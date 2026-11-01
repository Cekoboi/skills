// Deterministic animation helpers. Everything is a pure function of time `t` (seconds)
// so any frame can be rendered independently and in any order.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const remap = (x, a, b) => clamp((x - a) / (b - a));
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const smoother = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const easeOutCubic = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeInCubic = (x) => Math.pow(clamp(x), 3);
export const easeOutQuint = (x) => 1 - Math.pow(1 - clamp(x), 5);
export const easeInOutSine = (x) => -(Math.cos(Math.PI * clamp(x)) - 1) / 2;
export const easeOutBack = (x, s = 1.70158) => { x = clamp(x) - 1; return x * x * ((s + 1) * x + s) + 1; };
export const easeOutElastic = (x) => {
  x = clamp(x);
  if (x === 0 || x === 1) return x;
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};
/** 0→1→0 bump between a and b with soft in/out of width w */
export const window01 = (t, a, b, w = 0.15) => smooth(remap(t, a, a + w)) * (1 - smooth(remap(t, b - w, b)));

/** Seeded PRNG (mulberry32) so particles/dust are identical on every render. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1-D value noise, deterministic. */
export function noise1(x, seed = 0) {
  const h = (n) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

/**
 * Time-parameterised cubic Hermite spline through keys [{t, v:[...]}] with Catmull-Rom
 * tangents. Tangents at the ends are extrapolated (not zeroed) so motion carries
 * momentum across shot boundaries instead of stopping dead. Set `ease:true` on a key
 * to force zero velocity there (a deliberate settle).
 */
export function spline(keys, t) {
  const n = keys.length;
  if (n === 1 || t <= keys[0].t) {
    if (n === 1) return keys[0].v.slice();
    const m = tangent(keys, 0);
    return keys[0].v.map((v, i) => v + m[i] * (t - keys[0].t) * 0); // hold before first key
  }
  if (t >= keys[n - 1].t) return keys[n - 1].v.slice();
  let i = 0;
  while (i < n - 2 && t > keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const h = k1.t - k0.t, s = (t - k0.t) / h;
  const m0 = tangent(keys, i), m1 = tangent(keys, i + 1);
  const s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  return k0.v.map((v, j) => h00 * v + h10 * h * m0[j] + h01 * k1.v[j] + h11 * h * m1[j]);
}
function tangent(keys, i) {
  const k = keys[i];
  if (k.ease) return k.v.map(() => 0);
  const a = keys[Math.max(0, i - 1)], b = keys[Math.min(keys.length - 1, i + 1)];
  if (a === b) return k.v.map(() => 0);
  return k.v.map((_, j) => (b.v[j] - a.v[j]) / (b.t - a.t));
}

/** Typewriter: returns the visible prefix of `str` at time t. */
export const typed = (str, t, t0, cps = 28) => str.slice(0, Math.max(0, Math.floor((t - t0) * cps)));
