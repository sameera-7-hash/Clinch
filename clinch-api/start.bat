@echo off
REM Fixed port for this service - Vite proxies /api here (see vite.config.ts).
cd /d "%~dp0"
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8013
