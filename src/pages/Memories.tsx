import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { MemoryCard } from '../components/MemoryCard';
import { fetchVisibleMemories, subscribeToMemoryChanges } from '../lib/memories';
import type { MemoryWithPhotos } from '../lib/types';

const PAGE_SIZE = 24;

export function Memories() {
  const [memories, setMemories] = useState<MemoryWithPhotos[] | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [error, setError] = useState(false);

  async function load() {
    try {
      const data = await fetchVisibleMemories();
      setMemories(data);
      setError(false);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    load();
    const unsubscribe = subscribeToMemoryChanges(() => load());
    return unsubscribe;
  }, []);

  return (
    <div className="memories-shell">
      <Header backTo="/" backLabel="Home" />
      <main className="container memories-main">
        <p className="kicker">Farewell Gala Dinner</p>
        <h1 className="memories-title eyebrow-script">Memory Wall</h1>
        <p className="memories-desc">Moments, stories, and smiles from Farewell Gala Dinner.</p>

        {error && <p className="memories-error">Connection seems unstable. Please try again in a moment.</p>}

        {memories === null && !error && <GridSkeleton />}

        {memories && memories.length === 0 && (
          <div className="memories-empty">
            <p className="kicker" style={{ justifyContent: 'center' }}>
              Your Moments, Our Memory
            </p>
            <p className="memories-empty__desc">The Memory Wall is waiting for you. Share your first moment.</p>
          </div>
        )}

        {memories && memories.length > 0 && (
          <>
            <div className="masonry memories-masonry">
              {memories.slice(0, visibleCount).map((m) => (
                <MemoryCard key={m.id} memory={m} />
              ))}
            </div>

            {visibleCount < memories.length && (
              <div className="memories-loadmore">
                <button className="btn btn-secondary" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                  Load more memories
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        .memories-shell { display: flex; flex-direction: column; min-height: 100dvh; }
        .memories-main { flex: 1; padding: 24px 16px 56px; }
        .memories-title { margin-top: 4px; font-size: 2rem; color: var(--ocean-700); }
        .memories-desc { margin-top: 2px; color: var(--ink-700); font-size: 14.5px; }
        .memories-error { margin-top: 24px; color: var(--coral-500); font-size: 14px; }
        .memories-empty { text-align: center; padding: 60px 16px; }
        .memories-empty__desc { margin-top: 8px; color: var(--ink-700); }
        .memories-masonry { margin-top: 20px; }
        .memories-loadmore { display: flex; justify-content: center; margin-top: 30px; }
      `}</style>
    </div>
  );
}

function GridSkeleton() {
  const heights = [220, 300, 260, 340, 240, 280];
  return (
    <div className="masonry" style={{ marginTop: 20 }}>
      {heights.map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h }} />
      ))}
    </div>
  );
}
