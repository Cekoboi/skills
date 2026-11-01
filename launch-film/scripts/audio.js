// Builds out/audio.wav (48 kHz stereo): an original procedural score + synthesized SFX.
// Every effect is placed from soundCues() in src/config/timeline.js, and the music grid is
// phase-locked so the drop lands exactly on the bike's launch (MUSIC.dropAt).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILM, MUSIC, soundCues } from '../src/config/timeline.js';

const SR = 48000, DUR = FILM.duration + 0.0, N = Math.ceil(SR * DUR);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = new Float32Array(N), R = new Float32Array(N);
const sendL = new Float32Array(N), sendR = new Float32Array(N); // reverb send
const padBus = new Float32Array(N); // sidechained music bus (mono, spread later)
let seed = 1234; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rnd() * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function add(t, buf, { gain = 1, pan = 0, rev = 0.15, bus = null } = {}) {
  const i0 = Math.round(t * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < buf.length; i++) {
    const j = i0 + i; if (j < 0 || j >= N) continue;
    const v = buf[i];
    if (bus) { bus[j] += v * gain; continue; }
    L[j] += v * gl; R[j] += v * gr; sendL[j] += v * gl * rev; sendR[j] += v * gr * rev;
  }
}
const env = (n, a, d, curve = 4) => { const out = new Float32Array(n); const na = Math.max(1, Math.floor(a * SR)); for (let i = 0; i < n; i++) out[i] = i < na ? i / na : Math.exp(-curve * (i - na) / (d * SR)); return out; };
function lp(buf, fc) { let y = 0; const a = typeof fc === 'function' ? null : 1 - Math.exp(-2 * Math.PI * fc / SR); for (let i = 0; i < buf.length; i++) { const k = a ?? 1 - Math.exp(-2 * Math.PI * fc(i) / SR); y += k * (buf[i] - y); buf[i] = y; } return buf; }
function hp(buf, fc) { let y = 0, x1 = 0; const a = Math.exp(-2 * Math.PI * fc / SR); for (let i = 0; i < buf.length; i++) { y = a * (y + buf[i] - x1); x1 = buf[i]; buf[i] = y; } return buf; }
function bp(buf, fcFn, q = 2) { // state-variable bandpass, fc may vary
  let low = 0, band = 0;
  for (let i = 0; i < buf.length; i++) { const fc = typeof fcFn === 'function' ? fcFn(i) : fcFn; const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR); low += f * band; const high = buf[i] - low - band / q; band += f * high; buf[i] = band; }
  return buf;
}
const seconds = (s) => new Float32Array(Math.max(1, Math.floor(s * SR)));

