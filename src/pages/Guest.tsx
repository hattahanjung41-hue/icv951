import { useCallback, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { PhotoPicker } from '../components/PhotoPicker';
import { compressPhoto } from '../lib/imageCompression';
import { createMemory } from '../lib/memories';
import { supabase, PHOTOS_BUCKET } from '../lib/supabase';
import type { PendingPhoto } from '../lib/types';

type Phase = 'form' | 'processing' | 'uploading' | 'success' | 'submit-error';

interface QueueItem {
  localId: string;
  originalFile: File;
  status: 'pending' | 'compressing' | 'ready' | 'uploading' | 'done' | 'error';
  compressedFile?: File;
  width?: number;
  height?: number;
  storagePath?: string;
  errorMessage?: string;
}

const CONCURRENCY = 3;

export function Guest() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [coverLocalId, setCoverLocalId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [statusText, setStatusText] = useState('');
  const queueRef = useRef<QueueItem[]>([]);

  const doneCount = queue.filter((q) => q.status === 'done').length;

  const handleAdd = useCallback((files: File[]) => {
    const newItems: PendingPhoto[] = files.map((file) => ({
      localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => {
      const merged = [...prev, ...newItems];
      if (!coverLocalId && merged.length) setCoverLocalId(merged[0].localId);
      return merged;
    });
  }, [coverLocalId]);

  function handleRemove(localId: string) {
    setPhotos((prev) => {
      const next = prev.filter((p) => p.localId !== localId);
      if (coverLocalId === localId) setCoverLocalId(next[0]?.localId ?? null);
      return next;
    });
  }

  async function runQueue(items: QueueItem[]) {
    queueRef.current = items;
    setQueue(items);

    // ---- Step 1: compress (client-side, sequential-ish with worker) ----
    setPhase('processing');
    setStatusText('Preparing your memories...');

    for (const item of queueRef.current) {
      if (item.status === 'done' || item.status === 'ready') continue;
      updateItem(item.localId, { status: 'compressing' });
      try {
        const { file, width, height } = await compressPhoto(item.originalFile);
        updateItem(item.localId, { status: 'ready', compressedFile: file, width, height });
      } catch {
        updateItem(item.localId, { status: 'error', errorMessage: 'Could not process photo' });
      }
    }

    // ---- Step 2: upload with limited concurrency ----
    setPhase('uploading');
    const memoryFolder = crypto.randomUUID();
    const toUpload = queueRef.current.filter((i) => i.status === 'ready');
    let cursor = 0;

    async function worker() {
      while (cursor < toUpload.length) {
        const myIndex = cursor++;
        const item = toUpload[myIndex];
        if (!item.compressedFile) continue;
        updateItem(item.localId, { status: 'uploading' });
        const ext = item.compressedFile.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${memoryFolder}/${item.localId}.${ext}`;
        const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, item.compressedFile, {
          contentType: item.compressedFile.type,
          upsert: false,
        });
        if (error) {
          updateItem(item.localId, { status: 'error', errorMessage: error.message });
        } else {
          updateItem(item.localId, { status: 'done', storagePath: path });
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, toUpload.length) }, worker));

    const finalItems = queueRef.current;
    const failed = finalItems.filter((i) => i.status === 'error');
    if (failed.length > 0) {
      setPhase('submit-error');
      return;
    }

    // ---- Step 3: create the memory record ----
    try {
      const coverPhoto = photos.find((p) => p.localId === coverLocalId) ?? photos[0];
      const orderedItems = finalItems.filter((i) => i.status === 'done');
      const coverIndex = Math.max(
        0,
        orderedItems.findIndex((i) => i.localId === coverPhoto?.localId)
      );
      const memoryId = await createMemory({
        guestName: name.trim() || null,
        message: message.trim() || null,
        coverIndex,
        photos: orderedItems.map((i, idx) => ({
          storagePath: i.storagePath!,
          width: i.width ?? 0,
          height: i.height ?? 0,
          sortOrder: idx,
        })),
      });
      void memoryId;
      setPhase('success');
    } catch {
      setPhase('submit-error');
    }
  }

  function updateItem(localId: string, patch: Partial<QueueItem>) {
    queueRef.current = queueRef.current.map((i) => (i.localId === localId ? { ...i, ...patch } : i));
    setQueue(queueRef.current);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (photos.length === 0) return;
    const items: QueueItem[] = photos.map((p) => ({
      localId: p.localId,
      originalFile: p.file,
      status: 'pending',
    }));
    runQueue(items);
  }

  function handleRetryFailed() {
    const retryItems = queueRef.current.map((i) =>
      i.status === 'error' ? { ...i, status: 'pending' as const, errorMessage: undefined } : i
    );
    runQueue(retryItems);
  }

  function resetForm() {
    setPhotos([]);
    setCoverLocalId(null);
    setName('');
    setMessage('');
    setPhase('form');
    setQueue([]);
  }

  if (phase === 'success') {
    return (
      <div className="guest-shell">
        <Header backTo="/" backLabel="Home" />
        <main className="container guest-success">
          <div className="paper-note guest-success__card">
            <img src="/assets/torn-paper.webp" alt="" aria-hidden="true" className="guest-success__paper" />
            <div className="guest-success__content">
              <span className="guest-success__stamp" aria-hidden="true">
                <StampIcon />
              </span>
              <p className="kicker guest-success__kicker">Terima kasih</p>
              <h1 className="guest-success__title eyebrow-script">Memory Saved</h1>
              <p className="guest-success__desc">
                Thank you for sharing your moment with us. See you on the Memory Wall.
              </p>
            </div>
          </div>
          <div className="guest-success__actions">
            <Link to="/memories" className="btn btn-primary btn-block">
              View Memory Wall
            </Link>
            <button onClick={resetForm} className="btn btn-secondary btn-block">
              + Add Another Memory
            </button>
          </div>
        </main>
        <style>{guestStyles}</style>
      </div>
    );
  }

  if (phase === 'processing' || phase === 'uploading' || phase === 'submit-error') {
    return (
      <div className="guest-shell">
        <Header backTo="/guest" backLabel="Back" />
        <main className="container guest-progress">
          <p className="kicker">{phase === 'submit-error' ? 'Almost there' : 'Sharing your moment'}</p>
          <h1 className="guest-progress__title">
            {phase === 'submit-error' ? "Some photos couldn't be uploaded" : statusText || 'Uploading your memory...'}
          </h1>
          <p className="guest-progress__sub">
            {phase === 'submit-error'
              ? 'Your memory is safe. You can retry just the failed photos.'
              : `${doneCount} / ${queue.length} photos uploaded`}
          </p>

          <div className="guest-progress__list">
            {queue.map((item, i) => (
              <div key={item.localId} className="guest-progress__row">
                <StatusDot status={item.status} />
                <span>Photo {i + 1}</span>
                <span className="guest-progress__status">
                  {item.status === 'done'
                    ? 'Uploaded'
                    : item.status === 'error'
                    ? 'Failed'
                    : item.status === 'uploading'
                    ? 'Uploading…'
                    : item.status === 'compressing'
                    ? 'Processing…'
                    : 'Waiting'}
                </span>
              </div>
            ))}
          </div>

          {phase === 'submit-error' && (
            <div className="guest-progress__actions">
              <button onClick={handleRetryFailed} className="btn btn-primary" style={{ flex: 1 }}>
                Retry Failed
              </button>
              <button onClick={resetForm} className="btn btn-ghost" style={{ flex: 1 }}>
                Back
              </button>
            </div>
          )}
        </main>
        <style>{guestStyles}</style>
      </div>
    );
  }

  return (
    <div className="guest-shell">
      <Header backTo="/" backLabel="Home" />
      <main className="container guest-form">
        <p className="kicker">Farewell Gala Dinner</p>
        <h1 className="guest-form__title eyebrow-script">Share Your Moment</h1>
        <p className="guest-form__desc">Capture and share the moments that made Farewell Gala Dinner special.</p>

        <form onSubmit={handleSubmit} className="guest-form__fields">
          <PhotoPicker
            photos={photos}
            coverLocalId={coverLocalId}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onSetCover={setCoverLocalId}
          />

          <label className="guest-field">
            Your Name <span className="guest-field__optional">(optional)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
              className="guest-input"
            />
          </label>

          <label className="guest-field">
            Message <span className="guest-field__optional">(optional)</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a message"
              maxLength={400}
              rows={3}
              className="guest-input guest-input--textarea"
            />
          </label>

          <button type="submit" className="btn btn-primary btn-block" disabled={photos.length === 0}>
            Save My Memory
          </button>
        </form>
      </main>
      <style>{guestStyles}</style>
    </div>
  );
}

function StatusDot({ status }: { status: QueueItem['status'] }) {
  const color =
    status === 'done'
      ? 'var(--green-600)'
      : status === 'error'
      ? 'var(--coral-500)'
      : status === 'uploading' || status === 'compressing'
      ? 'var(--sun-500)'
      : 'var(--line)';
  return <span aria-hidden="true" className="guest-progress__dot" style={{ background: color }} />;
}

function StampIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="2.4" aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const guestStyles = `
  .guest-shell { display: flex; flex-direction: column; min-height: 100dvh; }

  .guest-form { flex: 1; padding: 28px 20px 48px; max-width: var(--max-w-narrow); }
  .guest-form__title { margin-top: 6px; font-size: 1.9rem; color: var(--ocean-700); }
  .guest-form__desc { margin-top: 6px; color: var(--ink-700); font-size: 14.5px; }
  .guest-form__fields { margin-top: 24px; display: flex; flex-direction: column; gap: 20px; }

  .guest-field { display: flex; flex-direction: column; gap: 7px; font-size: 13.5px; font-weight: 700; color: var(--ink-900); text-align: left; }
  .guest-field__optional { font-weight: 400; color: var(--ink-500); }
  .guest-input { font-size: 15px; padding: 12px 14px; border-radius: var(--radius-sm); border: 1.5px solid var(--line); background: var(--white); font-weight: 400; color: var(--ink-900); font-family: inherit; }
  .guest-input--textarea { resize: vertical; }

  .guest-progress { flex: 1; padding: 32px 20px; max-width: 420px; }
  .guest-progress__title { margin-top: 6px; font-size: 1.4rem; }
  .guest-progress__sub { margin-top: 8px; color: var(--ink-500); font-size: 14px; }
  .guest-progress__list { margin-top: 22px; display: flex; flex-direction: column; gap: 10px; }
  .guest-progress__row { display: flex; align-items: center; gap: 10px; font-size: 13.5px; }
  .guest-progress__dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .guest-progress__status { margin-left: auto; color: var(--ink-500); }
  .guest-progress__actions { margin-top: 26px; display: flex; gap: 10px; }

  .guest-success { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 32px 20px 48px; max-width: var(--max-w-narrow); }
  .guest-success__card { position: relative; padding: 8px; }
  .guest-success__paper { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; filter: drop-shadow(0 12px 20px rgba(54,42,22,.14)); }
  .guest-success__content { position: relative; padding: 46px 30px 40px; text-align: center; }
  .guest-success__stamp {
    display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
    width: 60px; height: 60px; border-radius: 50%; background: var(--ocean-700); box-shadow: var(--shadow-soft);
  }
  .guest-success__kicker { justify-content: center; }
  .guest-success__title { margin-top: 8px; font-size: 2.1rem; color: var(--ocean-700); }
  .guest-success__desc { margin-top: 12px; color: var(--ink-700); font-size: 14.5px; line-height: 1.55; max-width: 300px; margin-left: auto; margin-right: auto; }
  .guest-success__actions { margin-top: 26px; display: flex; flex-direction: column; gap: 12px; }
`;
