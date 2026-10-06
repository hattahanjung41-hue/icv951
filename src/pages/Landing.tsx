import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isCurrentUserAdmin, onAuthStateChange } from '../lib/adminAuth';

const GOLD = '#caa23e';
const GOLD_LIGHT = '#f3dfa0';
const GOLD_DEEP = '#9a6a24';
/** The constellation art's own paper tone (sampled from its lower half), so the page continues it seamlessly. */
const PAPER = '#faf1e3';

/** True while a signed-in admin is on this device — /guest is admin-only, so guests never see its button. */
function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    const check = () => isCurrentUserAdmin().then((ok) => active && setIsAdmin(ok));
    check();
    const unsubscribe = onAuthStateChange(() => check());
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return isAdmin;
}

export function Landing() {
  const isAdmin = useIsAdmin();

  return (
    <div className="landing">
      <header className="landing-topbar">
        <div className="container landing-topbar__row">
          <p className="landing-topbar__brand">
            <SparkIcon size={14} />
            FAREWELL GALA DINNER
          </p>
          <span className="landing-topbar__badge">INTEGRITAS KUAT, DJP HEBAT</span>
        </div>
        <span className="landing-topbar__spark" aria-hidden="true">
          <SparkIcon size={18} />
        </span>
      </header>

      <main className="landing-hero">
        <div className="landing-hero__bg" role="presentation" />
        <div className="landing-hero__art" role="presentation" />

        <ArcOrnament />
        <p className="landing-kicker">Selamat datang di</p>
        <h1 className="landing-title">
          <span className="landing-title__top">Farewell</span>
          <span className="landing-title__main">Gala Dinner</span>
        </h1>
        <p className="landing-tagline">Starry Night Celebrating Excellence 951</p>
        <DiamondRule className="landing-rule landing-rule--short" />
        <p className="landing-desc">
          Don&rsquo;t cry because it&rsquo;s over, smile because it happened. New adventures are just around the corner.
        </p>

        <div className="landing-actions">
          <Link to="/memories" className="landing-cta">
            <span className="landing-cta__spark landing-cta__spark--left" aria-hidden="true">
              <SparkIcon size={16} />
            </span>
            <span className="landing-cta__icon">
              <GalleryIcon />
            </span>
            View Memories
            <ChevronIcon />
            <span className="landing-cta__spark landing-cta__spark--right" aria-hidden="true">
              <SparkIcon size={16} />
            </span>
          </Link>
          {isAdmin && (
            <Link to="/guest" className="landing-cta">
              <span className="landing-cta__spark landing-cta__spark--left" aria-hidden="true">
                <SparkIcon size={16} />
              </span>
              <span className="landing-cta__icon">
                <CameraIcon />
              </span>
              Upload Memory
              <ChevronIcon />
              <span className="landing-cta__spark landing-cta__spark--right" aria-hidden="true">
                <SparkIcon size={16} />
              </span>
            </Link>
          )}
        </div>

        <DiamondRule className="landing-rule" />
        <dl className="landing-facts">
          <EventFact icon="calendar" label="Date" value="6 Okt 2026" />
          <EventFact icon="clock" label="Time" value="17.00 WIT" />
          <EventFact icon="pin" label="Venue" value="Rylich Panorama Hotel" />
          <EventFact icon="bow" label="Dress Code" value="Black-Tie Glamour" />
        </dl>
      </main>

      <footer className="landing-footer">
        <img src="/assets/pola bawah 2.png" alt="" aria-hidden="true" className="landing-footer__art" />
        <p className="landing-footer__brand">Capture your best moments at Farewell Gala Dinner</p>
      </footer>

      <style>{`
        .landing {
          display: flex; flex-direction: column;
          min-height: 100vh; min-height: 100dvh;
          background: ${PAPER};
          overflow-x: hidden;
        }

        /* ---- Top bar: dark gala header, not the pale sticky header used elsewhere ----
           Brand + badge are both nowrap pills of fixed text, so on narrow phones (iPhone SE/mini
           width and below) their combined width can exceed the viewport. flex-wrap lets the badge
           drop to its own line instead of forcing the whole page to scroll horizontally, and the
           clamp()'d sizes keep both on one line on most phones before that fallback ever kicks in. */
        .landing-topbar { position: relative; z-index: 2; background: var(--wave-deep); border-bottom: 2px solid ${GOLD}; }
        .landing-topbar__row {
          min-height: 60px; padding: 10px 0; display: flex; align-items: center;
          justify-content: space-between; gap: 8px 12px; flex-wrap: wrap;
        }
        .landing-topbar__brand {
          display: flex; align-items: center; gap: 8px;
          font-family: 'Cinzel', serif; font-weight: 600; font-size: clamp(10px, 2.9vw, 13.5px); letter-spacing: 0.06em;
          color: ${GOLD_LIGHT}; white-space: nowrap;
        }
        .landing-topbar__badge {
          font-size: clamp(8px, 2.3vw, 9.5px); font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase;
          color: var(--wave-deep); background: linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD});
          padding: 6px 12px; border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.35); white-space: nowrap;
        }
        /* The four-point star pinned to the middle of the gold rule under the bar. */
        .landing-topbar__spark {
          position: absolute; left: 50%; bottom: 0; transform: translate(-50%, 50%);
          display: flex; filter: drop-shadow(0 0 4px rgba(243, 223, 160, 0.9));
        }

        /*
         * ---- Hero: the constellation art is a background layer pinned to the top at full width;
         * the text flows over its plain lower half. A spacer sized to the art's drawn portion keeps
         * the heading clear of the swan's wing at every width.
         */
        .landing-hero {
          position: relative;
          background: ${PAPER};
          padding: 0 20px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .landing-hero > :not(.landing-hero__bg) { position: relative; z-index: 1; }
        .landing-hero__bg {
          position: absolute; top: 0; left: 0; right: 0;
          aspect-ratio: 1109 / 1419;
          background: url('/assets/Golden Celestial Bird Constellation.png') top center / 100% auto no-repeat;
          /* Fade the art's bottom edge into the page so a hero taller than the art shows no seam. */
          -webkit-mask-image: linear-gradient(180deg, #000 86%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 86%, transparent 100%);
          pointer-events: none;
        }
        /* Height of the constellation + swan within the source image (~690 of its 1419px). */
        .landing-hero__art { width: 100%; aspect-ratio: 1109 / 640; }

        .landing-arc { display: block; width: min(200px, 52vw); height: auto; margin-bottom: 2px; }

        .landing-kicker {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          margin-top: 4px;
          font-size: clamp(11px, 3.1vw, 13px); font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase;
          color: var(--ink-700);
        }
        .landing-kicker::before, .landing-kicker::after { content: ''; width: 32px; height: 1px; background: ${GOLD_DEEP}; }

        .landing-title {
          margin-top: 6px;
          display: flex; flex-direction: column; align-items: center;
          font-family: 'Cinzel', serif; font-weight: 600; line-height: 1; text-transform: uppercase;
          background: linear-gradient(180deg, #d8ad5c 0%, ${GOLD_DEEP} 55%, #c58f3c 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .landing-title__top { font-size: clamp(1.9rem, 9.5vw, 3rem); letter-spacing: 0.02em; }
        .landing-title__main { margin-top: 4px; font-size: clamp(2.3rem, 12.4vw, 4rem); letter-spacing: 0.01em; }

        .landing-tagline {
          margin-top: 8px;
          font-family: 'Great Vibes', cursive; font-size: clamp(1.45rem, 6.6vw, 2.1rem); line-height: 1.15;
          color: ${GOLD_DEEP};
        }

        .landing-rule { display: block; width: 100%; max-width: 420px; height: 12px; margin-top: 18px; }
        .landing-rule--short { max-width: 260px; margin-top: 10px; }

        .landing-desc {
          margin: 10px auto 0;
          max-width: 340px;
          font-family: 'Cormorant Garamond', serif; font-weight: 500;
          color: var(--ink-700);
          font-size: clamp(1.02rem, 4.4vw, 1.2rem);
          line-height: 1.35;
        }

        /* One max-content column: stacked buttons all stretch to the widest one, so they match. */
        .landing-actions {
          margin-top: 22px; display: grid; grid-template-columns: max-content; justify-content: center; gap: 14px;
        }
        .landing-cta {
          position: relative;
          display: inline-flex; align-items: center; justify-content: center; gap: 14px;
          padding: 12px 26px 12px 14px; border-radius: 999px;
          background: linear-gradient(180deg, #4a0d16, var(--wave-deep));
          border: 2px solid ${GOLD};
          box-shadow: 0 0 0 1px rgba(243, 223, 160, 0.5) inset, 0 12px 28px rgba(46, 7, 13, 0.32);
          color: ${GOLD_LIGHT}; text-decoration: none;
          font-family: 'Cormorant Garamond', serif; font-weight: 700; font-size: 1.3rem;
        }
        .landing-cta__icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: rgba(202, 162, 62, 0.14); border: 1px solid rgba(202, 162, 62, 0.55);
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .landing-cta__spark { position: absolute; top: 50%; display: flex; }
        .landing-cta__spark--left { left: 0; transform: translate(-55%, -50%); }
        .landing-cta__spark--right { right: 0; transform: translate(55%, -50%); }

        .landing-facts {
          margin: 14px auto 0;
          max-width: 440px;
          width: 100%;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        .fact {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 0 4px;
        }
        .fact + .fact { border-left: 1px solid rgba(202, 162, 62, 0.45); }
        .fact-icon {
          width: 36px; height: 36px; margin-bottom: 4px; border-radius: 50%;
          border: 1.5px solid ${GOLD}; display: flex; align-items: center; justify-content: center;
        }
        .fact-label {
          margin: 0; font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--ink-500);
        }
        .fact-value {
          margin: 0;
          font-family: 'Cormorant Garamond', serif; font-weight: 700;
          font-size: clamp(0.88rem, 3.7vw, 1.05rem); color: var(--ink-900); line-height: 1.15;
        }

        /*
         * ---- Footer: the Art Deco frame (transparent PNG) with the brand line set inside its
         * maroon band. Its transparent top half overlaps the hero slightly so the corner fans rise
         * beside the facts, like the mockup, while margin-top: auto still pins it to the bottom.
         */
        .landing-footer {
          position: relative; margin-top: auto;
          width: 100%; max-width: 760px; align-self: center;
        }
        .landing-footer__art { display: block; width: 100%; height: auto; margin-top: -6%; pointer-events: none; }
        /* Inner maroon panel of the band sits at roughly 72%–93% of the image height, 22%–78% of its width. */
        .landing-footer__brand {
          position: absolute; top: 72%; bottom: 7%; left: 21%; right: 21%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Great Vibes', cursive; color: ${GOLD_LIGHT};
          font-size: clamp(11px, 3.2vw, 19px); line-height: 1.05; text-align: center;
        }

        @media (min-width: 860px) {
          .landing-hero { width: 100%; max-width: 640px; margin: 0 auto; }
          /* On wide screens the art is a centred column, so also feather its left/right edges. */
          .landing-hero__bg {
            -webkit-mask-image: linear-gradient(180deg, #000 86%, transparent 100%),
              linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%);
            -webkit-mask-composite: source-in;
            mask-image: linear-gradient(180deg, #000 86%, transparent 100%),
              linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%);
            mask-composite: intersect;
          }
          .landing-footer { max-width: 640px; }
        }
      `}</style>
    </div>
  );
}

