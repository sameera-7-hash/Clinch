-- Append store for completed pipeline runs. Runs alongside Pinecone, not instead of it.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS threat_events (
    id          BIGSERIAL PRIMARY KEY,
    run_id      TEXT,
    source      TEXT,
    user_id     TEXT NULL,
    host        TEXT NULL,
    src_ip      TEXT NULL,
    event_time  TIMESTAMPTZ,
    event_text  TEXT NOT NULL,
    summary     TEXT,
    risk_score  REAL NULL,
    decision    TEXT NULL,
    attributes  JSONB,
    embedding   VECTOR(384),
    appended_by INT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS threat_events_embedding_hnsw
    ON threat_events USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS threat_events_run_id ON threat_events (run_id);
CREATE INDEX IF NOT EXISTS threat_events_created_at ON threat_events (created_at);

CREATE TABLE IF NOT EXISTS append_tasks (
    id            BIGSERIAL PRIMARY KEY,
    run_id        TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed')),
    rows_appended INT DEFAULT 0,
    error         TEXT NULL,
    model         TEXT,
    created_by    INT NULL,
    created_at    TIMESTAMPTZ DEFAULT now(),
    finished_at   TIMESTAMPTZ NULL
);

-- Covers in-flight tasks as well as finished ones, so two fast clicks can't both start.
-- A failed task is deliberately left out: that run can be retried.
CREATE UNIQUE INDEX IF NOT EXISTS append_tasks_one_live_task_per_run
    ON append_tasks (run_id) WHERE status IN ('queued', 'running', 'done');
