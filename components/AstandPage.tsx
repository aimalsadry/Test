import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Key, Car, Briefcase, Monitor, Building2, MapPin, ChevronRight } from 'lucide-react';

const GOLD = '#b99755';
const GOLD_BRIGHT = '#d4af6a';
const DARK = '#0a0a0f';

const services = [
  {
    rank: '01',
    icon: <Key size={18} strokeWidth={1.8} />,
    title: 'Licensing',
    sub: 'Permits, approvals & regulatory guidance',
    tier: 1,
  },
  {
    rank: '02',
    icon: <Car size={18} strokeWidth={1.8} />,
    title: 'Taxi Business',
    sub: 'Launch, licensing & operations support',
    tier: 1,
  },
  {
    rank: '03',
    icon: <Briefcase size={16} strokeWidth={1.8} />,
    title: 'Business Advisory',
    sub: 'Strategy, setup & growth consulting',
    tier: 2,
  },
  {
    rank: '04',
    icon: <Monitor size={16} strokeWidth={1.8} />,
    title: 'Software & Technology',
    sub: 'Website · Online Payments · CCTV Cameras',
    tier: 2,
  },
  {
    rank: '05',
    icon: <Building2 size={15} strokeWidth={1.8} />,
    title: 'Construction',
    sub: 'Permits, plans & project coordination',
    tier: 3,
  },
];

