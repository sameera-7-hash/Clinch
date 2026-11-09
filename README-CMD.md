# Clinch: Run Commands

How to run the four Clinch backend services and the frontend on your machine, either directly or with the backends in Docker.

Commands are for **Windows Command Prompt**. Unless a step says otherwise, start each one in the `app` folder.

| Service | What it does | Folder | URL |
|---|---|---|---|
| Clinch API | Accounts, PostgreSQL append store | `clinch-api` | http://localhost:8013 |
| Blue Team API | Transaction scoring, dashboard data | `fraudshield-ai\red-team01\sentinelpay` | http://localhost:8011 |
| Threat Chatbot | Threat Analyzer chat, analysis pipeline | `Fraudshield-back\blue_team_fraud_engine` | http://localhost:8012 |
| Red Team API | Attack generation | `Fraudshield-back\fraudshield-redteam.api` | http://localhost:8000 |
| Frontend | Web app, proxies `/api` to Clinch API | this folder | http://localhost:5174 |

Clinch API also needs PostgreSQL with pgvector, and Ollama.

## 1. First-time setup

You need Python 3.13, Node.js, and Git. To run without Docker you also need PostgreSQL with pgvector and Ollama. See [clinch-api/README.md](clinch-api/README.md) for the pgvector install.

### Download the three linked services

Do this only on a fresh clone. In the `Clinch` repo these folders are links to other repos, so they arrive empty.

```bat
git clone https://github.com/sameera-7-hash/Fraudshield-chatbot Fraudshield-back\blue_team_fraud_engine
git clone https://github.com/Prathamesh-Salunke/fraudshield-redteam.api Fraudshield-back\fraudshield-redteam.api
git clone https://github.com/sahilkasar01/red-team01 fraudshield-ai\red-team01
```

### Create the settings files

```bat
copy .env.example .env
```

Fill in these values in `app\.env`. Run each command and paste its output:

| Setting | Command |
|---|---|
| `AES_256_KEY` | `python -c "import os,base64;print(base64.b64encode(os.urandom(32)).decode())"` |
| `HMAC_KEY` | Same command as above, run again for a different value |
| `JWT_SECRET` | `python -c "import secrets;print(secrets.token_urlsafe(48))"` |

Also set `DATABASE_URL` to your PostgreSQL login. Docker replaces this value with its own database.

Create `Fraudshield-back\blue_team_fraud_engine\.env` with your own keys:

```ini
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
PINECONE_API_KEY=
```

### Point the frontend at your local services

By default the frontend calls the hosted Render services. This file overrides that without changing `.env`, and Git ignores it.

```bat
(
echo VITE_API_BASE_URL=http://localhost:8011
echo VITE_CHAT_API_BASE_URL=http://localhost:8012
echo VITE_RED_TEAM_API_BASE_URL=http://localhost:8000
) > .env.development.local
```

To go back to the hosted services, run `del .env.development.local` and restart the frontend.

## 2. Run everything locally

### Install dependencies (once)

**Clinch API**

```bat
cd clinch-api
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

**Blue Team API.** The version pins are required because the saved models were built for them.

```bat
cd fraudshield-ai\red-team01\sentinelpay
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt scikit-learn==1.7.2 xgboost==3.4.1 joblib==1.5.2 numpy==2.3.5 pandas==2.3.3
```

**Threat Chatbot**

```bat
cd Fraudshield-back\blue_team_fraud_engine
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

**Red Team API.** The first line removes a `.venv` copied from another computer. Skip it if the folder doesn't exist.

