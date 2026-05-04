from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import init_db
from app.api.video import router as video_router
from app.api.roi import router as roi_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initialising database…")
    await init_db()
    logger.info("Database ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Face Detection API",
    description=(
        "Receives video frames, detects faces using face_recognition + Pillow (no OpenCV), "
        "stores ROI data in SQLite, and streams annotated MJPEG feed."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(video_router)
app.include_router(roi_router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


@app.get("/", tags=["health"])
async def root():
    return {
        "service": "Face Detection API",
        "endpoints": {
            "ingest": "POST /video/ingest",
            "stream": "GET  /video/stream",
            "roi_data": "GET  /roi/data",
            "roi_latest": "GET  /roi/latest",
            "docs": "GET  /docs",
        },
    }