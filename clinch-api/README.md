# Clinch API

Local accounts and the PostgreSQL append store. Runs on port 8013; the Vite dev server
proxies `/api` here. The Red Team, Blue Team and chatbot services are separate and
unchanged.

## Requires

- PostgreSQL with the [pgvector](https://github.com/pgvector/pgvector) extension
- Ollama with the model named by `OLLAMA_MODEL` pulled
- Settings in `app/.env` (see `app/.env.example`)

Windows install, from a Command Prompt opened as Administrator:

```bat
winget install -e --id PostgreSQL.PostgreSQL.17 --interactive

call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set "PGROOT=C:\Program Files\PostgreSQL\17"
cd %TEMP%
git clone --branch v0.8.7 --depth 1 https://github.com/pgvector/pgvector.git
cd pgvector
nmake /F Makefile.win
nmake /F Makefile.win install
```

## Run

```bat
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
start.bat
```

The schema in `db/migrations` is applied at startup and is safe to re-run.

## Test

```bat
.venv\Scripts\python -m pytest
```

Database tests are skipped unless `TEST_DATABASE_URL` points at a separate database.
