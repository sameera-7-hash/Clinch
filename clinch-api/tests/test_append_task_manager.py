"""Task manager behaviour with Ollama, the embedder and the database mocked."""
import json

from services.append_task_manager import (
    AppendTaskManager,
    OllamaTimeout,
    OllamaUnavailable,
    build_event_text,
    parse_slm_output,
    rule_based_mapping,
)

RUN_ID = "run_0123456789"


def scored_record():
    return {
        "attack_type": "ACCOUNT_TAKEOVER",
        "fraud_label": 1,
        "event_time": "2026-11-09T10:00:00.000Z",
        "transaction": {
            "user_id": "U0001",
            "device_id": "UNKNOWN_DEVICE_1234",
            "location": "Pune",
            "amount": 45000.5,
            "risk_reason": "New device",
            "normal_device": "DEV_0001",
        },
        "signals": {"velocity": 40},
        "analysis": {
            "final_risk_score": 88.5,
            "decision": "CRITICAL_BLOCK",
            "layers": [{"label": "Rule Engine", "score": 90}],
            "explanation": "High risk.",
        },
    }


def unscored_record():
    record = scored_record()
    record["attack_type"] = "CARD_TESTING"
    record["analysis"] = None
    return record


class FakeStore:
    def __init__(self):
        self.tasks = {}
        self.rows = []
        self.fail_insert = False

    def create_or_get_live_task(self, run_id, model, created_by):
        for task in self.tasks.values():
            if task["run_id"] == run_id and task["status"] != "failed":
                return task, False
        task = {"id": len(self.tasks) + 1, "run_id": run_id, "status": "queued", "rows_appended": 0, "error": None}
        self.tasks[task["id"]] = task
        return task, True

    def get_task(self, task_id):
        return self.tasks.get(task_id)

    def mark_running(self, task_id):
        self.tasks[task_id]["status"] = "running"

    def mark_failed(self, task_id, error):
        self.tasks[task_id].update(status="failed", error=error)

    def insert_rows_and_finish(self, task_id, rows):
        if self.fail_insert:
            raise RuntimeError("password=hunter2 connection lost")
        self.rows.extend(rows)
        self.tasks[task_id].update(status="done", rows_appended=len(rows))


class FakeEmbedder:
    def embed(self, texts):
        return [[0.1] * 384 for _ in texts]


class FakeOllama:
    model = "llama3.2:1b"

    def __init__(self, responder=None, down=False):
        self.responder = responder or self.echo
        self.down = down
        self.calls = 0

    @staticmethod
    def echo(prompt):
        expected = json.loads(prompt.rsplit("\n", 1)[1])
        expected["summary"] = "An account takeover attempt was stopped by the defenses."
        return json.dumps(expected)

    def ping(self):
        if self.down:
            raise OllamaUnavailable("Ollama is not running at http://localhost:11434. Start Ollama and try again.")

    def generate(self, prompt):
        self.calls += 1
        return self.responder(prompt)


def make_manager(ollama, store=None):
    store = store or FakeStore()
    manager = AppendTaskManager(store, ollama, FakeEmbedder(), submit=lambda fn, *args: fn(*args))
    return manager, store


def test_success_appends_every_record_with_model_summary():
    manager, store = make_manager(FakeOllama())
    result = manager.create_task(RUN_ID, [scored_record(), unscored_record()], created_by=3)

    assert result["already_appended"] is False
    assert store.tasks[result["task_id"]]["status"] == "done"
    assert store.tasks[result["task_id"]]["rows_appended"] == 2
    assert store.rows[0]["summary"] == "An account takeover attempt was stopped by the defenses."
    assert store.rows[0]["appended_by"] == 3
    assert len(store.rows[0]["embedding"]) == 384


def test_columns_map_from_the_pipeline_record():
    row = rule_based_mapping(RUN_ID, scored_record())
    assert row["source"] == "ACCOUNT_TAKEOVER"
    assert row["user_id"] == "U0001"
    assert row["host"] == "UNKNOWN_DEVICE_1234"
    assert row["src_ip"] is None
    assert row["risk_score"] == 88.5
    assert row["decision"] == "CRITICAL_BLOCK"
    assert row["event_time"].isoformat() == "2026-11-09T10:00:00+00:00"
    assert row["attributes"]["normal_device"] == "DEV_0001"
    assert row["attributes"]["amount"] == 45000.5
    assert row["attributes"]["layers"] == [{"label": "Rule Engine", "score": 90}]


def test_unscored_scenario_keeps_null_score_and_decision():
    row = rule_based_mapping(RUN_ID, unscored_record())
    assert row["risk_score"] is None
    assert row["decision"] is None
    assert row["attributes"]["analyzed"] is False
    assert "not scored" in build_event_text(row)


def test_invalid_json_retries_once_then_falls_back():
    ollama = FakeOllama(responder=lambda prompt: "this is not json")
    manager, store = make_manager(ollama)
    result = manager.create_task(RUN_ID, [scored_record()], created_by=None)

    assert ollama.calls == 2
    assert store.tasks[result["task_id"]]["status"] == "done"
    assert store.rows[0]["summary"] == "Account takeover attempt on user U0001 scored 88.5 and was marked CRITICAL_BLOCK."


def test_invalid_json_then_valid_retry_uses_the_model_summary():
    responses = iter(["{broken", None])

    def responder(prompt):
        response = next(responses)
        return response if response is not None else FakeOllama.echo(prompt)

    ollama = FakeOllama(responder=responder)
    manager, store = make_manager(ollama)
    manager.create_task(RUN_ID, [scored_record()], created_by=None)

    assert ollama.calls == 2
    assert store.rows[0]["summary"].startswith("An account takeover attempt")


def test_model_that_changes_a_score_is_rejected():
    row = rule_based_mapping(RUN_ID, scored_record())
    output = {"summary": "A perfectly plausible sentence.", "source": row["source"], "user_id": row["user_id"],
              "host": row["host"], "risk_score": 12.0, "decision": row["decision"]}
    assert parse_slm_output(json.dumps(output), row) is None


def test_model_that_changes_a_decision_is_rejected():
    row = rule_based_mapping(RUN_ID, scored_record())
    output = {"summary": "A perfectly plausible sentence.", "source": row["source"], "user_id": row["user_id"],
              "host": row["host"], "risk_score": row["risk_score"], "decision": "ALLOW"}
    assert parse_slm_output(json.dumps(output), row) is None


def test_summary_with_an_invented_number_is_rejected():
    row = rule_based_mapping(RUN_ID, scored_record())
    row["event_text"] = build_event_text(row)
    output = {"summary": "The amount deviated by 5 standard deviations.", "source": row["source"],
              "user_id": row["user_id"], "host": row["host"], "risk_score": row["risk_score"], "decision": row["decision"]}
    assert parse_slm_output(json.dumps(output), row) is None


def test_summary_quoting_a_real_number_is_kept():
    row = rule_based_mapping(RUN_ID, scored_record())
    row["event_text"] = build_event_text(row)
    output = {"summary": "User U0001 was marked high risk at 88.5.", "source": row["source"], "user_id": row["user_id"],
              "host": row["host"], "risk_score": row["risk_score"], "decision": row["decision"]}
    assert parse_slm_output(json.dumps(output), row) == "User U0001 was marked high risk at 88.5."


def test_stored_columns_always_come_from_the_pipeline():
    manager, store = make_manager(FakeOllama())
    manager.create_task(RUN_ID, [scored_record()], created_by=None)
    assert store.rows[0]["risk_score"] == 88.5
    assert store.rows[0]["decision"] == "CRITICAL_BLOCK"


def test_one_slow_record_falls_back_without_failing_the_task():
    def responder(prompt):
        raise OllamaTimeout()

    ollama = FakeOllama(responder=responder)
    manager, store = make_manager(ollama)
    result = manager.create_task(RUN_ID, [scored_record()], created_by=None)

    assert ollama.calls == 1
    assert store.tasks[result["task_id"]]["status"] == "done"
    assert "scored 88.5" in store.rows[0]["summary"]


def test_ollama_down_fails_the_task_with_a_clear_message():
    manager, store = make_manager(FakeOllama(down=True))
    result = manager.create_task(RUN_ID, [scored_record()], created_by=None)

    task = store.tasks[result["task_id"]]
    assert task["status"] == "failed"
    assert "Ollama is not running" in task["error"]
    assert store.rows == []


def test_ollama_dying_mid_run_fails_the_task():
    def responder(prompt):
        raise OllamaUnavailable("Ollama is not running at http://localhost:11434. Start Ollama and try again.")

    manager, store = make_manager(FakeOllama(responder=responder))
    result = manager.create_task(RUN_ID, [scored_record()], created_by=None)

    assert store.tasks[result["task_id"]]["status"] == "failed"
    assert store.rows == []


def test_database_error_fails_the_task_without_leaking_details():
    store = FakeStore()
    store.fail_insert = True
    manager, store = make_manager(FakeOllama(), store)
    result = manager.create_task(RUN_ID, [scored_record()], created_by=None)

    task = store.tasks[result["task_id"]]
    assert task["status"] == "failed"
    assert "hunter2" not in task["error"]


def test_second_click_reports_already_appended_and_does_no_work():
    ollama = FakeOllama()
    manager, store = make_manager(ollama)
    first = manager.create_task(RUN_ID, [scored_record()], created_by=None)
    calls_after_first = ollama.calls
    second = manager.create_task(RUN_ID, [scored_record()], created_by=None)

    assert second["already_appended"] is True
    assert second["task_id"] == first["task_id"]
    assert second["rows_appended"] == 1
    assert ollama.calls == calls_after_first
    assert len(store.rows) == 1


def test_failed_run_can_be_retried():
    ollama = FakeOllama(down=True)
    manager, store = make_manager(ollama)
    first = manager.create_task(RUN_ID, [scored_record()], created_by=None)
    ollama.down = False
    second = manager.create_task(RUN_ID, [scored_record()], created_by=None)

    assert second["task_id"] != first["task_id"]
    assert store.tasks[second["task_id"]]["status"] == "done"
