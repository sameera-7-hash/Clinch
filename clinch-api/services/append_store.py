"""PostgreSQL persistence for append tasks and the rows they produce."""
from __future__ import annotations

from typing import Any

from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

LIVE_STATUSES = ("queued", "running", "done")


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"


class AppendStore:
    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def fail_interrupted_tasks(self) -> int:
        """A task left queued/running by a crash would otherwise block its run forever."""
        with self._pool.connection() as connection:
            cursor = connection.execute(
                """
                UPDATE append_tasks
                SET status = 'failed', error = 'Interrupted by a server restart.', finished_at = now()
                WHERE status IN ('queued', 'running')
                """
            )
            return cursor.rowcount

    def create_or_get_live_task(self, run_id: str, model: str, created_by: int | None) -> tuple[dict[str, Any], bool]:
        """Returns (task, created). An existing queued/running/done task for the run is reused."""
        # Two attempts: the conflicting task can fail between the INSERT and the SELECT.
        for _ in range(2):
            with self._pool.connection() as connection:
                inserted = connection.execute(
                    """
                    INSERT INTO append_tasks (run_id, status, model, created_by)
                    VALUES (%s, 'queued', %s, %s)
                    ON CONFLICT (run_id) WHERE status IN ('queued', 'running', 'done') DO NOTHING
                    RETURNING id, run_id, status, rows_appended
                    """,
                    (run_id, model, created_by),
                ).fetchone()
                if inserted is not None:
                    return inserted, True
                existing = connection.execute(
                    """
                    SELECT id, run_id, status, rows_appended FROM append_tasks
                    WHERE run_id = %s AND status IN ('queued', 'running', 'done')
                    """,
                    (run_id,),
                ).fetchone()
                if existing is not None:
                    return existing, False
        raise RuntimeError(f"Could not create or find a task for run {run_id}.")

    def get_task(self, task_id: int) -> dict[str, Any] | None:
        with self._pool.connection() as connection:
            return connection.execute(
                """
                SELECT id, run_id, status, rows_appended, error, model, created_at, finished_at
                FROM append_tasks WHERE id = %s
                """,
                (task_id,),
            ).fetchone()

    def mark_running(self, task_id: int) -> None:
        with self._pool.connection() as connection:
            connection.execute("UPDATE append_tasks SET status = 'running' WHERE id = %s", (task_id,))

    def mark_failed(self, task_id: int, error: str) -> None:
        with self._pool.connection() as connection:
            connection.execute(
                "UPDATE append_tasks SET status = 'failed', error = %s, finished_at = now() WHERE id = %s",
                (error, task_id),
            )

    def insert_rows_and_finish(self, task_id: int, rows: list[dict[str, Any]]) -> None:
        """All rows and the task's 'done' status commit together, or none of it does."""
        parameters = [
            (
                row["run_id"],
                row["source"],
                row["user_id"],
                row["host"],
                row["src_ip"],
                row["event_time"],
                row["event_text"],
                row["summary"],
                row["risk_score"],
                row["decision"],
                Jsonb(row["attributes"]),
                _vector_literal(row["embedding"]),
                row["appended_by"],
            )
            for row in rows
        ]
        with self._pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO threat_events (
                        run_id, source, user_id, host, src_ip, event_time, event_text, summary,
                        risk_score, decision, attributes, embedding, appended_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::vector, %s)
                    """,
                    parameters,
                )
            connection.execute(
                "UPDATE append_tasks SET status = 'done', rows_appended = %s, finished_at = now() WHERE id = %s",
                (len(rows), task_id),
            )
