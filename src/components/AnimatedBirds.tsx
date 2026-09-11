import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const WINGS_UP = 'M0 8 C5 -4 9 -4 14 6 C19 -4 23 -4 28 8';
const WINGS_DOWN = 'M0 6 C5 2 9 2 14 8 C19 2 23 2 28 6';

interface BirdSpec {
  flightPath: string;
  dur: string;
  begin: string;
  flapDur: string;
  scale: number;
  opacity: number;
}

/** Five independent flight paths/speeds/scales so the flock never reads as one synced echo. */
const BIRDS: BirdSpec[] = [
  { flightPath: 'M -60,60 Q 420,4 1060,50', dur: '24s', begin: '0s', flapDur: '.62s', scale: 1.15, opacity: .85 },
  { flightPath: 'M -60,30 Q 380,82 1060,14', dur: '29s', begin: '-9s', flapDur: '.7s', scale: .95, opacity: .68 },
  { flightPath: 'M -60,88 Q 460,42 1060,82', dur: '21s', begin: '-4s', flapDur: '.55s', scale: .8, opacity: .58 },
  { flightPath: 'M -60,45 Q 400,100 1060,35', dur: '26s', begin: '-14s', flapDur: '.65s', scale: 1, opacity: .72 },
  { flightPath: 'M -60,75 Q 440,20 1060,68', dur: '19s', begin: '-6.5s', flapDur: '.5s', scale: .7, opacity: .5 },
];

/**
 * Looping seagulls for the Live display's sky. Pure SMIL: <animateMotion> carries each
 * bird along a shallow arc (rotate="auto" keeps it nose-first into the turn) while a
 * nested <animate> morphs the wing path for a flap — no canvas, no rAF.
 */
export function AnimatedBirds({ className }: { className?: string }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <svg className={className} viewBox="0 0 1000 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {BIRDS.map((bird, i) => (
        <g key={i} opacity={bird.opacity}>
          {reduceMotion ? (
            <path d={WINGS_UP} stroke="#000000" strokeWidth={2.4 / bird.scale} fill="none" strokeLinecap="round"
              transform={`translate(120 ${18 + i * 22}) scale(${bird.scale * 2})`} />
          ) : (
            <g>
              <animateMotion path={bird.flightPath} dur={bird.dur} begin={bird.begin} repeatCount="indefinite" rotate="auto" />
              <path d={WINGS_UP} stroke="#000000" strokeWidth={2.4 / bird.scale} fill="none" strokeLinecap="round"
                transform={`scale(${bird.scale * 2})`}>
                <animate attributeName="d" values={`${WINGS_UP};${WINGS_DOWN};${WINGS_UP}`} dur={bird.flapDur} repeatCount="indefinite" />
              </path>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
