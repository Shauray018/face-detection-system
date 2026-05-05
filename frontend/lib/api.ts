// frontend/lib/api.ts
const API_BASE = "http://localhost:8000";

export const STREAM_URL = `${API_BASE}/video/stream`;
export const ROI_LATEST_URL = `${API_BASE}/roi/latest`;
export const ROI_DATA_URL = `${API_BASE}/roi/data`;

export interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
  center_x: number;
  center_y: number;
}

export interface ROIRecord {
  id: number;
  frame_id: string;
  bbox: BBox;
  confidence: number | null;
  frame_size: { width: number; height: number };
  created_at: string;
}

export interface ROIDataResponse {
  total: number;
  limit: number;
  offset: number;
  records: ROIRecord[];
}

export async function fetchLatestROI(): Promise<ROIRecord | null> {
  try {
    const res = await fetch(ROI_LATEST_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.record ?? null;
  } catch {
    return null;
  }
}

export async function fetchROIData(limit = 20, offset = 0): Promise<ROIDataResponse | null> {
  try {
    const res = await fetch(`${ROI_DATA_URL}?limit=${limit}&offset=${offset}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}