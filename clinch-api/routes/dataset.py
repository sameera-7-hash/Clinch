"""Read-only access to appended rows. These never wait on Ollama."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import get_pool
from dependencies import get_current_user

router = APIRouter(prefix="/api/dataset", tags=["dataset"], dependencies=[Depends(get_current_user)])

# Listed explicitly so the embedding can never reach a response.
COLUMNS = """id, run_id, source, user_id, host, src_ip, event_time, event_text, summary,
             risk_score, decision, attributes, appended_by, created_at"""


def _like_pattern(term: str) -> str:
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


@router.get("")
def list_rows(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, max_length=200),
    run_id: str | None = Query(default=None, max_length=64),
) -> dict:
    conditions: list[str] = []
    parameters: list[object] = []
    if run_id:
        conditions.append("run_id = %s")
        parameters.append(run_id)
    if search and search.strip():
        conditions.append(
            "(event_text ILIKE %s OR summary ILIKE %s OR run_id ILIKE %s OR user_id ILIKE %s OR source ILIKE %s)"
        )
        parameters.extend([_like_pattern(search.strip())] * 5)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_pool().connection() as connection:
        total = connection.execute(f"SELECT count(*) AS total FROM threat_events {where}", parameters).fetchone()
        rows = connection.execute(
            f"SELECT {COLUMNS} FROM threat_events {where} ORDER BY created_at DESC, id DESC LIMIT %s OFFSET %s",
            [*parameters, page_size, (page - 1) * page_size],
        ).fetchall()
    return {"items": rows, "total": total["total"], "page": page, "page_size": page_size}


@router.get("/{row_id}/similar")
def similar_rows(row_id: int, k: int = Query(default=5, ge=1, le=50)) -> dict:
    with get_pool().connection() as connection:
        exists = connection.execute("SELECT 1 FROM threat_events WHERE id = %s", (row_id,)).fetchone()
        if exists is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Row not found.")
        rows = connection.execute(
            f"""
            SELECT {COLUMNS},
                   1 - (embedding <=> (SELECT embedding FROM threat_events WHERE id = %(id)s)) AS similarity
            FROM threat_events
            WHERE id <> %(id)s AND embedding IS NOT NULL
            ORDER BY embedding <=> (SELECT embedding FROM threat_events WHERE id = %(id)s)
            LIMIT %(k)s
            """,
            {"id": row_id, "k": k},
        ).fetchall()
    return {"items": rows}
