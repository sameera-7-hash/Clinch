"""Appends a finished pipeline run to PostgreSQL, off the request path.

Runs live only in the browser, so the request carries the run's records. Each task runs
on a single worker thread: a task never holds up an API request, and a burst of clicks
can't pile several Ollama workloads onto the machine at once.
"""
from __future__ import annotations

import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any, Callable, Protocol

import httpx
from pydantic import BaseModel, ValidationError, field_validator

logger = logging.getLogger("append_task_manager")

_NUMBER = re.compile(r"\d+(?:\.\d+)?")


class OllamaUnavailable(Exception):
    """Ollama can't serve requests at all, so the whole task fails."""


class OllamaTimeout(Exception):
    """One record took too long. That record falls back to the rule-based mapping."""


class OllamaClient:
    def __init__(self, host: str, model: str, timeout_seconds: float) -> None:
        self.host = host
        self.model = model
        self.timeout_seconds = timeout_seconds

    def _unreachable(self) -> OllamaUnavailable:
        return OllamaUnavailable(f"Ollama is not running at {self.host}. Start Ollama and try again.")

    def ping(self) -> None:
        try:
            httpx.get(f"{self.host}/api/version", timeout=5.0).raise_for_status()
        except httpx.HTTPError as error:
            raise self._unreachable() from error

    def generate(self, prompt: str) -> str:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "keep_alive": "10m",
            "options": {"temperature": 0, "num_predict": 160},
        }
        try:
            response = httpx.post(f"{self.host}/api/generate", json=payload, timeout=self.timeout_seconds)
        except httpx.TimeoutException as error:
            raise OllamaTimeout() from error
        except httpx.TransportError as error:
            raise self._unreachable() from error
        if response.status_code == 404:
            raise OllamaUnavailable(f"Ollama model {self.model} is not pulled. Run: ollama pull {self.model}")
        if response.status_code >= 400:
            return ""
        return response.json().get("response", "")


class Generator(Protocol):
    model: str

    def ping(self) -> None: ...

    def generate(self, prompt: str) -> str: ...


