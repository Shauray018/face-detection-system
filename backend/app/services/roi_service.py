from __future__ import annotations

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.roi import ROIDetection
from app.services.detection import DetectionResult


async def save_roi(db: AsyncSession, result: DetectionResult) -> ROIDetection | None:
    """Persist a detection result to the database. Returns None if no face detected."""
    if not result.detected:
        return None

    record = ROIDetection(
        frame_id=result.frame_id,
        x1=result.x1,
        y1=result.y1,
        x2=result.x2,
        y2=result.y2,
        width=result.width,
        height=result.height,
        center_x=result.center_x,
        center_y=result.center_y,
        confidence=result.confidence,
        frame_width=result.frame_width,
        frame_height=result.frame_height,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def get_roi_list(
    db: AsyncSession,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    result = await db.execute(
        select(ROIDetection)
        .order_by(desc(ROIDetection.created_at))
        .limit(limit)
        .offset(offset)
    )
    rows = result.scalars().all()
    return [r.to_dict() for r in rows]


async def get_latest_roi(db: AsyncSession) -> dict | None:
    result = await db.execute(
        select(ROIDetection)
        .order_by(desc(ROIDetection.created_at))
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return row.to_dict() if row else None


async def get_roi_count(db: AsyncSession) -> int:
    from sqlalchemy import func, select
    result = await db.execute(select(func.count()).select_from(ROIDetection))
    return result.scalar_one()