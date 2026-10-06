import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Guest } from './pages/Guest';
import { Memories } from './pages/Memories';
import { MemoryDetail } from './pages/MemoryDetail';
import { Live } from './pages/Live';
import { Admin } from './pages/Admin';
import { getSession, isCurrentUserAdmin, onAuthStateChange } from './lib/adminAuth';

/** Only admins take photos now — /guest is reached via the Admin menu, not the public landing page. */
function RequireAdmin({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    let active = true;
    async function check() {
      const session = await getSession();
      if (!active) return;
      if (!session) {
        setStatus('denied');
        return;
      }
      const admin = await isCurrentUserAdmin();
      if (active) setStatus(admin ? 'allowed' : 'denied');
    }
    check();
    return onAuthStateChange(() => check());
  }, []);

  if (status === 'checking') return null;
  if (status === 'denied') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/guest"
        element={
          <RequireAdmin>
            <Guest />
          </RequireAdmin>
        }
      />
      <Route path="/memories" element={<Memories />} />
      <Route path="/memories/:id" element={<MemoryDetail />} />
      <Route path="/live" element={<Live />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