def _to_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_event_time(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(timezone.utc)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def rule_based_mapping(run_id: str, record: dict[str, Any]) -> dict[str, Any]:
    """The authoritative column mapping. Anything without a column goes in attributes."""
    transaction = dict(record.get("transaction") or {})
    analysis = record.get("analysis") or {}
    source = record.get("attack_type") or transaction.get("attack_type") or "UNKNOWN"

    user_id = transaction.pop("user_id", None)
    host = transaction.pop("device_id", None)
    src_ip = transaction.pop("src_ip", None)
    transaction.pop("attack_type", None)

    attributes = {
        **transaction,
        "fraud_label": record.get("fraud_label"),
        "signals": record.get("signals") or {},
        "analyzed": bool(analysis),
    }
    if analysis:
        attributes["layers"] = analysis.get("layers") or []
        attributes["explanation"] = analysis.get("explanation")

    return {
        "run_id": run_id,
        "source": str(source),
        "user_id": None if user_id is None else str(user_id),
        "host": None if host is None else str(host),
        "src_ip": None if src_ip is None else str(src_ip),
        "event_time": _parse_event_time(record.get("event_time")),
        "risk_score": _to_float(analysis.get("final_risk_score")),
        "decision": analysis.get("decision"),
        "attributes": attributes,
    }


def build_event_text(row: dict[str, Any]) -> str:
    """The text that gets embedded, so similar attacks land near each other."""
    attributes = row["attributes"]
    parts = [f"{row['source']} transaction for user {row['user_id'] or 'unknown'} on device {row['host'] or 'unknown'}"]
    if attributes.get("location"):
        parts.append(f"in {attributes['location']}")
    if attributes.get("amount") is not None:
        parts.append(f"for amount {attributes['amount']}")
    text = " ".join(parts) + "."
    if attributes.get("risk_reason"):
        text += f" Reason: {attributes['risk_reason']}."
    signals = attributes.get("signals") or {}
    if signals:
        text += " Signals: " + ", ".join(f"{name} {value}" for name, value in signals.items()) + "."
    if row["decision"] is not None:
        text += f" Outcome: {row['decision']} at risk {row['risk_score']}."
    else:
        text += " Outcome: not scored by the Blue Team."
    return text


def rule_based_summary(row: dict[str, Any]) -> str:
    attack = row["source"].replace("_", " ").capitalize()
    subject = f"user {row['user_id']}" if row["user_id"] else "an unknown user"
    if row["decision"] is not None:
        return f"{attack} attempt on {subject} scored {row['risk_score']:g} and was marked {row['decision']}."
    return f"{attack} attempt on {subject} was generated but not scored by the Blue Team."


class SlmRecord(BaseModel):
    summary: str
    source: str | None = None
    user_id: str | None = None
    host: str | None = None
    risk_score: float | None = None
    decision: str | None = None

    @field_validator("summary")
    @classmethod
    def summary_is_one_short_line(cls, value: str) -> str:
        value = " ".join(value.split())
        if not 10 <= len(value) <= 300:
            raise ValueError("summary must be 10-300 characters.")
        return value


def build_prompt(row: dict[str, Any], event_text: str) -> str:
    expected = {
        "summary": "<one plain-English sentence>",
        "source": row["source"],
        "user_id": row["user_id"],
        "host": row["host"],
        "risk_score": row["risk_score"],
        "decision": row["decision"],
    }
    return (
        "You write one-sentence summaries of fraud events.\n"
        f"Event: {event_text}\n"
        "Reply with ONLY this JSON object. Copy every value exactly as shown and "
        "replace the summary placeholder with one plain-English sentence.\n"
        f"{json.dumps(expected)}"
    )


def parse_slm_output(raw: str, row: dict[str, Any]) -> str | None:
    """Returns the summary, or None if the output is invalid or changed a real value.

    A small model must never be able to alter a score, decision or ID, so those are
    compared with the pipeline's values and the columns always come from the pipeline.
    Summaries quoting a number that isn't in the event are rejected as invented.
    """
    try:
        parsed = SlmRecord.model_validate(json.loads(raw))
    except (json.JSONDecodeError, ValidationError, TypeError):
        return None

    for field in ("source", "user_id", "host", "decision"):
        if getattr(parsed, field) != row[field]:
            return None
    if parsed.risk_score != row["risk_score"]:
        if parsed.risk_score is None or row["risk_score"] is None:
            return None
        if abs(parsed.risk_score - row["risk_score"]) > 0.01:
            return None
    if not set(_NUMBER.findall(parsed.summary)) <= set(_NUMBER.findall(row["event_text"])):
        return None
    return parsed.summary


class AppendTaskManager:
    def __init__(
        self,
        store: Any,
        ollama: Generator,
        embedder: Any,
        concurrency: int = 3,
        submit: Callable[..., Any] | None = None,
    ) -> None:
        self._store = store
        self._ollama = ollama
        self._embedder = embedder
        self._concurrency = concurrency
        self._worker = ThreadPoolExecutor(max_workers=1, thread_name_prefix="append-task")
        self._submit = submit or self._worker.submit

    def warm_up(self) -> None:
        """Loads the embedding model early, so the first click doesn't pay for it."""
        self._submit(self._warm_up)

    def _warm_up(self) -> None:
        try:
            self._embedder.load()
        except Exception:
            logger.exception("Could not preload the embedding model.")

    def shutdown(self) -> None:
        self._worker.shutdown(wait=False, cancel_futures=True)

    def create_task(self, run_id: str, records: list[dict[str, Any]], created_by: int | None) -> dict[str, Any]:
        task, created = self._store.create_or_get_live_task(run_id, self._ollama.model, created_by)
        if created:
            self._submit(self._run_task, task["id"], run_id, records, created_by)
        return {
            "task_id": task["id"],
            "status": task["status"],
            "rows_appended": task["rows_appended"],
            "already_appended": not created and task["status"] == "done",
        }

    def get_task(self, task_id: int) -> dict[str, Any] | None:
        return self._store.get_task(task_id)

    def _summarize(self, row: dict[str, Any]) -> str:
        prompt = build_prompt(row, row["event_text"])
        for _ in range(2):  # the first try, then one retry
            try:
                raw = self._ollama.generate(prompt)
            except OllamaTimeout:
                break
            summary = parse_slm_output(raw, row)
            if summary is not None:
                return summary
        logger.info("Using the rule-based summary for a %s record.", row["source"])
        return rule_based_summary(row)

    def _run_task(self, task_id: int, run_id: str, records: list[dict[str, Any]], created_by: int | None) -> None:
        try:
            self._store.mark_running(task_id)
            self._ollama.ping()

            rows = [rule_based_mapping(run_id, record) for record in records]
            for row in rows:
                row["event_text"] = build_event_text(row)
                row["appended_by"] = created_by

            with ThreadPoolExecutor(max_workers=self._concurrency, thread_name_prefix="ollama") as pool:
                for row, summary in zip(rows, pool.map(self._summarize, rows)):
                    row["summary"] = summary

            for row, embedding in zip(rows, self._embedder.embed([row["event_text"] for row in rows])):
                row["embedding"] = embedding

            self._store.insert_rows_and_finish(task_id, rows)
        except OllamaUnavailable as error:
            logger.warning("Append task %s failed: %s", task_id, error)
            self._store.mark_failed(task_id, str(error))
        except Exception:
            logger.exception("Append task %s failed.", task_id)
            self._store.mark_failed(task_id, "Could not save this run to the database. Check the API logs.")
