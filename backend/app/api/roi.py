"""
ROI endpoints:
  GET /roi/data    — paginated list of stored ROI detections
  GET /roi/latest  — most recent detection
  GET /roi/count   — total detection count
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.roi_service import get_roi_list, get_latest_roi, get_roi_count

router = APIRouter(prefix="/roi", tags=["roi"])


@router.get("/data", summary="Retrieve stored ROI detection records")
async def get_roi_data(
    limit: int = Query(default=50, ge=1, le=200, description="Max records to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns paginated ROI records ordered by most recent first.

    Each record contains:
    - frame_id: unique identifier for the source frame
    - bbox: AABB coordinates (x1, y1, x2, y2) plus width, height, center
    - confidence: detection confidence (null for HOG model)
    - frame_size: original frame dimensions
    - created_at: ISO 8601 timestamp
    """
    records = await get_roi_list(db, limit=limit, offset=offset)
    total = await get_roi_count(db)
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "records": records,
    }


@router.get("/latest", summary="Most recent ROI detection")
async def get_latest(db: AsyncSession = Depends(get_db)):
    record = await get_latest_roi(db)
    return {"record": record}


@router.get("/count", summary="Total number of stored detections")
async def count_detections(db: AsyncSession = Depends(get_db)):
    total = await get_roi_count(db)
    return {"total": total}