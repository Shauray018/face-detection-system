// frontend/app/components/CameraCapture.tsx
"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
const INGEST_URL = `${API_BASE}/video/ingest`;

const TARGET_FPS = 15;

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "requesting" | "streaming" | "denied">("idle");
  const [fps, setFps] = useState(0);

  async function start() {
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("streaming");
      activeRef.current = true;
      sendFrames();
    } catch {
      setStatus("denied");
    }
  }

  function stop() {
    activeRef.current = false;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }

  async function sendFrames() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d")!;
    const interval = 1000 / TARGET_FPS;
    let sent = 0;
    const t0 = Date.now();

    while (activeRef.current) {
      const frameStart = Date.now();

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);               // draw current webcam frame to canvas

      // toBlob is async — convert canvas to JPEG without any library
      const blob: Blob | null = await new Promise(res =>
        canvas.toBlob(res, "image/jpeg", 0.85)
      );

      if (blob && activeRef.current) {
        const form = new FormData();
        form.append("frame", blob, "frame.jpg"); // same field name backend expects
        fetch(INGEST_URL, { method: "POST", body: form }).catch(() => {});
        sent++;
        setFps(Math.round(sent / ((Date.now() - t0) / 1000)));
      }

      // Pace to target FPS
      const elapsed = Date.now() - frameStart;
      if (elapsed < interval) {
        await new Promise(r => setTimeout(r, interval - elapsed));
      }
    }
  }

  useEffect(() => () => { activeRef.current = false; }, []);

  return (
    <div className="capture">
      {/* Hidden video element — webcam feed goes here, user never sees this */}
      <video ref={videoRef} muted playsInline style={{ display: "none" }} />
      {/* Hidden canvas — used only to extract JPEG frames */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="capture-controls">
        {status === "idle" && (
          <button className="btn-start" onClick={start}>Enable Camera</button>
        )}
        {status === "requesting" && (
          <span className="status-text">Waiting for camera permission…</span>
        )}
        {status === "streaming" && (
          <div className="streaming-row">
            <span className="dot-live">●</span>
            <span>Capturing · {fps} fps</span>
            <button className="btn-stop" onClick={stop}>Stop</button>
          </div>
        )}
        {status === "denied" && (
          <span className="status-error">Camera access denied. Check browser permissions.</span>
        )}
      </div>

      <style jsx>{`
        .capture { font-family: 'JetBrains Mono', monospace; }
        .capture-controls {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px;
          background: #0d0d14;
          border: 1px solid rgba(0,255,120,0.12);
          border-radius: 4px;
          font-size: 12px;
        }
        .btn-start {
          background: rgba(0,255,120,0.1); border: 1px solid rgba(0,255,120,0.4);
          color: #00ff78; padding: 6px 16px; border-radius: 3px; cursor: pointer;
          font-family: inherit; font-size: 11px; letter-spacing: 0.08em;
        }
        .btn-start:hover { background: rgba(0,255,120,0.2); }
        .btn-stop {
          background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.3);
          color: #ff5050; padding: 4px 12px; border-radius: 3px; cursor: pointer;
          font-family: inherit; font-size: 11px;
        }
        .dot-live { color: #00ff78; animation: pulse 1s infinite; }
        .status-text { color: rgba(255,255,255,0.4); }
        .status-error { color: #ff5050; }
        .streaming-row { display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.7); }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