// ------------------------------------------------------------------ instruments
function kick(g = 1) { const n = seconds(0.42), b = seconds(0.42); let ph = 0; for (let i = 0; i < n.length; i++) { const t = i / SR; const f = 45 + 95 * Math.exp(-t * 28); ph += 2 * Math.PI * f / SR; b[i] = Math.sin(ph) * Math.exp(-t * 7.5) * g + (i < 80 ? noise() * 0.3 * (1 - i / 80) : 0); } return b; }
function clap() { const b = seconds(0.3); for (let i = 0; i < b.length; i++) { const t = i / SR; const burst = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 90) : 0), 0) * 0.5 + Math.exp(-t * 16) * 0.6; b[i] = noise() * burst; } return bp(b, 1300, 1.2); }
function hat(open = false) { const b = seconds(open ? 0.22 : 0.06); for (let i = 0; i < b.length; i++) b[i] = noise() * Math.exp(-(i / SR) * (open ? 18 : 70)); return hp(hp(b, 7000), 7000); }
function rim() { const b = seconds(0.08); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(2 * Math.PI * 1700 * t) * 0.6 + noise() * 0.4) * Math.exp(-t * 60); } return b; }
function pluck(m, dur = 0.6, bright = 0.5) { // Karplus–Strong
  const f = mtof(m), P = Math.max(2, Math.round(SR / f)), b = seconds(dur), d = new Float32Array(P);
  for (let i = 0; i < P; i++) d[i] = noise();
  let idx = 0, prev = 0;
  for (let i = 0; i < b.length; i++) { const cur = d[idx]; const nx = (cur * (0.5 + bright * 0.5) + prev * (0.5 - bright * 0.5)) * 0.996; prev = cur; d[idx] = nx; b[i] = cur; idx = (idx + 1) % P; }
  const e = env(b.length, 0.002, dur, 3); for (let i = 0; i < b.length; i++) b[i] *= e[i];
  return lp(b, 5200);
}
function pad(notes, dur, cutoff = 1400, attack = 0.5) {
  const b = seconds(dur);
  for (const m of notes) for (const det of [-0.08, 0.0, 0.07]) {
    const f = mtof(m + det); let ph = rnd();
    for (let i = 0; i < b.length; i++) { ph += f / SR; ph -= Math.floor(ph); b[i] += (ph * 2 - 1) * 0.08; }
  }
  lp(b, cutoff); lp(b, cutoff * 1.4);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] *= Math.min(1, t / attack) * Math.min(1, (dur - t) / 0.25); }
  return b;
}
function bass(m, dur) { const f = mtof(m), b = seconds(dur); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += f / SR; const s = Math.sin(2 * Math.PI * ph) + 0.35 * Math.sin(4 * Math.PI * ph) + 0.12 * ((ph % 1) * 2 - 1); b[i] = s * Math.min(1, t / 0.006) * Math.exp(-t * 2.2) * Math.min(1, (dur - t) / 0.03); } return lp(b, 900); }
function bell(m, dur = 1.2, g = 1) { const f = mtof(m), b = seconds(dur); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = g * (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 6) + 0.2 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * 10)) * Math.min(1, t / 0.002); } return b; }

