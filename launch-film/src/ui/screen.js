// The laptop's interface, drawn with Canvas2D every frame from COPY + time.
// Design space is 1280×800 (16:10), rendered at 2880×1800 so close-ups stay crisp.
import * as THREE from 'three';
import { COPY } from '../config/timeline.js';
import { BRAND } from '../config/brand.js';
import { drawClaude, drawHF, rrect, checkMark } from './icons.js';
import { clamp, remap, smooth, easeOutBack, easeOutCubic, typed, window01 } from '../lib/anim.js';

const W = 1280, H = 800, K = 2.25;
const C = BRAND.color;
const F = (w, px, fam = 'Inter') => `${w} ${px}px "${fam}"`;

// layout constants (design px) — editable
export const UI_LAYOUT = {
  sidebar: 210,
  card: { x: 330, y: 300, w: 660, h: 210, r: 26 },
  modeAnchor: { x: 850, y: 478 }, // "Adaptive" label in the input card
  send: { x: 930, y: 452, s: 40 },
  viewport: { x: 250, y: 120, w: 990, h: 530, r: 22 }, // 3D viewport in the model shot
};

export function createScreenUI(thumbs) {
  const canvas = document.createElement('canvas');
  canvas.width = W * K; canvas.height = H * K;
  const g = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 16;
  texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter;

  function text(str, x, y, font, color, align = 'left') { g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(str, x, y); return g.measureText(str).width; }
  function shimmerText(str, x, y, font, base, t, speed = 1.2) {
    g.font = font; const w = g.measureText(str).width;
    const p = ((t * speed) % 1.6) - 0.3;
    const grd = g.createLinearGradient(x, 0, x + w, 0);
    grd.addColorStop(0, base); grd.addColorStop(clamp(p - 0.15), base); grd.addColorStop(clamp(p), '#e9e6e1'); grd.addColorStop(clamp(p + 0.15), base); grd.addColorStop(1, base);
    g.fillStyle = grd; g.textAlign = 'left'; g.fillText(str, x, y); return w;
  }

  function chrome(t) {
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
    // sidebar
    g.fillStyle = '#EDE9E3'; g.fillRect(0, 0, UI_LAYOUT.sidebar, H);
    [['#ED6A5E', 22], ['#F4BF4F', 40], ['#61C554', 58]].forEach(([c, x]) => { g.fillStyle = c; g.beginPath(); g.arc(x, 24, 6, 0, 7); g.fill(); });
    text('+', 26, 74, F(500, 18), '#6b655f'); text(COPY.newChat, 44, 73, F(500, 15), '#45403b');
    g.fillStyle = '#DFDAD3';
    [118, 150, 182, 214, 246, 278, 310].forEach((y, i) => { rrect(g, 24, y, 140 - (i * 17) % 50, 10, 5); g.fill(); });
    // top bar
    text(COPY.appModel, 240, 38, F(700, 19), '#25221f');
    g.strokeStyle = '#25221f'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(323, 30); g.lineTo(328, 35); g.lineTo(333, 30); g.stroke();
    // MCP pill
    g.font = F(500, 14); const bw = g.measureText(COPY.mcpBadge).width + 64;
    const bx = W - bw - 24; g.fillStyle = '#ECEAE4'; rrect(g, bx, 16, bw, 32, 16); g.fill();
    drawHF(g, bx + 20, 32, 13, { badge: true });
    text(COPY.mcpBadge, bx + 36, 37, F(500, 14), '#4b4640');
    g.fillStyle = C.lime; g.beginPath(); g.arc(bx + bw - 14, 32, 4 + Math.sin(t * 6) * 0.6, 0, 7); g.fill();
  }

  function attachmentThumb(x, y, w, h, img, r = 10) {
    g.save(); rrect(g, x, y, w, h, r); g.clip();
    if (img) g.drawImage(img, x, y, w, h); else { g.fillStyle = '#ddd'; g.fillRect(x, y, w, h); }
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 1; rrect(g, x, y, w, h, r); g.stroke();
  }
  function pdfCard(x, y, w, h) {
    g.fillStyle = '#FBFAF7'; rrect(g, x, y, w, h, 10); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.1)'; g.stroke();
    text(COPY.attachmentPdf.split(' ')[0], x + w - 10, y + 22, F(600, 10), '#3b3632', 'right');
    text(COPY.attachmentPdf.split(' ')[1] || '', x + w - 10, y + 34, F(600, 10), '#3b3632', 'right');
    g.fillStyle = '#E5E1DA'; for (let i = 0; i < 4; i++) { rrect(g, x + 10, y + 44 + i * 8, w - 22 - (i % 2) * 14, 3, 1.5); g.fill(); }
    g.strokeStyle = '#bdb6ad'; rrect(g, x + 10, y + h - 22, 28, 14, 7); g.stroke(); text('PDF', x + 24, y + h - 12, F(600, 7), '#8d867e', 'center');
  }
  function cursor(x, y, press = 0) {
    g.save(); g.translate(x, y); const s = 1 - press * 0.15; g.scale(s, s);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 26); g.lineTo(7, 20); g.lineTo(12, 31); g.lineTo(17, 29); g.lineTo(12, 18); g.lineTo(21, 18); g.closePath();
    g.fillStyle = '#111'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.restore();
    if (press > 0) { g.strokeStyle = `rgba(217,119,87,${press})`; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 10 + (1 - press) * 22, 0, 7); g.stroke(); }
  }

  // ------------------------------------------------------------ states
  function home(t) {
    const L = UI_LAYOUT.card;
    const intro = easeOutCubic(remap(t, 6.2, 6.6));
    g.globalAlpha = intro;
    drawClaude(g, 420, 246, 30, C.claude, t * 0.4);
    text(COPY.homeTitle, 446, 257, F(500, 32, 'Manrope'), '#625c56');
    g.globalAlpha = 1;
    // card
    g.save(); g.shadowColor = 'rgba(90,60,40,0.12)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
    g.fillStyle = '#FFFFFF'; rrect(g, L.x, L.y, L.w, L.h, L.r); g.fill(); g.restore();
    g.strokeStyle = '#E6E1DA'; g.lineWidth = 1.2; rrect(g, L.x, L.y, L.w, L.h, L.r); g.stroke();
    // attachments drop in
    const a1 = easeOutBack(remap(t, 6.35, 6.7)), a2 = easeOutBack(remap(t, 6.5, 6.85));
    g.save(); g.globalAlpha = clamp(a1 * 2); g.translate(0, (1 - a1) * 20); attachmentThumb(L.x + 22, L.y + 20, 122, 88, thumbs.rusty); g.restore();
    g.save(); g.globalAlpha = clamp(a2 * 2); g.translate(0, (1 - a2) * 20); pdfCard(L.x + 156, L.y + 18, 92, 92); g.restore();
    // typed prompt
    const full = COPY.prompt.join('');
    const shown = typed(full, t, 6.75, 33);
    const p0 = shown.slice(0, COPY.prompt[0].length), p1 = shown.slice(COPY.prompt[0].length);
    let x = L.x + 24; const y = L.y + 152;
    x += text(p0, x, y, F(400, 20), '#2b2724');
    x += text(p1, x, y, F(500, 20), C.coral);
    if (Math.floor(t * 2.4) % 2 === 0 || shown.length < full.length) { g.fillStyle = '#2b2724'; g.fillRect(x + 2, y - 18, 2, 22); }
    text('+', L.x + 26, L.y + L.h - 22, F(400, 26), '#6b655f');
    // model selector
    const mx = UI_LAYOUT.modeAnchor.x, my = UI_LAYOUT.modeAnchor.y;
    text(COPY.appModel, mx - 12, my, F(500, 15), '#4b4640', 'right');
    text(COPY.appMode, mx, my, F(500, 15), '#8d867e');
    g.strokeStyle = '#8d867e'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(mx + 70, my - 8); g.lineTo(mx + 74, my - 4); g.lineTo(mx + 78, my - 8); g.stroke();
    // send button (pressed at 8.8)
    const press = window01(t, 8.75, 8.95, 0.08);
    const S = UI_LAYOUT.send; const s = S.s * (1 - press * 0.12);
    g.fillStyle = C.coral; rrect(g, S.x + (S.s - s) / 2, S.y + (S.s - s) / 2, s, s, 12); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(S.x + 20, S.y + 30); g.lineTo(S.x + 20, S.y + 11); g.moveTo(S.x + 12, S.y + 19); g.lineTo(S.x + 20, S.y + 11); g.lineTo(S.x + 28, S.y + 19); g.stroke();
    // dropdown (8.25–8.7) + cursor
    const dd = window01(t, 8.22, 8.72, 0.1);
    if (dd > 0) {
      g.save(); g.globalAlpha = dd; g.translate(0, (1 - dd) * 8);
      const dx = mx - 20, dy = my - 160, dw = 290, dh = 140;
      g.shadowColor = 'rgba(60,40,30,0.18)'; g.shadowBlur = 24; g.fillStyle = '#fff'; rrect(g, dx, dy, dw, dh, 14); g.fill(); g.shadowBlur = 0;
      COPY.appModes.forEach(([n, d], i) => {
        const yy = dy + 30 + i * 40, sel = i === 0;
        if (sel) { g.fillStyle = '#F5EFE9'; rrect(g, dx + 8, yy - 20, dw - 16, 38, 9); g.fill(); }
        text(n, dx + 20, yy - 2, F(600, 14), sel ? '#25221f' : '#59534d');
        text(d, dx + 20, yy + 13, F(400, 11), '#9a938b');
        if (sel) checkMark(g, dx + dw - 26, yy - 2, 18, C.coral, 0.13);
      });
      g.restore();
    }
    // cursor path: from lower-left into "Adaptive", click, then to send
    if (t > 7.9) {
      const k1 = easeOutCubic(remap(t, 7.95, 8.3)), k2 = easeOutCubic(remap(t, 8.45, 8.75));
      const cx = mx + 20 + (1 - k1) * -140 + k2 * (S.x + 20 - mx - 20);
      const cy = my - 4 + (1 - k1) * 90 + k2 * (S.y + 22 - my + 4);
      const pr = window01(t, 8.32, 8.42, 0.04) + window01(t, 8.78, 8.9, 0.04);
      cursor(cx, cy, clamp(pr));
    }
  }

  function userBubble(t, y0 = 70) {
    const a = easeOutCubic(remap(t, 8.95, 9.25));
    g.save(); g.globalAlpha = a; g.translate((1 - a) * 30, 0);
    attachmentThumb(W - 250, y0, 120, 80, thumbs.rusty, 10);
    pdfCard(W - 120, y0, 80, 80);
    g.font = F(500, 15); const msg = COPY.prompt.join(''); const w = g.measureText(msg).width + 32;
    g.fillStyle = '#EAE6E0'; rrect(g, W - 40 - w, y0 + 96, w, 38, 19); g.fill();
    text(msg, W - 40 - w + 16, y0 + 120, F(500, 15), '#3a3531');
    g.restore();
  }

  function conversation(t) {
    userBubble(t);
    const big = 1 - smooth(remap(t, 13.8, 14.5)); // "Checking" headline shrinks into the thread
    const x0 = 270;
    // line 1 — checking
    if (t > 9.05) {
      const a = easeOutCubic(remap(t, 9.05, 9.35));
      g.save(); g.globalAlpha = a;
      const size = 22 + big * 20, y = 272 - big * 0;
      drawClaude(g, x0 + 2, y - size * 0.35, size * 1.0, C.claude, t * (big > 0.5 ? 2.2 : 0.4));
      const tx = x0 + size * 0.95;
      if (t < 14.5) shimmerText(COPY.checking, tx, y, F(700, size, 'Manrope'), '#3a3531', t);
      else text(COPY.checking, tx, y, F(600, size, 'Manrope'), '#8f8780');
      g.restore();
    }
    // line 2 — verdict (14.6+)
    if (t > 14.6) {
      const a = easeOutCubic(remap(t, 14.6, 14.95)), y = 340;
      g.save(); g.globalAlpha = a; g.translate(0, (1 - a) * 12);
      drawClaude(g, x0 + 4, y - 9, 30, C.claude, t * 0.6);
      const shown = typed(COPY.verdictBold + COPY.verdictRest, t, 14.7, 60);
      const b = shown.slice(0, COPY.verdictBold.length), r = shown.slice(COPY.verdictBold.length);
      let x = x0 + 30;
      x += text(b, x, y, F(700, 26, 'Manrope'), '#1f1c1a');
      text(r, x, y, F(500, 26, 'Manrope'), '#6f6862');
      g.restore();
    }
    if (t > 15.15) {
      const a = easeOutCubic(remap(t, 15.15, 15.45)), y = 404;
      g.save(); g.globalAlpha = a;
      drawHF(g, x0 + 4, y - 8, 15, { badge: true });
      let x = x0 + 26;
      x += text(COPY.usingHF[0], x, y, F(500, 22), '#5b554f');
      x += shimmerText(COPY.usingHF[1], x, y, F(600, 22), C.coral, t, 0.9);
      text(typed(COPY.usingHF[2], t, 15.4, 40), x, y, F(500, 22), '#5b554f');
      g.restore();
    }
    // line 3 — ready / generating (22.0+)
    if (t > 21.95) {
      const a = easeOutCubic(remap(t, 21.95, 22.25)), y = 470;
      g.save(); g.globalAlpha = a;
      drawClaude(g, x0 + 4, y - 9, 28, C.claude, t * 0.6);
      text(COPY.readyBold, x0 + 30, y, F(700, 24, 'Manrope'), '#1f1c1a');
      drawHF(g, x0 + 4, y + 40, 13, { badge: true });
      shimmerText(COPY.generating, x0 + 26, y + 46, F(500, 18), '#ad5a45', t);
      // image tiles
      const tiles = [thumbs.v1, thumbs.v2, thumbs.v3];
      tiles.forEach((img, i) => {
        const k = easeOutBack(remap(t, 22.35 + i * 0.2, 22.65 + i * 0.2));
        const x = x0 + 30 + i * 196, yy = y + 70;
        g.save(); g.globalAlpha = clamp(k * 1.5);
        g.fillStyle = '#E9E4DD'; rrect(g, x, yy, 180, 120, 14); g.fill();
        if (k > 0.05) attachmentThumb(x, yy, 180, 120, img, 14);
        g.restore();
      });
    }
  }

  function modelView(t) {
    const VP = UI_LAYOUT.viewport;
    text(COPY.appModel, 240, 38, F(700, 19), '#25221f');
    drawHF(g, VP.x + 10, VP.y - 30, 15, { badge: true });
    text(COPY.finalModel, VP.x + 30, VP.y - 24, F(600, 20), '#3a3531');
    // the viewport is drawn by the screen shader (live 3D); draw a frame + bottom UI here
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2; rrect(g, VP.x, VP.y, VP.w, VP.h, VP.r); g.stroke();
    // check stamp handled in 3D; question chip
    const q = easeOutBack(remap(t, 24.05, 24.35));
    const done = remap(t, 24.72, 24.88), qOut = remap(t, 24.6, 24.7);
    if (q > 0) {
      const cw = 440, ch = 58, cx = VP.x + VP.w / 2 - cw / 2, cy = VP.y + VP.h + 30; // below the live viewport
      g.save(); g.globalAlpha = clamp(q * 2); g.translate(0, (1 - q) * 20);
      g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 20; g.fillStyle = '#FBFAF7'; rrect(g, cx, cy, cw, ch, 29); g.fill(); g.shadowBlur = 0;
      if (qOut < 1) {
        g.globalAlpha *= 1 - qOut;
        drawClaude(g, cx + 30, cy + 29, 22, C.claude);
        text(COPY.guideQ, cx + 50, cy + 36, F(600, 17), '#2b2724');
        const yp = window01(t, 24.5, 24.62, 0.04);
        g.fillStyle = C.coral; rrect(g, cx + cw - 128, cy + 13, 56 - yp * 4, 32, 16); g.fill();
        text(COPY.yes, cx + cw - 100, cy + 35, F(700, 15), '#fff', 'center');
        g.fillStyle = '#1f1c1a'; rrect(g, cx + cw - 64, cy + 13, 50, 32, 16); g.fill();
        text(COPY.no, cx + cw - 39, cy + 35, F(700, 15), '#fff', 'center');
        const k = easeOutCubic(remap(t, 24.2, 24.48));
        cursor(cx + cw - 100 + (1 - k) * 160, cy + 30 + (1 - k) * 80, clamp(window01(t, 24.48, 24.6, 0.04)));
      } else g.globalAlpha = 1;
      if (done > 0) {
        g.globalAlpha = done;
        g.fillStyle = '#EDEAE5'; rrect(g, cx + 16, cy + 12, 34, 34, 8); g.fill();
        g.strokeStyle = '#8a837b'; g.lineWidth = 1.5; rrect(g, cx + 25, cy + 19, 16, 20, 2); g.stroke();
        text(COPY.guideFile[0], cx + 64, cy + 29, F(700, 17), '#1f1c1a');
        text(COPY.guideFile[1], cx + 64, cy + 47, F(500, 12), '#8a837b');
        g.strokeStyle = '#d5d0c9'; rrect(g, cx + cw - 128, cy + 12, 110, 34, 17); g.stroke();
        text(COPY.guideFile[2] + '  ⌄', cx + cw - 73, cy + 34, F(600, 14), '#2b2724', 'center');
      }
      g.restore();
    }
  }

  function draw(t) {
    g.setTransform(K, 0, 0, K, 0, 0);
    chrome(t);
    if (t < 8.95) home(t);
    else if (t < 23.4) conversation(t);
    else modelView(t);
    texture.needsUpdate = true;
  }
  return { canvas, texture, draw };
}

