import { useRef } from 'react';
import type { PendingPhoto } from '../lib/types';
import { ACCEPTED_IMAGE_TYPES } from '../lib/imageCompression';

const MAX_PHOTOS = 20;

export function PhotoPicker({
  photos,
  coverLocalId,
  onAdd,
  onRemove,
  onSetCover,
}: {
  photos: PendingPhoto[];
  coverLocalId: string | null;
  onAdd: (files: File[]) => void;
  onRemove: (localId: string) => void;
  onSetCover: (localId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = MAX_PHOTOS - photos.length;
  const atLimit = remaining <= 0;

  function handleFiles(fileList: FileList | null) {
    if (!fileList || !fileList.length) return;
    const files = Array.from(fileList).slice(0, remaining);
    onAdd(files);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="photo-picker">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        className="visually-hidden"
        id="photo-input"
        disabled={atLimit}
      />

      {photos.length === 0 ? (
        <label htmlFor="photo-input" className="photo-picker__empty">
          <span className="photo-picker__plus" aria-hidden="true">
            +
          </span>
          <span className="photo-picker__title">Add Photos</span>
          <span className="photo-picker__hint">Up to {MAX_PHOTOS} photos</span>
        </label>
      ) : (
        <>
          <div className="photo-picker__grid">
            {photos.map((p) => {
              const isCover = coverLocalId === p.localId;
              return (
                <div key={p.localId} className="photo-picker__cell">
                  <div className="photo-frame photo-picker__frame">
                    <img src={p.previewUrl} alt="" />
                  </div>
                  {isCover && <span className="photo-picker__cover-tag">Cover</span>}
                  <button onClick={() => onRemove(p.localId)} aria-label="Remove photo" className="photo-picker__remove">
                    ✕
                  </button>
                  {!isCover && (
                    <button
                      onClick={() => onSetCover(p.localId)}
                      aria-pressed={false}
                      className="photo-picker__set-cover"
                    >
                      Set as cover
                    </button>
                  )}
                </div>
              );
            })}

            {!atLimit && (
              <label htmlFor="photo-input" className="photo-picker__add-more" aria-label="Add more photos">
                +
              </label>
            )}
          </div>

          <p className={`photo-picker__count${atLimit ? ' photo-picker__count--limit' : ''}`}>
            {photos.length} / {MAX_PHOTOS} photos{atLimit ? ' · Maximum reached' : ''}
          </p>
        </>
      )}

      <style>{`
        .photo-picker__empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 40px 20px;
          border: 1.5px dashed var(--ocean-600);
          border-radius: var(--radius-md);
          background: var(--white);
          cursor: pointer;
          text-align: center;
        }
        .photo-picker__plus {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--ocean-700);
          color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 700;
        }
        .photo-picker__title { font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--ink-900); }
        .photo-picker__hint { font-size: 13px; color: var(--ink-500); }

        .photo-picker__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .photo-picker__cell { position: relative; aspect-ratio: 1 / 1; }
        .photo-picker__frame { width: 100%; height: 100%; padding: 3px; }

        .photo-picker__cover-tag {
          position: absolute;
          top: 6px;
          left: 6px;
          background: var(--sun-500);
          color: var(--ink-900);
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 3px 7px;
          border-radius: var(--radius-pill);
        }
        .photo-picker__remove {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: none;
          background: rgba(10, 22, 26, 0.62);
          color: var(--white);
          font-size: 11px;
          cursor: pointer;
          line-height: 0;
        }
        .photo-picker__set-cover {
          position: absolute;
          bottom: 5px;
          left: 5px;
          right: 5px;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 0;
          border-radius: var(--radius-sm);
          border: none;
          cursor: pointer;
          background: rgba(255, 253, 247, 0.9);
          color: var(--ink-900);
          opacity: 0;
          transition: opacity 120ms ease;
        }
        .photo-picker__cell:hover .photo-picker__set-cover,
        .photo-picker__cell:focus-within .photo-picker__set-cover { opacity: 1; }
        @media (hover: none) {
          .photo-picker__set-cover { opacity: 1; background: rgba(255, 253, 247, 0.86); }
        }

        .photo-picker__add-more {
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px dashed var(--ocean-600);
          border-radius: var(--radius-photo);
          cursor: pointer;
          color: var(--ocean-700);
          font-size: 24px;
          font-weight: 700;
        }

        .photo-picker__count { margin-top: 10px; font-size: 13px; font-weight: 600; color: var(--ink-500); }
        .photo-picker__count--limit { color: var(--coral-500); }
      `}</style>
    </div>
  );
}