// ------------------------------------------------------------------ SFX
const SFX = {
  whoosh: (c, lo = 300, hi = 3200, d = 0.55) => { const b = seconds(d); for (let i = 0; i < b.length; i++) { const u = i / b.length; b[i] = noise() * Math.sin(Math.PI * Math.pow(u, 0.7)) ** 2; } return bp(b, (i) => lo + (hi - lo) * Math.sin(Math.PI * i / b.length), 1.4); },
  whooshLow: () => SFX.whoosh(null, 120, 900, 0.6),
  whip: () => SFX.whoosh(null, 600, 6000, 0.3),
  brush: () => { const b = seconds(0.5); for (let i = 0; i < b.length; i++) { const u = i / b.length; b[i] = noise() * (u < 0.15 ? u / 0.15 : Math.exp(-(u - 0.15) * 3)) * (0.7 + 0.3 * Math.sin(i / SR * 2 * Math.PI * 23)); } return bp(b, (i) => 900 + 2600 * i / b.length, 0.9); },
  riserSoft: () => { const b = seconds(1.5); for (let i = 0; i < b.length; i++) { const u = i / b.length; b[i] = noise() * u * u * 0.6; } return bp(b, (i) => 200 + 2400 * (i / b.length) ** 2, 2); },
  riser: (c) => { const d = c.dur || 0.4, b = seconds(d); let ph = 0; for (let i = 0; i < b.length; i++) { const u = i / b.length; ph += (200 + 1400 * u * u) / SR; b[i] = (noise() * 0.6 + ((ph % 1) * 2 - 1) * 0.3) * u * u; } return bp(b, (i) => 400 + 6000 * (i / b.length) ** 2, 1.5); },
  clayTick: () => { const b = seconds(0.09); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(2 * Math.PI * (650 + rnd() * 30) * t) * 0.7 + noise() * 0.3) * Math.exp(-t * 55); } return b; },
  shimmer: () => { const b = seconds(1.6); [84, 88, 91, 96].forEach((m, k) => { const f = mtof(m); for (let i = 0; i < b.length; i++) { const t = i / SR - k * 0.04; if (t < 0) continue; b[i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 2.4) * 0.22 * (0.7 + 0.3 * Math.sin(t * 40 + k)); } }); return b; },
  shutter: () => { const b = seconds(0.14); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = noise() * (Math.exp(-t * 300) + (t > 0.06 ? Math.exp(-(t - 0.06) * 260) * 0.8 : 0)); } return hp(b, 1500); },
  scan: () => { const b = seconds(1.0); let ph = 0; for (let i = 0; i < b.length; i++) { const u = i / b.length; ph += (500 + 1500 * u) / SR; b[i] = Math.sin(2 * Math.PI * ph) * Math.sin(Math.PI * u) * 0.25 * (0.6 + 0.4 * Math.sin(u * 90)); } return b; },
  key: () => { const b = seconds(0.03); const f = 2400 + rnd() * 1600; for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (noise() * 0.7 + Math.sin(2 * Math.PI * f * t) * 0.3) * Math.exp(-t * 260); } return hp(b, 900); },
  click: () => { const b = seconds(0.04); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(2 * Math.PI * 2100 * t) * 0.6 + noise() * 0.4) * Math.exp(-t * 180); } return b; },
  tick: () => SFX.click(),
  send: () => { const b = seconds(0.25); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (500 + 900 * Math.min(1, t / 0.12)) / SR; b[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 14) * 0.6; } return b; },
  thinking: () => { const b = seconds(0.9); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(2 * Math.PI * mtof(76) * t) + Math.sin(2 * Math.PI * mtof(81) * t) * 0.6) * Math.sin(Math.PI * t / 0.9) * 0.15 * (0.6 + 0.4 * Math.sin(t * 24)); } return b; },
  pop: () => { const b = seconds(0.12); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (900 * Math.exp(-t * 30) + 260) / SR; b[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 32); } return b; },
  cardPop: () => { const b = SFX.pop(); const s = bell(91, 0.3, 0.15); for (let i = 0; i < s.length && i < b.length; i++) b[i] += s[i]; return b; },
  pill: () => { const b = SFX.pop(); const s = SFX.shimmer(); const o = seconds(0.9); for (let i = 0; i < o.length; i++) o[i] = (b[i] || 0) + (s[i] || 0) * 0.5; return o; },
  partsRattle: () => { const b = seconds(0.45); for (let k = 0; k < 9; k++) { const t0 = rnd() * 0.35, f = 1800 + rnd() * 2500; for (let i = Math.floor(t0 * SR); i < b.length; i++) { const t = i / SR - t0; b[i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 70) * 0.3; } } return b; },
  alertLow: () => { const b = seconds(0.5); [[57, 0], [53, 0.16]].forEach(([m, o]) => { const s = bell(m, 0.34, 0.5); for (let i = 0; i < s.length; i++) { const j = i + Math.floor(o * SR); if (j < b.length) b[j] += s[i]; } }); return lp(b, 2500); },
  confirm: () => { const b = seconds(0.8); [[72, 0], [79, 0.1]].forEach(([m, o]) => { const s = bell(m, 0.6, 0.45); for (let i = 0; i < s.length; i++) { const j = i + Math.floor(o * SR); if (j < b.length) b[j] += s[i]; } }); return b; },
  stamp: (c) => { const b = seconds(0.7); const k = kick(0.6); for (let i = 0; i < k.length && i < b.length; i++) b[i] += k[i] * Math.exp(-i / SR * 20); const s = bell([77, 79, 81, 84][c.pitch || 0], 0.6, 0.35); for (let i = 0; i < s.length; i++) b[i] += s[i]; return b; },
  clunk: (c) => { const b = seconds(0.5); const f0 = [180, 200, 160, 230][c.pitch || 0]; [1, 2.76, 5.4, 8.9].forEach((r, k) => { for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] += Math.sin(2 * Math.PI * f0 * r * t) * Math.exp(-t * (14 + k * 10)) * [0.6, 0.35, 0.22, 0.12][k]; } }); for (let i = 0; i < 600; i++) b[i] += noise() * 0.5 * (1 - i / 600); return b; },
  clamp: () => { const b = seconds(0.35); for (let k = 0; k < 3; k++) { const t0 = k * 0.07; for (let i = Math.floor(t0 * SR); i < b.length; i++) { const t = i / SR - t0; b[i] += (noise() * 0.5 + Math.sin(2 * Math.PI * 3100 * t) * 0.5) * Math.exp(-t * 120) * 0.5; } } return b; },
  thread: () => { const b = seconds(0.3); for (let k = 0; k < 6; k++) { const t0 = k * 0.04; for (let i = Math.floor(t0 * SR); i < b.length; i++) { const t = i / SR - t0; b[i] += (Math.sin(2 * Math.PI * 4200 * t)) * Math.exp(-t * 200) * 0.4; } } return b; },
  chain: () => { const b = seconds(0.45); for (let k = 0; k < 26; k++) { const t0 = k * 0.014 + rnd() * 0.01; for (let i = Math.floor(t0 * SR); i < b.length; i++) { const t = i / SR - t0; b[i] += Math.sin(2 * Math.PI * (3000 + rnd() * 50) * t) * Math.exp(-t * 300) * 0.25; } } return b; },
  sweep: () => { const s = SFX.whoosh(null, 800, 7000, 0.55); const sh = SFX.shimmer(); const b = seconds(1.6); for (let i = 0; i < b.length; i++) b[i] = (s[i] || 0) * 0.7 + (sh[i] || 0) * 0.6; return b; },
  freewheel: (c) => { const d = c.dur || 0.8, b = seconds(d + 0.05); let tt = 0, rate = 34; while (tt < d) { const i0 = Math.floor(tt * SR); for (let i = 0; i < 300 && i0 + i < b.length; i++) b[i0 + i] += Math.sin(2 * Math.PI * 5200 * i / SR) * Math.exp(-i / SR * 900) * 0.5 * (1 - tt / d * 0.6); tt += 1 / rate; rate *= 0.985; } return b; },
  glint: () => bell(96, 0.9, 0.35),
  roll: (c) => { const d = c.dur || 3, b = seconds(d); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = noise() * 0.5 * Math.min(1, t / 0.2) * Math.min(1, (d - t) / 0.4) * (0.8 + 0.2 * Math.sin(t * 2 * Math.PI * 9)); } return lp(lp(b, 500), 700); },
  rampKnock: () => { const b = seconds(0.2); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(2 * Math.PI * 320 * t) + 0.5 * Math.sin(2 * Math.PI * 780 * t)) * Math.exp(-t * 40) * 0.6; } return b; },
  launch: () => { const k = kick(1.2), w = SFX.whoosh(null, 200, 4000, 0.4), b = seconds(0.6); for (let i = 0; i < b.length; i++) b[i] = (k[i] || 0) * 0.9 + (w[i] || 0) * 0.5; return b; },
  whooshFlip: (c) => { const d = c.dur || 0.9, b = seconds(d); for (let i = 0; i < b.length; i++) { const u = i / b.length; const rot = 0.5 + 0.5 * Math.cos(2 * Math.PI * (u * u * (3 - 2 * u)) * 2); b[i] = noise() * Math.sin(Math.PI * u) * (0.35 + 0.65 * rot); } return bp(b, (i) => 500 + 2500 * Math.sin(Math.PI * i / b.length), 1.6); },
  land: () => { const b = seconds(0.6); const k = kick(1); for (let i = 0; i < k.length && i < b.length; i++) b[i] += k[i]; const r = SFX.chain(); for (let i = 0; i < r.length && i < b.length; i++) b[i + 400 < b.length ? i + 400 : i] += r[i] * 0.6; return b; },
  logoHit: () => { const b = seconds(2.4); const k = kick(1.1); for (let i = 0; i < k.length; i++) b[i] += k[i] * 0.9; [53, 60, 65, 69, 72].forEach((m, j) => { const s = bell(m, 2.2, 0.16); for (let i = 0; i < s.length && i < b.length; i++) b[i] += s[i]; }); return b; },
};

