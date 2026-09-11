import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/** A brisk, symmetric ease — no linear "sliding" feel, no snap at the loop point. */
const EASE = '0.37 0 0.63 1';

function Morph({ dur, begin, values }: { dur: string; begin?: string; values: string }) {
  return (
    <animate
      attributeName="d"
      dur={dur}
      begin={begin}
      repeatCount="indefinite"
      calcMode="spline"
      keyTimes="0;0.5;1"
      keySplines={`${EASE};${EASE}`}
      values={values}
    />
  );
}

const back =
  'M0 42C116 15 226 20 338 62C426 95 474 119 548 112C650 102 705 66 790 75C902 86 940 139 1040 151C1142 163 1218 130 1325 105C1446 76 1509 101 1601 88C1740 66 1830 26 1920 36V300H0Z';
// Left rises / right sinks — reads as a rightward roll. Amplitude doubled so it reads clearly at speed.
const backMorph =
  'M0 26C116 -1 226 4 338 46C426 83 474 107 548 100C650 90 705 54 790 63C902 98 940 151 1040 163C1142 175 1218 142 1325 117C1446 96 1509 121 1601 108C1740 86 1830 46 1920 56V300H0Z';

const middle =
  'M0 110C100 79 208 95 296 128C386 164 464 154 548 111C640 60 728 82 810 133C894 190 975 185 1057 115C1144 61 1237 75 1324 136C1420 204 1510 184 1615 144C1740 95 1833 110 1920 116V300H0Z';
// Left sinks / right rises — opposite bias from the back wave, so the two layers read as independent.
const middleMorph =
  'M0 126C100 95 208 111 296 144C386 174 464 164 548 121C640 70 728 92 810 143C894 180 975 175 1057 105C1144 51 1237 65 1324 126C1420 186 1510 166 1615 126C1740 77 1833 92 1920 98V300H0Z';

const front =
  'M0 180C130 143 242 164 355 198C480 237 620 215 738 178C860 140 962 160 1065 205C1178 255 1298 235 1412 184C1526 132 1628 152 1715 186C1810 223 1886 188 1920 168V300H0Z';
// Short, alternating chop rather than a broad tilt — this layer is closest to shore and fastest.
const frontMorph =
  'M0 164C130 127 242 148 355 182C480 253 620 231 738 194C860 124 962 144 1065 189C1178 271 1298 251 1412 200C1526 116 1628 136 1715 170C1810 239 1886 204 1920 184V300H0Z';

const accent1 = 'M65 76C180 37 292 57 407 101';
const accent1Morph = 'M65 88C184 53 284 41 415 89';
const accent2 = 'M1164 115C1270 86 1370 95 1467 132';
const accent2Morph = 'M1164 103C1274 102 1366 79 1475 144';
const accent3 = 'M233 213C360 229 486 215 598 187';
const accent3Morph = 'M233 225C364 213 482 231 606 175';

/**
 * The living-ocean wave system shared by the Live Display's beach scene and any
 * other spot that wants the same in-viewport motion instead of a static raster wave.
 * Independently morphing layers (never a single rigid transform), each with its own
 * duration/bias so the layers read as distinct rather than a synced echo.
 */
export function AnimatedWaves({
  className,
  frontColor = '#7a2e12',
  midColor = '#d9622f',
  backColor = '#f2b76b',
}: {
  className?: string;
  frontColor?: string;
  midColor?: string;
  backColor?: string;
}) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <svg className={className} viewBox="0 0 1920 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path fill={backColor} d={back}>
        {!reduceMotion && <Morph dur="3s" values={`${back};${backMorph};${back}`} />}
      </path>
      <path fill={midColor} d={middle}>
        {!reduceMotion && <Morph dur="2.2s" begin="-0.4s" values={`${middle};${middleMorph};${middle}`} />}
      </path>
      <path fill={frontColor} d={front}>
        {!reduceMotion && <Morph dur="1.5s" begin="-0.7s" values={`${front};${frontMorph};${front}`} />}
      </path>
      <path d={accent1} fill="none" stroke="#fbe0b8" strokeWidth="5" strokeLinecap="round" opacity=".68">
        {!reduceMotion && <Morph dur="2s" values={`${accent1};${accent1Morph};${accent1}`} />}
      </path>
      <path d={accent2} fill="none" stroke="#fbe0b8" strokeWidth="4" strokeLinecap="round" opacity=".55">
        {!reduceMotion && <Morph dur="2s" begin="-0.7s" values={`${accent2};${accent2Morph};${accent2}`} />}
      </path>
      <path d={accent3} fill="none" stroke="#f7c48c" strokeWidth="4" strokeLinecap="round" opacity=".62">
        {!reduceMotion && <Morph dur="2s" begin="-1.3s" values={`${accent3};${accent3Morph};${accent3}`} />}
      </path>
    </svg>
  );
}
