// The single continuous set: one desk, one laptop, a few props. Units: metres, desk top at y=0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../lib/anim.js';

export const LAPTOP = {
  pos: [0, 0, -0.07],
  baseW: 0.312, baseD: 0.218, baseH: 0.0145,
  lidH: 0.206, lidT: 0.0055,
  openDeg: 106, // lid angle from the base
  screenW: 0.288, screenH: 0.18, // 16:10 active area
  screenPx: [2880, 1800],
};
export const DESK = { w: 1.9, d: 0.95, top: 0 };
export const SPOTS = {
  bike: [0.0, 0, 0.215], // assembly / hero spot in front of the laptop
  phone: [-0.36, 0, 0.12],
  mug: [0.31, 0, -0.13],
  plant: [0.44, 0, -0.27],
  pencils: [-0.34, 0, -0.2],
  lamp: [-0.6, 0, -0.3],
  notebooks: [0.52, 0, 0.02],
  sticky: [-0.24, 0, -0.02],
  sketch: [-0.17, 0, 0.12],
};

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function deskTextures() {
  const r = rng(3);
  const color = canvasTex(2048, 1024, (g, w, h) => {
    g.fillStyle = '#D6B9A5'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { // subtle linoleum/ash grain
      g.strokeStyle = `rgba(${r() < 0.5 ? '170,130,110' : '235,210,195'},${0.04 + r() * 0.06})`;
      g.lineWidth = 1 + r() * 4; g.beginPath();
      const y = r() * h; g.moveTo(0, y);
      for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.004 + i) * 6 + (r() - 0.5) * 3);
      g.stroke();
    }
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(120,80,60,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 2); }
  });
  const rough = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#a0a0a0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? 255 : 60},${r() < 0.5 ? 255 : 60},${r() < 0.5 ? 255 : 60},0.05)`; g.fillRect(r() * w, r() * h, 3, 3); }
  }, false);
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping; rough.repeat.set(3, 2);
  return { color, rough };
}

function matTexture() {
  return canvasTex(2048, 1365, (g, w, h) => {
    g.fillStyle = '#EAD8CB'; g.fillRect(0, 0, w, h);
    const step = w / 30;
    for (let i = 0; i <= 30; i++) {
      g.strokeStyle = i % 5 ? 'rgba(196,120,96,0.28)' : 'rgba(196,110,86,0.55)';
      g.lineWidth = i % 5 ? 2 : 4;
      g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * step); g.lineTo(w, i * step); g.stroke();
    }
    g.strokeStyle = 'rgba(196,110,86,0.5)'; g.lineWidth = 3;
    g.beginPath(); g.arc(w * 0.83, h * 0.78, step * 3, 0, Math.PI * 2); g.stroke();
    g.font = '600 26px Inter'; g.fillStyle = 'rgba(160,96,74,0.7)';
    for (let i = 1; i < 30; i += 5) g.fillText(String(i - 1), i * step - step + 6, 30);
    g.fillText('TRAIL BUILD MAT · A2', 40, h - 30);
  });
}

function keyboardTexture() {
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#D9CCC6'; g.fillRect(0, 0, w, h);
  });
}

