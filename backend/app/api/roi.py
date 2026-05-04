from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.roi_service import get_latest_roi, get_roi_count, get_roi_list

router = APIRouter(prefix="/roi", tags=["roi"])


@router.get("/data", summary="List stored ROI detections")
async def list_roi_data(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    items = await get_roi_list(db, limit=limit, offset=offset)
    total = await get_roi_count(db)
    return {
        "items": items,
        "limit": limit,
        "offset": offset,
        "count": len(items),
        "total": total,
    }


@router.get("/latest", summary="Fetch the latest ROI detection")
async def latest_roi_data(db: AsyncSession = Depends(get_db)):
    item = await get_latest_roi(db)
    return {"item": item}
