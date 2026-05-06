"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchLatestROI, ROIRecord } from "../lib/api";

const BACKEND =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
const POLL_MS = 50; // ~20fps

export default function VideoPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(true);
  const [roi, setRoi] = useState<ROIRecord | null>(null);
  const [fps, setFps] = useState(0);
  const [hasFrame, setHasFrame] = useState(false);
  const frameCountRef = useRef(0);
  const lastFpsRef = useRef(Date.now());

  // Poll latest annotated frame and draw to canvas
  useEffect(() => {
    activeRef.current = true;
    async function pollFrames() {
      while (activeRef.current) {
        const t0 = Date.now();
        try {
          const res = await fetch(`${BACKEND}/video/latest-frame`, {
            cache: "no-store",
          });
          if (res.ok) {
            const blob = await res.blob();
            const bitmap = await createImageBitmap(blob);
            const canvas = canvasRef.current;
            if (canvas) {
              canvas.width = bitmap.width;
              canvas.height = bitmap.height;
              canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
              setHasFrame(true);
              frameCountRef.current++;
              const now = Date.now();
              const elapsed = (now - lastFpsRef.current) / 1000;
              if (elapsed >= 1) {
                setFps(Math.round(frameCountRef.current / elapsed));
                frameCountRef.current = 0;
                lastFpsRef.current = now;
              }
            }
          }
        } catch { /* backend not ready yet */ }
        const elapsed = Date.now() - t0;
        await new Promise(r => setTimeout(r, Math.max(0, POLL_MS - elapsed)));
      }
    }
    pollFrames();
    return () => { activeRef.current = false; };
  }, []);

  // Poll ROI data
  useEffect(() => {
    let active = true;
    async function poll() {
      while (active) {
        const latest = await fetchLatestROI();
        if (active) setRoi(latest);
        await new Promise(r => setTimeout(r, 300));
      }
    }
    poll();
    return () => { active = false; };
  }, []);

  return (
    <div className="video-wrapper">
      <div className="video-inner">
        <canvas ref={canvasRef} className="video-frame" />

        {!hasFrame && (
          <div className="waiting">
            <p>Waiting for frames…</p>
            <p className="waiting-sub">Start the camera below</p>
          </div>
        )}

        <div className="hud-tl"><span className="hud-badge">● LIVE</span></div>
        <div className="hud-tr"><span className="hud-badge">{fps} fps</span></div>

        {roi && (
          <div className="hud-bl">
            <div className="roi-tag">
              <span className="roi-label">ROI</span>
              <span className="roi-coords">
                ({roi.bbox.x1}, {roi.bbox.y1}) → ({roi.bbox.x2}, {roi.bbox.y2})
              </span>
              <span className="roi-size">{roi.bbox.width}×{roi.bbox.height}px</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .video-wrapper { width: 100%; position: relative; }
        .video-inner {
          position: relative; width: 100%; aspect-ratio: 16/9;
          background: #0a0a0f; border-radius: 4px; overflow: hidden;
          border: 1px solid rgba(0,255,120,0.15);
        }
        .video-frame { width: 100%; height: 100%; object-fit: contain; display: block; }
        .waiting {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono', monospace; font-size: 13px;
        }
        .waiting-sub { font-size: 11px; margin-top: 6px; color: rgba(255,255,255,0.15); }
        .hud-tl { position: absolute; top: 12px; left: 12px; }
        .hud-tr { position: absolute; top: 12px; right: 12px; }
        .hud-bl { position: absolute; bottom: 12px; left: 12px; }
        .hud-badge {
          background: rgba(0,0,0,0.6); border: 1px solid rgba(0,255,120,0.4);
          color: #00ff78; font-family: 'JetBrains Mono', monospace;
          font-size: 11px; padding: 3px 8px; border-radius: 2px; letter-spacing: 0.08em;
        }
        .roi-tag {
          background: rgba(0,0,0,0.7); border: 1px solid rgba(0,255,120,0.3);
          border-radius: 2px; padding: 6px 10px; display: flex; gap: 10px;
          align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 11px;
        }
        .roi-label { color: #00ff78; font-weight: 600; letter-spacing: 0.1em; }
        .roi-coords { color: rgba(255,255,255,0.8); }
        .roi-size { color: rgba(255,255,255,0.5); }
      `}</style>
    </div>
  );
}
