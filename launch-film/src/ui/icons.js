// Brand marks as Path2D (parsed from the SVG files so they stay the single source of truth).
import { BRAND } from '../config/brand.js';

export const ICONS = { claude: null, hf: null, claudeVB: 100, hfVB: 20, claudeSvg: '', hfSvg: '' };

export async function loadIcons() {
  const [c, h] = await Promise.all([fetch(BRAND.logos.claude).then((r) => r.text()), fetch(BRAND.logos.higgsfield).then((r) => r.text())]);
  ICONS.claudeSvg = c; ICONS.hfSvg = h;
  const d = (s) => [...s.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]).join(' ');
  const vb = (s) => Number((s.match(/viewBox="0 0 ([\d.]+)/) || [0, 100])[1]);
  ICONS.claude = new Path2D(d(c)); ICONS.claudeVB = vb(c);
  ICONS.hf = new Path2D(d(h)); ICONS.hfVB = vb(h);
}

/** Draw the Claude spark centred at (x,y) with size s, optional rotation. */
export function drawClaude(g, x, y, s, color = BRAND.color.claude, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s / ICONS.claudeVB, s / ICONS.claudeVB); g.translate(-ICONS.claudeVB / 2, -ICONS.claudeVB / 2);
  g.fillStyle = color; g.fill(ICONS.claude); g.restore();
}
/** Higgsfield glyph; with `badge` draws it on the lime rounded square used in product UI. */
export function drawHF(g, x, y, s, { badge = false, color = BRAND.color.ink } = {}) {
  g.save();
  if (badge) {
    const b = s * 1.5; g.fillStyle = BRAND.color.lime; rrect(g, x - b / 2, y - b / 2, b, b, b * 0.22); g.fill();
    color = BRAND.color.hfBadgeInk;
  }
  g.translate(x - s / 2, y - s / 2); g.scale(s / ICONS.hfVB, s / ICONS.hfVB); g.fillStyle = color; g.fill(ICONS.hf); g.restore();
}
export function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function checkMark(g, x, y, s, color = '#fff', lw = 0.14) {
  g.save(); g.strokeStyle = color; g.lineWidth = s * lw; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x - s * 0.32, y + s * 0.02); g.lineTo(x - s * 0.08, y + s * 0.26); g.lineTo(x + s * 0.36, y - s * 0.24); g.stroke(); g.restore();
}
