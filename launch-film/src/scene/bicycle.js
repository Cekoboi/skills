// Parametric bicycle built from recognisable components:
//   frame · fork · front/rear wheel · handlebars (+stem) · crankset · pedals · saddle (+post) · chain
// Geometry is authored in real-world metres (29er hardtail, 73° seat / 66° head angle) and the
// whole bike is scaled to a desk toy by BIKE.scale. Two part sets exist: `old` (the rusty
// starting bike) and `new` (the trail build). The frame is shared and repainted in the film.
//
// Every part exposes:  group (THREE.Group placed at its assembled pose in bike space)
//                      insert: unit vector (bike space) it slides along when seating
//                      order: assembly order index
import * as THREE from 'three';
import { rng } from '../lib/anim.js';

export const BIKE = {
  scale: 0.16,
  wheelR: 0.368, // outer tyre radius (axle height)
  bb: [0, 0.31],
  rearAxle: [-0.435, 0.368],
  seatAngle: 73,
  seatTube: 0.44,
  headAngle: 66,
  headTop: [0.45, 0.93],
  headLen: 0.11,
  forkOffset: 0.044,
  rearHalf: 0.074, // Boost 148 rear spacing / 2
  frontHalf: 0.055, // Boost 110
  barWidth: 0.78,
  crankLen: 0.17,
  chainline: 0.0592, // matches cassette cog #2 and chainring plane
  forkLegZ: 0.058,
  seatpostExposed: 0.2,
};

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const deg = THREE.MathUtils.degToRad;

/** Derived key points (bike space, metres). */
export function bikePoints() {
  const sa = deg(BIKE.seatAngle), ha = deg(BIKE.headAngle);
  const bb = V(...BIKE.bb);
  const stDir = V(-Math.cos(sa), Math.sin(sa));
  const stTop = bb.clone().addScaledVector(stDir, BIKE.seatTube);
  const cluster = bb.clone().addScaledVector(stDir, BIKE.seatTube - 0.04);
  const down = V(Math.cos(ha), -Math.sin(ha)); // steering axis, pointing down
  const fwdN = V(Math.sin(ha), Math.cos(ha)); // perpendicular, forward
  const htTop = V(...BIKE.headTop);
  const htBot = htTop.clone().addScaledVector(down, BIKE.headLen);
  // solve fork length so the front axle sits at wheel radius height
  const L = (htBot.y + BIKE.forkOffset * fwdN.y - BIKE.wheelR) / -down.y;
  const frontAxle = htBot.clone().addScaledVector(down, L).addScaledVector(fwdN, BIKE.forkOffset);
  const rearAxle = V(...BIKE.rearAxle);
  const steererTop = htBot.clone().addScaledVector(down, -(BIKE.headLen + 0.048));
  return { bb, stDir, stTop, cluster, down, fwdN, htTop, htBot, forkLen: L, frontAxle, rearAxle, steererTop };
}

