// 2D overlay plates composited over the 3D frame: real HTML text + inline SVG logos, so every
// word and mark is resolution-independent and editable. Hand-drawn accents are SVG strokes
// with a 3-frame "boil" so they read as drawn, and are placed to never cover product or copy.
import { COPY, RIDE } from '../config/timeline.js';
import { BRAND } from '../config/brand.js';
import { ICONS } from './icons.js';
import { clamp, remap, smooth, easeOutCubic, easeOutBack, window01, typed, rng } from '../lib/anim.js';

const C = BRAND.color;
const $ = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
const svgInline = (svg, cls, color) => svg.replace('<svg', `<svg class="${cls}"`).replace(/fill="#[0-9A-Fa-f]{6}"/g, color ? `fill="${color}"` : '$&');

export function createOverlay(root) {
  const hf = (cls = 'mk', color) => svgInline(ICONS.hfSvg, cls, color);
  const cl = (cls = 'mk') => svgInline(ICONS.claudeSvg, cls);
  const lockupHTML = (size) => `<div class="lockup" style="--s:${size}px">
      <span class="lk-item">${hf('mk hfmk')}<b>${COPY.lockup.left}</b></span>
      <span class="lk-x">${COPY.lockup.sep}</span>
      <span class="lk-item">${cl('mk clmk')}<b>${COPY.lockup.right}</b></span></div>`;

  const el = {
    top: $(`<div class="ov ov-top">${lockupHTML(42)}</div>`),
    hud: $(`<div class="ov hud"><i class="br tl"></i><i class="br tr"></i><i class="br bl"></i><i class="br br_"></i>
              <span class="hud-l">${COPY.hudFile}</span><span class="hud-r"></span><div class="scanline"></div></div>`),
    cond: [0, 1].map(() => $(`<div class="ov cond"><span class="cond-l">${COPY.condition}</span><span class="cond-v"></span></div>`)),
    pill: $(`<div class="ov pill"><span class="pill-badge">${hf('mk', C.hfBadgeInk)}</span><span class="pill-t"></span><i class="pill-bar"></i></div>`),
    tagline: $(`<div class="ov tagline"></div>`),
    end: $(`<div class="ov endcard">${lockupHTML(58)}<div class="avail">${COPY.availability}</div></div>`),
    svg: $(`<svg class="ov accents" viewBox="0 0 1920 1080" preserveAspectRatio="none"></svg>`),
    wipeFill: $(`<div class="ov wipefill"></div>`),
  };
  root.append(el.top, el.hud, ...el.cond, el.pill, el.tagline, el.end, el.wipeFill, el.svg);

  // ---------------------------------------------------- hand-drawn strokes
  const NS = 'http://www.w3.org/2000/svg';
  const jitterPath = (pts, seed, amp) => {
    const r = rng(seed); let d = '';
    pts.forEach(([x, y], i) => { const jx = x + (r() - 0.5) * amp, jy = y + (r() - 0.5) * amp; d += (i ? (i === 1 ? ' Q' : ' T') : 'M') + `${jx.toFixed(1)} ${jy.toFixed(1)}`; if (i === 1) { const [x2, y2] = pts[Math.min(2, pts.length - 1)]; d += ` ${(x2 + jx) / 2} ${(y2 + jy) / 2}`; } });
    return d;
  };
  const strokes = {};
  function stroke(name, pts, { width = 6, color = C.ink, amp = 4, cap = 'round', opacity = 1 } = {}) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', color); p.setAttribute('stroke-width', width);
    p.setAttribute('stroke-linecap', cap); p.setAttribute('stroke-linejoin', 'round'); p.style.opacity = opacity;
    el.svg.appendChild(p);
    const variants = [0, 1, 2].map((k) => jitterPath(pts, name.length * 31 + k * 7, amp));
    p.setAttribute('d', variants[0]);
    const len = p.getTotalLength() * 1.05;
    strokes[name] = { p, variants, len, opacity };
    return strokes[name];
  }
  /** draw-on k∈[0,1], erase e∈[0,1] (from the start), boil by frame index */
  function drawStroke(name, k, e = 0, frame = 0) {
    const s = strokes[name]; if (!s) return;
    s.p.setAttribute('d', s.variants[Math.floor(frame / 3) % 3]);
    if (k <= 0 || e >= 1) { s.p.style.display = 'none'; return; }
    s.p.style.display = '';
    s.p.style.strokeDasharray = `${s.len} ${s.len}`;
    s.p.style.strokeDashoffset = `${s.len * (1 - k)}`;
    if (e > 0) { s.p.style.strokeDasharray = `0 ${s.len * e} ${s.len * (k - e)} ${s.len}`; s.p.style.strokeDashoffset = '0'; }
  }
  // lime brush wipe (zig-zag passes covering the frame)
  const zig = []; for (let i = 0; i <= 6; i++) { zig.push([i % 2 ? 2150 : -250, -120 + i * 220]); }
  stroke('wipe', zig, { width: 330, color: C.lime, amp: 40, cap: 'round' });
  // accents
  stroke('spark1a', [[1475, 160], [1500, 128]], { width: 7, color: C.coral, amp: 3 });
  stroke('spark1b', [[1510, 175], [1548, 160]], { width: 7, color: C.coral, amp: 3 });
  stroke('spark1c', [[1486, 192], [1478, 228]], { width: 7, color: C.coral, amp: 3 });
  stroke('underline', [[690, 0], [960, 8], [1240, -2]], { width: 7, color: C.lime, amp: 6 });
  for (let i = 0; i < 3; i++) stroke('swoosh' + i, [[0, 0], [70, -6], [150, -4]], { width: 6, color: C.ink, amp: 3 });
  stroke('arrow', [[300, 880], [380, 840], [450, 852]], { width: 6, color: C.ink, amp: 4 });
  stroke('arrowHead', [[422, 828], [452, 852], [420, 872]], { width: 6, color: C.ink, amp: 3 });
  // burst lines (flip launch)
  const burst = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.1;
    burst.push(stroke('burst' + i, [[Math.cos(a) * 290, Math.sin(a) * 250], [Math.cos(a) * 380, Math.sin(a) * 320], [Math.cos(a) * 460, Math.sin(a) * 390]], { width: 5, color: '#fff', amp: 6, opacity: 0.85 }));
  }

  // ---------------------------------------------------- per-frame update
  function update(t, frame, ctx) {
    const show = (e, on) => { e.style.display = on ? '' : 'none'; };
    // top lockup (title shot)
    const lk = window01(t, 1.55, 3.3, 0.25);
    show(el.top, lk > 0); el.top.style.opacity = lk; el.top.style.transform = `translate(-50%, ${(1 - easeOutCubic(remap(t, 1.55, 1.9))) * -16}px)`;
    // HUD
    const hud = window01(t, 3.3, 5.45, 0.12);
    show(el.hud, hud > 0); el.hud.style.opacity = hud;
    if (hud > 0) {
      el.hud.querySelector('.hud-r').textContent = t < 3.55 ? COPY.hudMode[0] : COPY.hudMode[1];
      const sl = remap(t, 3.6, 4.6); el.hud.querySelector('.scanline').style.cssText = `top:${8 + sl * 84}%;opacity:${window01(t, 3.6, 4.6, 0.1)}`;
      el.hud.style.setProperty('--flash', String(Math.max(0, 1 - Math.abs(t - 3.55) * 10)));
    }
    // condition tags (inspect shot), anchored to projected part bounds
    const conds = [
      { on: window01(t, 12.35, 14.5, 0.12), rect: ctx.rects?.wheels, value: 12, bad: true, t0: 12.35 },
      { on: window01(t, 13.35, 14.5, 0.12), rect: ctx.rects?.frame, value: 96, bad: false, t0: 13.35 },
    ];
    conds.forEach((c, i) => {
      const e = el.cond[i]; show(e, c.on > 0 && c.rect);
      if (!(c.on > 0 && c.rect)) return;
      const k = easeOutCubic(remap(t, c.t0, c.t0 + 0.3));
      const [x0, y0, x1, y1] = c.rect, pad = 14;
      e.style.left = `${x0 - pad}px`; e.style.top = `${y0 - pad}px`; e.style.width = `${(x1 - x0 + pad * 2) * (0.85 + 0.15 * k)}px`; e.style.height = `${y1 - y0 + pad * 2}px`;
      e.style.opacity = c.on; e.className = `ov cond ${c.bad ? 'bad' : 'good'}`;
      e.querySelector('.cond-v').textContent = `${Math.round(c.value * clamp(remap(t, c.t0, c.t0 + 0.5)))}%`;
    });
    // caption pill (assembly, test ride)
    let cap = null, capT0 = 0, pillOn = 0, prog = 0;
    if (t >= 18.1 && t < 21.2) {
      pillOn = window01(t, 18.1, 21.2, 0.15);
      for (const [ts, s] of COPY.assemblySteps) if (t >= ts) { cap = s; capT0 = ts; }
      prog = remap(t, 18.1, 21.0);
      if (cap) cap = { plain: typed(cap, t, capT0, 70) };
    } else if (t >= 25.35 && t < 26.6) {
      pillOn = window01(t, 25.35, 26.6, 0.15);
      const s = typed(COPY.testRide.join(''), t, 25.45, 40);
      cap = { a: s.slice(0, COPY.testRide[0].length), b: s.slice(COPY.testRide[0].length) };
      prog = remap(t, 25.35, 26.6);
    }
    show(el.pill, pillOn > 0 && cap);
    if (pillOn > 0 && cap) {
      el.pill.style.opacity = pillOn;
      el.pill.querySelector('.pill-t').innerHTML = cap.plain != null ? cap.plain : `<em>${cap.a}</em>${cap.b}`;
      el.pill.querySelector('.pill-bar').style.width = `${prog * 100}%`;
    }
    // tagline: types on during the flip, then moves up for the end card
    const tg = t >= 26.95;
    show(el.tagline, tg);
    if (tg) {
      el.tagline.textContent = typed(COPY.tagline, t, 26.95, 34);
      const up = easeOutCubic(remap(t, 28.35, 28.8));
      el.tagline.style.top = `${14.5 + up * 24.5}%`;
      el.tagline.style.fontSize = `${30 - up * 2}px`;
    }
    // end card
    const ec = smooth(remap(t, 28.4, 28.75));
    show(el.end, ec > 0); el.end.style.opacity = ec;
    if (ec > 0) {
      el.end.style.transform = `translate(-50%,-50%) scale(${0.96 + 0.04 * easeOutBack(remap(t, 28.4, 28.9)) + (t - 28.4) * 0.006})`;
      el.end.querySelector('.avail').style.opacity = smooth(remap(t, 28.75, 29.1));
    }
    // wipe (11.6 → 12.05)
    const wk = easeOutCubic(remap(t, 11.58, 11.84)), we = smooth(remap(t, 11.86, 12.1));
    drawStroke('wipe', wk, we, frame);
    el.wipeFill.style.opacity = String(window01(t, 11.76, 11.92, 0.05));
    show(el.wipeFill, t > 11.7 && t < 11.95);
    // accents
    const sp = window01(t, 17.62, 18.0, 0.08), spk = easeOutCubic(remap(t, 17.62, 17.8));
    ['spark1a', 'spark1b', 'spark1c'].forEach((n) => { drawStroke(n, spk * (sp > 0 ? 1 : 0), 0, frame); strokes[n].p.style.opacity = sp; });
    const ul = remap(t, 27.95, 28.25);
    const ulOn = t > 27.95 && t < 28.4;
    drawStroke('underline', ulOn ? easeOutCubic(ul) : 0, 0, frame);
    strokes.underline.p.setAttribute('transform', 'translate(0,412)');
    // speed swooshes trailing the bike during the ride/flip (anchored to projected bike)
    for (let i = 0; i < 3; i++) {
      const on = (t > 25.6 && t < 26.85) ? window01(t, 25.6, 26.85, 0.1) : 0;
      const b = ctx.bikeScreen;
      if (on > 0 && b) {
        strokes['swoosh' + i].p.setAttribute('transform', `translate(${b[0] - 470 - i * 18},${b[1] - 10 + i * 28})`);
        drawStroke('swoosh' + i, clamp(((t * 3 + i * 0.33) % 1) * 1.6), clamp(((t * 3 + i * 0.33) % 1) * 1.6 - 0.6), frame);
        strokes['swoosh' + i].p.style.opacity = on;
      } else drawStroke('swoosh' + i, 0);
    }
    // burst at launch, centred on the bike
    const bk = remap(t, 26.84, 27.2);
    burst.forEach((_, i) => {
      const n = 'burst' + i, b = ctx.bikeScreen;
      if (bk > 0 && bk < 1 && b) {
        strokes[n].p.setAttribute('transform', `translate(${b[0]},${b[1]}) scale(${1 + bk * 0.8})`);
        drawStroke(n, clamp(bk * 2.2), clamp(bk * 1.6 - 0.4), frame);
      } else drawStroke(n, 0);
    });
    // arrow hint toward the send button during the macro
    const ar = window01(t, 8.05, 8.6, 0.08);
    drawStroke('arrow', ar > 0 ? easeOutCubic(remap(t, 8.05, 8.3)) : 0, 0, frame); strokes.arrow.p.style.opacity = ar;
    drawStroke('arrowHead', ar > 0 ? easeOutCubic(remap(t, 8.25, 8.38)) : 0, 0, frame); strokes.arrowHead.p.style.opacity = ar;
  }
  return { update };
}

