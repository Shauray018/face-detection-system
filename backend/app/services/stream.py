from __future__ import annotations

import asyncio
import logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

BOUNDARY = b"--frame"
MAX_QUEUE_SIZE = 10
FRAME_TIMEOUT = 5.0


class StreamManager:
    def __init__(self) -> None:
        self._queues: dict[str, asyncio.Queue[bytes]] = {}
        self._latest: dict[str, bytes] = {}

    def _get_or_create_queue(self, stream_id: str) -> asyncio.Queue[bytes]:
        if stream_id not in self._queues:
            self._queues[stream_id] = asyncio.Queue(maxsize=MAX_QUEUE_SIZE)
        return self._queues[stream_id]

    def get_latest_frame(self, stream_id: str) -> bytes | None:
        return self._latest.get(stream_id)

    async def push_frame(self, stream_id: str, jpeg_bytes: bytes) -> None:
        self._latest[stream_id] = jpeg_bytes
        q = self._get_or_create_queue(stream_id)
        if q.full():
            try:
                q.get_nowait()
            except asyncio.QueueEmpty:
                pass
        await q.put(jpeg_bytes)

    async def generate_mjpeg(self, stream_id: str) -> AsyncGenerator[bytes, None]:
        q = self._get_or_create_queue(stream_id)
        while True:
            try:
                jpeg = await asyncio.wait_for(q.get(), timeout=FRAME_TIMEOUT)
            except asyncio.TimeoutError:
                yield BOUNDARY + b"\r\nContent-Type: image/jpeg\r\n\r\n" + b"\r\n"
                continue
            chunk = (
                BOUNDARY + b"\r\n"
                b"Content-Type: image/jpeg\r\n"
                b"Content-Length: " + str(len(jpeg)).encode() + b"\r\n"
                b"\r\n" + jpeg + b"\r\n"
            )
            yield chunk

    def remove_stream(self, stream_id: str) -> None:
        self._queues.pop(stream_id, None)


stream_manager = StreamManager()