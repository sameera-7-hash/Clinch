"""Starts append tasks and reports their progress."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Path, Request, status
from pydantic import BaseModel, Field

from dependencies import CurrentUser, get_current_user
from services.append_task_manager import AppendTaskManager

router = APIRouter(prefix="/api/append", tags=["append"], dependencies=[Depends(get_current_user)])


class RunRecord(BaseModel):
    attack_type: str | None = None
    fraud_label: int | None = None
    event_time: str | None = None
    transaction: dict[str, Any]
    signals: dict[str, Any] = Field(default_factory=dict)
    # Null for orchestrator scenarios the Blue Team didn't score.
    analysis: dict[str, Any] | None = None


class AppendRequest(BaseModel):
    records: list[RunRecord] = Field(min_length=1, max_length=50)


def get_task_manager(request: Request) -> AppendTaskManager:
    return request.app.state.task_manager


@router.post("/{run_id}", status_code=status.HTTP_202_ACCEPTED)
def start_append(
    body: AppendRequest,
    run_id: str = Path(pattern=r"^[A-Za-z0-9_-]{8,64}$"),
    user: CurrentUser = Depends(get_current_user),
    manager: AppendTaskManager = Depends(get_task_manager),
) -> dict:
    return manager.create_task(run_id, [record.model_dump() for record in body.records], user.id)


@router.get("/tasks/{task_id}")
def task_status(task_id: int, manager: AppendTaskManager = Depends(get_task_manager)) -> dict:
    task = manager.get_task(task_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found.")
    return {
        "task_id": task["id"],
        "run_id": task["run_id"],
        "status": task["status"],
        "rows_appended": task["rows_appended"],
        "error": task["error"],
        "model": task["model"],
        "created_at": task["created_at"],
        "finished_at": task["finished_at"],
    }
