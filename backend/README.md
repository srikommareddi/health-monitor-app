# Thrive AI Companion Backend

FastAPI + Uvicorn service that powers the mobile app. This service integrates
LangChain, LiveKit, Postgres, Redis, ClickHouse, Kafka, and RabbitMQ.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Environment

Copy `.env.example` to `.env` and fill in values.

## Key endpoints

- `GET /health`
- `GET /v1/profile`
- `POST /v1/insights`
- `POST /v1/livekit/token`