```bat
cd Fraudshield-back\fraudshield-redteam.api
rmdir /s /q .venv
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

**Frontend and Ollama model**

```bat
npm install
ollama pull llama3.2:1b
```

### Start the services

Make sure PostgreSQL and Ollama are running, then use one terminal per service.

```bat
:: Terminal 1: Clinch API (8013)
cd clinch-api
.\start.bat
```

```bat
:: Terminal 2: Blue Team API (8011)
:: Activating the venv makes start.bat use it. Skip that line if the packages are in your main Python.
cd fraudshield-ai\red-team01\sentinelpay
.venv\Scripts\activate
.\start.bat
```

```bat
:: Terminal 3: Threat Chatbot (8012)
cd Fraudshield-back\blue_team_fraud_engine
.\start.bat
```

```bat
:: Terminal 4: Red Team API (8000)
cd Fraudshield-back\fraudshield-redteam.api
.venv\Scripts\python -m flask --app app run --host 127.0.0.1 --port 8000
```

```bat
:: Terminal 5: Frontend (5174)
npm run dev
```

Open http://localhost:5174. Use `localhost`, because `127.0.0.1` doesn't reach the frontend. Press `Ctrl+C` in a terminal to stop that service.

## 3. Run the backends in Docker

This runs the four backend services, PostgreSQL, and Ollama in containers. The frontend still runs on your machine.

Install Docker Desktop once, then restart Windows and open it:

```bat
winget install -e --id Docker.DockerDesktop
```

Complete the settings files in section 1, and stop any local copies of the services first, because Docker uses the same ports. Your installed PostgreSQL and Ollama can stay running.

```bat
docker compose up -d --build
docker compose ps
npm run dev
```

The first build and start can take a long time, because they download Python packages, the PyTorch CPU build, and the Ollama and embedding models. Give Docker Desktop at least 8 GB of memory.

Docker has its own empty database, so accounts created outside Docker won't exist there. Data is kept when containers stop, except the Blue Team `blue_team_api_log.csv`, which resets when that container is recreated.

To use a different password for the Docker database, add `CLINCH_DB_PASSWORD=your-password` to `app\.env` before the first start.

### Docker command reference

Replace `clinch-api` with `blue-team`, `chatbot`, `red-team`, `postgres`, `ollama`, or `ollama-pull` as needed.

| Task | Command |
|---|---|
| Check the Compose file | `docker compose config --quiet` |
| Build and start everything | `docker compose up -d --build` |
| Start without rebuilding | `docker compose up -d` |
| See status and health | `docker compose ps` |
| Follow all logs | `docker compose logs -f` |
| Follow one service's logs | `docker compose logs -f clinch-api` |
| Watch the model download | `docker compose logs -f ollama-pull` |
| Restart one service | `docker compose restart clinch-api` |
| Rebuild one service after a code change | `docker compose up -d --build clinch-api` |
| Open a shell in a service | `docker compose exec clinch-api bash` |
| Run Clinch API tests | `docker compose exec clinch-api python -m pytest` |
| Open the database | `docker compose exec postgres psql -U clinch -d clinch` |
| List Ollama models | `docker compose exec ollama ollama list` |
| Stop, keeping containers | `docker compose stop` |
| Stop and remove containers, keeping data | `docker compose down` |
| **Delete everything, including the database and models** | `docker compose down -v` |

Code changes need a rebuild, because the code is copied into the images.

## 4. Check that it's working

These work for both local and Docker runs:

```bat
curl http://localhost:8013/health
curl http://localhost:8011/
curl http://localhost:8012/health
curl http://localhost:8000/health
curl -I http://localhost:5174/
```

API docs for the FastAPI services are at http://localhost:8013/docs, http://localhost:8011/docs, and http://localhost:8012/docs.

To run the Clinch API tests without Docker:

```bat
cd clinch-api
.venv\Scripts\python -m pytest
```

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| `address already in use` or Docker can't bind a port | Run `netstat -ano \| findstr :8013` with the port you need, then `taskkill /PID <pid> /F` |
| `did not find executable at C:\Python314\python.exe` | The `.venv` came from another computer. Delete it and repeat the install step |
| `ModuleNotFoundError` | Repeat that service's install step |
| `'start.bat' is not recognized` | Use `.\start.bat` |
| Clinch API says a setting is not set | Fill in that value in `app\.env` |
| Clinch API says pgvector is not installed | Follow [clinch-api/README.md](clinch-api/README.md), or use Docker |
| Frontend still calls `onrender.com` | Create `.env.development.local` from section 1 and restart `npm run dev` |
| Append jobs fail right after a Docker start | The model may still be downloading. Check `docker compose logs -f ollama-pull` |
| Docker says it can't find a service's `requirements.txt` | Download the linked services from section 1 |