// ------------------------------------------------------------------ score
const beat = 60 / MUSIC.bpm, bar = beat * 4;
const grid0 = MUSIC.dropAt - Math.round(MUSIC.dropAt / bar) * bar; // phase so the drop is a downbeat
// F major: Fmaj9 | Dm9 | Bbmaj9 | C6/9   (MIDI, F3 = 53)
const CHORDS = [[53, 57, 60, 64, 67], [50, 53, 57, 60, 64], [46, 50, 53, 57, 60], [48, 52, 55, 57, 62]];
const BASS = [41, 38, 34, 36];
const ARP = [[72, 76, 79, 81], [69, 72, 76, 77], [70, 74, 77, 81], [67, 72, 74, 79]];
const section = (t) => (t < 6.2 ? 'intro' : t < 11.6 ? 'groove' : t < 12.0 ? 'wipe' : t < 18 ? 'groove2' : t < 21.2 ? 'build' : t < 25.2 ? 'groove2' : t < MUSIC.dropAt ? 'riser' : t < 27.81 ? 'air' : t < MUSIC.outroAt ? 'full' : 'outro');

for (let b = -1; b < 16; b++) {
  const tb = grid0 + b * bar; if (tb > DUR) break;
  const ci = ((b % 4) + 4) % 4;
  const sec = section(Math.max(0, tb + 0.01));
  // pads (whole bar), cutoff opens through the film
  const cutoff = 700 + 1800 * clamp(tb / 26, 0, 1);
  if (tb + bar > 0 && sec !== 'outro') add(tb, pad(CHORDS[ci].map((m) => m + 12), bar + 0.3, cutoff, 0.35), { gain: 0.5, bus: padBus });
  for (let k = 0; k < 4; k++) { // per beat
    const t = tb + k * beat; if (t < 0 || t > DUR) continue;
    const s = section(t);
    const drums = ['groove', 'groove2', 'build', 'full'].includes(s);
    if (drums || (s === 'air' && k === 0)) add(t, kick(), { gain: s === 'full' ? 0.95 : 0.8, rev: 0.02 });
    if (drums && (k === 1 || k === 3)) add(t, clap(), { gain: 0.32, pan: 0.05, rev: 0.25 });
    if (drums || s === 'riser') for (let h = 0; h < 2; h++) add(t + h * beat / 2 + (h ? 0.012 : 0), hat(h === 1 && k === 3), { gain: h ? 0.12 : 0.08, pan: 0.3, rev: 0.05 });
    if (s === 'build') for (let h = 0; h < 4; h++) add(t + h * beat / 4, rim(), { gain: 0.07 + (h === 2 ? 0.04 : 0), pan: -0.35, rev: 0.1 });
    // bass: root on 1, octave/fifth pickups
    if (drums || s === 'air') { const m = BASS[ci] + (k === 2 ? 7 : 0) + 12 * (k === 3 ? 1 : 0) * 0; if (k !== 1) add(t, bass(m, beat * (k === 0 ? 1.4 : 0.9)), { gain: 0.42, rev: 0.0 }); }
    // arp plucks (eighths), from the prompt shot onward and in the intro softly
    for (let e = 0; e < 2; e++) {
      const te = t + e * beat / 2; if (te > DUR - 0.3) continue;
      const se = section(te);
      if (se === 'wipe') continue;
      const on = se === 'intro' ? (e === 0) : se !== 'riser' || (k % 2 === 0);
      if (!on) continue;
      const note = ARP[ci][(k * 2 + e) % 4] + (se === 'full' ? 12 : 0);
      add(te, pluck(note, 0.5, se === 'intro' ? 0.25 : 0.55), { gain: se === 'intro' ? 0.16 : 0.2, pan: e ? 0.35 : -0.35, rev: 0.35 });
    }
  }
}
// outro: final chord swell + bell
add(MUSIC.outroAt, pad([53, 60, 65, 69, 72, 76], DUR - MUSIC.outroAt + 0.2, 2600, 0.08), { gain: 0.75, rev: 0.4 });
add(MUSIC.outroAt, bass(29, 1.8), { gain: 0.5 });
// a downbeat-locked impact at the cut to the end card
// sidechain: duck the pad bus under every kick-ish transient (simple envelope follower on beats)
for (let i = 0; i < N; i++) {
  const t = i / SR; const ph = ((t - grid0) / beat) % 1; const s = section(t);
  const duck = ['groove', 'groove2', 'build', 'full'].includes(s) ? 1 - 0.55 * Math.exp(-((ph + 1) % 1) * 9) : 1;
  const v = padBus[i] * duck; L[i] += v * 0.9; R[i] += v * 0.9; sendL[i] += v * 0.3; sendR[i] += v * 0.3;
}

