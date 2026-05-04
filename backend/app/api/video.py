"""
Video endpoints:
  POST /video/ingest   — receive raw JPEG frames (multipart or raw bytes)
  GET  /video/stream   — serve annotated MJPEG feed
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.detection import detect_and_annotate
from app.services.roi_service import save_roi
from app.services.stream import stream_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/video", tags=["video"])

DEFAULT_STREAM_ID = "main"


async def _process_frame(jpeg_bytes: bytes, db: AsyncSession) -> None:
    """Run detection, persist ROI, push annotated frame to stream — all in background."""
    loop = asyncio.get_event_loop()
    # face_recognition is CPU-bound — run in thread pool to avoid blocking event loop
    result = await loop.run_in_executor(None, detect_and_annotate, jpeg_bytes)
    await save_roi(db, result)
    await stream_manager.push_frame(DEFAULT_STREAM_ID, result.annotated_jpeg)


@router.post("/ingest", summary="Receive a raw video frame for processing")
async def ingest_frame(
    background_tasks: BackgroundTasks,
    frame: UploadFile = File(..., description="JPEG frame from the video source"),
    db: AsyncSession = Depends(get_db),
):
    """
    Accepts a single JPEG frame via multipart upload.

    The frame is:
      1. Decoded and fed to the face detection pipeline (face_recognition + Pillow)
      2. ROI stored in SQLite if a face is detected
      3. Annotated frame pushed to the MJPEG stream buffer

    Clients (e.g. a camera script) should POST frames as fast as desired;
    the server drops stale frames if the consumer falls behind.
    """
    if frame.content_type not in ("image/jpeg", "image/jpg", "application/octet-stream"):
        raise HTTPException(status_code=415, detail="Only JPEG frames accepted")

    jpeg_bytes = await frame.read()
    if not jpeg_bytes:
        raise HTTPException(status_code=400, detail="Empty frame")

    # Process in background so this endpoint returns immediately
    background_tasks.add_task(_process_frame, jpeg_bytes, db)

    return {"status": "queued", "bytes": len(jpeg_bytes)}


@router.get("/stream", summary="Serve annotated MJPEG video feed")
async def stream_video():
    """
    Returns a multipart/x-mixed-replace MJPEG stream.

    Point an <img> or <video> tag (or the Next.js VideoPlayer) at this endpoint.
    The stream contains frames with the face ROI rectangle drawn using Pillow.
    """
    return StreamingResponse(
        stream_manager.generate_mjpeg(DEFAULT_STREAM_ID),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Access-Control-Allow-Origin": "*",
        },
    )