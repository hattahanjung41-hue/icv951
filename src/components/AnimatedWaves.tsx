/** One scalloped "fan" motif, repeated via an SVG pattern to form a continuous Art Deco border. */
function FanTile() {
  return (
    <pattern id="deco-fan-tile" patternUnits="userSpaceOnUse" x="0" y="20" width="120" height="280">
      {/* Small accent tick at the seam between two adjoining fans. */}
      <line x1="0" y1="150" x2="0" y2="136" stroke="var(--deco-gold, #d4a84b)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Outer scallop arc. */}
      <path d="M0 150A60 60 0 0 1 120 150" fill="none" stroke="var(--deco-gold, #d4a84b)" strokeWidth="2.5" />
      {/* Nested inner arc, echoing the layered-petal look of the reference pattern. */}
      <path d="M22 150A38 38 0 0 1 98 150" fill="none" stroke="var(--deco-gold, #d4a84b)" strokeWidth="2" opacity="0.85" />
      {/* Radiating fan lines from the pivot out to the outer arc. */}
      <g stroke="var(--deco-gold, #d4a84b)" strokeWidth="2" strokeLinecap="round" opacity="0.9">
        <line x1="60" y1="150" x2="6" y2="150" />
        <line x1="60" y1="150" x2="13.2" y2="123" />
        <line x1="60" y1="150" x2="33" y2="103.2" />
        <line x1="60" y1="150" x2="60" y2="96" />
        <line x1="60" y1="150" x2="87" y2="103.2" />
        <line x1="60" y1="150" x2="106.8" y2="123" />
        <line x1="60" y1="150" x2="114" y2="150" />
      </g>
      {/* Baseline grounding the row of fans. */}
      <line x1="0" y1="150" x2="120" y2="150" stroke="var(--deco-gold, #d4a84b)" strokeWidth="2" opacity="0.7" />
    </pattern>
  );
}

/**
 * A repeating Art Deco scalloped-fan border — gold linework on a deep ground, with a thin
 * light band along the top edge. Static by design (this is ornamental trim, not motion).
 * Kept as a drop-in replacement for the previous animated wave footer: same component name,
 * same `className`/`frontColor` props, so both call sites (Landing footer, Live canvas) needed
 * no changes.
 */
export function AnimatedWaves({
  className,
  frontColor = 'var(--wave-deep)',
  goldColor = '#d4a84b',
  topColor = '#f3e6c5',
}: {
  className?: string;
  frontColor?: string;
  goldColor?: string;
  topColor?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 1920 300"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      style={{ ['--deco-gold' as string]: goldColor }}
    >
      <defs>
        <FanTile />
      </defs>
      <rect x="0" y="0" width="1920" height="300" fill={frontColor} />
      <rect x="0" y="20" width="1920" height="280" fill="url(#deco-fan-tile)" />
      <rect x="0" y="0" width="1920" height="12" fill={topColor} />
    </svg>
  );
}
