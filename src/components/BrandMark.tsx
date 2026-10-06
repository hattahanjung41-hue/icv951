export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="wordmark">
      <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden="true">
        <path fill="#8C1526" d="M32 2c3 9 6 13 22 15-15 4-19 8-22 20-3-12-7-16-22-20 16-2 19-6 22-15z" />
      </svg>
      {!compact && <span>FAREWELL GALA DINNER</span>}
    </span>
  );
}
