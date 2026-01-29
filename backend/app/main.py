import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .core.config import settings
from .db.postgres import init_db


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup() -> None:
    try:
        await init_db()
    except Exception as exc:
        logger.warning("Database init failed, continuing without DB: %s", exc)
