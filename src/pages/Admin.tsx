import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AdminLogin } from './AdminLogin';
import { BrandMark } from '../components/BrandMark';
import { getSession, onAuthStateChange, signOutAdmin } from '../lib/adminAuth';
import {
  deleteMemory,
  deletePhoto,
  fetchAllMemoriesAdmin,
  setMemoryHidden,
  subscribeToMemoryChanges,
} from '../lib/memories';
import { fetchLiveSettings, updateLiveSettings } from '../lib/liveSettings';
import type { LiveSettingsRow, MemoryWithPhotos } from '../lib/types';

const DURATIONS = [5, 8, 10, 15];

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
  const [previewMemory, setPreviewMemory] = useState<MemoryWithPhotos | null>(null);
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
    const unsub = subscribeToMemoryChanges(loadMemories);
    return unsub;
  }, []);

  const totalMemories = memories.length;
  const totalPhotos = memories.reduce((sum, m) => sum + m.photos.length, 0);
  const hiddenCount = memories.filter((m) => m.is_hidden).length;

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
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    await updateLiveSettings(patch);
  }

  if (!settings) return null;

  return (
    <div className="admin">
      <header className="admin-topbar">
        <div className="container admin-topbar__row">
          <BrandMark compact />
          <button onClick={onSignOut} className="btn btn-ghost admin-topbar__signout">
            Sign Out
          </button>
        </div>
      </header>

      <main className="container admin-main">
        <p className="admin-summary">
          <strong>{totalMemories}</strong> memories · <strong>{totalPhotos}</strong> photos ·{' '}
          <strong>{hiddenCount}</strong> hidden
        </p>

        <section className="admin-card">
          <h2 className="admin-card__title">Live Display Control</h2>

          <div className="admin-row admin-row--wrap">
            <button className="btn btn-primary admin-btn-sm" onClick={() => patchSettings({ is_paused: !settings.is_paused })}>
              {settings.is_paused ? 'Resume' : 'Pause'}
            </button>
            <button className="btn btn-secondary admin-btn-sm" onClick={() => patchSettings({ is_paused: false })}>
              Restart Loop
            </button>
          </div>

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
          <h2 className="admin-section-title">Moderation</h2>
          <div className="admin-list">
            {memories.map((m) => (
              <div key={m.id} className="admin-card admin-mod-row">
                <div className="admin-mod-row__top">
                  <img src={m.coverUrl} alt="" className="admin-mod-row__thumb" />
                  <div className="admin-mod-row__info">
                    <p className="admin-mod-row__title">
                      {m.photos.length} photo{m.photos.length !== 1 ? 's' : ''}
                      {m.is_hidden && <span className="admin-badge">HIDDEN</span>}
                    </p>
                    <p className="admin-mod-row__meta">
                      {m.guest_name || 'Anonymous'} · {new Date(m.created_at).toLocaleString('id-ID')}
                    </p>
                    {m.message && <p className="admin-mod-row__message">{m.message}</p>}
                  </div>
                </div>

                <div className="admin-row admin-row--wrap">
                  <button onClick={() => setPreviewMemory(m)} className="btn btn-ghost admin-btn-sm">
                    Preview
                  </button>
                  <button onClick={() => toggleHide(m)} className="btn btn-secondary admin-btn-sm">
                    {m.is_hidden ? 'Unhide' : 'Hide Memory'}
                  </button>
                  <button onClick={() => setConfirmDelete({ type: 'memory', memory: m })} className="btn btn-danger admin-btn-sm">
                    Delete Memory
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {previewMemory && (
        <PreviewPanel
          memory={previewMemory}
          onClose={() => setPreviewMemory(null)}
          onDeletePhoto={(photoId) => setConfirmDelete({ type: 'photo', memory: previewMemory, photoId })}
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
}: {
  memory: MemoryWithPhotos;
  onClose: () => void;
  onDeletePhoto: (photoId: string) => void;
}) {
  return (
    <div role="dialog" aria-modal="true" className="admin-sheet-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="admin-sheet">
        <div className="admin-sheet__header">
          <h3>Photos ({memory.photos.length})</h3>
          <button onClick={onClose} className="btn btn-ghost admin-btn-sm">
            Close
          </button>
        </div>
        <div className="admin-sheet__grid">
          {memory.photos.map((p, i) => (
            <div key={p.id} className="admin-sheet__cell">
              <img src={p.url} alt="" />
              <span className="admin-sheet__index">{i + 1}</span>
              <button onClick={() => onDeletePhoto(p.id)} aria-label={`Delete photo ${i + 1}`} className="admin-sheet__delete">
                Delete
              </button>
            </div>
          ))}
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
  .admin-topbar__signout { padding: 8px 14px; min-height: auto; }

  .admin-main { padding: 20px 16px 60px; display: flex; flex-direction: column; gap: 22px; }
  .admin-summary { font-size: 13.5px; color: var(--ink-700); }
  .admin-summary strong { color: var(--ocean-800); font-family: var(--font-display); }

  .admin-card { background: var(--white); border-radius: var(--radius-md); padding: 16px; border: 1px solid var(--line); }
  .admin-card__title { font-size: 1rem; }
  .admin-section-title { font-size: 1rem; margin-bottom: 10px; }

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

  .admin-list { display: flex; flex-direction: column; gap: 10px; }
  .admin-mod-row__top { display: flex; gap: 12px; }
  .admin-mod-row__thumb { width: 60px; height: 60px; border-radius: var(--radius-photo); object-fit: cover; flex-shrink: 0; background: var(--sand-200); }
  .admin-mod-row__info { flex: 1; min-width: 0; }
  .admin-mod-row__title { font-weight: 700; font-size: 14px; }
  .admin-badge { margin-left: 8px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.03em; color: var(--coral-500); }
  .admin-mod-row__meta { font-size: 12.5px; color: var(--ink-500); margin-top: 2px; }
  .admin-mod-row__message {
    font-size: 12.5px; color: var(--ink-700); margin-top: 4px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }

  .admin-sheet-overlay { position: fixed; inset: 0; background: rgba(10, 22, 26, 0.82); z-index: 90; display: flex; align-items: flex-end; }
  .admin-sheet { background: var(--white); width: 100%; max-height: 80vh; overflow-y: auto; border-radius: 18px 18px 0 0; padding: 20px; }
  .admin-sheet__header { display: flex; justify-content: space-between; align-items: center; }
  .admin-sheet__grid { margin-top: 14px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .admin-sheet__cell { position: relative; }
  .admin-sheet__cell img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: var(--radius-photo); display: block; }
  .admin-sheet__index { position: absolute; top: 4px; left: 4px; font-size: 10px; background: rgba(0,0,0,0.6); color: #fff; padding: 2px 6px; border-radius: 6px; }
  .admin-sheet__delete {
    position: absolute; bottom: 4px; right: 4px; background: var(--coral-500); color: #fff; border: none;
    border-radius: 6px; font-size: 10px; padding: 3px 6px; cursor: pointer;
  }

  .admin-confirm-overlay { position: fixed; inset: 0; background: rgba(10, 22, 26, 0.6); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .admin-confirm { background: var(--white); border-radius: 16px; padding: 22px; max-width: 320px; width: 100%; }
  .admin-confirm__message { font-size: 15px; font-weight: 600; margin-bottom: 18px; }
`;
