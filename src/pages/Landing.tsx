import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { AnimatedWaves } from '../components/AnimatedWaves';
import { AnimatedSun } from '../components/AnimatedSun';
import { AnimatedBirds } from '../components/AnimatedBirds';

export function Landing() {
  return (
    <div className="landing">
      <Header />

      <section className="landing-photo" aria-hidden="false">
        <img
          src="/assets/BG-landingpage.png"
          alt="Saoka Beach Resort — palm-framed sunset cove where ICV Akselerasi 951 takes place"
          className="landing-photo__img"
          fetchPriority="high"
        />
        <AnimatedSun className="landing-photo__sun" />
        <AnimatedBirds className="landing-photo__birds" />
        <div className="landing-photo__scrim" aria-hidden="true" />
      </section>

      <main className="landing-content">
        <p className="kicker">Selamat datang di</p>
        <h1 className="landing-title">ICV AKSELERASI 951</h1>
        <p className="landing-tagline eyebrow-script">Recharge &amp; Rise Together</p>
        <p className="landing-desc">
          Saatnya rehat sejenak, mengisi energi, dan melangkah lebih kuat untuk masa depan yang lebih baik.
        </p>

        <div className="landing-actions">
          <Link to="/guest" className="btn btn-primary btn-block">
            <span className="btn-icon">
              <CameraIcon />
            </span>
            Leave Your Memory
          </Link>
          <Link to="/memories" className="btn btn-secondary btn-block">
            <span className="btn-icon btn-icon-light">
              <GalleryIcon />
            </span>
            View Memories
          </Link>
        </div>

        <dl className="landing-facts">
          <EventFact icon="calendar" label="Date" value="12 Sept 2026" />
          <EventFact icon="clock" label="Time" value="07.00–14.00 WIT" />
          <EventFact icon="pin" label="Venue" value="Saoka Beach" />
          <EventFact icon="shirt" label="Dress Code" value="Tropical Vibes" />
        </dl>
      </main>

      <footer className="landing-footer">
        <AnimatedWaves className="landing-footer__wave" frontColor="var(--wave-deep)" />
        <div className="landing-footer__band">
          <img src="/assets/tropical-vibes-tag.webp" alt="Tropical Vibes Only" className="landing-footer__tag" />
          <p className="landing-footer__brand">Abadikan momen terbaikmu di ICV 951</p>
        </div>
      </footer>

      <style>{`
        .landing { display: flex; flex-direction: column; background: var(--sand-50); }

        /*
         * ---- Photo stage: the environment comes first, text follows below it ----
         * Deliberately short (compact editorial hero, not a full-screen poster) so the
         * headline, both CTAs and the event-facts row all land within the first mobile
         * viewport. The crop itself is untouched — see object-position below — this only
         * shrinks the WINDOW onto that same sky-to-sand scene.
         */
        .landing-photo {
          position: relative;
          height: 40vh;
          min-height: 260px;
          max-height: 400px;
          overflow: hidden;
        }
        /*
         * object-position keeps the sunset/horizon band (roughly the middle third of the
         * source art) in frame within the short hero band, while still showing a strip of
         * sand at the bottom instead of drifting toward "photo of the sky".
         */
        .landing-photo__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 42%; }
        .landing-photo__sun {
          position: absolute;
          top: 4px;
          right: 6vw;
          width: 92px;
          opacity: 0.9;
        }
        .landing-photo__birds {
          position: absolute;
          top: 14%;
          left: 8vw;
          width: 60vw;
          max-width: 420px;
          height: 60px;
          opacity: 0.85;
        }
        .landing-photo__scrim {
          position: absolute;
          inset: 0;
          /* Fades late and fast — the sand stays vivid; only the seam where the content
             panel overlaps (see .landing-content's negative margin) needs easing into it. */
          background: linear-gradient(180deg, rgba(251, 246, 234, 0) 78%, var(--sand-50) 98%);
          pointer-events: none;
        }

        /* ---- Content panel: sits on solid ground, not fighting a photo for contrast ---- */
        .landing-content {
          position: relative;
          margin-top: -3vh;
          padding: 0 24px;
          max-width: 440px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          text-align: center;
        }
        .landing-title {
          margin-top: 4px;
          font-size: clamp(1.7rem, 7vw, 2.5rem);
          color: var(--green-700);
        }
        .landing-tagline { margin-top: 4px; font-size: clamp(1.15rem, 4.6vw, 1.6rem); color: var(--ocean-700); }
        .landing-desc {
          margin: 10px auto 0;
          max-width: 340px;
          color: var(--ink-700);
          font-size: 14.5px;
          line-height: 1.5;
        }
        .landing-actions {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 320px;
          margin-left: auto;
          margin-right: auto;
        }
        .btn-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.22);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .btn-icon-light { background: var(--ocean-700); }

        .landing-facts {
          margin: 20px auto 0;
          padding: 14px 6px 0;
          max-width: 400px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          border-top: 1px solid var(--line);
        }
        .fact { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .fact-label {
          margin: 0; font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--ink-500);
        }
        .fact-value { margin: 2px 0 0; font-size: 11.5px; font-weight: 700; color: var(--ink-900); line-height: 1.25; }

        /* ---- Footer wave: same brand band used to close every mobile page ---- */
        .landing-footer { position: relative; margin-top: 28px; }
        .landing-footer__wave { width: 100%; height: auto; aspect-ratio: 1920 / 300; display: block; }
        .landing-footer__band {
          background: var(--wave-deep);
          margin-top: -2px;
          padding: 6px 24px 20px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
        }
        .landing-footer__tag { width: 72px; opacity: 0.95; }
        .landing-footer__brand {
          color: var(--white);
          font-weight: 700;
          font-size: 10.5px;
          letter-spacing: 0.02em;
          text-align: right;
          max-width: 170px;
        }

        @media (min-width: 860px) {
          .landing-content { max-width: 640px; }
          .landing-facts { max-width: 560px; }
        }
      `}</style>
    </div>
  );
}

function EventFact({ icon, label, value }: { icon: 'calendar' | 'clock' | 'pin' | 'shirt'; label: string; value: string }) {
  return (
    <div className="fact">
      <FactIcon kind={icon} />
      <dt className="fact-label">{label}</dt>
      <dd className="fact-value">{value}</dd>
    </div>
  );
}

function FactIcon({ kind }: { kind: 'calendar' | 'clock' | 'pin' | 'shirt' }) {
  const common = { width: 15, height: 15, stroke: 'var(--ocean-600)', strokeWidth: 1.8, fill: 'none' };
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
      <path d="M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2-2-2z" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
      <path d="M4 8h3l2-2h6l2 2h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13.5" r="3.3" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l5-5 4 4 3-3 4 4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
