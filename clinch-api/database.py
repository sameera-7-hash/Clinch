"""PostgreSQL connection pool and idempotent schema setup."""
from __future__ import annotations

import logging
from pathlib import Path

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

logger = logging.getLogger("database")

MIGRATIONS_DIR = Path(__file__).resolve().parent / "db" / "migrations"
# Arbitrary constant: serialises migrations if two processes start at once.
MIGRATION_LOCK_ID = 727274

_pool: ConnectionPool | None = None


def init_db(database_url: str) -> None:
    """Applies every migration. All of them are safe to re-run."""
    try:
        with psycopg.connect(database_url, autocommit=False) as connection:
            connection.execute("SELECT pg_advisory_xact_lock(%s)", (MIGRATION_LOCK_ID,))
            for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
                connection.execute(path.read_text(encoding="utf-8"))
    except psycopg.errors.FeatureNotSupported as error:
        raise RuntimeError(
            "The pgvector extension is not installed on this PostgreSQL server. "
            "See clinch-api/README.md for the install commands."
        ) from error
    except psycopg.OperationalError as error:
        raise RuntimeError(f"Could not connect to PostgreSQL using DATABASE_URL: {error}") from error
    logger.info("Database schema is up to date.")


def open_pool(database_url: str) -> None:
    global _pool
    _pool = ConnectionPool(
        database_url, min_size=1, max_size=10, kwargs={"row_factory": dict_row}, open=True, name="clinch"
    )
    _pool.wait(timeout=10)


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def get_pool() -> ConnectionPool:
    if _pool is None:
        raise RuntimeError("Database pool is not open.")
    return _pool
