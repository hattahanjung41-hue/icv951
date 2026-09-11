import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';

export function Header({ backTo, backLabel }: { backTo?: string; backLabel?: string }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(251, 246, 234, 0.92)',
        backdropFilter: 'blur(6px)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div
        className="container"
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {backTo ? (
          <Link
            to={backTo}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              color: 'var(--ink-900)',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            <span aria-hidden="true">←</span>
            <span>{backLabel ?? 'Back'}</span>
          </Link>
        ) : (
          <Link to="/" style={{ textDecoration: 'none' }}>
            <BrandMark />
          </Link>
        )}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--white)',
            background: 'var(--ocean-800)',
            padding: '6px 10px',
            borderRadius: 999,
            letterSpacing: '0.02em',
          }}
        >
          INTEGRITAS KUAT, DJP HEBAT
        </span>
      </div>
    </header>
  );
}