// ---------------------------------------------------------------- floating cards (3D planes)
export function makeCardCanvas(w, h, scale = 3) {
  const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d'); g.scale(scale, scale);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
  return { c, g, tex, w, h };
}

function stepIcon(g, kind, x, y, s, fg) {
  g.save(); g.translate(x, y); g.strokeStyle = fg; g.fillStyle = fg; g.lineWidth = s * 0.09; g.lineCap = 'round'; g.lineJoin = 'round';
  if (kind === 'fork') { g.beginPath(); g.moveTo(0, -s * 0.38); g.lineTo(0, -s * 0.12); g.moveTo(-s * 0.22, s * 0.36); g.lineTo(-s * 0.22, -s * 0.12); g.lineTo(s * 0.22, -s * 0.12); g.lineTo(s * 0.22, s * 0.36); g.stroke(); }
  if (kind === 'wheel') { g.beginPath(); g.arc(0, 0, s * 0.36, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, s * 0.08, 0, 7); g.fill(); for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; g.beginPath(); g.moveTo(Math.cos(a) * s * 0.1, Math.sin(a) * s * 0.1); g.lineTo(Math.cos(a) * s * 0.33, Math.sin(a) * s * 0.33); g.stroke(); } }
  if (kind === 'bars') { g.beginPath(); g.moveTo(-s * 0.4, -s * 0.12); g.quadraticCurveTo(-s * 0.2, s * 0.05, 0, s * 0.05); g.quadraticCurveTo(s * 0.2, s * 0.05, s * 0.4, -s * 0.12); g.moveTo(0, s * 0.05); g.lineTo(0, s * 0.38); g.stroke(); }
  if (kind === 'bike') { for (const cx of [-0.26, 0.26]) { g.beginPath(); g.arc(cx * s, s * 0.14, s * 0.18, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(-s * 0.26, s * 0.14); g.lineTo(-s * 0.05, -s * 0.16); g.lineTo(s * 0.17, -s * 0.16); g.lineTo(s * 0.26, s * 0.14); g.moveTo(-s * 0.05, -s * 0.16); g.lineTo(0, s * 0.14); g.lineTo(s * 0.17, -s * 0.16); g.moveTo(s * 0.14, -s * 0.26); g.lineTo(s * 0.17, -s * 0.16); g.stroke(); }
  g.restore();
}

export function drawStepCard(card, step, i, progress) {
  const { g, w, h } = card;
  g.clearRect(0, 0, w, h);
  g.save(); g.shadowColor = 'rgba(80,50,30,0.0)';
  g.fillStyle = 'rgba(250,248,244,0.94)'; rrect(g, 2, 2, w - 4, h - 4, 18); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; rrect(g, 2, 2, w - 4, h - 4, 18); g.stroke(); g.restore();
  const tiles = [[C.claude, '#fff'], [C.lime, '#163000'], [C.coral, '#fff'], ['#151515', '#fff']];
  const [bg, fg] = tiles[i % 4];
  g.fillStyle = bg; rrect(g, 18, 20, 52, 52, 12); g.fill();
  stepIcon(g, step.icon, 44, 46, 40, fg);
  g.font = F(600, 10); g.fillStyle = '#a49c93'; g.fillText(step.k, 84, 34);
  g.font = F(700, 19, 'Manrope'); g.fillStyle = '#1f1c1a'; g.fillText(step.title, 84, 56);
  g.font = F(500, 12); g.fillStyle = '#8b847c'; g.fillText(step.sub, 84, 74);
  // progress bar
  g.fillStyle = '#ECE8E2'; rrect(g, 18, h - 22, w - 36, 6, 3); g.fill();
  g.fillStyle = C.lime; rrect(g, 18, h - 22, (w - 36) * clamp(progress), 6, 3); g.fill();
  card.tex.needsUpdate = true;
}

export function drawPlanHeader(card, n, t) {
  const { g, w, h } = card;
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(250,248,244,0.96)'; rrect(g, 2, 2, w - 4, h - 4, (h - 4) / 2); g.fill();
  drawHF(g, 32, h / 2, 16, { badge: true });
  g.font = F(500, 21); g.fillStyle = '#2b2724'; g.textAlign = 'left'; g.fillText(COPY.planTitle, 58, h / 2 + 7);
  g.font = F(700, 22, 'Manrope'); g.fillStyle = C.coral; g.textAlign = 'right'; g.fillText(`${n}/4`, w - 24, h / 2 + 8); g.textAlign = 'left';
  card.tex.needsUpdate = true;
}

export function drawStamp(card) {
  const { g, w, h } = card;
  g.clearRect(0, 0, w, h);
  const r = w / 2 - 4;
  const grd = g.createRadialGradient(w * 0.42, h * 0.38, r * 0.1, w / 2, h / 2, r);
  grd.addColorStop(0, '#F07A62'); grd.addColorStop(1, '#C2412F');
  g.fillStyle = grd; g.beginPath(); g.arc(w / 2, h / 2, r, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, r - 5, 0, 7); g.stroke();
  checkMark(g, w / 2, h / 2 + 2, r * 1.15, '#fff', 0.16);
  card.tex.needsUpdate = true;
}

export function drawPill(card, label, { bg = C.lime, fg = '#163000', font = F(800, 30, 'Space Grotesk') } = {}) {
  const { g, w, h } = card;
  g.clearRect(0, 0, w, h);
  g.fillStyle = bg; rrect(g, 3, 3, w - 6, h - 6, (h - 6) / 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; rrect(g, 5, 5, w - 10, h - 10, (h - 10) / 2); g.stroke();
  g.font = font; g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, w / 2, h / 2 + 1);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  card.tex.needsUpdate = true;
}

export function drawImageCard(card, img, { circled = false, t = 0 } = {}) {
  const { g, w, h } = card;
  g.clearRect(0, 0, w, h);
  g.save(); rrect(g, 4, 4, w - 8, h - 8, 16); g.clip(); g.drawImage(img, 4, 4, w - 8, h - 8); g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 6; rrect(g, 4, 4, w - 8, h - 8, 16); g.stroke();
  if (circled) { // hand-drawn coral ellipse
    g.strokeStyle = C.coral; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath();
    const k = clamp(t);
    for (let i = 0; i <= 60 * k; i++) { const a = -0.6 + (i / 60) * Math.PI * 2.15; const x = w / 2 + Math.cos(a) * (w * 0.44 + Math.sin(i * 0.7) * 2), y = h / 2 + Math.sin(a) * (h * 0.4 + Math.cos(i * 0.5) * 2); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  card.tex.needsUpdate = true;
}

export function drawSketch(card, t) {
  const { g, w, h } = card;
  g.fillStyle = '#F7F2EA'; g.fillRect(0, 0, w, h);
  g.font = F(700, 11, 'Space Grotesk'); g.fillStyle = '#3a3531'; g.fillText(COPY.sketchTitle, 14, 22);
  g.strokeStyle = '#3a3531'; g.lineWidth = 1.6; g.lineCap = 'round';
  // hand-drawn bike silhouette that "draws on"
  const k = clamp(t);
  const seg = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  g.save(); g.beginPath(); g.rect(0, 0, w * (0.1 + 0.9 * k), h); g.clip();
  for (const cx of [62, 178]) { g.beginPath(); g.ellipse(cx, 112, 38, 37, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, 112, 3, 0, 7); g.stroke(); }
  seg([[62, 112], [104, 104], [94, 62], [62, 112]]); seg([[94, 62], [150, 58], [104, 104]]); seg([[150, 58], [178, 112]]);
  seg([[147, 50], [156, 44], [168, 46]]); seg([[90, 56], [94, 62]]); seg([[80, 54], [102, 54]]);
  g.restore();
  g.strokeStyle = C.coral; g.lineWidth = 1.8;
  if (k > 0.8) { g.beginPath(); g.ellipse(178, 112, 46, 45, 0, 0, Math.PI * 2 * remap(k, 0.8, 1)); g.stroke(); g.font = F(600, 10); g.fillStyle = C.coral; g.fillText('29 × 2.4"', 196, 64); }
  card.tex.needsUpdate = true;
}
