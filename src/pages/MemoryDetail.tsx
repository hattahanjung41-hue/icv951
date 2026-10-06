import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { downloadFilename, downloadPhotoWithFrame, lowerThirdSrc } from '../lib/lowerThird';
import { fetchMemoryById } from '../lib/memories';
import type { MemoryWithPhotos } from '../lib/types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

export function MemoryDetail() {
  const { id } = useParams<{ id: string }>();
  const [memory, setMemory] = useState<MemoryWithPhotos | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let active = true;
    if (!id) return;
    setState('loading');
    fetchMemoryById(id)
      .then((m) => {
        if (!active) return;
        if (!m) {
          setState('not-found');
        } else {
          setMemory(m);
          setIndex(0);
          setState('ready');
        }
      })
      .catch(() => active && setState('error'));
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (state !== 'ready' || !memory) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, memory!.photos.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, memory]);

  if (state === 'loading') {
    return (
      <div className="detail-shell">
        <Header backTo="/memories" backLabel="Memory Wall" />
        <main className="container detail-loading">
          <div className="skeleton" style={{ height: '58vh', maxHeight: 520 }} />
        </main>
      </div>
    );
  }

  if (state === 'not-found' || state === 'error') {
    return (
      <div className="detail-shell">
        <Header backTo="/memories" backLabel="Memory Wall" />
        <main className="container detail-missing">
          <p className="kicker">Farewell Gala Dinner</p>
          <h1 className="detail-missing__title eyebrow-script">This memory isn&apos;t here anymore</h1>
          <p className="detail-missing__desc">
            {state === 'error'
              ? 'Connection seems unstable. Please try again in a moment.'
              : 'It may have been removed, or the link is off. Browse the wall to find more moments.'}
          </p>
          <Link to="/memories" className="btn btn-primary" style={{ marginTop: 22 }}>
            Back to Memory Wall
          </Link>
        </main>
      </div>
    );
  }

  const m = memory!;
  const photo = m.photos[index];
  const hasWords = Boolean(m.message || m.guest_name);

  return (
    <div className="detail-shell">
      <Header backTo="/memories" backLabel="Memory Wall" />
      <main className="container detail-main">
        <div className="detail-stage">
          <div className="photo-frame detail-stage__frame">
            {/* Shrink-wraps the photo so the lower-third sits on the photo itself, not the letterbox around it. */}
            <div className="detail-stage__photo">
              <img key={photo.id} src={photo.url} alt="" />
              <img src={lowerThirdSrc(photo)} alt="" aria-hidden="true" className="detail-stage__lowerthird" />
              <button
                type="button"
                className="detail-stage__download"
                aria-label={`Download photo ${index + 1}`}
                onClick={() => void downloadPhotoWithFrame(photo, downloadFilename(m, m.photos.length > 1 ? index + 1 : undefined))}
              >
                <DownloadIcon />
              </button>
            </div>
          </div>
          {index > 0 && (
            <button aria-label="Previous photo" className="detail-stage__nav detail-stage__nav--prev" onClick={() => setIndex((i) => i - 1)}>
              ‹
            </button>
          )}
          {index < m.photos.length - 1 && (
            <button aria-label="Next photo" className="detail-stage__nav detail-stage__nav--next" onClick={() => setIndex((i) => i + 1)}>
              ›
            </button>
          )}
          <span className="detail-stage__count">
            {index + 1} / {m.photos.length}
          </span>
        </div>

        {m.photos.length > 1 && (
          <div className="detail-filmstrip">
            {m.photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setIndex(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={`detail-filmstrip__cell${i === index ? ' detail-filmstrip__cell--active' : ''}`}
              >
                <img src={p.url} alt="" />
              </button>
            ))}
          </div>
        )}

        {hasWords && (
          <div className="paper-note detail-note">
            <img src="/assets/torn-paper.webp" alt="" aria-hidden="true" className="detail-note__paper" />
            <div className="detail-note__content">
              {m.message && <p className="detail-note__message eyebrow-script">&ldquo;{m.message}&rdquo;</p>}
              <p className="detail-note__meta">
                {m.guest_name && <span>— {m.guest_name} · </span>}
                {formatDateTime(m.created_at)}
              </p>
            </div>
          </div>
        )}
        {!hasWords && <p className="detail-timestamp">{formatDateTime(m.created_at)}</p>}
      </main>

      <style>{`
        .detail-shell { display: flex; flex-direction: column; min-height: 100dvh; }
        .detail-loading, .detail-main { flex: 1; padding: 20px 16px 48px; max-width: 640px; }
        .detail-missing { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 24px; }
        .detail-missing__title { margin-top: 8px; font-size: 1.7rem; color: var(--green-700); }
        .detail-missing__desc { margin-top: 10px; color: var(--ink-700); max-width: 320px; }

        .detail-stage { position: relative; }
        .detail-stage__frame { padding: 6px; display: flex; justify-content: center; background: #e9e3d6; }
        .detail-stage__photo { position: relative; display: inline-block; max-width: 100%; line-height: 0; }
        .detail-stage__photo img { display: block; max-width: 100%; max-height: 62vh; width: auto; height: auto; }
        /* Full photo width, pinned to the bottom — same as the download composite. Its transparent
           top simply overflows (clipped) on photos wider than the frame's own aspect ratio. */
        .detail-stage__photo { overflow: hidden; }
        .detail-stage__photo .detail-stage__lowerthird {
          position: absolute; left: 0; bottom: 0; width: 100%; height: auto; max-height: none;
          pointer-events: none;
        }
        .detail-stage__download {
          position: absolute; top: 10px; right: 10px; width: 34px; height: 34px; z-index: 2;
          display: flex; align-items: center; justify-content: center;
          background: rgba(10, 22, 26, 0.6); border: none; border-radius: 50%; cursor: pointer;
        }
        .detail-stage__nav {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 40px; height: 40px; border-radius: 50%; border: none;
          background: rgba(10, 22, 26, 0.55); color: var(--white); font-size: 22px; cursor: pointer; line-height: 0;
        }
        .detail-stage__nav--prev { left: 10px; }
        .detail-stage__nav--next { right: 10px; }
        .detail-stage__count {
          position: absolute; left: 14px; top: 14px; padding: 5px 10px; border-radius: var(--radius-pill);
          background: rgba(10, 22, 26, 0.6); color: var(--white); font-size: 11.5px; font-weight: 700;
        }

        .detail-filmstrip { margin-top: 10px; display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
        .detail-filmstrip__cell {
          flex-shrink: 0; width: 56px; height: 56px; padding: 0; border-radius: var(--radius-photo);
          overflow: hidden; border: 2px solid transparent; cursor: pointer; opacity: 0.6; background: none;
        }
        .detail-filmstrip__cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .detail-filmstrip__cell--active { border-color: var(--sun-400); opacity: 1; }

        .detail-note { position: relative; margin-top: 22px; padding: 8px; }
        .detail-note__paper { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; filter: drop-shadow(0 10px 18px rgba(54,42,22,.13)); }
        .detail-note__content { position: relative; padding: 30px 26px 26px; text-align: center; }
        .detail-note__message { font-size: 1.5rem; color: var(--ocean-700); line-height: 1.3; }
        .detail-note__meta { margin-top: 14px; font-size: 12.5px; color: var(--ink-500); font-weight: 600; }
        .detail-timestamp { margin-top: 16px; text-align: center; font-size: 12.5px; color: var(--ink-500); font-weight: 600; }
      `}</style>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" aria-hidden="true">
      <path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
