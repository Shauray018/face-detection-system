"use client"
import VideoPlayer from "@/components/VideoPlayer";
import ROIPanel from "@/components/ROIPanel";
import CameraCapture from "@/components/CameraCapture";

export default function Home() {
  return (
    <main className="main">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-bracket">[</span>
            <span className="logo-text">FACE DETECT</span>
            <span className="logo-bracket">]</span>
          </div>
          <p className="header-sub">
            face_recognition · Pillow ROI · FastAPI · SQLite
          </p>
        </div>
      </header>

      <div className="layout">
        <section className="video-section">
          <VideoPlayer />
          <CameraCapture />
        </section>

        <aside className="side-panel">
          <ROIPanel />

          <div className="info-card">
            <div className="info-title">PIPELINE</div>
            <div className="info-row">
              <span className="info-key">Detection</span>
              <span className="info-val">HOG · face_recognition</span>
            </div>
            <div className="info-row">
              <span className="info-key">Drawing</span>
              <span className="info-val">Pillow (no OpenCV)</span>
            </div>
            <div className="info-row">
              <span className="info-key">Stream</span>
              <span className="info-val">MJPEG multipart</span>
            </div>
            <div className="info-row">
              <span className="info-key">Storage</span>
              <span className="info-val">SQLite · SQLAlchemy</span>
            </div>
            <div className="info-row">
              <span className="info-key">Ingest</span>
              <span className="info-val">POST /video/ingest</span>
            </div>
          </div>
        </aside>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          background: #06060d;
          color: #e8e8f0;
          font-family: 'Space Grotesk', sans-serif;
          min-height: 100vh;
        }

        .main { min-height: 100vh; display: flex; flex-direction: column; }

        .header {
          border-bottom: 1px solid rgba(0, 255, 120, 0.1);
          padding: 16px 32px;
          background: rgba(0, 255, 120, 0.02);
        }
        .header-inner { max-width: 1400px; margin: 0 auto; }
        .logo {
          display: inline-flex;
          gap: 4px;
          align-items: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 0.12em;
          margin-bottom: 2px;
        }
        .logo-bracket { color: rgba(0, 255, 120, 0.6); }
        .logo-text { color: #e8e8f0; }
        .header-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.05em;
        }

        .layout {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          padding: 24px 32px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          align-items: start;
        }

        .video-section { width: 100%; }

        .side-panel { display: flex; flex-direction: column; gap: 16px; }

        .info-card {
          background: #0d0d14;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 4px;
          overflow: hidden;
          font-family: 'JetBrains Mono', monospace;
        }
        .info-title {
          font-size: 10px;
          letter-spacing: 0.15em;
          color: rgba(255,255,255,0.3);
          padding: 10px 14px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 7px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          font-size: 11px;
        }
        .info-key { color: rgba(255,255,255,0.35); }
        .info-val { color: rgba(255,255,255,0.75); }

        @media (max-width: 900px) {
          .layout { grid-template-columns: 1fr; padding: 16px; }
          .header { padding: 12px 16px; }
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,255,120,0.2); border-radius: 2px; }
      `}</style>
    </main>
  );
}