from sqlalchemy import Column, Integer, String, Float, DateTime, func
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class ROIDetection(Base):
    """
    Stores the axis-aligned minimal bounding box (AABB) for each detected face.

    Coordinates are pixel values in the original frame's coordinate space:
      (x1, y1) = top-left corner
      (x2, y2) = bottom-right corner
    """

    __tablename__ = "roi_detections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    frame_id = Column(String, nullable=False, index=True)
    # AABB corners
    x1 = Column(Integer, nullable=False)
    y1 = Column(Integer, nullable=False)
    x2 = Column(Integer, nullable=False)
    y2 = Column(Integer, nullable=False)
    # Derived geometry (stored for query convenience)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    center_x = Column(Float, nullable=False)
    center_y = Column(Float, nullable=False)
    # Detection metadata
    confidence = Column(Float, nullable=True)
    frame_width = Column(Integer, nullable=True)
    frame_height = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "frame_id": self.frame_id,
            "bbox": {
                "x1": self.x1,
                "y1": self.y1,
                "x2": self.x2,
                "y2": self.y2,
                "width": self.width,
                "height": self.height,
                "center_x": self.center_x,
                "center_y": self.center_y,
            },
            "confidence": self.confidence,
            "frame_size": {
                "width": self.frame_width,
                "height": self.frame_height,
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }