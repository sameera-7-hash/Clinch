"""Clinch API: local accounts plus the PostgreSQL append store.

A separate service, so the Red Team, Blue Team and chatbot services stay untouched.
"""
from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from config import get_settings
from database import close_pool, get_pool, init_db, open_pool
from routes import append, auth, dataset
from services.append_store import AppendStore
from services.append_task_manager import AppendTaskManager, OllamaClient
from services.embeddings import Embedder

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    init_db(settings.database_url)
    open_pool(settings.database_url)

    store = AppendStore(get_pool())
    interrupted = store.fail_interrupted_tasks()
    if interrupted:
        logger.warning("Marked %s interrupted append task(s) as failed.", interrupted)

    manager = AppendTaskManager(
        store=store,
        ollama=OllamaClient(settings.ollama_host, settings.ollama_model, settings.ollama_timeout_seconds),
        embedder=Embedder(settings.embedding_model),
        concurrency=settings.ollama_concurrency,
    )
    manager.warm_up()
    app.state.task_manager = manager

    yield

    manager.shutdown()
    close_pool()


app = FastAPI(title="Clinch API", version="1.0.0", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(append.router)
app.include_router(dataset.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