const AstandPage: React.FC = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'A-Stand Poster — Aimal.fi';
    fetch('/api/settings/profile-image')
      .then(r => r.json())
      .then(data => { if (data.image) setProfileImage(data.image); })
      .catch(() => {});
    return () => { document.title = 'Aimal.fi Advisory'; };
  }, []);

  const handlePrint = () => window.print();

  return (
    <div className="asp-wrap">
      <button onClick={handlePrint} className="asp-print-btn" data-testid="button-print-astand" aria-label="Print poster">
        <Printer size={14} />
        <span>Print / Save as PDF</span>
      </button>

      <div className="asp-poster" data-testid="astand-poster">
        <div className="asp-inner">

          <div className="asp-accent-top" />

          <div className="asp-header">
            <div className="asp-photo-wrap">
              <img
                src={profileImage || '/images/profile-photo.png'}
                alt="Aimal.fi"
                className="asp-photo"
                data-testid="img-astand-profile"
              />
              <div className="asp-photo-fade" />
            </div>
            <div className="asp-brand">
              <div className="asp-eyebrow">Helsinki Advisory</div>
              <h1 className="asp-brand-name">Aimal.fi</h1>
              <p className="asp-brand-sub">Your trusted partner for<br />business success in Finland</p>
            </div>
          </div>

          <div className="asp-rule" />

          <div className="asp-hook">
            <span className="asp-hook-headline">What's Holding<br />Your Business Back?</span>
            <span className="asp-hook-note">We solve it for you →</span>
          </div>

          <div className="asp-rule asp-rule--faint" />

          <div className="asp-services">
            {services.map((s) => (
              <div
                key={s.rank}
                className={`asp-svc ${s.tier === 1 ? 'asp-svc--top' : ''} ${s.tier === 3 ? 'asp-svc--minor' : ''}`}
                data-testid={`row-service-${s.rank}`}
              >
                <span className="asp-svc-rank">{s.rank}</span>
                <div className={`asp-svc-icon ${s.tier === 1 ? 'asp-svc-icon--gold' : ''}`}>{s.icon}</div>
                <div className="asp-svc-text">
                  <div className="asp-svc-title">{s.title}</div>
                  <div className="asp-svc-sub">{s.sub}</div>
                </div>
                {s.tier === 1 && <ChevronRight size={11} className="asp-svc-arrow" />}
              </div>
            ))}
          </div>

          <div className="asp-rule" />

          <div className="asp-qr-row">
            <div className="asp-qr-block">
              <div className="asp-qr-frame">
                <QRCodeSVG
                  value="https://aimal.fi"
                  size={88}
                  bgColor="#ffffff"
                  fgColor={DARK}
                  level="H"
                  style={{ display: 'block', borderRadius: '2px' }}
                />
                <div className="asp-qr-center">
                  <span className="asp-qr-word">Aimal</span>
                </div>
              </div>
              <div className="asp-qr-label">Scan to visit</div>
            </div>

            <div className="asp-footer">
              <div className="asp-url">www.aimal.fi</div>
              <div className="asp-location">
                <MapPin size={10} strokeWidth={1.5} style={{ flexShrink: 0, opacity: 0.6 }} />
                <span>Helsinki, Finland</span>
              </div>
            </div>
          </div>

          <div className="asp-accent-bot" />
        </div>
      </div>

      <style>{`
        /* ── Page wrapper ── */
        .asp-wrap {
          min-height: 100vh;
          background: #111;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 16px 56px;
          gap: 20px;
          font-family: inherit;
        }

        /* ── Print button ── */
        .asp-print-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 24px;
          background: ${GOLD};
          color: #080808;
          border: none;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.2s;
          box-shadow: 0 4px 18px rgba(185,151,85,0.35);
        }
        .asp-print-btn:hover { opacity: 0.85; }

        /* ── Poster shell ── */
        .asp-poster {
          width: 100%;
          max-width: 520px;
          aspect-ratio: 594 / 841;
          background: ${DARK};
          border-radius: 5px;
          overflow: hidden;
          box-shadow: 0 20px 70px rgba(0,0,0,0.85), 0 0 0 1px rgba(185,151,85,0.22);
          position: relative;
        }

        .asp-inner {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          padding: 3% 5.5%;
          box-sizing: border-box;
          background:
            radial-gradient(ellipse 90% 40% at 10% 0%, rgba(185,151,85,0.09) 0%, transparent 60%),
            radial-gradient(ellipse 60% 30% at 90% 100%, rgba(185,151,85,0.07) 0%, transparent 60%),
            ${DARK};
        }

        /* ── Accent bars ── */
        .asp-accent-top {
          width: 100%;
          height: 2.5px;
          background: linear-gradient(90deg, transparent, ${GOLD_BRIGHT}, transparent);
          border-radius: 2px;
          margin-bottom: 2.5%;
        }
        .asp-accent-bot {
          width: 100%;
          height: 2.5px;
          background: linear-gradient(90deg, transparent, ${GOLD_BRIGHT}, transparent);
          border-radius: 2px;
          margin-top: 2%;
          opacity: 0.75;
        }

        /* ── Dividers ── */
        .asp-rule {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, ${GOLD}, transparent);
          margin: 2% 0;
          opacity: 0.3;
        }
        .asp-rule--faint { opacity: 0.15; margin: 1.2% 0; }

        /* ── Header row ── */
        .asp-header {
          display: flex;
          align-items: center;
          gap: 5%;
          margin-bottom: 0;
        }

        .asp-photo-wrap {
          width: 26%;
          aspect-ratio: 3 / 4;
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid rgba(185,151,85,0.35);
          position: relative;
          box-shadow: 0 4px 22px rgba(0,0,0,0.6);
          flex-shrink: 0;
        }
        .asp-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
        }
        .asp-photo-fade {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 50%, rgba(10,10,15,0.55) 100%);
        }

        .asp-brand {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .asp-eyebrow {
          font-size: clamp(6px, 1.1vw, 8px);
          font-weight: 700;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: ${GOLD};
          opacity: 0.72;
        }
        .asp-brand-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(26px, 6.8vw, 52px);
          font-weight: 700;
          color: #fff;
          margin: 0;
          letter-spacing: 0.02em;
          line-height: 1;
        }
        .asp-brand-sub {
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(6.5px, 1.3vw, 9px);
          color: #7a7060;
          font-style: italic;
          line-height: 1.5;
          margin-top: 3px;
        }

        /* ── Hook ── */
        .asp-hook {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 4%;
          flex-wrap: wrap;
        }
        .asp-hook-headline {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(15px, 3.8vw, 28px);
          font-weight: 700;
          color: #fff;
          line-height: 1.18;
          letter-spacing: 0.01em;
        }
        .asp-hook-note {
          font-size: clamp(6.5px, 1.2vw, 9px);
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${GOLD};
          opacity: 0.65;
          white-space: nowrap;
        }

        /* ── Services ── */
        .asp-services {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .asp-svc {
          display: flex;
          align-items: center;
          gap: 2.5%;
          padding: 1.8% 2.5%;
          border-radius: 3px;
        }
        .asp-svc--top {
          background: rgba(185,151,85,0.08);
          border: 1px solid rgba(185,151,85,0.18);
          margin-bottom: 1.2%;
        }
        .asp-svc--minor { opacity: 0.65; }

        .asp-svc-rank {
          font-family: Georgia, serif;
          font-size: clamp(7px, 1.3vw, 10px);
          font-weight: 700;
          color: ${GOLD};
          opacity: 0.5;
          min-width: 1.8em;
          letter-spacing: 0.05em;
        }
        .asp-svc--top .asp-svc-rank { opacity: 0.9; font-size: clamp(8px, 1.5vw, 11px); }

        .asp-svc-icon {
          width: clamp(24px, 4.8vw, 34px);
          height: clamp(24px, 4.8vw, 34px);
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #5c5248;
          flex-shrink: 0;
        }
        .asp-svc-icon--gold {
          border-color: rgba(185,151,85,0.32);
          background: rgba(185,151,85,0.1);
          color: ${GOLD_BRIGHT};
        }

        .asp-svc-text { flex: 1; display: flex; flex-direction: column; gap: 1px; }

        .asp-svc-title {
          font-size: clamp(9px, 2vw, 14px);
          font-weight: 700;
          color: #d8cfc0;
          letter-spacing: 0.02em;
          line-height: 1.2;
        }
        .asp-svc--top .asp-svc-title {
          color: #fff;
          font-size: clamp(11px, 2.4vw, 17px);
        }
        .asp-svc--minor .asp-svc-title { font-size: clamp(8px, 1.7vw, 12px); color: #8a8070; }

        .asp-svc-sub {
          font-size: clamp(6px, 1.1vw, 8px);
          color: #4a443c;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          font-weight: 600;
          line-height: 1.3;
        }
        .asp-svc--top .asp-svc-sub { color: #6a5e4a; font-size: clamp(6.5px, 1.2vw, 9px); }

        .asp-svc-arrow { color: ${GOLD}; opacity: 0.45; flex-shrink: 0; }

        /* ── QR + footer row ── */
        .asp-qr-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4%;
        }

        .asp-qr-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }

        .asp-qr-frame {
          position: relative;
          padding: 5px;
          background: #fff;
          border-radius: 5px;
          box-shadow: 0 0 0 1px rgba(185,151,85,0.28), 0 4px 16px rgba(0,0,0,0.45);
          display: inline-block;
        }

        .asp-qr-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #fff;
          border-radius: 3px;
          padding: 2px 5px;
          box-shadow: 0 0 0 2px #fff;
        }
        .asp-qr-word {
          font-family: Georgia, serif;
          font-size: clamp(7px, 1.5vw, 11px);
          font-weight: 700;
          color: ${GOLD};
          white-space: nowrap;
          letter-spacing: 0.03em;
          line-height: 1;
        }

        .asp-qr-label {
          font-size: clamp(6px, 1.1vw, 8px);
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: ${GOLD};
          opacity: 0.55;
        }

        /* ── Footer ── */
        .asp-footer {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          gap: 5px;
        }

        .asp-url {
          font-family: Georgia, serif;
          font-size: clamp(14px, 3.4vw, 26px);
          font-weight: 700;
          color: ${GOLD_BRIGHT};
          letter-spacing: 0.06em;
          text-align: right;
        }

        .asp-location {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: clamp(6px, 1.1vw, 8px);
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #3e3830;
        }

        /* ── Print ── */
        @media print {
          @page { size: A1 portrait; margin: 0; }
          body * { visibility: hidden !important; }
          .asp-poster, .asp-poster * { visibility: visible !important; }
          .asp-print-btn { display: none !important; }
          .asp-wrap { background: transparent !important; padding: 0 !important; gap: 0 !important; }
          .asp-poster {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            aspect-ratio: unset !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AstandPage;
