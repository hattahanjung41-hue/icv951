import { useEffect, useRef, useState } from 'react';
import { AnimatedBirds } from '../components/AnimatedBirds';
import { AnimatedSun } from '../components/AnimatedSun';
import { AnimatedWaves } from '../components/AnimatedWaves';
import { fetchVisibleMemories, photoUrlsOf, subscribeToMemoryChanges } from '../lib/memories';
import { fetchLiveSettings, pushLivePosition, subscribeToLiveSettings } from '../lib/liveSettings';
import type { LiveSettingsRow, MemoryWithPhotos } from '../lib/types';

const DEFAULT_DURATION = 8_000;

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jayapura',
  }).format(new Date(value));
}

function formatClock(value: string) {
  const formatted = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura', hourCycle: 'h23',
  }).format(new Date(value));
  return `${formatted.replace('.', ':')} WIT`;
}

/**
 * Silent, full-viewport presentation for the event screen — portrait-first, with a fully
 * independent landscape composition (not a rotated/squeezed copy of the portrait one).
 *
 * The composition is: one static background artwork (a plain sunset/palm-frame backdrop,
 * one dedicated asset per orientation — BG-livepotrait.png / BG-livelandscape.png) +
 * an animated decorative layer (sun/birds/palm/waves, all independently
 * positioned, native SVG/CSS animation) + a live content layer (guest photo, filmstrip,
 * name, message, timestamp) composited on top. Every dynamic piece is a percentage-
 * positioned overlay sized against the artwork's own aspect ratio via CSS container query
 * units (cqw/cqh), so it stays pixel-aligned with the art at any screen size. Orientation
 * is detected with `@media (orientation: …)` — both background images stay mounted and are
 * toggled with `display`, so rotating the display never re-fetches or flashes.
 */