export const OVERLAY_CSS = `
.ov{position:absolute;pointer-events:none}
.mk{height:1em;width:auto;display:inline-block;vertical-align:-0.14em}
.lockup{display:flex;align-items:center;gap:calc(var(--s)*0.5);font:700 var(--s)/1 Inter,sans-serif;color:${C.ink};letter-spacing:-0.02em;white-space:nowrap}
.lockup .lk-item{display:flex;align-items:center;gap:calc(var(--s)*0.3)}
.lockup .lk-item .mk{height:calc(var(--s)*1.05)}
.lockup .lk-x{font-weight:400;opacity:.55;font-size:calc(var(--s)*0.8)}
.ov-top{left:50%;top:11%;}
.hud{inset:0}
.hud .br{position:absolute;width:46px;height:46px;border:3px solid rgba(30,26,24,.75)}
.hud .tl{left:60px;top:60px;border-right:0;border-bottom:0}.hud .tr{right:60px;top:60px;border-left:0;border-bottom:0}
.hud .bl{left:60px;bottom:60px;border-right:0;border-top:0}.hud .br_{right:60px;bottom:60px;border-left:0;border-top:0}
.hud-l,.hud-r{position:absolute;font:600 15px 'Space Grotesk',sans-serif;letter-spacing:.14em;color:rgba(30,26,24,.8)}
.hud-l{left:74px;bottom:76px}.hud-r{right:76px;top:78px}
.hud::after{content:'';position:absolute;inset:0;background:#fff;opacity:calc(var(--flash,0)*.55)}
.scanline{position:absolute;left:60px;right:60px;height:3px;background:${C.lime};box-shadow:0 0 18px 4px rgba(207,248,81,.55)}
.cond{border:3px solid;border-radius:6px}
.cond.bad{border-color:${C.coral};background:rgba(217,83,74,.06)}.cond.good{border-color:#7FB52E;background:rgba(207,248,81,.16)}
.cond-l{position:absolute;left:-3px;top:-34px;font:700 20px Inter,sans-serif;color:#2b2724}
.cond-v{position:absolute;right:6px;top:4px;font:700 18px Inter,sans-serif;padding:2px 8px;border-radius:5px;color:#fff}
.cond.bad .cond-v{background:${C.coral}}.cond.good .cond-v{background:#7FB52E}
.pill{left:50%;bottom:9%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:12px 24px 14px 14px;border-radius:999px;background:rgba(250,248,244,.92);
  box-shadow:0 10px 30px rgba(80,50,30,.18);font:500 22px Inter,sans-serif;color:#3a3531;white-space:nowrap;overflow:hidden}
.pill em{font-style:normal;color:${C.coral};font-weight:600}
.pill-badge{display:grid;place-items:center;width:30px;height:30px;border-radius:7px;background:${C.lime}}
.pill-badge .mk{height:18px}
.pill-bar{position:absolute;left:0;bottom:0;height:4px;background:${C.coral};border-radius:2px}
.tagline{left:50%;top:30%;transform:translateX(-50%);font:700 30px 'Space Grotesk',sans-serif;letter-spacing:.2em;color:${C.ink};white-space:nowrap;text-shadow:0 1px 0 rgba(255,255,255,.4)}
.endcard{left:50%;top:52%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:26px}
.avail{font:500 20px Inter,sans-serif;color:#5b544e}
.accents{inset:0;width:100%;height:100%;overflow:visible}
.wipefill{inset:0;background:${C.lime}}
`;