// ---------------------------------------------------------------- materials
function rustTexture(seed, base, rustAmt) {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  const r = rng(seed);
  for (let i = 0; i < 900 * rustAmt; i++) {
    const x = r() * S, y = r() * S, rad = 2 + r() * 26 * r();
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const tone = r();
    const col = tone < 0.4 ? '107,52,28' : tone < 0.75 ? '146,72,34' : '60,34,24';
    grd.addColorStop(0, `rgba(${col},${0.55 + r() * 0.4})`);
    grd.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  for (let i = 0; i < 3000 * rustAmt; i++) { // pitting specks
    g.fillStyle = `rgba(${r() < 0.5 ? '40,22,14' : '190,120,80'},${0.3 + r() * 0.5})`;
    g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function roughTexture(seed) {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.4})`; g.fillRect(r() * S, r() * S, 2 + r() * 6, 2 + r() * 6); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function bikeMaterials() {
  const rough = roughTexture(7);
  const M = {
    rustPaint: new THREE.MeshStandardMaterial({ map: rustTexture(11, '#A9503A', 1), roughnessMap: rough, roughness: 0.85, metalness: 0.15 }),
    rustChrome: new THREE.MeshStandardMaterial({ map: rustTexture(23, '#8f8a84', 0.8), roughness: 0.6, metalness: 0.55 }),
    freshPaint: new THREE.MeshPhysicalMaterial({ color: '#C9553E', roughness: 0.32, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 }),
    lime: new THREE.MeshPhysicalMaterial({ color: '#CFF851', roughness: 0.3, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    limeAnod: new THREE.MeshPhysicalMaterial({ color: '#C2EA3E', roughness: 0.22, metalness: 0.75, clearcoat: 0.6 }),
    blackGloss: new THREE.MeshPhysicalMaterial({ color: '#1b1b1d', roughness: 0.28, metalness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.1 }),
    blackMatte: new THREE.MeshStandardMaterial({ color: '#232224', roughness: 0.62, metalness: 0.3 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#2a2827', roughness: 0.92, metalness: 0 }),
    oldRubber: new THREE.MeshStandardMaterial({ color: '#4a3d35', roughness: 0.97, metalness: 0, map: rustTexture(5, '#4a3d35', 0.25) }),
    alloy: new THREE.MeshStandardMaterial({ color: '#c9c6c2', roughness: 0.25, metalness: 0.95 }),
    steel: new THREE.MeshStandardMaterial({ color: '#9a9896', roughness: 0.35, metalness: 0.9 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: '#3b3a3a', roughness: 0.4, metalness: 0.85 }),
    leatherOld: new THREE.MeshStandardMaterial({ map: rustTexture(31, '#6e4630', 0.35), roughness: 0.8, metalness: 0 }),
    saddleNew: new THREE.MeshPhysicalMaterial({ color: '#1e1d1f', roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#555') }),
  };
  return M;
}

// ---------------------------------------------------------------- primitives
function tube(a, b, r0, r1, mat, seg = 20) {
  const d = b.clone().sub(a), len = d.length();
  const g = new THREE.CylinderGeometry(r1 ?? r0, r0, len, seg, 1);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  m.castShadow = m.receiveShadow = true;
  return m;
}
function ball(p, r, mat) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat);
  m.position.copy(p); m.castShadow = true; return m;
}
function axleCyl(r, len, mat, z = 0, seg = 32) { // cylinder along Z
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.rotation.x = Math.PI / 2; m.position.z = z; m.castShadow = m.receiveShadow = true; return m;
}
function box(w, h, d, mat, p) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  if (p) m.position.copy(p); m.castShadow = m.receiveShadow = true; return m;
}

// ---------------------------------------------------------------- frame
function buildFrame(P, mat, detailMat) {
  const g = new THREE.Group(); g.name = 'frame';
  const { bb, stTop, cluster, htTop, htBot, rearAxle } = P;
  const rh = BIKE.rearHalf - 0.006;
  g.add(tube(htBot, htTop, 0.023, 0.021, mat)); // head tube (tapered)
  g.add(tube(bb.clone(), htBot.clone().lerp(htTop, 0.3), 0.021, 0.02, mat)); // down tube (joins above the crown)
  g.add(tube(cluster.clone(), htTop.clone().lerp(htBot, 0.18), 0.016, 0.017, mat)); // top tube
  g.add(tube(bb.clone(), stTop, 0.017, 0.016, mat)); // seat tube
  // chainstays & seatstays (pairs)
  for (const s of [-1, 1]) {
    const bbS = V(bb.x - 0.03, bb.y, s * 0.034); // inboard of the chainring
    const mid = V(-0.2, rearAxle.y - 0.035, s * 0.052);
    const dro = V(rearAxle.x + 0.012, rearAxle.y - 0.006, s * rh);
    g.add(tube(bbS, mid, 0.011, 0.01, mat));
    g.add(tube(mid, dro, 0.01, 0.0085, mat));
    g.add(ball(mid, 0.0102, mat));
    const ss0 = V(cluster.x - 0.006, cluster.y - 0.006, s * 0.018);
    const ssMid = V(-0.29, 0.53, s * 0.058);
    g.add(tube(ss0, ssMid, 0.0085, 0.0082, mat));
    g.add(tube(ssMid, V(rearAxle.x + 0.014, rearAxle.y + 0.012, s * rh), 0.0082, 0.0078, mat));
    g.add(ball(ssMid, 0.0085, mat));
    // dropout plate
    const d = box(0.04, 0.034, 0.006, mat, V(rearAxle.x + 0.006, rearAxle.y + 0.002, s * rh));
    g.add(d);
  }
  // seat-stay bridge
  g.add(tube(V(-0.155, 0.656, -0.026), V(-0.155, 0.656, 0.026), 0.005, 0.005, mat)); // above the tyre
  // BB shell
  g.add(axleCyl(0.022, 0.09, mat));
  // welds / lugs
  for (const p of [htTop.clone().lerp(htBot, 0.18), htBot.clone().lerp(htTop, 0.3), cluster]) g.add(ball(p, 0.0175, mat));
  // seat collar + headset cups
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.016, 24), detailMat);
  collar.position.copy(stTop); collar.quaternion.setFromUnitVectors(V(0, 1, 0), P.stDir); g.add(collar);
  for (const [p, o] of [[htTop, 0.006], [htBot, -0.006]]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 28), detailMat);
    cup.position.copy(p).addScaledVector(P.down, -o); cup.quaternion.setFromUnitVectors(V(0, 1, 0), P.down.clone().negate()); g.add(cup);
  }
  // bottle bosses
  for (const k of [0.35, 0.5]) g.add(ball(bb.clone().lerp(htBot, k).add(V(0, 0.02, 0)), 0.004, detailMat));
  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  return g;
}

// ---------------------------------------------------------------- wheel
function buildWheel({ front, knobby, M, old }) {
  const g = new THREE.Group();
  const spin = new THREE.Group(); spin.name = 'spin'; g.add(spin);
  const R = BIKE.wheelR;
  const tubeR = knobby ? 0.03 : 0.022;
  const torR = knobby ? R - tubeR - 0.006 : R - tubeR;
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(torR, tubeR, 18, 96), old ? M.oldRubber : M.rubber);
  tyre.castShadow = tyre.receiveShadow = true; spin.add(tyre);
  if (knobby) { // tread knobs: 3 rows, alternating
    const knob = new THREE.BoxGeometry(0.016, 0.009, 0.014);
    const n = 64, rows = [[-0.019, 0.5], [0, 0], [0.019, 0.5]];
    const inst = new THREE.InstancedMesh(knob, M.rubber, n * rows.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
    let i = 0;
    for (const [z, ph] of rows) for (let k = 0; k < n; k++) {
      const a = ((k + ph) / n) * Math.PI * 2;
      const rr = torR + Math.sqrt(Math.max(0, tubeR * tubeR - z * z)) + 0.002;
      q.setFromAxisAngle(V(0, 0, 1), a - Math.PI / 2);
      const tilt = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.atan2(z, tubeR) * 0.9);
      q.multiply(tilt);
      m4.compose(V(Math.cos(a) * rr, Math.sin(a) * rr, z), q, s);
      inst.setMatrixAt(i++, m4);
    }
    inst.castShadow = true; spin.add(inst);
  }
  // rim
  const rimMat = old ? M.rustChrome : M.blackGloss;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(torR - 0.004, 0.012, 12, 96), rimMat);
  rim.scale.z = 1.25; spin.add(rim);
  if (!old) for (const z of [-0.0152, 0.0152]) {
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(torR - 0.006, 0.0026, 6, 96), M.lime);
    stripe.position.z = z; spin.add(stripe);
  }
  // hub
  const half = front ? BIKE.frontHalf : BIKE.rearHalf;
  spin.add(axleCyl(0.019, half * 1.5, old ? M.rustChrome : M.alloy));
  for (const z of [-0.032, 0.032]) spin.add(axleCyl(0.03, 0.004, old ? M.rustChrome : M.alloy, z));
  g.add(axleCyl(0.006, (front ? 0.05 : 0.062) * 2, M.steel)); // axle stub, stays inside the dropouts
  // spokes, 3-cross lacing
  const nS = 32, rimRad = torR - 0.012;
  const spokeGeo = new THREE.CylinderGeometry(0.0014, 0.0014, 1, 5);
  const inst = new THREE.InstancedMesh(spokeGeo, old ? M.rustChrome : M.steel, nS);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < nS; i++) {
    const side = i % 2 ? 1 : -1;
    const a = (i / nS) * Math.PI * 2;
    const dir = (Math.floor(i / 2) % 2 ? 1 : -1);
    const a2 = a + dir * (3 * Math.PI * 2) / (nS / 2) * 0.5;
    const p0 = V(Math.cos(a2) * 0.028, Math.sin(a2) * 0.028, side * 0.032);
    const p1 = V(Math.cos(a) * rimRad, Math.sin(a) * rimRad, 0);
    const d = p1.clone().sub(p0), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
    m4.compose(p0.clone().addScaledVector(d, len / 2), q, V(1, len, 1));
    inst.setMatrixAt(i, m4);
  }
  inst.castShadow = true; spin.add(inst);
  if (!old) { // disc rotor (non-drive side) + caliper sits on frame/fork
    const rotor = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.09, 48), M.steel);
    rotor.position.z = front ? -0.033 : -0.054; rotor.material = M.steel.clone(); rotor.material.side = THREE.DoubleSide;
    spin.add(rotor);
  }
  if (!front) { // cassette on the drive side
    const n = old ? 5 : 10;
    for (let i = 0; i < n; i++) {
      const r = 0.026 + (i / (n - 1)) * (old ? 0.03 : 0.05); // smallest outboard
      spin.add(axleCyl(r, 0.0022, old ? M.rustChrome : M.alloy, 0.062 - i * (old ? 0.004 : 0.0028), 40));
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------- fork (local: +y = up the steering axis, +x forward)
function buildFork({ P, M, old }) {
  const g = new THREE.Group();
  const L = P.forkLen, off = BIKE.forkOffset, half = BIKE.forkLegZ;
  const steerMat = old ? M.rustChrome : M.blackMatte;
  g.add(tube(V(0, -0.01, 0), V(0, BIKE.headLen + 0.048, 0), 0.0145, 0.0145, steerMat)); // steerer
  if (old) {
    const crown = box(0.04, 0.026, 0.115, M.rustPaint, V(0.004, -0.028, 0)); g.add(crown);
    for (const s of [-1, 1]) { // raked rigid legs
      const pts = [V(0.004, -0.035, s * 0.05), V(0.006, -0.25, s * 0.055), V(off * 0.55, -L + 0.08, s * half), V(off, -L, s * half)];
      const curve = new THREE.CatmullRomCurve3(pts);
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0115, 12), M.rustPaint);
      m.castShadow = true; g.add(m);
    }
  } else {
    const crown = box(0.04, 0.03, 0.15, M.blackGloss, V(0.004, -0.032, 0)); g.add(crown);
    for (const s of [-1, 1]) {
      const z = s * half;
      g.add(tube(V(0.004, -0.045, z), V(0.004, -0.2, z), 0.0175, 0.0175, M.limeAnod)); // stanchions
      g.add(tube(V(0.004, -0.19, z), V(off - 0.004, -L + 0.022, z), 0.0215, 0.02, M.blackGloss)); // lowers
      const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.0222, 0.0222, 0.008, 24), M.blackMatte);
      seal.position.set(0.004, -0.19, z); g.add(seal);
      g.add(box(0.03, 0.03, 0.012, M.blackGloss, V(off, -L, z))); // dropout
    }
    // arch
    const arch = new THREE.Mesh(new THREE.TorusGeometry(half, 0.011, 10, 28, Math.PI), M.blackGloss);
    arch.rotation.y = Math.PI / 2; arch.position.set(0.006, -0.17, 0); g.add(arch); // clears the tyre
    // brake caliper (non-drive side)
    g.add(box(0.026, 0.04, 0.014, M.limeAnod, V(off - 0.05, -L + 0.065, -0.04))); // straddles the rotor, behind the leg
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------- handlebars (local origin: steerer top)
function buildBars({ M, old }) {
  const g = new THREE.Group();
  const tilt = deg(90 - BIKE.headAngle);
  const W = old ? 0.62 : BIKE.barWidth;
  const stemLen = old ? 0.06 : 0.05;
  const stemMat = old ? M.rustChrome : M.blackGloss;
  // stem clamp around steerer + extension forward (local x)
  const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.04, 20), stemMat); sc.rotation.z = tilt; g.add(sc);
  const ext = tube(V(0, 0.004, 0), V(stemLen, 0.012, 0), 0.014, 0.013, stemMat); g.add(ext);
  const clamp = axleCyl(0.019, 0.05, stemMat); clamp.position.set(stemLen, 0.012, 0); g.add(clamp);
  // bar: riser (new) / swept city bar (old)
  const barMat = old ? M.rustChrome : M.blackGloss;
  const pts = old
    ? [V(-0.11, 0.06, -W / 2), V(-0.03, 0.035, -0.18), V(stemLen, 0.012, -0.06), V(stemLen, 0.012, 0.06), V(-0.03, 0.035, 0.18), V(-0.11, 0.06, W / 2)]
    : [V(stemLen - 0.025, 0.035, -W / 2), V(stemLen - 0.01, 0.034, -0.2), V(stemLen, 0.014, -0.08), V(stemLen, 0.012, 0), V(stemLen, 0.014, 0.08), V(stemLen - 0.01, 0.034, 0.2), V(stemLen - 0.025, 0.035, W / 2)];
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.011, 12), barMat));
  // grips + levers
  for (const s of [-1, 1]) {
    const end = pts[s < 0 ? 0 : pts.length - 1];
    const inner = pts[s < 0 ? 1 : pts.length - 2];
    const dir = end.clone().sub(inner).normalize();
    const a = end.clone().addScaledVector(dir, -0.13);
    g.add(tube(a, end.clone().addScaledVector(dir, 0.004), 0.016, 0.016, old ? M.oldRubber : M.rubber));
    if (!old) g.add(tube(end.clone().addScaledVector(dir, -0.006), end.clone().addScaledVector(dir, 0.006), 0.0172, 0.0172, M.lime));
    const lv = box(0.09, 0.008, 0.014, old ? M.rustChrome : M.blackMatte, a.clone().add(V(0.05, -0.004, -s * 0.01)));
    lv.rotation.y = s * 0.25; g.add(lv);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------- crankset (origin: BB centre)
function buildCranks({ M, old }) {
  const g = new THREE.Group();
  const cl = BIKE.chainline, L = BIKE.crankLen;
  const armMat = old ? M.rustChrome : M.blackGloss;
  g.add(axleCyl(0.012, 0.13, M.steel, -0.004)); // spindle (drive-side crank)
  // chainring with teeth
  const teeth = old ? 42 : 32, rr = old ? 0.11 : 0.085;
  const shape = new THREE.Shape();
  for (let i = 0; i <= teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2, r = i % 2 ? rr : rr + 0.006;
    i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, rr - 0.03, 0, Math.PI * 2, true); shape.holes.push(hole);
  const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: false, curveSegments: 4 }), old ? M.rustChrome : M.limeAnod);
  ring.position.z = cl - 0.002; g.add(ring);
  const spider = axleCyl(rr - 0.025, 0.006, armMat, cl - 0.004, 5); g.add(spider);
  // arms: right forward, left rearward (classic display pose)
  const arm = (s, ang) => {
    const z = s * 0.075;
    const end = V(Math.cos(ang) * L, Math.sin(ang) * L, z);
    g.add(tube(V(0, 0, z), end, 0.013, 0.01, armMat));
    g.add(axleCyl(0.016, 0.02, armMat, z));
    const eye = axleCyl(0.012, 0.02, armMat, z); eye.position.x = end.x; eye.position.y = end.y; g.add(eye);
  };
  arm(1, deg(-8));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, arm };
}
function buildCrankL({ M, old }) {
  const g = new THREE.Group(), L = BIKE.crankLen, z = -0.075, ang = deg(172);
  const armMat = old ? M.rustChrome : M.blackGloss;
  const end = V(Math.cos(ang) * L, Math.sin(ang) * L, z);
  g.add(tube(V(0, 0, z), end, 0.013, 0.01, armMat));
  g.add(axleCyl(0.016, 0.02, armMat, z));
  const eye = axleCyl(0.012, 0.02, armMat, z); eye.position.x = end.x; eye.position.y = end.y; g.add(eye);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export const pedalAnchor = (side) => {
  const L = BIKE.crankLen, ang = side > 0 ? deg(-8) : deg(172);
  return V(Math.cos(ang) * L, Math.sin(ang) * L, side * 0.075);
};
function buildPedal({ M, old, side }) {
  const g = new THREE.Group(); // origin at crank eye; body extends outward along side*z
  g.add(axleCyl(0.006, 0.06, M.steel, side * 0.03));
  if (old) {
    const b = box(0.075, 0.022, 0.07, M.oldRubber, V(0, 0, side * 0.06)); g.add(b);
    for (const x of [-0.04, 0.04]) g.add(box(0.008, 0.026, 0.074, M.rustChrome, V(x, 0, side * 0.06)));
  } else {
    g.add(box(0.1, 0.016, 0.095, M.limeAnod, V(0, 0, side * 0.065)));
    const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.03, 6), M.steel, 16);
    const m4 = new THREE.Matrix4(); let i = 0;
    for (const x of [-0.042, -0.014, 0.014, 0.042]) for (const z of [0.024, 0.106]) for (const y of [0]) {
      m4.makeTranslation(x, y, side * z); pins.setMatrixAt(i++, m4);
      m4.makeTranslation(x, y, side * (z + (z < 0.05 ? 0.012 : -0.012))); pins.setMatrixAt(i++, m4);
    }
    g.add(pins);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------- saddle + post (local +y = up seat-tube axis; origin = seat tube top)
function buildSaddle({ M, old }) {
  const g = new THREE.Group();
  const exp = BIKE.seatpostExposed;
  g.add(tube(V(0, -0.1, 0), V(0, exp, 0), 0.0135, 0.0135, old ? M.rustChrome : M.blackGloss)); // post (0.1 inserted)
  const head = box(0.05, 0.016, 0.03, old ? M.rustChrome : M.blackMatte, V(0, exp + 0.008, 0)); g.add(head);
  // saddle shell: top-view outline extruded and bevelled
  const s = new THREE.Shape();
  const len = old ? 0.25 : 0.27, wB = old ? 0.17 : 0.14, wN = old ? 0.06 : 0.04;
  s.moveTo(-len * 0.42, 0);
  s.bezierCurveTo(-len * 0.45, wB * 0.55, -len * 0.18, wB * 0.55, 0, wB * 0.35);
  s.bezierCurveTo(len * 0.25, wN * 0.6, len * 0.5, wN * 0.6, len * 0.58, 0);
  s.bezierCurveTo(len * 0.5, -wN * 0.6, len * 0.25, -wN * 0.6, 0, -wB * 0.35);
  s.bezierCurveTo(-len * 0.18, -wB * 0.55, -len * 0.45, -wB * 0.55, -len * 0.42, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 5, curveSegments: 24 });
  geo.rotateX(-Math.PI / 2);
  const shell = new THREE.Mesh(geo, old ? M.leatherOld : M.saddleNew);
  // saddle is level in bike space; this group is tilted to the seat axis, so counter-rotate later
  shell.name = 'shell'; shell.position.y = exp + 0.03; g.add(shell);
  if (!old) { const st = new THREE.Mesh(new THREE.BoxGeometry(len * 0.75, 0.002, 0.004), M.lime); st.position.set(len * 0.02, exp + 0.056, 0); g.add(st); }
  // rails
  for (const zz of [-0.018, 0.018]) g.add(tube(V(-0.06, exp + 0.022, zz), V(0.08, exp + 0.026, zz), 0.0035, 0.0035, M.steel));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------- chain
function chainPath(P, old) {
  const pts = [];
  const ring = old ? 0.113 : 0.088, cog = old ? 0.034 : 0.035;
  const bb = P.bb, ra = P.rearAxle;
  // upper run tangent ring-top -> cog-top, cog wraps back/down, derailleur pulleys, ring bottom
  for (let a = 100; a >= -95; a -= 8) pts.push(V(bb.x + Math.cos(deg(a)) * ring, bb.y + Math.sin(deg(a)) * ring));
  const j1 = V(ra.x + 0.01, ra.y - 0.085), j2 = V(ra.x + 0.03, ra.y - 0.14);
  pts.push(j2.clone().add(V(0.012, -0.008)));
  pts.push(j2.clone().add(V(-0.012, -0.004)), j1.clone().add(V(-0.012, 0)), j1.clone().add(V(0.004, 0.01)));
  for (let a = -80; a >= -280; a -= 12) pts.push(V(ra.x + Math.cos(deg(a)) * cog, ra.y + Math.sin(deg(a)) * cog));
  return new THREE.CatmullRomCurve3(pts.map((p) => p.setZ(BIKE.chainline)), true, 'centripetal');
}
function buildChain(P, M, old) {
  const curve = chainPath(P, old);
  const len = curve.getLength(), n = Math.floor(len / 0.0127);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0127, 0.0065, 0.0075), old ? M.rustChrome : M.darkSteel, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const u = i / n, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    q.setFromUnitVectors(V(1, 0, 0), t);
    m4.compose(p, q, V(1, 1, 1)); inst.setMatrixAt(i, m4);
  }
  inst.castShadow = true;
  const g = new THREE.Group(); g.add(inst);
  // rear derailleur cage
  const cage = box(0.012, 0.075, 0.01, old ? M.rustChrome : M.blackGloss, V(P.rearAxle.x + 0.02, P.rearAxle.y - 0.11, BIKE.chainline + 0.008));
  cage.rotation.z = 0.25; g.add(cage);
  for (const [dx, dy] of [[0.01, -0.085], [0.03, -0.14]]) g.add(axleCyl(0.011, 0.006, old ? M.rustChrome : M.lime, BIKE.chainline).translateX(P.rearAxle.x + dx).translateY(P.rearAxle.y + dy));
  g.userData.count = n; g.userData.inst = inst;
  return g;
}

// ---------------------------------------------------------------- assemble
/**
 * Returns { root, frame, sets:{old,new}, P, M, setVariant(name), parts(name) }
 * Each part object: { name, group, home:{pos,quat}, insert: Vector3, order }
 */
export function createBicycle() {
  const P = bikePoints();
  const M = bikeMaterials();
  const root = new THREE.Group(); root.name = 'bicycle';
  const body = new THREE.Group(); body.scale.setScalar(BIKE.scale); root.add(body);

  // frame: rust + fresh copies, swapped/split with clipping during the repaint sweep
  const frameRust = buildFrame(P, M.rustPaint, M.rustChrome);
  const frameFresh = buildFrame(P, M.freshPaint, M.blackGloss);
  const frame = new THREE.Group(); frame.add(frameRust, frameFresh); body.add(frame);
  // lime down-tube decal for the fresh frame
  const decal = tube(P.bb.clone().lerp(P.htBot, 0.42), P.bb.clone().lerp(P.htBot, 0.62), 0.0212, 0.0212, M.lime);
  frameFresh.add(decal);

  const forkQuat = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), P.down.clone().negate());
  const stQuat = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), P.stDir);
  const up = P.down.clone().negate();

  const makeSet = (old) => {
    const parts = {};
    const add = (name, group, pos, quat, insert, order) => {
      group.position.copy(pos); if (quat) group.quaternion.copy(quat);
      const holder = new THREE.Group(); holder.name = name; holder.add(group); body.add(holder);
      parts[name] = { name, group: holder, inner: group, insert: insert.clone().normalize(), order };
    };
    add('fork', buildFork({ P, M, old }), P.htBot, forkQuat, up, 1); // steerer slides up into the head tube
    add('wheelF', buildWheel({ front: true, knobby: !old, M, old }), P.frontAxle, null, V(0, 1, 0), 2); // raised into the dropouts
    add('wheelR', buildWheel({ front: false, knobby: !old, M, old }), P.rearAxle, null, V(0, 1, 0), 3);
    // bars: positioned at steerer top, oriented level (stem extends forward in bike x)
    add('bars', buildBars({ M, old }), P.steererTop, null, up.clone().negate(), 4);
    add('cranks', buildCranks({ M, old }).g, P.bb, null, V(0, 0, -1), 5);
    add('crankL', buildCrankL({ M, old }), P.bb, null, V(0, 0, 1), 5.5);
    add('pedalR', buildPedal({ M, old, side: 1 }), P.bb.clone().add(pedalAnchor(1)), null, V(0, 0, -1), 6);
    add('pedalL', buildPedal({ M, old, side: -1 }), P.bb.clone().add(pedalAnchor(-1)), null, V(0, 0, 1), 6.5);
    add('chain', buildChain(P, M, old), V(0, 0, 0), null, V(0, 0, -1), 7);
    const sad = buildSaddle({ M, old });
    sad.getObjectByName('shell').quaternion.copy(stQuat.clone().invert()); // keep saddle level
    // rails/head also level: rotate the whole top cluster
    add('saddle', sad, P.stTop, stQuat, P.stDir.clone().negate(), 8);
    return parts;
  };
  const sets = { old: makeSet(true), new: makeSet(false) };

  // home poses (bike space) for animation resets
  for (const set of Object.values(sets)) for (const p of Object.values(set)) {
    p.home = { pos: p.group.position.clone(), quat: p.group.quaternion.clone() };
  }
  // sit the bike so tyres touch y=0 (axle height = wheelR)
  body.position.y = 0;

  const api = { root, body, frame, frameRust, frameFresh, sets, P, M };
  api.setVariant = (name) => {
    for (const [k, set] of Object.entries(sets)) for (const p of Object.values(set)) p.group.visible = k === name;
  };
  api.allParts = (name) => Object.values(sets[name]).sort((a, b) => a.order - b.order);
  /** wheel spin (radians) for both sets */
  api.spinWheels = (a) => { for (const set of Object.values(sets)) for (const n of ['wheelF', 'wheelR']) set[n].inner.getObjectByName('spin').rotation.z = -a; };
  api.setVariant('old');
  return api;
}