type FactKind = 'calendar' | 'clock' | 'pin' | 'bow';

function EventFact({ icon, label, value }: { icon: FactKind; label: string; value: string }) {
  return (
    <div className="fact">
      <span className="fact-icon">
        <FactIcon kind={icon} />
      </span>
      <dt className="fact-label">{label}</dt>
      <dd className="fact-value">{value}</dd>
    </div>
  );
}

function FactIcon({ kind }: { kind: FactKind }) {
  const common = { width: 17, height: 17, stroke: GOLD_DEEP, strokeWidth: 1.6, fill: 'none' };
  if (kind === 'calendar') {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'clock') {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'pin') {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.4" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 10 4 6v8l8-4zm0 0 8-4v8l-8-4z" strokeLinejoin="round" />
      <path d="m11 11-3 9M13 11l3 9" strokeLinecap="round" />
    </svg>
  );
}

/** Thin gold arc with a star at its crown, sitting just above the kicker. */
function ArcOrnament() {
  return (
    <svg className="landing-arc" viewBox="0 0 200 30" fill="none" aria-hidden="true">
      <path d="M8 28 Q100 4 192 28" stroke={GOLD} strokeWidth="1.2" />
      <path d="M100 0c.8 6 2.6 8.6 7 10-4.4 1.4-6.2 4-7 10-.8-6-2.6-8.6-7-10 4.4-1.4 6.2-4 7-10z" fill={GOLD} />
    </svg>
  );
}

/** Hairline rule with a small diamond star in the middle. */
function DiamondRule({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 420 12" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path d="M0 6h196M224 6h196" stroke={GOLD} strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d="M210 0l3 6-3 6-3-6z M199 6l3-1.6v3.2z M221 6l-3-1.6v3.2z" fill={GOLD} />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={GOLD_LIGHT} strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l5-5 4 4 3-3 4 4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={GOLD_LIGHT} strokeWidth="1.8" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD_LIGHT} strokeWidth="2.2" aria-hidden="true">
      <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={GOLD} aria-hidden="true">
      <path d="M12 2c1 4 3 6 7 7-4 1-6 3-7 7-1-4-3-6-7-7 4-1 6-3 7-7z" />
    </svg>
  );
}
