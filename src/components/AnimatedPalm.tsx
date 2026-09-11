import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const EASE = '0.37 0 0.63 1';

interface Frond {
  /** Neutral resting shape. */
  d0: string;
  /** Wind-bent shape — only the tip half of the blade moves; the base stays glued to the crown. */
  d1: string;
  dur: string;
  begin: string;
}

/**
 * Eight filled leaf-blade shapes fanning from a single crown point, each one a closed
 * two-curve outline (wide-ish at the base, tapering to a point at the tip) rather than a
 * stroked stick — that's what reads as an actual frond instead of a wire silhouette.
 * The "d1" wind variant only shifts the tip-side curve/control points, so the sway visibly
 * originates at the base and grows toward the tip instead of the whole blade swinging rigidly.
 */
const FRONDS: Frond[] = [
  { d0: 'M162 150 Q110 90 40 70 Q100 120 168 155 Z', d1: 'M162 150 Q119 96 49 76 Q109 126 168 155 Z', dur: '6.4s', begin: '0s' },
  { d0: 'M166 150 Q150 60 150 20 Q180 70 178 152 Z', d1: 'M166 150 Q156 64 156 24 Q186 74 178 152 Z', dur: '7.2s', begin: '-1.2s' },
  { d0: 'M178 152 Q230 90 270 55 Q220 130 172 158 Z', d1: 'M178 152 Q221 97 261 62 Q211 137 172 158 Z', dur: '5.8s', begin: '-2.4s' },
  { d0: 'M180 155 Q250 130 290 140 Q240 175 175 165 Z', d1: 'M180 155 Q242 139 282 149 Q232 184 175 165 Z', dur: '6.8s', begin: '-.6s' },
  { d0: 'M175 158 Q230 190 270 230 Q210 210 165 168 Z', d1: 'M175 158 Q220 196 260 236 Q200 216 165 168 Z', dur: '6.1s', begin: '-3.6s' },
  { d0: 'M168 158 Q120 190 60 220 Q110 200 155 165 Z', d1: 'M168 158 Q130 185 70 215 Q120 195 155 165 Z', dur: '7.6s', begin: '-2s' },
  { d0: 'M162 155 Q100 145 50 150 Q100 175 165 165 Z', d1: 'M162 155 Q106 154 56 159 Q106 184 165 165 Z', dur: '6.6s', begin: '-4.2s' },
  { d0: 'M163 150 Q120 110 90 110 Q120 135 168 155 Z', d1: 'M163 150 Q128 115 98 115 Q128 140 168 155 Z', dur: '5.4s', begin: '-1.8s' },
];

/**
 * A tropical corner palm for the Live display: a tapered, gently leaning trunk plus a
 * fuller crown of filled fronds (not thin stick lines), each swaying independently by
 * morphing its own blade shape from the base outward — no canvas, no rAF, no rigid
 * whole-frond rotation. Reduced motion drops straight to the resting silhouette.
 */
export function AnimatedPalm({ className }: { className?: string }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <svg className={className} viewBox="0 0 300 340" aria-hidden="true">
      <defs>
        <linearGradient id="live-palm-trunk" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#5a3d24" />
          <stop offset="100%" stopColor="#7d5738" />
        </linearGradient>
        <linearGradient id="live-palm-frond" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4d7a3f" />
          <stop offset="100%" stopColor="#2f4f28" />
        </linearGradient>
      </defs>

      <ellipse cx="162" cy="337" rx="34" ry="7" fill="#3a2a18" opacity=".2" />

      <path d="M140 340 C132 260 150 200 160 150 L184 150 C176 200 190 260 184 340 Z"
        fill="url(#live-palm-trunk)" stroke="#4a3319" strokeWidth="1.5" />
      <path d="M148 300 Q162 296 176 300 M146 240 Q162 235 178 240 M150 185 Q163 181 175 185"
        fill="none" stroke="#4a3319" strokeWidth="2" opacity=".4" strokeLinecap="round" />

      {FRONDS.map((frond, i) => (
        <path key={i} d={frond.d0} fill="url(#live-palm-frond)" stroke="#26401f" strokeWidth="1" opacity=".95">
          {!reduceMotion && (
            <animate attributeName="d" values={`${frond.d0};${frond.d1};${frond.d0}`}
              dur={frond.dur} begin={frond.begin} repeatCount="indefinite"
              calcMode="spline" keyTimes="0;0.5;1" keySplines={`${EASE};${EASE}`} />
          )}
        </path>
      ))}
    </svg>
  );
}