export function Live() {
  const [memories, setMemories] = useState<MemoryWithPhotos[]>([]);
  const [settings, setSettings] = useState<LiveSettingsRow | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isNewMemory, setIsNewMemory] = useState(false);
  const [isLandscapePhoto, setIsLandscapePhoto] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const memoryRef = useRef<MemoryWithPhotos[]>([]);
  const settingsRef = useRef<LiveSettingsRow | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const photoIndexRef = useRef(0);
  const orderRef = useRef<string[]>([]);
  const indexRef = useRef(-1);
  const newQueueRef = useRef<string[]>([]);
  const knownIdsRef = useRef(new Set<string>());
  const isNewMemoryRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNavSeqRef = useRef<number | null>(null);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  /**
   * Fire-and-forget: reports playback position for the admin preview. Never blocks local
   * playback. Captures nav_seq at send time — if a newer Admin command (Next/Prev/Show Now)
   * lands before this resolves, the RPC's nav_seq guard makes it a no-op instead of an
   * out-of-order overwrite.
   */
  function pushPosition() {
    const id = currentIdRef.current;
    const idx = photoIndexRef.current;
    const expectedNavSeq = settingsRef.current?.nav_seq ?? 0;
    // eslint-disable-next-line no-console
    console.log('[live] pushPosition ->', { id, idx, expectedNavSeq });
    void pushLivePosition(id, idx, expectedNavSeq)
      .then(() => {
        // eslint-disable-next-line no-console
        console.log('[live] pushPosition resolved', { id, idx, expectedNavSeq });
      })
      .catch((err) => {
        console.error('[live] pushPosition failed', { id, idx, expectedNavSeq, err });
      });
  }

  function schedule() {
    clearTimer();
    if (settingsRef.current?.is_paused || !currentIdRef.current) {
      console.log('[live] schedule: not scheduling', {
        is_paused: settingsRef.current?.is_paused,
        currentId: currentIdRef.current,
      });
      return;
    }
    const seconds = settingsRef.current?.display_duration_seconds ?? DEFAULT_DURATION / 1000;
    console.log('[live] schedule: timer set', { currentId: currentIdRef.current, photoIndex: photoIndexRef.current, seconds });
    timerRef.current = setTimeout(() => {
      console.log('[live] timer fired -> advance()', { currentId: currentIdRef.current, photoIndex: photoIndexRef.current });
      advance();
    }, Math.max(1, seconds) * 1000);
  }

  /** Timer tick: step to the next photo within the current memory, or hand off to advanceMemory once its photos are exhausted. */
  function advance() {
    clearTimer();
    const currentMemory = memoryRef.current.find((memory) => memory.id === currentIdRef.current);
    const photoCount = currentMemory ? photoUrlsOf(currentMemory).length : 0;
    console.log('[live] advance() called', {
      before: { currentId: currentIdRef.current, photoIndex: photoIndexRef.current },
      photoCount,
    });
    if (photoCount > 1 && photoIndexRef.current + 1 < photoCount) {
      photoIndexRef.current += 1;
      setPhotoIndex(photoIndexRef.current);
      console.log('[live] advance(): stepped photo within memory', {
        currentId: currentIdRef.current,
        after: { photoIndex: photoIndexRef.current },
      });
      pushPosition();
      schedule();
      return;
    }
    console.log('[live] advance(): photos exhausted -> advanceMemory()');
    advanceMemory();
  }

  function advanceMemory() {
    console.log('[live] advanceMemory() called', { before: { currentId: currentIdRef.current } });
    clearTimer();
    const visibleIds = new Set(memoryRef.current.map((memory) => memory.id));
    newQueueRef.current = newQueueRef.current.filter((id) => visibleIds.has(id));
    const queuedId = newQueueRef.current.shift();
    if (queuedId) {
      currentIdRef.current = queuedId;
      setCurrentId(queuedId);
      photoIndexRef.current = 0;
      setPhotoIndex(0);
      isNewMemoryRef.current = true;
      setIsNewMemory(true);
      console.log('[live] advanceMemory(): interrupting with queued new memory', { after: { currentId: queuedId } });
      pushPosition();
      schedule();
      return;
    }
    const order = orderRef.current.filter((id) => visibleIds.has(id));
    orderRef.current = order;
    if (!order.length) {
      currentIdRef.current = null;
      setCurrentId(null);
      photoIndexRef.current = 0;
      setPhotoIndex(0);
      isNewMemoryRef.current = false;
      setIsNewMemory(false);
      console.log('[live] advanceMemory(): no visible memories left -> cleared');
      pushPosition();
      return;
    }
    indexRef.current = (indexRef.current + 1) % order.length;
    const nextId = order[indexRef.current];
    currentIdRef.current = nextId;
    setCurrentId(nextId);
    photoIndexRef.current = 0;
    setPhotoIndex(0);
    isNewMemoryRef.current = false;
    setIsNewMemory(false);
    console.log('[live] advanceMemory(): moved to next memory in order', { after: { currentId: nextId } });
    pushPosition();
    schedule();
  }

  /** Manual step back (admin Prev): previous photo in the current memory, or the last photo of the previous memory in play order. */
  function goBack() {
    console.log('[live] goBack() called', { before: { currentId: currentIdRef.current, photoIndex: photoIndexRef.current } });
    clearTimer();
    if (photoIndexRef.current > 0) {
      photoIndexRef.current -= 1;
      setPhotoIndex(photoIndexRef.current);
      console.log('[live] goBack(): stepped photo within memory', {
        currentId: currentIdRef.current,
        after: { photoIndex: photoIndexRef.current },
      });
      pushPosition();
      schedule();
      return;
    }
    goToPreviousMemory();
  }

  function goToPreviousMemory() {
    clearTimer();
    const visibleIds = new Set(memoryRef.current.map((memory) => memory.id));
    const order = orderRef.current.filter((id) => visibleIds.has(id));
    orderRef.current = order;
    if (!order.length) {
      currentIdRef.current = null;
      setCurrentId(null);
      photoIndexRef.current = 0;
      setPhotoIndex(0);
      pushPosition();
      return;
    }
    indexRef.current = (indexRef.current - 1 + order.length) % order.length;
    const prevId = order[indexRef.current];
    const prevMemory = memoryRef.current.find((memory) => memory.id === prevId);
    const lastPhotoIndex = prevMemory ? Math.max(0, photoUrlsOf(prevMemory).length - 1) : 0;
    currentIdRef.current = prevId;
    setCurrentId(prevId);
    photoIndexRef.current = lastPhotoIndex;
    setPhotoIndex(lastPhotoIndex);
    isNewMemoryRef.current = false;
    setIsNewMemory(false);
    console.log('[live] goToPreviousMemory(): moved to previous memory in order', {
      after: { currentId: prevId, photoIndex: lastPhotoIndex },
    });
    pushPosition();
    schedule();
  }

  /** Admin "Show Now": jump straight to an explicit memory + photo, not a relative step. */
  function jumpTo(memoryId: string | null, photoIndex: number) {
    console.log('[live] jumpTo() called', {
      target: { memoryId, photoIndex },
      before: { currentId: currentIdRef.current, photoIndex: photoIndexRef.current },
    });
    clearTimer();
    if (!memoryId) {
      console.log('[live] jumpTo(): no memoryId, ignoring');
      return;
    }
    const memory = memoryRef.current.find((m) => m.id === memoryId);
    if (!memory) {
      console.log('[live] jumpTo(): target memory not in local visible list, ignoring', {
        memoryId,
        visibleIds: memoryRef.current.map((m) => m.id),
      });
      return; // not currently visible (e.g. hidden) — nothing to jump to
    }
    const photoCount = photoUrlsOf(memory).length;
    const clampedIndex = Math.min(Math.max(0, photoIndex), Math.max(0, photoCount - 1));
    currentIdRef.current = memoryId;
    setCurrentId(memoryId);
    photoIndexRef.current = clampedIndex;
    setPhotoIndex(clampedIndex);
    const posInOrder = orderRef.current.indexOf(memoryId);
    if (posInOrder !== -1) indexRef.current = posInOrder;
    isNewMemoryRef.current = false;
    setIsNewMemory(false);
    console.log('[live] jumpTo(): after', { currentId: currentIdRef.current, photoIndex: photoIndexRef.current });
    pushPosition();
    schedule();
  }

  function installMemories(next: MemoryWithPhotos[], allowInterrupt = false) {
    const ids = next.map((memory) => memory.id);
    const priorNormal = orderRef.current[indexRef.current];
    orderRef.current = settingsRef.current?.shuffle ? shuffle(ids) : ids;
    indexRef.current = priorNormal && orderRef.current.includes(priorNormal)
      ? orderRef.current.indexOf(priorNormal)
      : Math.min(indexRef.current, orderRef.current.length - 1);
    const arrivals = allowInterrupt ? next.filter((memory) => !knownIdsRef.current.has(memory.id)) : [];
    next.forEach((memory) => knownIdsRef.current.add(memory.id));
    arrivals.forEach((memory) => {
      if (!newQueueRef.current.includes(memory.id) && memory.id !== currentIdRef.current) newQueueRef.current.push(memory.id);
    });
    memoryRef.current = next;
    setMemories(next);
    const currentStillVisible = currentIdRef.current && ids.includes(currentIdRef.current);
    console.log('[live] installMemories() called', {
      allowInterrupt,
      currentId: currentIdRef.current,
      currentStillVisible,
      arrivals: arrivals.map((m) => m.id),
      interruption_enabled: settingsRef.current?.interruption_enabled,
      isNewMemory: isNewMemoryRef.current,
    });
    if (!currentStillVisible) {
      console.log('[live] installMemories(): current memory no longer visible -> advanceMemory()');
      advanceMemory();
    } else if (arrivals.length && settingsRef.current?.interruption_enabled !== false && !isNewMemoryRef.current) {
      console.log('[live] installMemories(): new arrival interrupting -> advanceMemory()');
      advanceMemory();
    }
  }

  async function refresh(allowInterrupt = false) {
    try {
      const next = await fetchVisibleMemories();
      setOffline(false);
      console.log('[live] refresh(): memories/memory_photos changed, refetched', {
        allowInterrupt,
        count: next.length,
      });
      installMemories(next, allowInterrupt);
    } catch {
      // Retain loaded memories instead of blanking the event screen.
      setOffline(true);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [nextMemories, nextSettings] = await Promise.all([fetchVisibleMemories(), fetchLiveSettings()]);
        if (!active) return;
        settingsRef.current = nextSettings;
        lastNavSeqRef.current = nextSettings.nav_seq;
        setSettings(nextSettings);
        installMemories(nextMemories);
        setOffline(false);
      } catch {
        if (active) setOffline(true);
      }
    }
    load();
    const unsubscribeMemories = subscribeToMemoryChanges(() => void refresh(true));
    const unsubscribeSettings = subscribeToLiveSettings((next) => {
      const prev = settingsRef.current;
      settingsRef.current = next;
      setSettings(next);

      // Admin-forced Prev/Next: act once per new nav_seq, never on the value already
      // in place when this tab connected (that's just baseline, not a command to replay).
      const isNewNavCommand = lastNavSeqRef.current !== null && next.nav_seq !== lastNavSeqRef.current;
      // eslint-disable-next-line no-console
      console.log('[live] settings realtime update', {
        nav_action: next.nav_action,
        nav_seq: next.nav_seq,
        prevNavSeq: lastNavSeqRef.current,
        isNewNavCommand,
        current_memory_id: next.current_memory_id,
        current_photo_index: next.current_photo_index,
        is_paused: next.is_paused,
      });
      lastNavSeqRef.current = next.nav_seq;
      if (isNewNavCommand) {
        // 'next'/'prev' are relative navigation commands; anything else (nav_action is null)
        // is a Show Now direct position update — adopt current_memory_id/current_photo_index as-is.
        if (next.nav_action === 'next') advance();
        else if (next.nav_action === 'prev') goBack();
        else jumpTo(next.current_memory_id, next.current_photo_index);
      }

      // Pause/duration changes — diffed against the previous row so this ignores updates
      // that are only our own position echo (pushPosition writes the same row).
      if (!prev || prev.is_paused !== next.is_paused || prev.display_duration_seconds !== next.display_duration_seconds) {
        if (next.is_paused) clearTimer();
        else if (currentIdRef.current) schedule();
        else advanceMemory();
      }
    });
    const onOnline = () => void refresh(true);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      active = false;
      clearTimer();
      unsubscribeMemories();
      unsubscribeSettings();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
    // Refs intentionally keep this subscription stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Preload every photo in the current memory (so stepping through the submission is instant) plus the next memory's cover.
    const currentMemory = memories.find((memory) => memory.id === currentId);
    const nextId = orderRef.current[(indexRef.current + 1) % Math.max(orderRef.current.length, 1)];
    const nextCover = memories.find((memory) => memory.id === nextId)?.coverUrl;
    [...(currentMemory ? photoUrlsOf(currentMemory) : []), nextCover]
      .filter(Boolean).forEach((src) => { const image = new Image(); image.src = src as string; });
  }, [currentId, memories]);

  const current = memories.find((memory) => memory.id === currentId) ?? null;
  const allPhotoUrls = current ? photoUrlsOf(current) : [];
  const activePhotoIndex = allPhotoUrls.length ? Math.min(photoIndex, allPhotoUrls.length - 1) : 0;
  const activePhotoUrl = allPhotoUrls[activePhotoIndex] ?? current?.coverUrl ?? '';
  const visibleThumbnails = allPhotoUrls.slice(0, 6);
  const remainingThumbnails = Math.max(0, allPhotoUrls.length - visibleThumbnails.length);
  const hasWords = Boolean(current?.message || current?.guest_name);

  return (
    <main className="live-display" aria-label="Live event memory display">
      <div className="live-canvas">
        <img
          className="live-canvas__art live-canvas__art--landscape"
          src="/assets/BG-livelandscape.png"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
        />
        <img
          className="live-canvas__art live-canvas__art--portrait"
          src="/assets/BG-livepotrait.png"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
        />

        <img className="live-canvas__flamingo" src="/assets/flamingo.png" alt="" aria-hidden="true" />
        <img className="live-canvas__flower" src="/assets/red-flower.png" alt="" aria-hidden="true" />
        <img className="live-canvas__pineapple" src="/assets/pineapple.png" alt="" aria-hidden="true" />

        <AnimatedSun className="live-canvas__sun" />
        <AnimatedBirds className="live-canvas__birds" />
        <AnimatedWaves className="live-canvas__waves" />

        <div className="live-title">
          <p className="live-title__tagline">
            <span className="live-title__tagline-line1">Starry Night</span>
            <span className="live-title__tagline-line2">Celebrating Excellence 951</span>
          </p>
        </div>

        {current ? (
          <div className="live-photo-zone" key={`${current.id}-${activePhotoIndex}`}>
            <div className="live-photo-frame">
              <img
                className={`live-photo-frame__img${isLandscapePhoto ? ' is-landscape' : ''}`}
                src={activePhotoUrl}
                alt="Shared event memory"
                onLoad={(e) => setIsLandscapePhoto(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight)}
              />
            </div>
            {visibleThumbnails.length > 1 && (
              <div className="live-thumbs" aria-label="Other photos in this memory">
                {visibleThumbnails.map((url, index) => (
                  <img key={url + index} src={url} alt="" className={index === activePhotoIndex ? 'is-active' : undefined} />
                ))}
                {remainingThumbnails > 0 && (
                  <span className="live-thumbs__more"><strong>+{remainingThumbnails}</strong>foto lainnya</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="live-photo-zone live-photo-zone--empty">
            <p className="live-empty__eyebrow">Menunggu momen pertama</p>
            <p className="live-empty__copy">Bagikan foto &amp; ceritamu untuk tampil di layar ini.</p>
          </div>
        )}

        {current && (
          <div className={`live-quote-zone${hasWords ? '' : ' live-quote-zone--quiet'}`} key={`quote-${current.id}`}>
            <img src="/assets/torn-paper.webp" alt="" aria-hidden="true" className="live-quote-zone__paper" />
            <div className="live-quote-zone__content">
              {isNewMemory && <p className="live-quote__new">New memory</p>}
              {current.message && (
                <p className={`live-quote__message${current.message.length > 90 ? ' is-long' : ''}`}>
                  <span className="live-quote__mark" aria-hidden="true">&ldquo;</span>
                  {current.message}
                  <span className="live-quote__mark live-quote__mark--close" aria-hidden="true">&rdquo;</span>
                </p>
              )}
              <div className="live-quote__meta">
                {current.guest_name && <p className="live-quote__name">— {current.guest_name}</p>}
                <p className="live-quote__date">{formatDate(current.created_at)}</p>
                <p className="live-quote__clock">{formatClock(current.created_at)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <span className="live-brand">
        <img src="/assets/tropical-vibes-tag.webp" alt="" aria-hidden="true" className="live-brand__tag" />
        <span className="live-brand__label">Farewell Gala Dinner</span>
      </span>
      {offline && <span className="live-status">Reconnecting</span>}

      <style>{`
        .live-display{position:fixed;inset:0;overflow:hidden;background:#f4ecd6;color:var(--ink-900)}

        /*
         * ---- Canvas: sized to the LANDSCAPE background's ratio by default (954.5 / 611.3),
         * the portrait ratio (611.3 / 954.5) takes over under the portrait media query below.
         * Always at least viewport-covering on both axes (like background-size:cover), so the
         * art never gutters, stretches, or distorts — only the overflow is cropped.
         */
        .live-canvas{position:absolute;inset:0;margin:auto;width:max(100vw,calc(100vh * 954.5 / 611.3));height:max(100vh,calc(100vw * 611.3 / 954.5));overflow:visible;container-type:size;container-name:stage}
        .live-canvas__art{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;user-select:none}
        .live-canvas__art--portrait{display:none}
        @media (orientation: portrait){
          .live-canvas__art--landscape{display:none}
          .live-canvas__art--portrait{display:block}
        }

        /* ==================================================
           LANDSCAPE composition (default) — 954.5 x 611.3
           ================================================== */

        /* ---- Animated decorative layer: sky + shoreline, all above the art, below the live content ---- */
        .live-canvas__sun{position:absolute;left:68cqw;top:5cqh;width:12cqh;aspect-ratio:1/1;opacity:.92;pointer-events:none}
        .live-canvas__birds{position:absolute;left:20cqw;top:11cqh;width:48cqw;height:8cqh;pointer-events:none;overflow:visible}
        .live-canvas__waves{position:fixed;left:0;right:0;bottom:0;width:100vw;height:calc(100vw * 300 / 1920);min-height:90px;pointer-events:none}
        .live-canvas__flamingo,.live-canvas__flower,.live-canvas__pineapple{display:none}

        /* ---- Live content layer: guest photo + frame + filmstrip ---- */
        .live-photo-zone{position:absolute;left:15cqw;top:15cqh;width:46cqw;height:62cqh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.4cqh;animation:live-arrive .7s cubic-bezier(.2,.7,.2,1) both}
        .live-photo-frame{position:relative;display:inline-flex;padding:1cqw;background:#fffdf8;box-shadow:0 2cqh 4.4cqh rgba(45,30,20,.24)}
        .live-photo-frame__img{display:block;max-width:40cqw;max-height:42cqh;width:auto;height:auto;background:#e9e3d6}
        .live-thumbs{display:flex;justify-content:center;gap:1cqw;max-width:58cqw;height:10cqh}
        .live-thumbs img{height:100%;aspect-ratio:1/1;width:auto;border:.32cqw solid #fffdf8;object-fit:cover;box-shadow:0 1cqh 2.2cqh rgba(45,30,20,.18)}
        .live-thumbs img.is-active{outline:.16cqw solid var(--ocean-600);outline-offset:1px}
        .live-thumbs__more{height:100%;aspect-ratio:1/1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:.32cqw solid #fffdf8;background:#efe6d2;box-shadow:0 1cqh 2.2cqh rgba(45,30,20,.18);color:var(--ocean-800);font-size:clamp(7px,.68cqw,10px);font-weight:700;text-align:center}
        .live-thumbs__more strong{font-size:clamp(11px,1.15cqw,17px);font-weight:800}

        .live-photo-zone--empty{color:var(--ocean-700);text-align:center;gap:1.4cqh}
        .live-empty__eyebrow{font-weight:800;font-size:clamp(11px,1.7cqw,21px);letter-spacing:.05em}
        .live-empty__copy{color:var(--ink-700);font-weight:600;font-size:clamp(9px,1.05cqw,15px);max-width:60cqw}

        /* ---- Live content layer: message/name/timestamp, on its own paper-note card
           (the backgrounds are plain atmosphere now — no baked-in quote-paper to sit on) ---- */
        .live-quote-zone{position:absolute;left:63cqw;top:26cqh;width:30cqw;height:42cqh;display:flex;flex-direction:column;justify-content:center;text-align:center;animation:live-arrive .7s .08s cubic-bezier(.2,.7,.2,1) both}
        .live-quote-zone--quiet{align-items:center;text-align:center}
        .live-quote-zone__paper{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;filter:drop-shadow(0 1.4cqh 2.6cqh rgba(58,42,22,.2))}
        .live-quote-zone__content{position:relative;padding:8% 9%}
        .live-quote__new{margin-bottom:1cqh;color:var(--ocean-700);font-size:clamp(8px,1cqw,13px);font-weight:800;letter-spacing:.14em;text-transform:uppercase}
        .live-quote__message{font-family:var(--font-brush);font-weight:400;color:var(--coral-500);font-size:clamp(17px,3cqw,26px);line-height:1.22;text-align:center}
        .live-quote__message.is-long{font-size:clamp(14px,2.2cqw,20px)}
        .live-quote__mark{font-size:1.55em;line-height:0;vertical-align:-.32em;opacity:.8}
        .live-quote__mark--close{vertical-align:-.62em}
        .live-quote__meta{margin-top:1.6cqh;margin-left:auto;width:fit-content;max-width:100%;text-align:right}
        .live-quote__name{margin:0;font-size:clamp(13px,1.9cqw,18px);font-weight:600;color:var(--ink-700)}
        .live-quote__date{margin-top:.5cqh;font-size:clamp(11px,1.55cqw,15px);color:var(--ink-700);font-weight:500;letter-spacing:.01em}
        .live-quote__clock{margin-top:.25cqh;font-size:clamp(10px,1.4cqw,13px);color:var(--ink-700);font-weight:400;letter-spacing:.01em}

        .live-status{position:absolute;right:2.2vw;bottom:1.8vh;z-index:40;color:var(--ocean-700);font-size:12px;font-weight:700;letter-spacing:.05em;background:rgba(255,253,248,.85);padding:.35em .8em;border-radius:20px}

        /* ---- Brand mark — logo tag + event name, top-left, never competes with the photo ---- */
        .live-brand{position:fixed;left:2.2vw;bottom:1.8vh;z-index:40;display:inline-flex;align-items:center;gap:2px}
        .live-brand__tag{height:64px;width:auto;display:block;filter:drop-shadow(0 1px 3px rgba(0,0,0,.45))}
        .live-brand__label{position:relative;top:24px;color:var(--white);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;text-shadow:0 1px 3px rgba(58,32,16,.9),0 2px 8px rgba(58,32,16,.5)}

        @keyframes live-arrive{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}

        /* ---- Event title block: HTML/CSS text (not baked into the art), portrait only — see below ---- */
        .live-title{display:none}

        /* ==================================================
           PORTRAIT composition (primary) — 536.3 x 954.5 (9:16)
           A deliberate top-to-bottom stack: birds + title in the sky, the guest photo as the
           dominant hero, the quote note below it, then palm + waves grounding the scene.
           Not a rotated or shrunk copy of the landscape layout above.
           ================================================== */
        @media (orientation: portrait){
          .live-canvas{width:max(100vw,calc(100vh * 536.3 / 954.5));height:max(100vh,calc(100vw * 954.5 / 536.3))}

          .live-canvas__sun{left:64cqw;top:2cqh;width:24cqw;height:auto;aspect-ratio:1/1}
          .live-canvas__birds{left:8cqw;top:1cqh;width:68cqw;height:7cqh}
          .live-canvas__waves{position:absolute;left:0;right:0;bottom:0;width:100%;height:13cqh;min-height:0;z-index:10}
          .live-canvas__flamingo{display:block;position:absolute;right:-4cqw;top:75cqh;width:30cqw;height:auto;pointer-events:none;transform:scaleX(-1)}
          .live-canvas__flower{display:block;position:absolute;left:15cqw;top:80cqh;width:19cqw;height:auto;pointer-events:none;z-index:5}
          .live-canvas__pineapple{display:block;position:absolute;left:-2cqw;top:70.9cqh;width:27cqw;height:auto;pointer-events:none}

          .live-title{display:block;position:absolute;left:10cqw;top:1cqh;width:80cqw;text-align:center;pointer-events:none}
          .live-title__tagline{margin:1cqh 0 0}
          .live-title__tagline-line1,.live-title__tagline-line2{display:block;font-family:var(--font-brush);font-weight:400;letter-spacing:.01em}
          .live-title__tagline-line1{font-size:clamp(28px,8.6cqw,50px);line-height:1;color:var(--white);text-shadow:0 2px 0 rgba(58,32,16,.55),0 4px 14px rgba(58,32,16,.6)}
          .live-title__tagline-line2{margin-top:.3cqh;font-size:clamp(32px,9.6cqw,56px);line-height:1;color:var(--sun-400);text-shadow:0 2px 0 rgba(58,32,16,.6),0 4px 16px rgba(58,32,16,.65)}

          .live-photo-zone{left:5cqw;top:16.2cqh;width:90cqw;height:60.5cqh;gap:1cqh}
          .live-photo-frame__img{width:61.3cqw;height:53.25cqh;max-width:none;max-height:none}
          .live-photo-frame__img.is-landscape{width:auto;height:auto;max-width:80cqw;max-height:53.25cqh}
          .live-thumbs{max-width:80cqw;height:5.8cqh}

          .live-quote-zone{left:28.4cqw;top:78cqh;width:43.2cqw;height:auto;min-height:9cqh;max-height:14cqh}
          .live-quote-zone--quiet{min-height:6cqh;max-height:8.5cqh}
          .live-quote-zone__content{padding:6% 8% 7%}
          .live-quote__message{font-size:clamp(14px,3.2cqw,19px);line-height:1.22}
          .live-quote__message.is-long{font-size:clamp(11px,2.4cqw,15px)}
          .live-quote__meta{margin-top:.7cqh}
          .live-quote__name{font-size:clamp(13px,2.6cqw,16px)}
          .live-quote__date{margin-top:.5cqh;font-size:clamp(10.5px,2cqw,12px)}
          .live-quote__clock{margin-top:.25cqh;font-size:clamp(9.5px,1.8cqw,11px)}
          .live-empty__copy{max-width:70cqw}
        }
      `}</style>
    </main>
  );
}
