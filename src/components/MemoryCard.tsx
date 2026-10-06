import { Link } from 'react-router-dom';
import { lowerThirdSrc } from '../lib/lowerThird';
import type { MemoryWithPhotos } from '../lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function findCover(memory: MemoryWithPhotos) {
  return memory.photos.find((p) => p.url === memory.coverUrl);
}

/** Clamp a photo's natural aspect ratio so the masonry stays lively without producing slivers. */
function coverAspectRatio(memory: MemoryWithPhotos): number {
  const cover = findCover(memory);
  if (!cover?.width || !cover?.height) return 4 / 5;
  const ratio = cover.width / cover.height;
  return Math.min(1.4, Math.max(0.62, ratio));
}

export function MemoryCard({ memory }: { memory: MemoryWithPhotos }) {
  const extraCount = memory.photos.length - 1;
  const aspect = coverAspectRatio(memory);
  const frameSrc = lowerThirdSrc(findCover(memory));

  return (
    <Link
      to={`/memories/${memory.id}`}
      aria-label={`Open memory${memory.guest_name ? ' from ' + memory.guest_name : ''}, ${memory.photos.length} photo${
        memory.photos.length > 1 ? 's' : ''
      }`}
      className="memory-card"
    >
      <div className="memory-card__frame photo-frame">
        <div className="memory-card__photo" style={{ aspectRatio: aspect }}>
          <img src={memory.coverUrl} alt="" loading="lazy" />
          <img src={frameSrc} alt="" aria-hidden="true" className="memory-card__lowerthird" />
          {extraCount > 0 && <span className="memory-card__count">+{extraCount}</span>}
        </div>
      </div>
      {(memory.message || memory.guest_name) && (
        <div className="memory-card__caption">
          {memory.message && <p className="memory-card__message">{memory.message}</p>}
          <div className="memory-card__meta">
            <span>{memory.guest_name ? `— ${memory.guest_name}` : ''}</span>
            <span>{formatDate(memory.created_at)}</span>
          </div>
        </div>
      )}
    </Link>
  );
}
