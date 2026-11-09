# Shared image for the four Python backend services. docker-compose.yml passes the
# service folder, and any version pins that service needs, as build args.
FROM python:3.13-slim

ARG SERVICE_DIR
# "1" installs the CPU build of torch first, which avoids downloading several GB of
# CUDA libraries for the services that use sentence-transformers.
ARG CPU_TORCH=0
# Extra pip requirements, used to hold the versions that saved .pkl/.joblib models need.
ARG PIP_PINS=""

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/home/app/.cache/huggingface

# xgboost needs the OpenMP runtime, which the slim image doesn't include.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# The cache folder is created here so a new named volume inherits this ownership.
RUN useradd --create-home app \
    && mkdir -p /srv/service /home/app/.cache/huggingface \
    && chown -R app:app /srv/service /home/app

WORKDIR /srv/service

# Dependencies go in before the source so code edits don't reinstall them.
COPY ${SERVICE_DIR}/requirements.txt ./requirements.txt
RUN if [ "$CPU_TORCH" = "1" ]; then \
        pip install torch --index-url https://download.pytorch.org/whl/cpu; \
    fi
RUN pip install -r requirements.txt $PIP_PINS

COPY --chown=app:app ${SERVICE_DIR}/ ./

USER app
