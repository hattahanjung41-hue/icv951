import { useState, type FormEvent } from 'react';
import { signInAdmin } from '../lib/adminAuth';
import { BrandMark } from '../components/BrandMark';

export function AdminLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInAdmin(email.trim(), password);
      onSignedIn();
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <form onSubmit={handleSubmit} className="admin-login__card">
        <BrandMark />
        <p className="kicker" style={{ marginTop: 16 }}>
          Operator Access
        </p>
        <h1 className="admin-login__title">Admin Sign In</h1>
        <p className="admin-login__sub">Event control panel access only.</p>

        <label className="admin-login__field">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="guest-input"
            autoComplete="username"
          />
        </label>

        <label className="admin-login__field">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="guest-input"
            autoComplete="current-password"
          />
        </label>

        {error && <p className="admin-login__error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <style>{`
        .admin-login { min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: var(--sand-50); padding: 20px; }
        .admin-login__card {
          width: 100%; max-width: 360px; background: var(--white); border-radius: var(--radius-lg);
          padding: 30px 26px; box-shadow: var(--shadow-soft); display: flex; flex-direction: column; gap: 14px;
        }
        .admin-login__title { font-size: 1.3rem; margin-top: 2px; }
        .admin-login__sub { font-size: 13px; color: var(--ink-500); }
        .admin-login__field { font-size: 13px; font-weight: 700; display: flex; flex-direction: column; gap: 6px; color: var(--ink-900); }
        .admin-login__error { color: var(--coral-500); font-size: 13px; }
      `}</style>
    </div>
  );
}
