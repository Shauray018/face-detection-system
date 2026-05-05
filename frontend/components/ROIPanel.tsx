"use client";

import { useEffect, useState } from "react";
import { fetchROIData, ROIRecord } from "../lib/api";

export default function ROIPanel() {
  const [records, setRecords] = useState<ROIRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function poll() {
      while (active) {
        const data = await fetchROIData(10);
        if (active && data) {
          setRecords(data.records);
          setTotal(data.total);
          setLoading(false);
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    poll();
    return () => { active = false; };
  }, []);

  function fmtTime(iso: string) {
    try {
      return new Date(iso).toLocaleTimeString("en-US", { hour12: false });
    } catch {
      return iso;
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">ROI DETECTIONS</span>
        <span className="panel-count">{total.toLocaleString()} total</span>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : records.length === 0 ? (
        <div className="empty">No detections yet</div>
      ) : (
        <div className="record-list">
          {records.map((r, i) => (
            <div key={r.id} className={`record ${i === 0 ? "record-latest" : ""}`}>
              <div className="record-top">
                <span className="record-id">#{r.id}</span>
                <span className="record-time">{fmtTime(r.created_at)}</span>
              </div>
              <div className="record-bbox">
                <span className="bbox-label">AABB</span>
                <span className="bbox-val">
                  ({r.bbox.x1},{r.bbox.y1}) → ({r.bbox.x2},{r.bbox.y2})
                </span>
              </div>
              <div className="record-meta">
                <span className="meta-item">{r.bbox.width}×{r.bbox.height}px</span>
                <span className="meta-dot">·</span>
                <span className="meta-item">
                  cx:{Math.round(r.bbox.center_x)} cy:{Math.round(r.bbox.center_y)}
                </span>
                {r.frame_size.width && (
                  <>
                    <span className="meta-dot">·</span>
                    <span className="meta-item">
                      frame {r.frame_size.width}×{r.frame_size.height}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .panel {
          background: #0d0d14;
          border: 1px solid rgba(0, 255, 120, 0.12);
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          overflow: hidden;
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(0, 255, 120, 0.1);
          background: rgba(0, 255, 120, 0.04);
        }
        .panel-title {
          font-size: 10px;
          letter-spacing: 0.15em;
          color: #00ff78;
          font-weight: 600;
        }
        .panel-count {
          font-size: 10px;
          color: rgba(255,255,255,0.35);
        }
        .empty {
          padding: 24px;
          text-align: center;
          color: rgba(255,255,255,0.3);
          font-size: 12px;
        }
        .record-list { max-height: 400px; overflow-y: auto; }
        .record {
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background 0.15s;
        }
        .record:hover { background: rgba(255,255,255,0.02); }
        .record-latest { border-left: 2px solid #00ff78; }
        .record-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .record-id { font-size: 11px; color: rgba(255,255,255,0.5); }
        .record-time { font-size: 10px; color: rgba(255,255,255,0.3); }
        .record-bbox {
          display: flex;
          gap: 8px;
          align-items: baseline;
          margin-bottom: 3px;
        }
        .bbox-label {
          font-size: 9px;
          letter-spacing: 0.12em;
          color: #00ff78;
          opacity: 0.7;
        }
        .bbox-val { font-size: 12px; color: rgba(255,255,255,0.85); }
        .record-meta {
          display: flex;
          gap: 4px;
          font-size: 10px;
          color: rgba(255,255,255,0.3);
        }
        .meta-dot { color: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}