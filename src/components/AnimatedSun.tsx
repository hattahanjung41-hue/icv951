import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const EASE = '0.37 0 0.63 1';
const RAY_COUNT = 12;

/**
 * A small tropical sun accent for the Live display's sky — pure SVG, no canvas or
 * rAF loop. Glow breathes via a radial-gradient circle animating its radius, the
 * ray ring turns very slowly, and the core pulses opacity — all native <animate>.
 */
export function AnimatedSun({ className }: { className?: string }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="live-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff1c2" stopOpacity=".85" />
          <stop offset="55%" stopColor="#f7c948" stopOpacity=".32" />
          <stop offset="100%" stopColor="#f7c948" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="90" fill="url(#live-sun-glow)">
        {!reduceMotion && (
          <animate attributeName="r" values="84;98;84" dur="4.8s" repeatCount="indefinite"
            calcMode="spline" keyTimes="0;0.5;1" keySplines={`${EASE};${EASE}`} />
        )}
      </circle>
      <g stroke="#f2a93c" strokeWidth="4" strokeLinecap="round" opacity=".8">
        {!reduceMotion && (
          <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100"
            dur="20s" repeatCount="indefinite" />
        )}
        {Array.from({ length: RAY_COUNT }).map((_, i) => {
          const angle = (i * (360 / RAY_COUNT) * Math.PI) / 180;
          const x1 = 100 + Math.cos(angle) * 56;
          const y1 = 100 + Math.sin(angle) * 56;
          const x2 = 100 + Math.cos(angle) * 71;
          const y2 = 100 + Math.sin(angle) * 71;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      <circle cx="100" cy="100" r="45" fill="#f9c94d">
        {!reduceMotion && (
          <animate attributeName="fill-opacity" values="1;.85;1" dur="4.8s" repeatCount="indefinite"
            calcMode="spline" keyTimes="0;0.5;1" keySplines={`${EASE};${EASE}`} />
        )}
      </circle>
      <circle cx="100" cy="100" r="45" fill="none" stroke="#eb9420" strokeWidth="2" opacity=".45" />
    </svg>
  );
}
