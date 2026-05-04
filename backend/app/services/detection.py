"""
Face detection and ROI annotation service.

Detection:  face_recognition library (dlib HOG model)
Drawing:    Pillow (PIL) — NO OpenCV used anywhere in this module

face_recognition.face_locations() returns:
    List of (top, right, bottom, left) tuples in CSS order.

We convert to AABB (x1, y1, x2, y2):
    x1 = left,  y1 = top
    x2 = right, y2 = bottom
"""

from __future__ import annotations

import io
import uuid
import logging
from dataclasses import dataclass
from typing import Optional

import face_recognition
import numpy as np
from PIL import Image, ImageDraw

logger = logging.getLogger(__name__)

# Visual style for the bounding box
BOX_COLOR = (0, 255, 120)       # bright green
BOX_WIDTH = 3                    # px
LABEL_BG = (0, 255, 120)
LABEL_FG = (0, 0, 0)
LABEL_FONT_SIZE = 14


@dataclass
class DetectionResult:
    frame_id: str
    detected: bool
    # AABB in pixel coords
    x1: int = 0
    y1: int = 0
    x2: int = 0
    y2: int = 0
    width: int = 0
    height: int = 0
    center_x: float = 0.0
    center_y: float = 0.0
    confidence: Optional[float] = None
    frame_width: int = 0
    frame_height: int = 0
    # Annotated frame as JPEG bytes
    annotated_jpeg: bytes = b""


def _pil_to_rgb_array(image: Image.Image) -> np.ndarray:
    """Convert PIL image → RGB numpy array for face_recognition."""
    return np.array(image.convert("RGB"))


def _draw_roi(image: Image.Image, x1: int, y1: int, x2: int, y2: int) -> Image.Image:
    """
    Draw an axis-aligned minimal bounding box on a PIL image.
    Uses only PIL — no OpenCV.
    Returns a new image (original is not mutated).
    """
    annotated = image.copy().convert("RGB")
    draw = ImageDraw.Draw(annotated)

    # ── Outer rectangle ──────────────────────────────────────────────────────
    draw.rectangle(
        [(x1, y1), (x2, y2)],
        outline=BOX_COLOR,
        width=BOX_WIDTH,
    )

    # ── Corner tick marks (small L-shapes at each corner) ────────────────────
    tick = 12
    corners = [
        # (start, end) pairs for the two tick lines at each corner
        ((x1, y1 + tick), (x1, y1), (x1 + tick, y1)),         # top-left
        ((x2 - tick, y1), (x2, y1), (x2, y1 + tick)),         # top-right
        ((x1, y2 - tick), (x1, y2), (x1 + tick, y2)),         # bottom-left
        ((x2 - tick, y2), (x2, y2), (x2, y2 - tick)),         # bottom-right
    ]
    for p1, vertex, p2 in corners:
        draw.line([p1, vertex, p2], fill=(255, 255, 255), width=BOX_WIDTH + 1)

    # ── Label ─────────────────────────────────────────────────────────────────
    label = "face"
    pad = 4
    label_w = len(label) * 8 + pad * 2
    label_h = LABEL_FONT_SIZE + pad * 2

    label_x0 = x1
    label_y0 = max(0, y1 - label_h - 2)
    label_x1 = label_x0 + label_w
    label_y1 = label_y0 + label_h

    draw.rectangle([(label_x0, label_y0), (label_x1, label_y1)], fill=LABEL_BG)
    draw.text(
        (label_x0 + pad, label_y0 + pad),
        label,
        fill=LABEL_FG,
    )

    return annotated


def detect_and_annotate(jpeg_bytes: bytes) -> DetectionResult:
    """
    Main entry point.

    1. Decode JPEG bytes → PIL Image
    2. Run face detection (face_recognition, no OpenCV)
    3. If a face is found: compute AABB, draw ROI with Pillow
    4. Return DetectionResult with annotated JPEG and AABB coords
    """
    frame_id = str(uuid.uuid4())

    try:
        image = Image.open(io.BytesIO(jpeg_bytes)).convert("RGB")
    except Exception as exc:
        logger.warning("Failed to decode frame: %s", exc)
        return DetectionResult(frame_id=frame_id, detected=False, annotated_jpeg=jpeg_bytes)

    frame_w, frame_h = image.size
    rgb_array = _pil_to_rgb_array(image)

    # face_recognition returns list of (top, right, bottom, left)
    # model="hog" is fast; use model="cnn" for GPU accuracy
    locations = face_recognition.face_locations(rgb_array, model="hog")

    if not locations:
        # No face found — return original frame unchanged
        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=85)
        return DetectionResult(
            frame_id=frame_id,
            detected=False,
            frame_width=frame_w,
            frame_height=frame_h,
            annotated_jpeg=buf.getvalue(),
        )

    # Only one face expected — take the first
    top, right, bottom, left = locations[0]

    # Axis-aligned minimal bounding box
    x1, y1 = left, top
    x2, y2 = right, bottom
    w = x2 - x1
    h = y2 - y1
    cx = x1 + w / 2
    cy = y1 + h / 2

    # Draw ROI using Pillow only
    annotated_image = _draw_roi(image, x1, y1, x2, y2)

    buf = io.BytesIO()
    annotated_image.save(buf, format="JPEG", quality=85)

    return DetectionResult(
        frame_id=frame_id,
        detected=True,
        x1=x1, y1=y1, x2=x2, y2=y2,
        width=w, height=h,
        center_x=cx, center_y=cy,
        confidence=None,           # face_recognition HOG doesn't expose a score
        frame_width=frame_w,
        frame_height=frame_h,
        annotated_jpeg=buf.getvalue(),
    )