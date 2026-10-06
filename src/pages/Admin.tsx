import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { AdminLogin } from './AdminLogin';
import { BrandMark } from '../components/BrandMark';
import { getSession, onAuthStateChange, signOutAdmin } from '../lib/adminAuth';
import {
  deleteMemory,
  deletePhoto,
  fetchAllMemoriesAdmin,
  photoUrlsOf,
  setMemoryHidden,
  subscribeToMemoryChanges,
} from '../lib/memories';
import { fetchLiveSettings, subscribeToLiveSettings, updateLiveSettings } from '../lib/liveSettings';
import type { LiveSettingsRow, MemoryPhotoRow, MemoryWithPhotos } from '../lib/types';

const DURATIONS = [5, 8, 10, 15];
const PAGE_SIZE = 12;

export function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    getSession().then(setSession);
    return onAuthStateChange(setSession);
  }, []);

  if (session === undefined) return null;
  if (!session) return <AdminLogin onSignedIn={() => getSession().then(setSession)} />;

  return <AdminDashboard onSignOut={() => signOutAdmin().then(() => setSession(null))} />;
}

function AdminDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [memories, setMemories] = useState<MemoryWithPhotos[]>([]);
  const [settings, setSettings] = useState<LiveSettingsRow | null>(null);
  const [previewMemoryId, setPreviewMemoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<
    { type: 'memory'; memory: MemoryWithPhotos } | { type: 'photo'; memory: MemoryWithPhotos; photoId: string } | null
  >(null);

  async function loadMemories() {
    const data = await fetchAllMemoriesAdmin();
    setMemories(data);
  }

  useEffect(() => {
    loadMemories();
    fetchLiveSettings().then(setSettings);
    const unsubMemories = subscribeToMemoryChanges(loadMemories);
    const unsubSettings = subscribeToLiveSettings((next) => {
      console.log('[admin] live_settings realtime update received', {
        current_memory_id: next.current_memory_id,
        current_photo_index: next.current_photo_index,
        nav_action: next.nav_action,
        nav_seq: next.nav_seq,
        is_paused: next.is_paused,
      });
      setSettings(next);
    });
    return () => {
      unsubMemories();
      unsubSettings();
    };
  }, []);

  const totalMemories = memories.length;
  const totalPhotos = memories.reduce((sum, m) => sum + m.photos.length, 0);
  const hiddenCount = memories.filter((m) => m.is_hidden).length;
  const previewMemory = memories.find((m) => m.id === previewMemoryId) ?? null;

  async function toggleHide(m: MemoryWithPhotos) {
    await setMemoryHidden(m.id, !m.is_hidden);
    loadMemories();
  }

  async function confirmAndDelete() {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'memory') {
      await deleteMemory(confirmDelete.memory);
    } else {
      const photo = confirmDelete.memory.photos.find((p) => p.id === confirmDelete.photoId);
      if (photo) await deletePhoto(photo);
    }
    setConfirmDelete(null);
    loadMemories();
  }

  async function patchSettings(patch: Partial<LiveSettingsRow>) {
    const previous = settings;
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    try {
      await updateLiveSettings(patch);
    } catch (err) {
      // Revert the optimistic change so Admin's UI never claims a state that
      // was never actually persisted, and surface the real Supabase error.
      setSettings(previous);
      console.error('Failed to update live_settings:', err);
    }
  }

  function nav(action: 'next' | 'prev') {
    const nextSeq = Number(settings?.nav_seq ?? 0) + 1;
    console.log('[admin] nav', { action, currentNavSeq: settings?.nav_seq, nextSeq });
    patchSettings({ nav_action: action, nav_seq: nextSeq });
  }

  /**
   * Show Now: a direct position update, not a navigation command — nav_action stays null so
   * /live can tell it apart from Next/Prev and simply adopts current_memory_id/current_photo_index.
   */
  function showNow(memory: MemoryWithPhotos, photo: MemoryPhotoRow & { url: string }) {
    const orderedUrls = photoUrlsOf(memory);
    const index = Math.max(0, orderedUrls.indexOf(photo.url));
    const nextSeq = Number(settings?.nav_seq ?? 0) + 1;
    console.log('[admin] showNow', { memoryId: memory.id, index, currentNavSeq: settings?.nav_seq, nextSeq });
    patchSettings({
      current_memory_id: memory.id,
      current_photo_index: index,
      nav_action: null,
      nav_seq: nextSeq,
    });
  }

  if (!settings) return null;

  const currentMemory = memories.find((m) => m.id === settings.current_memory_id) ?? null;
  const currentPhotos = currentMemory ? photoUrlsOf(currentMemory) : [];
  const currentPhotoUrl = currentPhotos.length
    ? currentPhotos[Math.min(settings.current_photo_index, currentPhotos.length - 1)]
    : null;
  const isLive = !settings.is_paused && Boolean(settings.current_memory_id);
  const statusKind = isLive ? 'live' : settings.is_paused ? 'frozen' : 'idle';
  const statusLabel = isLive ? '🟢 LIVE' : settings.is_paused ? '🧊 FROZEN' : '⚪ IDLE';

  const query = search.trim().toLowerCase();
  const filtered = query
    ? memories.filter(
        (m) => (m.guest_name ?? '').toLowerCase().includes(query) || (m.message ?? '').toLowerCase().includes(query)
      )
    : memories;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="admin">
      <header className="admin-topbar">
        <div className="container admin-topbar__row">
          <BrandMark compact />
          <div className="admin-topbar__actions">
            <Link to="/guest" className="btn btn-primary admin-btn-sm">
              Upload Memory
            </Link>
            <button onClick={onSignOut} className="btn btn-ghost admin-topbar__signout">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container admin-main">
        <div className="admin-stats">
          <div className="admin-stat">
            <span className="admin-stat__value">{totalMemories}</span>
            <span className="admin-stat__label">Memories</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat__value">{totalPhotos}</span>
            <span className="admin-stat__label">Photos</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat__value">{hiddenCount}</span>
            <span className="admin-stat__label">Hidden</span>
          </div>
        </div>

        <div className="admin-live-grid">
          <section className="admin-card">
            <h2 className="admin-card__title">Live Display</h2>
            <div className="admin-preview">
              {currentPhotoUrl ? (
                <div className="admin-preview__frame">
                  <img src={currentPhotoUrl} alt="" className="admin-preview__img" />
                </div>
              ) : (
                <div className="admin-preview__empty">No memory showing yet</div>
              )}
            </div>
          </section>

          <section className="admin-card">
            <h2 className="admin-card__title">Live Control</h2>
            <p className={`admin-status admin-status--${statusKind}`}>
              <span className="admin-status__dot" aria-hidden="true" />
              {statusLabel}
            </p>
            <p className="admin-showing">
              Showing: <strong>{currentMemory ? currentMemory.guest_name || 'Anonymous' : '—'}</strong>
            </p>

            <div className="admin-row admin-row--wrap">
              <button
                className="btn btn-primary admin-btn-sm"
                onClick={() => patchSettings({ is_paused: !settings.is_paused })}
              >
                {settings.is_paused ? '▶ Resume' : '🧊 Freeze'}
              </button>
            </div>
            <div className="admin-row admin-row--wrap">
              <button
                className="btn btn-secondary admin-btn-sm"
                disabled={!settings.current_memory_id}
                onClick={() => nav('prev')}
              >
                ← Prev
              </button>
              <button
                className="btn btn-secondary admin-btn-sm"
                disabled={!settings.current_memory_id}
                onClick={() => nav('next')}
              >
                Next →
              </button>
            </div>
          </section>
        </div>

        <section className="admin-card">
          <h2 className="admin-card__title">Playback Settings</h2>

          <div className="admin-field">
            <p className="admin-field__label">Display duration</p>
            <div className="admin-row">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => patchSettings({ display_duration_seconds: d })}
                  className={`admin-chip${settings.display_duration_seconds === d ? ' admin-chip--active' : ''}`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <div className="admin-toggles">
            <ToggleRow label="Shuffle" checked={settings.shuffle} onChange={(v) => patchSettings({ shuffle: v })} />
            <ToggleRow label="Auto loop" checked={settings.auto_loop} onChange={(v) => patchSettings({ auto_loop: v })} />
            <ToggleRow
              label="New memory interruption"
              checked={settings.interruption_enabled}
              onChange={(v) => patchSettings({ interruption_enabled: v })}
            />
          </div>
        </section>

        <section>
          <h2 className="admin-section-title">Memories</h2>

          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search guest name or message..."
            className="admin-search"
          />

          {pageItems.length === 0 ? (
            <p className="admin-empty">
              {filtered.length === 0 && memories.length > 0 ? 'No memories match your search.' : 'No memories yet.'}
            </p>
          ) : (
            <div className="admin-grid">
              {pageItems.map((m) => (
                <div key={m.id} className="admin-grid-card">
                  <div className="admin-grid-card__photo photo-frame">
                    <img src={m.coverUrl} alt="" loading="lazy" />
                    {m.photos.length > 1 && <span className="admin-grid-card__count">+{m.photos.length - 1}</span>}
                    {m.is_hidden && <span className="admin-badge--card">HIDDEN</span>}
                  </div>
                  <p className="admin-grid-card__name">{m.guest_name || 'Anonymous'}</p>
                  <p className="admin-grid-card__meta">
                    {m.photos.length} photo{m.photos.length !== 1 ? 's' : ''}
                  </p>
                  <button className="btn btn-secondary admin-btn-sm btn-block" onClick={() => setPreviewMemoryId(m.id)}>
                    Open Album
                  </button>
                </div>
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <div className="admin-pagination">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`admin-page-btn${p === safePage ? ' admin-page-btn--active' : ''}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {previewMemory && (
        <PreviewPanel
          memory={previewMemory}
          onClose={() => setPreviewMemoryId(null)}
          onDeletePhoto={(photoId) => setConfirmDelete({ type: 'photo', memory: previewMemory, photoId })}
          onToggleHide={() => toggleHide(previewMemory)}
          onDeleteMemory={() => setConfirmDelete({ type: 'memory', memory: previewMemory })}
          onShowNow={(photo) => showNow(previewMemory, photo)}
          liveMemoryId={settings.current_memory_id}
          livePhotoUrl={currentPhotoUrl}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={
            confirmDelete.type === 'memory'
              ? 'Delete this memory and all its photos permanently?'
              : 'Delete this photo permanently?'
          }
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmAndDelete}
        />
      )}

      <style>{adminStyles}</style>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="admin-toggle">
      {label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function PreviewPanel({
  memory,
  onClose,
  onDeletePhoto,
  onToggleHide,
  onDeleteMemory,
  onShowNow,
  liveMemoryId,
  livePhotoUrl,
}: {
  memory: MemoryWithPhotos;
  onClose: () => void;
  onDeletePhoto: (photoId: string) => void;
  onToggleHide: () => void;
  onDeleteMemory: () => void;
  onShowNow: (photo: MemoryPhotoRow & { url: string }) => void;
  liveMemoryId: string | null;
  livePhotoUrl: string | null;
}) {
  return (
    <div role="dialog" aria-modal="true" className="admin-sheet-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="admin-sheet">
        <div className="admin-sheet__header">
          <h3>Photos ({memory.photos.length})</h3>
          <div className="admin-sheet__header-actions">
            <button onClick={onToggleHide} className="btn btn-secondary admin-btn-sm">
              {memory.is_hidden ? 'Unhide' : 'Hide'}
            </button>
            <button onClick={onDeleteMemory} className="btn btn-danger admin-btn-sm">
              Delete
            </button>
            <button onClick={onClose} className="btn btn-ghost admin-btn-sm">
              Close
            </button>
          </div>
        </div>
        <div className="admin-sheet__grid">
          {memory.photos.map((p, i) => {
            const isLive = memory.id === liveMemoryId && p.url === livePhotoUrl;
            return (
              <div key={p.id} className={`admin-sheet__cell${isLive ? ' admin-sheet__cell--live' : ''}`}>
                <img src={p.url} alt="" />
                <span className="admin-sheet__index">{i + 1}</span>
                {isLive && <span className="admin-sheet__live-badge">LIVE</span>}
                <div className="admin-sheet__actions">
                  <button onClick={() => onShowNow(p)} className="admin-sheet__shownow">
                    Show Now
                  </button>
                  <button
                    onClick={() => onDeletePhoto(p.id)}
                    aria-label={`Delete photo ${i + 1}`}
                    className="admin-sheet__deletebtn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onCancel, onConfirm }: { message: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div role="alertdialog" aria-modal="true" className="admin-confirm-overlay">
      <div className="admin-confirm">
        <p className="admin-confirm__message">{message}</p>
        <div className="admin-row">
          <button onClick={onConfirm} className="btn btn-danger" style={{ flex: 1 }}>
            Delete
          </button>
          <button onClick={onCancel} className="btn btn-ghost" style={{ flex: 1 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const adminStyles = `
  .admin { min-height: 100dvh; background: var(--sand-50); }
  .admin-topbar { position: sticky; top: 0; z-index: 10; background: var(--white); border-bottom: 1px solid var(--line); }
  .admin-topbar__row { height: 56px; display: flex; align-items: center; justify-content: space-between; }
  .admin-topbar__actions { display: flex; align-items: center; gap: 8px; }
  .admin-topbar__signout { padding: 8px 14px; min-height: auto; }

  .admin-main { padding: 20px 16px 60px; display: flex; flex-direction: column; gap: 22px; }
  /* Admin is an operator dashboard, not the guest-facing editorial pages — give it a wider
     desktop container than the shared --max-w (1180px) instead of sitting in a narrow centered
     column. Scoped to .admin so no other page is affected. */
  .admin .container { max-width: min(1440px, 94vw); }

  .admin-stats { display: flex; gap: 10px; flex-wrap: wrap; }
  .admin-stat { flex: 1; min-width: 96px; background: var(--white); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 14px 12px; text-align: center; }
  .admin-stat__value { display: block; font-family: var(--font-display); font-size: 1.6rem; color: var(--ocean-800); }
  .admin-stat__label { display: block; margin-top: 2px; font-size: 11.5px; font-weight: 700; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.04em; }

  /* The live preview is intentionally portrait (it mirrors the portrait /live screen), so it
     gets a capped column width instead of splitting the row ~50/50 — otherwise a tall portrait
     image ends up dominating the dashboard and the whole page reads as portrait-shaped. Live
     Control gets the rest of the width to actually behave like a dashboard panel. */
  .admin-live-grid { display: grid; grid-template-columns: minmax(240px, 320px) 1fr; gap: 16px; align-items: start; }
  @media (max-width: 780px) { .admin-live-grid { grid-template-columns: 1fr; } }

  .admin-card { background: var(--white); border-radius: var(--radius-md); padding: 16px; border: 1px solid var(--line); }
  .admin-card__title { font-size: 1rem; }
  .admin-section-title { font-size: 1rem; margin-bottom: 10px; }

  .admin-preview { margin-top: 14px; }
  .admin-preview__frame { padding: 6px; background: var(--white); box-shadow: var(--shadow-photo); border-radius: var(--radius-photo); }
  .admin-preview__img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: 2px; display: block; background: var(--sand-200); }
  .admin-preview__empty {
    aspect-ratio: 4 / 5; display: flex; align-items: center; justify-content: center; text-align: center;
    background: var(--sand-100); border-radius: var(--radius-md); color: var(--ink-500); font-size: 13px; padding: 20px;
  }

  .admin-status { margin-top: 14px; display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; }
  .admin-status__dot { width: 10px; height: 10px; border-radius: 50%; background: var(--ink-500); flex-shrink: 0; }
  .admin-status--live .admin-status__dot { background: #2f9e44; }
  .admin-status--frozen .admin-status__dot { background: var(--sun-500); }
  .admin-status--idle .admin-status__dot { background: var(--ink-500); }
  .admin-showing { margin-top: 6px; font-size: 13.5px; color: var(--ink-700); }
  .admin-showing strong { color: var(--ink-900); }

  .admin-row { display: flex; gap: 8px; margin-top: 14px; }
  .admin-row--wrap { flex-wrap: wrap; }
  .admin-btn-sm { min-height: 36px; padding: 7px 13px; font-size: 13px; }

  .admin-field { margin-top: 18px; }
  .admin-field__label { font-size: 12px; font-weight: 700; color: var(--ink-500); margin-bottom: 8px; }
  .admin-chip {
    min-height: 34px; padding: 6px 13px; font-size: 13px; font-weight: 600; border-radius: var(--radius-pill);
    border: 1.5px solid var(--line); background: transparent; color: var(--ink-700); cursor: pointer;
  }
  .admin-chip--active { background: var(--ocean-700); border-color: var(--ocean-700); color: var(--white); }

  .admin-toggles { margin-top: 18px; display: flex; flex-direction: column; gap: 12px; }
  .admin-toggle { display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 600; }
  .admin-toggle input { width: 20px; height: 20px; accent-color: var(--ocean-700); }

  .admin-search {
    width: 100%; font-size: 14px; padding: 11px 14px; border-radius: var(--radius-pill); border: 1.5px solid var(--line);
    background: var(--white); margin-bottom: 14px; font-family: inherit; color: var(--ink-900);
  }

  .admin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
  .admin-grid-card { display: flex; flex-direction: column; gap: 6px; }
  .admin-grid-card__photo { position: relative; aspect-ratio: 1 / 1; }
  .admin-grid-card__photo img { width: 100%; height: 100%; object-fit: cover; border-radius: 2px; display: block; }
  .admin-grid-card__count {
    position: absolute; top: 6px; right: 6px; background: rgba(10, 34, 43, 0.6); color: var(--white);
    font-size: 11px; font-weight: 700; padding: 3px 7px; border-radius: var(--radius-pill);
  }
  .admin-badge--card {
    position: absolute; top: 6px; left: 6px; background: var(--coral-500); color: var(--white);
    font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 6px; letter-spacing: 0.03em;
  }
  .admin-grid-card__name { font-weight: 700; font-size: 13.5px; margin-top: 2px; }
  .admin-grid-card__meta { font-size: 12px; color: var(--ink-500); margin-top: -4px; }

  .admin-empty { text-align: center; padding: 30px 16px; color: var(--ink-500); font-size: 13.5px; }

  .admin-pagination { display: flex; justify-content: center; gap: 6px; margin-top: 18px; flex-wrap: wrap; }
  .admin-page-btn {
    min-width: 34px; min-height: 34px; border-radius: var(--radius-pill); border: 1.5px solid var(--line);
    background: var(--white); color: var(--ink-700); font-size: 13px; font-weight: 700; cursor: pointer;
  }
  .admin-page-btn--active { background: var(--ocean-700); border-color: var(--ocean-700); color: var(--white); }

  .admin-sheet-overlay { position: fixed; inset: 0; background: rgba(10, 22, 26, 0.82); z-index: 90; display: flex; align-items: flex-end; }
  .admin-sheet { background: var(--white); width: 100%; max-height: 80vh; overflow-y: auto; border-radius: 18px 18px 0 0; padding: 20px; }
  .admin-sheet__header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
  .admin-sheet__header-actions { display: flex; gap: 6px; align-items: center; }
  .admin-sheet__grid { margin-top: 14px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .admin-sheet__cell { position: relative; }
  .admin-sheet__cell img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: var(--radius-photo); display: block; }
  .admin-sheet__cell--live img { outline: 3px solid #2f9e44; outline-offset: -3px; }
  .admin-sheet__index { position: absolute; top: 4px; left: 4px; font-size: 10px; background: rgba(0,0,0,0.6); color: #fff; padding: 2px 6px; border-radius: 6px; }
  .admin-sheet__live-badge {
    position: absolute; top: 4px; right: 4px; background: #2f9e44; color: #fff; font-size: 9px; font-weight: 800;
    letter-spacing: 0.03em; padding: 2px 6px; border-radius: 6px;
  }
  .admin-sheet__actions { position: absolute; left: 4px; right: 4px; bottom: 4px; display: flex; gap: 4px; }
  .admin-sheet__shownow, .admin-sheet__deletebtn {
    flex: 1; border: none; border-radius: 6px; font-size: 9.5px; font-weight: 700; padding: 4px 2px; cursor: pointer;
  }
  .admin-sheet__shownow { background: var(--ocean-700); color: #fff; }
  .admin-sheet__deletebtn { background: var(--coral-500); color: #fff; }

  .admin-confirm-overlay { position: fixed; inset: 0; background: rgba(10, 22, 26, 0.6); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .admin-confirm { background: var(--white); border-radius: 16px; padding: 22px; max-width: 320px; width: 100%; }
  .admin-confirm__message { font-size: 15px; font-weight: 600; margin-bottom: 18px; }
`;
