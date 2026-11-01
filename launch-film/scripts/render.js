// Render the film: headless Chromium draws each frame deterministically, frames stream to ffmpeg.
//   node scripts/render.js                → out/higgsfield-claude-launch.mp4 (with out/audio.wav if present)
//   node scripts/render.js --preview      → contact sheet + stills at shot midpoints (out/preview)
//   node scripts/render.js --stills 3.5,12.2  → out/preview/still-<t>.png
//   node scripts/render.js --from 18 --to 21  → partial render (out/partial.mp4)
//   --workers N  parallel browser processes (default 2)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally; or add as a devDependency
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.js';
import { FILM, SHOTS } from '../src/config/timeline.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'out'); fs.mkdirSync(path.join(out, 'preview'), { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(k);
const server = await serve(0);
const url = `http://127.0.0.1:${server.address().port}/index.html`;

async function openPage() {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: FILM.width, height: FILM.height }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 180000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error(err);
  return { browser, page };
}
const shoot = async (page, t) => { await page.evaluate((tt) => window.renderFrame(tt), t); return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: FILM.width, height: FILM.height } }); };

if (has('--preview') || has('--stills')) {
  const { browser, page } = await openPage();
  const times = has('--stills') ? arg('--stills').split(',').map(Number) : SHOTS.map((s) => +(((s.t0 + s.t1) / 2).toFixed(2)));
  const files = [];
  for (const t of times) { const f = path.join(out, 'preview', `still-${t.toFixed(2).padStart(5, '0')}.png`); fs.writeFileSync(f, await shoot(page, t)); files.push(f); console.log('still', t); }
  await browser.close(); server.close();
  if (!has('--stills')) {
    await new Promise((r) => spawn('ffmpeg', ['-y', '-v', 'error', '-pattern_type', 'glob', '-i', path.join(out, 'preview', 'still-*.png'), '-vf', 'scale=480:-1,tile=5x4', '-frames:v', '1', path.join(out, 'preview', 'contact.png')], { stdio: 'inherit' }).on('close', r));
  }
  process.exit(0);
}

const from = Number(arg('--from', 0)), to = Number(arg('--to', FILM.duration));
const workers = Number(arg('--workers', 2));
const f0 = Math.round(from * FILM.fps), f1 = Math.round(to * FILM.fps);
const N = f1 - f0;
const partial = from > 0 || to < FILM.duration;
const frameDir = path.join(out, 'frames'); fs.mkdirSync(frameDir, { recursive: true });
let done = 0; const t0 = Date.now();
async function work(w) {
  const { browser, page } = await openPage();
  for (let f = f0 + w; f < f1; f += workers) {
    const file = path.join(frameDir, `f${String(f).padStart(5, '0')}.png`);
    if (!has('--force') && fs.existsSync(file)) { done++; continue; }
    fs.writeFileSync(file, await shoot(page, f / FILM.fps));
    done++;
    if (done % 15 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${N} frames · ${(el / done).toFixed(2)} s/frame · eta ${((N - done) * el / done / 60).toFixed(1)} min`); }
  }
  await browser.close();
}
await Promise.all(Array.from({ length: workers }, (_, w) => work(w)));
server.close();
const mp4 = path.join(out, partial ? 'partial.mp4' : 'higgsfield-claude-launch.mp4');
const audio = path.join(out, 'audio.wav');
const ff = ['-y', '-v', 'error', '-framerate', String(FILM.fps), '-start_number', String(f0), '-i', path.join(frameDir, 'f%05d.png')];
if (!partial && fs.existsSync(audio)) ff.push('-i', audio);
ff.push('-frames:v', String(N), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709');
if (!partial && fs.existsSync(audio)) ff.push('-c:a', 'aac', '-b:a', '320k', '-shortest');
ff.push(mp4);
await new Promise((r, j) => spawn('ffmpeg', ff, { stdio: 'inherit' }).on('close', (c) => (c ? j(new Error('ffmpeg ' + c)) : r())));
console.log('wrote', mp4);