// ------------------------------------------------------------------ SFX placement
const PAN = { key: 0.1, clayTick: 0, whip: -0.4, clunk: 0.15, freewheel: 0.25, roll: -0.2, whooshFlip: 0.1 };
for (const c of soundCues()) {
  const fn = SFX[c.type]; if (!fn) { console.warn('missing sfx', c.type); continue; }
  const buf = fn(c);
  add(c.t, buf, { gain: c.gain * 0.85, pan: PAN[c.type] ?? 0, rev: ['shimmer', 'confirm', 'stamp', 'glint', 'logoHit', 'sweep'].includes(c.type) ? 0.35 : 0.12 });
}

// ------------------------------------------------------------------ reverb (Freeverb-style) + master
function reverb(inp, combs, aps) {
  const out = new Float32Array(N);
  for (const d of combs) { const buf = new Float32Array(d); let idx = 0, f = 0; for (let i = 0; i < N; i++) { const y = buf[idx]; f = y * 0.7 + f * 0.3; buf[idx] = inp[i] + f * 0.82; idx = (idx + 1) % d; out[i] += y / combs.length; } }
  for (const d of aps) { const buf = new Float32Array(d); let idx = 0; for (let i = 0; i < N; i++) { const b = buf[idx]; const y = -out[i] + b; buf[idx] = out[i] + b * 0.5; idx = (idx + 1) % d; out[i] = y; } }
  return out;
}
const rl = reverb(sendL, [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((x) => Math.round(x * SR / 44100)), [556, 441, 341, 225]);
const rr = reverb(sendR, [1580, 1640, 1514, 1445, 1300, 1379, 1211, 1139].map((x) => Math.round(x * SR / 44100)), [579, 464, 364, 248]);
for (let i = 0; i < N; i++) { L[i] += rl[i] * 0.55; R[i] += rr[i] * 0.55; }
// gentle bus compression + soft clip, fades
let envF = 0;
for (let i = 0; i < N; i++) {
  const lvl = Math.max(Math.abs(L[i]), Math.abs(R[i]));
  envF = lvl > envF ? envF + (lvl - envF) * 0.01 : envF + (lvl - envF) * 0.0002;
  const gr = envF > 0.5 ? 0.5 / envF + (1 - 0.5 / envF) * 0.4 : 1;
  const t = i / SR, fade = Math.min(1, t / 0.05) * Math.min(1, (DUR - t) / 0.35);
  L[i] = Math.tanh(L[i] * gr * 1.1) * fade; R[i] = Math.tanh(R[i] * gr * 1.1) * fade;
}
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = 0.89 / peak;
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8); out.write('fmt ', 12);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { out.writeInt16LE(Math.round(clamp(L[i] * norm, -1, 1) * 32767), 44 + i * 4); out.writeInt16LE(Math.round(clamp(R[i] * norm, -1, 1) * 32767), 46 + i * 4); }
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
fs.writeFileSync(path.join(root, 'out', 'audio.wav'), out);
// cue sheet for reference
fs.writeFileSync(path.join(root, 'out', 'cue-sheet.json'), JSON.stringify({ bpm: MUSIC.bpm, gridOffset: +grid0.toFixed(4), cues: soundCues() }, null, 1));
console.log(`audio.wav  ${DUR}s  peak-normalised ×${norm.toFixed(2)}  grid0=${grid0.toFixed(3)}s`);
