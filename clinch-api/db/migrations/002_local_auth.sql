-- Local accounts, replacing Supabase Auth.
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email_enc       BYTEA NOT NULL,
    email_hash      TEXT NOT NULL UNIQUE,
    name_enc        BYTEA NULL,
    password_hash   TEXT NOT NULL,
    -- Copied into each JWT. Bumping it signs the user out everywhere.
    session_version INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now(),
    last_login_at   TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS password_resets_user_id ON password_resets (user_id);