export function createDesk({ screenTexture }) {
  const root = new THREE.Group(); root.name = 'desk';
  const T = deskTextures();
  const mat = {
    desk: new THREE.MeshStandardMaterial({ map: T.color, roughnessMap: T.rough, roughness: 0.7, metalness: 0 }),
    wall: new THREE.MeshStandardMaterial({ color: '#E6D0C0', roughness: 0.95 }),
    alu: new THREE.MeshPhysicalMaterial({ color: '#D6C7C1', metalness: 0.85, roughness: 0.32, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
    bezel: new THREE.MeshPhysicalMaterial({ color: '#0d0d0f', roughness: 0.18, metalness: 0.1, clearcoat: 1 }),
    key: new THREE.MeshStandardMaterial({ color: '#2b2726', roughness: 0.55, metalness: 0.05 }),
    clay: new THREE.MeshStandardMaterial({ color: '#B9583F', roughness: 0.78 }),
    clayLight: new THREE.MeshStandardMaterial({ color: '#D98A70', roughness: 0.7 }),
    lime: new THREE.MeshStandardMaterial({ color: '#CFF851', roughness: 0.55 }),
    pink: new THREE.MeshStandardMaterial({ color: '#E7A79B', roughness: 0.7 }),
    paper: new THREE.MeshStandardMaterial({ color: '#F6F1EA', roughness: 0.9 }),
    cork: new THREE.MeshStandardMaterial({ color: '#C08A5E', roughness: 0.95 }),
    white: new THREE.MeshPhysicalMaterial({ color: '#F3EEE9', roughness: 0.35, clearcoat: 0.5 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#8DB33A', roughness: 0.6 }),
    coffee: new THREE.MeshPhysicalMaterial({ color: '#2a160c', roughness: 0.08, clearcoat: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#111', roughness: 0.08, metalness: 0.2, clearcoat: 1 }),
  };
  const shadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  // desk + wall
  const deskTop = new THREE.Mesh(new RoundedBoxGeometry(DESK.w, 0.04, DESK.d, 4, 0.012), mat.desk);
  deskTop.position.y = -0.02; deskTop.receiveShadow = true; root.add(deskTop);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), mat.wall); wall.position.set(0, 1.1, -0.62); wall.receiveShadow = true; root.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: '#BFA08E', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.75; root.add(floor);

  // cutting mat
  const cm = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.002, 0.44, 2, 0.001), new THREE.MeshStandardMaterial({ map: matTexture(), roughness: 0.85 }));
  cm.position.set(0.04, 0.001, 0.17); cm.receiveShadow = true; root.add(cm);

  // ------------------------------------------------ laptop
  const L = LAPTOP;
  const laptop = new THREE.Group(); laptop.name = 'laptop'; laptop.position.set(...L.pos); root.add(laptop);
  const base = new THREE.Mesh(new RoundedBoxGeometry(L.baseW, L.baseH, L.baseD, 4, 0.006), mat.alu);
  base.position.y = L.baseH / 2; laptop.add(base);
  // keyboard well + keys (instanced)
  const well = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.001, 0.105), new THREE.MeshStandardMaterial({ color: '#1b1817', roughness: 0.8 }));
  well.position.set(0, L.baseH + 0.0003, -0.045); laptop.add(well);
  const keyGeo = new RoundedBoxGeometry(0.0158, 0.0022, 0.0158, 2, 0.002);
  const keys = new THREE.InstancedMesh(keyGeo, mat.key, 14 * 6);
  const m4 = new THREE.Matrix4(); let ki = 0;
  for (let row = 0; row < 6; row++) for (let col = 0; col < 14; col++) {
    m4.makeTranslation(-0.1235 + col * 0.019, L.baseH + 0.0012, -0.0915 + row * 0.0185 * (row === 0 ? 1 : 1));
    if (row === 0) m4.scale(new THREE.Vector3(1, 1, 0.55));
    keys.setMatrixAt(ki++, m4);
  }
  keys.castShadow = true; keys.receiveShadow = true; laptop.add(keys);
  const pad = new THREE.Mesh(new RoundedBoxGeometry(0.115, 0.0008, 0.07, 2, 0.0004), new THREE.MeshPhysicalMaterial({ color: '#CDBDB6', roughness: 0.25, metalness: 0.6 }));
  pad.position.set(0, L.baseH, 0.058); laptop.add(pad);
  // lid
  const hinge = new THREE.Group(); hinge.position.set(0, L.baseH, -L.baseD / 2 + 0.004); laptop.add(hinge);
  hinge.rotation.x = -THREE.MathUtils.degToRad(L.openDeg - 90);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(L.baseW, L.lidH, L.lidT, 4, 0.0026), mat.alu);
  lid.position.set(0, L.lidH / 2, -L.lidT / 2); hinge.add(lid);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(L.baseW - 0.004, L.lidH - 0.004, 0.0012, 3, 0.0005), mat.bezel);
  bezel.position.set(0, L.lidH / 2, 0.0002); hinge.add(bezel);
  const screenGeo = new THREE.PlaneGeometry(L.screenW, L.screenH);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false });
  const screen = new THREE.Mesh(screenGeo, screenMat); screen.name = 'screen';
  screen.position.set(0, L.lidH / 2 + 0.006, 0.0011); hinge.add(screen);
  // glass reflection layer
  const glass = new THREE.Mesh(screenGeo, new THREE.MeshPhysicalMaterial({ color: '#000', transparent: true, opacity: 0.0, roughness: 0.05, metalness: 0, clearcoat: 1, transmission: 0, depthWrite: false }));
  glass.position.copy(screen.position); glass.position.z += 0.0002; glass.material.opacity = 0.06; hinge.add(glass);
  shadow(laptop); screen.castShadow = false; screen.receiveShadow = false; glass.castShadow = false;

  // ------------------------------------------------ props
  const lathe = (pts, m, seg = 48) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), m);
  // mug on cork coaster
  const mug = new THREE.Group(); mug.position.set(...SPOTS.mug); root.add(mug);
  const coaster = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.004, 48), mat.cork); coaster.position.y = 0.002; mug.add(coaster);
  const body = lathe([[0, 0.004], [0.036, 0.004], [0.039, 0.012], [0.04, 0.09], [0.0365, 0.092], [0.035, 0.012], [0, 0.012]], mat.clay); mug.add(body);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.035, 32), mat.coffee); coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.078; mug.add(coffee);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0065, 12, 32), mat.clay); handle.position.set(0.045, 0.05, 0); mug.add(handle);
  shadow(mug);
  // plant pot
  const plant = new THREE.Group(); plant.position.set(...SPOTS.plant); root.add(plant);
  plant.add(lathe([[0, 0], [0.05, 0], [0.062, 0.1], [0.066, 0.104], [0.062, 0.108], [0.055, 0.098], [0, 0.098]], mat.clayLight));
  const pr = rng(9);
  for (let i = 0; i < 9; i++) {
    const h = 0.12 + pr() * 0.1;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.012, h, 6), mat.leaf);
    leaf.scale.z = 0.35; const a = (i / 9) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.02, 0.1 + h / 2, Math.sin(a) * 0.02);
    leaf.rotation.set(Math.sin(a) * 0.35, a, -Math.cos(a) * 0.35); plant.add(leaf);
  }
  shadow(plant);
  // pencil cup
  const pc = new THREE.Group(); pc.position.set(...SPOTS.pencils); root.add(pc);
  pc.add(lathe([[0, 0], [0.034, 0], [0.034, 0.1], [0.031, 0.1], [0.031, 0.006], [0, 0.006]], mat.clay));
  const cols = ['#CFF851', '#E7A79B', '#2b2726', '#F6F1EA', '#D9534A'];
  for (let i = 0; i < 5; i++) {
    const pen = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.16, 6), new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.5 }));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0042, 0.014, 6), mat.cork); tip.position.y = 0.087;
    pen.add(p, tip); pen.position.set((i - 2) * 0.009, 0.085, (i % 2) * 0.008 - 0.004); pen.rotation.z = (i - 2) * 0.08; pen.rotation.x = ((i % 3) - 1) * 0.06; pc.add(pen);
  }
  shadow(pc);
  // phone (shows the rusty bike photo)
  const phone = new THREE.Group(); phone.position.set(...SPOTS.phone); phone.rotation.y = 0.5; root.add(phone);
  phone.add(new THREE.Mesh(new RoundedBoxGeometry(0.072, 0.008, 0.152, 4, 0.006), mat.alu).translateY(0.004));
  const phoneScreenMat = new THREE.MeshBasicMaterial({ color: '#222', toneMapped: false });
  const ps = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.145), phoneScreenMat); ps.rotation.x = -Math.PI / 2; ps.position.y = 0.0082; phone.add(ps);
  shadow(phone); ps.castShadow = false;
  // sticky notes
  const sticky = new THREE.Group(); sticky.position.set(...SPOTS.sticky); sticky.rotation.y = -0.25; root.add(sticky);
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.0012, 0.06), mat.lime); s.position.y = 0.0006 + i * 0.0012; s.rotation.y = i * 0.12; sticky.add(s); }
  shadow(sticky);
  // notebook stack
  const nb = new THREE.Group(); nb.position.set(...SPOTS.notebooks); nb.rotation.y = 0.2; root.add(nb);
  [[mat.lime, 0.012], [mat.pink, 0.01], [mat.paper, 0.008]].reduce((y, [m, h], i) => { const b = new THREE.Mesh(new RoundedBoxGeometry(0.2, h, 0.27, 2, 0.002), m); b.position.y = y + h / 2; b.rotation.y = i * 0.07; nb.add(b); return y + h; }, 0);
  shadow(nb);
  // desk lamp
  const lamp = new THREE.Group(); lamp.position.set(...SPOTS.lamp); root.add(lamp);
  lamp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.016, 40), mat.white).translateY(0.008));
  const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 16), mat.white); arm1.position.set(0.05, 0.21, 0); arm1.rotation.z = -0.25; lamp.add(arm1);
  const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.32, 16), mat.white); arm2.position.set(0.2, 0.43, 0.04); arm2.rotation.z = -1.25; arm2.rotation.y = -0.3; lamp.add(arm2);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.08, 32, 1, true), mat.white); head.position.set(0.34, 0.46, 0.09); head.rotation.z = 0.3; lamp.add(head);
  shadow(lamp);

  // sketch card (assembly blueprint), propped against a small stand
  const sketch = new THREE.Group(); sketch.name = 'sketch'; sketch.position.set(...SPOTS.sketch); sketch.rotation.y = 0.35; root.add(sketch);
  const sketchMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.0015), [mat.paper, mat.paper, mat.paper, mat.paper, sketchMat, mat.paper]);
  card.position.set(0, 0.048, 0); card.rotation.x = -0.22; sketch.add(card);
  shadow(sketch);
  sketch.userData.mat = sketchMat;

  // ruler ramp on an eraser (for the test ride)
  const ramp = new THREE.Group(); ramp.name = 'ramp'; root.add(ramp);
  const eraser = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.024, 0.05, 3, 0.004), mat.pink); ramp.add(eraser);
  const ruler = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.004, 0.05), new THREE.MeshStandardMaterial({ color: '#2a2726', roughness: 0.4, metalness: 0.4 }));
  const rulerEdge = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.0045, 0.006), mat.lime);
  ramp.add(ruler, rulerEdge);
  shadow(ramp);
  ramp.userData = { eraser, ruler, rulerEdge };

  return { root, laptop, hinge, screen, phone, phoneScreenMat, sketch, ramp, mat, plant, mug, pencils: pc, lamp, notebooks: nb };
}

/** Place the ramp: ruler from (x0,0) up to the top of an eraser at x1. Returns launch info. */
export function layoutRamp(ramp, x0, x1, z) {
  const { eraser, ruler, rulerEdge } = ramp.userData;
  const eh = 0.024;
  eraser.position.set(x1 + 0.012, eh / 2, z);
  const top = eh + 0.002;
  const len = Math.hypot(x1 + 0.03 - x0, top), ang = Math.atan2(top, x1 + 0.03 - x0);
  ruler.scale.x = len / 0.30; rulerEdge.scale.x = len / 0.30;
  for (const r of [ruler, rulerEdge]) { r.rotation.set(0, 0, ang); r.position.set((x0 + x1 + 0.03) / 2, top / 2 + 0.001, z); }
  rulerEdge.position.z = z + 0.022; rulerEdge.position.y += 0.0004;
  return { angle: ang, lipX: x1 + 0.03, lipY: top + 0.003 };
}
