// Film runtime. window.renderFrame(t) draws one deterministic frame for time t (seconds).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FILM, SHOTS, CAMERA, FOCUS, COPY, ASSEMBLY, RIDE, shotAt } from './config/timeline.js';
import { BRAND } from './config/brand.js';
import { clamp, lerp, remap, smooth, smoother, easeOutCubic, easeOutBack, easeInOutSine, easeInCubic, window01, spline, noise1, rng } from './lib/anim.js';
import { createDesk, layoutRamp, LAPTOP, SPOTS } from './scene/desk.js';
import { createBicycle, BIKE } from './scene/bicycle.js';
import { createTitle3D } from './scene/title3d.js';
import { createScreenUI, UI_LAYOUT, makeCardCanvas, drawStepCard, drawPlanHeader, drawStamp, drawPill, drawImageCard, drawSketch } from './ui/screen.js';
import { loadIcons } from './ui/icons.js';
import { createOverlay, OVERLAY_CSS } from './ui/overlay.js';
import { Post } from './post/composite.js';

const W = FILM.width, H = FILM.height;
const V3 = (a) => new THREE.Vector3(...a);

async function loadFonts() {
  const jobs = [];
  for (const role of Object.values(BRAND.fonts)) for (const [w, f] of Object.entries(role.files)) {
    const ff = new FontFace(role.family, `url(assets/fonts/${f})`, { weight: w });
    jobs.push(ff.load().then((x) => document.fonts.add(x)));
  }
  await Promise.all(jobs);
}

async function init() {
  await loadFonts();
  await loadIcons();
  const style = document.createElement('style'); style.textContent = OVERLAY_CSS; document.head.appendChild(style);

  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ---------------------------------------------------------------- main scene + studio lighting
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#E2CCBD');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env; scene.environmentIntensity = 0.4;
  const key = new THREE.DirectionalLight('#FFE9DA', 2.4); // large softbox, camera-left
  key.position.set(-0.9, 1.5, 1.0); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.002;
  Object.assign(key.shadow.camera, { left: -0.9, right: 0.9, top: 0.7, bottom: -0.7, near: 0.5, far: 3.5 });
  scene.add(key);
  const rim = new THREE.DirectionalLight('#FFD6BD', 1.3); rim.position.set(0.9, 0.7, -0.9); scene.add(rim);
  const fill = new THREE.HemisphereLight('#FFF4EC', '#B88A74', 0.35); scene.add(fill);
  const bounce = new THREE.PointLight('#FFC9A8', 0.25, 2.0); bounce.position.set(0.2, 0.25, 0.5); scene.add(bounce);

  // ---------------------------------------------------------------- studio scene (thumbnails + live viewport)
  const studio = new THREE.Scene();
  studio.environment = env; studio.environmentIntensity = 0.7;
  const sKey = new THREE.DirectionalLight('#fff3ea', 2.6); sKey.position.set(-1, 2, 2); sKey.castShadow = true;
  sKey.shadow.mapSize.set(1024, 1024); Object.assign(sKey.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5 }); studio.add(sKey);
  const sRim = new THREE.DirectionalLight('#d9ff80', 1.4); sRim.position.set(1.5, 1, -1.5); studio.add(sRim);
  studio.add(new THREE.HemisphereLight('#ffffff', '#444', 0.5));
  const floorMat = new THREE.MeshStandardMaterial({ color: '#2d3a12', roughness: 0.6 });
  const sFloor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), floorMat); sFloor.rotation.x = -Math.PI / 2; sFloor.receiveShadow = true; studio.add(sFloor);
  const sRing = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.012, 8, 128), new THREE.MeshBasicMaterial({ color: '#CFF851' })); sRing.rotation.x = -Math.PI / 2; sRing.position.y = 0.005; studio.add(sRing);
  const studioBike = createBicycle(); studioBike.setVariant('new'); studioBike.body.scale.setScalar(1);
  studioBike.frameRust.visible = false; studio.add(studioBike.root);
  const sCam = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 50);

  // thumbnails rendered once from the studio, copied to 2D canvases for the UI
  const thumbs = {};
  const snap = (name, setup) => {
    setup();
    renderer.setRenderTarget(null); renderer.toneMapping = THREE.NeutralToneMapping; renderer.setClearColor(studio.background || 0);
    renderer.render(studio, sCam);
    const c = document.createElement('canvas'); c.width = 600; c.height = 400;
    c.getContext('2d').drawImage(canvas, (W - H * 1.5) / 2, 0, H * 1.5, H, 0, 0, 600, 400);
    thumbs[name] = c; renderer.toneMapping = THREE.NoToneMapping;
  };
  const studioView = (az, el = 0.18, dist = 3.9, ty = 0.55) => { sCam.position.set(Math.sin(az) * dist, ty + Math.sin(el) * dist, Math.cos(az) * dist); sCam.lookAt(0.15, ty, 0); sCam.aspect = 16 / 9; sCam.updateProjectionMatrix(); };
  snap('rusty', () => { studioBike.setVariant('old'); studioBike.frameRust.visible = true; studioBike.frameFresh.visible = false; studio.background = new THREE.Color('#D9C2B2'); floorMat.color.set('#CDB3A2'); sRing.visible = false; studioView(0.55); });
  const variants = [['v1', '#C9553E', '#2d3a12'], ['v2', '#1f1f22', '#3a2d22'], ['v3', '#E9E2D6', '#22301a']];
  for (const [n, col, fl] of variants) snap(n, () => { studioBike.setVariant('new'); studioBike.frameRust.visible = false; studioBike.frameFresh.visible = true; studioBike.M.freshPaint.color.set(col); studio.background = new THREE.Color(fl).multiplyScalar(1.4); floorMat.color.set(fl); sRing.visible = true; studioView(n === 'v2' ? -0.6 : n === 'v3' ? 0.9 : 0.5); });
  studioBike.M.freshPaint.color.set('#C9553E'); studio.background = new THREE.Color('#33421d'); floorMat.color.set('#2d3a12'); sRing.visible = true;
  const viewRT = new THREE.WebGLRenderTarget(1280, 720, { type: THREE.HalfFloatType, samples: 4 });

  // ---------------------------------------------------------------- laptop UI + screen shader (UI ⊕ live viewport)
  const ui = createScreenUI(thumbs);
  const VP = UI_LAYOUT.viewport;
  const screenMat = new THREE.ShaderMaterial({
    uniforms: { ui: { value: ui.texture }, view: { value: viewRT.texture }, rect: { value: new THREE.Vector4(VP.x / 1280, 1 - (VP.y + VP.h) / 800, (VP.x + VP.w) / 1280, 1 - VP.y / 800) }, viewOn: { value: 0 }, rad: { value: VP.r / 1280 }, glow: { value: 1.0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D ui, view; uniform vec4 rect; uniform float viewOn, rad, glow; varying vec2 vUv;
      float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p)-b+r; return length(max(q,0.)) + min(max(q.x,q.y),0.) - r; }
      void main(){ vec3 c = texture2D(ui, vUv).rgb;
        if (viewOn > 0.) { vec2 asp = vec2(1., 800./1280.); vec2 ctr = (rect.xy+rect.zw)*0.5; vec2 hb = (rect.zw-rect.xy)*0.5;
          float d = sdRR((vUv-ctr)/asp*vec2(1.,1.), hb/asp, rad);
          vec2 vuv = (vUv-rect.xy)/(rect.zw-rect.xy); vec3 v = texture2D(view, vuv).rgb;
          c = mix(c, v, viewOn*(1.-smoothstep(-0.0008, 0.0008, d))); }
        gl_FragColor = vec4(c*glow, 1.); }`,
  });
  const desk = createDesk({ screenTexture: ui.texture });
  desk.screen.material = screenMat;
  scene.add(desk.root);
  desk.phoneScreenMat.map = new THREE.CanvasTexture(thumbs.rusty); desk.phoneScreenMat.map.colorSpace = THREE.SRGBColorSpace; desk.phoneScreenMat.color.set('#fff');
  desk.phoneScreenMat.map.center.set(0.5, 0.5); desk.phoneScreenMat.map.rotation = Math.PI / 2; desk.phoneScreenMat.map.repeat.set(0.67, 1); desk.phoneScreenMat.needsUpdate = true;
  const sketchCard = makeCardCanvas(260, 180, 4); desk.sketch.userData.mat.map = sketchCard.tex; desk.sketch.userData.mat.needsUpdate = true;
  scene.updateMatrixWorld(true);

  // screen helpers
  const sW = LAPTOP.screenW, sH = LAPTOP.screenH;
  const screenNormal = new THREE.Vector3(0, 0, 1).transformDirection(desk.screen.matrixWorld);
  const screenPt = (u, v, d = 0) => desk.screen.localToWorld(new THREE.Vector3((u - 0.5) * sW, (0.5 - v) * sH, 0)).addScaledVector(screenNormal, d);
  const screenQuat = new THREE.Quaternion(); desk.screen.getWorldQuaternion(screenQuat);
  const spot = V3(SPOTS.bike);
  const Hh = { screen: (u, v, d, off = [0, 0, 0]) => screenPt(u, v, d).add(V3(off)).toArray(), bike: (x, y, z) => spot.clone().add(new THREE.Vector3(x, y, z)).toArray() };
  const CAM = CAMERA(Hh);

  // ---------------------------------------------------------------- hero bike
  const bike = createBicycle(); scene.add(bike.root);
  const bikeMats = Object.values(bike.M).concat([]);
  const parts = { old: bike.sets.old, new: bike.sets.new };
  // work stand (assembly + wheel macro)
  const standMat = new THREE.MeshPhysicalMaterial({ color: '#2a2726', roughness: 0.35, metalness: 0.6, clearcoat: 0.6 });
  const stand = new THREE.Group(); scene.add(stand);
  const sBase = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.006, 32), standMat); sBase.position.y = 0.003;
  const sPole = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 1, 16), standMat);
  const sArm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 16), standMat); sArm.rotation.x = Math.PI / 2;
  const sClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.014, 16), desk.mat.lime);
  stand.add(sBase, sPole, sArm, sClamp); stand.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });

  // ---------------------------------------------------------------- 3D title
  const title = await createTitle3D(COPY.title3d, `assets/fonts/${BRAND.fonts.display.files[800]}`, { size: 0.052, depth: 0.014 });
  scene.add(title.group);

  // ---------------------------------------------------------------- floating cards
  const cardMesh = (card, wm) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wm, wm * card.h / card.w), new THREE.MeshBasicMaterial({ map: card.tex, transparent: true, toneMapped: false, depthWrite: false }));
    m.renderOrder = 10; scene.add(m); return m;
  };
  const planHeader = makeCardCanvas(560, 64, 3); const planHeaderM = cardMesh(planHeader, 0.17);
  const stepCards = COPY.steps.map(() => makeCardCanvas(300, 120, 3));
  const stepMs = stepCards.map((c) => cardMesh(c, 0.066));
  const stamp = makeCardCanvas(96, 96, 3); drawStamp(stamp);
  const stampMs = [0, 1, 2, 3, 4].map(() => cardMesh(stamp, 0.019));
  const analyze = makeCardCanvas(240, 70, 4); drawPill(analyze, COPY.analyze); const analyzeM = cardMesh(analyze, 0.07);
  const imgCards = ['v1', 'v2', 'v3'].map(() => makeCardCanvas(300, 200, 3));
  const imgMs = imgCards.map((c) => cardMesh(c, 0.085));
  const allCards = [planHeaderM, ...stepMs, ...stampMs, analyzeM, ...imgMs];

  // clay confetti (soft shapes floating near the laptop in UI shots), deterministic
  const confetti = new THREE.Group(); scene.add(confetti);
  const cr = rng(42);
  const shapes = [() => new THREE.TorusGeometry(0.006, 0.0026, 12, 24), () => new THREE.CapsuleGeometry(0.0028, 0.008, 6, 12), () => new THREE.IcosahedronGeometry(0.0045, 0), () => new THREE.SphereGeometry(0.0038, 16, 12)];
  const cmats = [desk.mat.clay, desk.mat.lime, desk.mat.pink, desk.mat.clayLight];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(shapes[i % 4](), cmats[Math.floor(cr() * 4)]);
    // keep to the screen periphery so they never sit on copy
    const side = i % 4;
    const u = side === 0 ? -0.08 + cr() * 0.2 : side === 1 ? 0.88 + cr() * 0.2 : 0.1 + cr() * 0.8;
    const v = side === 2 ? -0.12 + cr() * 0.14 : side === 3 ? 0.88 + cr() * 0.18 : cr();
    m.userData = { u, v, d: 0.03 + cr() * 0.09, ph: cr() * 6.28, sp: 0.3 + cr() * 0.6, rx: cr(), ry: cr() };
    m.castShadow = true; confetti.add(m);
  }
  // burst particles for stamps
  const sparks = new THREE.Group(); scene.add(sparks);
  for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(i % 3 ? new THREE.SphereGeometry(0.0016, 8, 6) : new THREE.BoxGeometry(0.0026, 0.0026, 0.0026), i % 2 ? desk.mat.lime : desk.mat.clay); m.userData.seed = i; sparks.add(m); }

  // ---------------------------------------------------------------- camera + post
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.005, 12);
  const post = new Post(renderer, W, H);
  const overlay = createOverlay(document.getElementById('overlay'));

  const rampInfo = layoutRamp(desk.ramp, RIDE.rampX0, RIDE.rampX1, RIDE.z);

  // ---------------------------------------------------------------- bike motion for the ride/flip
  const R = BIKE.wheelR * BIKE.scale;
  const lipX = rampInfo.lipX, lipY = rampInfo.lipY;
  const tRampStart = RIDE.t0 + (RIDE.rampX0 - RIDE.startX) / RIDE.speed;
  const rampLen = (lipX - RIDE.rampX0);
  const tLaunch = tRampStart + rampLen / Math.cos(rampInfo.angle) / RIDE.speed;
  const T = RIDE.air, hA = RIDE.apex;
  // solve gravity so that the bike rises hA above the lip and lands on the desk after T seconds
  const sq = Math.sqrt(2 * hA); const s = (sq * T + Math.sqrt(2 * hA * T * T + 2 * T * T * lipY)) / (T * T); const g = s * s; const vy0 = Math.sqrt(2 * g * hA);
  const tLand = tLaunch + T, xLand = lipX + RIDE.speed * T;
  const bbOff = new THREE.Vector3(0.12, 0.31, 0).multiplyScalar(BIKE.scale); // pivot ≈ centre of mass (bike space → world)
  function rideState(t) {
    // returns {x, y, pitch, spin(dist)} for the bike root (rear-axle-ground origin = bike space origin)
    let x, y = 0, pitch = 0;
    const ramp = (xx) => clamp((xx - RIDE.rampX0) / rampLen) * (lipY - 0.003);
    if (t < tLaunch) {
      x = RIDE.startX + (t - RIDE.t0) * RIDE.speed;
      // on the ramp: rear and front contact heights define pitch
      const xr = x - 0.07, xf = x + 0.12; // approx rear/front contact (bike origin is 0.07 ahead of rear contact)
      const yr = ramp(xr + 0.0), yf = ramp(xf);
      pitch = Math.atan2(yf - yr, xf - xr); y = yr;
      return { x, y, pitch, dist: x - RIDE.startX, air: 0 };
    }
    if (t < tLand) {
      const k = (t - tLaunch);
      x = lipX + k * RIDE.speed;
      y = lipY - 0.003 + vy0 * k - 0.5 * g * k * k;
      const u = k / T;
      pitch = lerp(rampInfo.angle, Math.PI * 2, smoother(u)); // one monotonic ease: continuous backflip, no pause or reversal
      return { x, y: Math.max(0, y), pitch, dist: x - RIDE.startX, air: 1, u };
    }
    const k = t - tLand, vx = RIDE.speed, dStop = RIDE.stopX - xLand;
    const tau = 2 * dStop / vx; const kk = Math.min(k, tau);
    x = xLand + vx * kk - (vx / tau) * kk * kk / 2;
    const squash = Math.exp(-k * 9) * Math.sin(k * 30) * 0.004;
    return { x, y: squash > 0 ? 0 : 0, pitch: Math.PI * 2, dist: x - RIDE.startX, air: 0, squash };
  }

  // ---------------------------------------------------------------- per-frame helpers
  const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();
  function resetBike() {
    bike.root.position.copy(spot).setY(0.0005); bike.root.quaternion.identity(); bike.root.scale.setScalar(1); bike.root.visible = true;
    for (const set of Object.values(parts)) for (const p of Object.values(set)) { p.group.position.copy(p.home.pos); p.group.quaternion.copy(p.home.quat); p.group.scale.setScalar(1); p.group.visible = true; }
    bike.frame.visible = true; bike.frameRust.visible = true; bike.frameFresh.visible = false;
    for (const m of bikeMats) m.clippingPlanes = null;
    bike.spinWheels(0);
    for (const set of Object.values(parts)) { const ch = set.chain.inner.children[0]; ch.count = ch.userData?.n ?? ch.count; }
  }
  for (const set of Object.values(parts)) { const ch = set.chain.inner.children[0]; ch.userData.n = ch.count; }

  // move a part by a world-space offset (converted to bike space)
  const toBike = (wv) => { const q = bike.root.quaternion.clone().invert(); return wv.clone().applyQuaternion(q).multiplyScalar(1 / (BIKE.scale * bike.root.scale.x)); };

  // flat layout for the inspection shot: world (x,z) targets, part laid on its side
  const FLAT = { frame: [0.2, 0.2], wheelR: [-0.255, 0.255], wheelF: [-0.125, 0.255], fork: [-0.27, 0.115], bars: [-0.13, 0.11], saddle: [0.02, 0.27], cranks: [0.02, 0.13], crankL: [0.075, 0.12], pedalR: [-0.04, 0.08], pedalL: [-0.0, 0.08], chain: [0.03, 0.2] };
  const flatRects = {};
  function layFlat() {
    bike.root.position.set(0, 0, 0); bike.root.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    bike.root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const items = Object.entries(FLAT);
    for (const [name, [x, z]] of items) {
      const obj = name === 'frame' ? bike.frame : parts.old[name]?.group; if (!obj) continue;
      if (name === 'chain') obj.position.set(0, 0, 0);
      obj.updateMatrixWorld(true); box.setFromObject(obj);
      const c = box.getCenter(new THREE.Vector3());
      const d = toBike(new THREE.Vector3(x - c.x, 0.0012 - box.min.y, z - c.z));
      obj.position.add(d); obj.updateMatrixWorld(true);
    }
  }
  function projectBox(objs) {
    const box = new THREE.Box3(); objs.forEach((o) => box.expandByObject(o));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < 8; i++) {
      tmpV.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
      const sx = (tmpV.x * 0.5 + 0.5) * W, sy = (1 - (tmpV.y * 0.5 + 0.5)) * H;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return [x0, y0, x1, y1];
  }
  const toScreen = (p) => { tmpV.copy(p).project(camera); return [(tmpV.x * 0.5 + 0.5) * W, (1 - (tmpV.y * 0.5 + 0.5)) * H, tmpV.z]; };

  // ---------------------------------------------------------------- camera evaluation
  function evalCamera(t, out) {
    const shot = shotAt(t);
    const keys = CAM[shot.id];
    let p, l, fov = 32, roll = 0;
    if (keys && keys.length) {
      const k = (f) => keys.map((kk) => ({ t: kk.t, v: f(kk), ease: kk.ease }));
      p = spline(k((kk) => kk.p), t); l = spline(k((kk) => kk.l), t);
      fov = spline(k((kk) => [kk.fov ?? 32]), t)[0]; roll = spline(k((kk) => [kk.roll ?? 0]), t)[0];
    } else {
      // tracking cameras for ride / flip / end
      const st = rideState(Math.min(t, 28.6));
      const bx = st.x;
      if (shot.id === 'ride') {
        const u = remap(t, 25.2, 26.3);
        p = [bx + 0.22 - u * 0.06, 0.065 + u * 0.01, RIDE.z + 0.56]; l = [bx + 0.07, 0.065, RIDE.z]; fov = 30;
      } else if (shot.id === 'flip') {
        const u = remap(t, 26.3, 28.4), e = easeInOutSine(u);
        const cx = lerp(-0.02, 0.36, e);
        const by = Math.max(0, st.y);
        p = [cx, 0.12 + 0.03 * e, RIDE.z + 1.0 - 0.06 * e];
        l = [lerp(cx + 0.02, Math.min(bx, 0.62) * 0.55 + cx * 0.45, 0.85), 0.07 + 0.45 * by, RIDE.z - 0.02];
        fov = 30;
      } else { // end
        const u = remap(t, 28.4, 30);
        p = [0.38 + u * 0.03, 0.135, RIDE.z + 0.7 - u * 0.04]; l = [0.42 + u * 0.03, 0.09, RIDE.z - 0.04]; fov = 30;
      }
    }
    // subtle handheld drift (none on the macro / top-down plates)
    const hh = shot.id === 'inspect' || shot.id === 'desk' ? 0.25 : 1;
    const a = 0.0012 * hh;
    p = [p[0] + noise1(t * 0.7, 1) * a, p[1] + noise1(t * 0.6, 2) * a, p[2] + noise1(t * 0.5, 3) * a];
    out.position.set(...p); out.fov = fov;
    const dir = new THREE.Vector3(...l).sub(out.position).normalize();
    const up = Math.abs(dir.y) > 0.95 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    out.up.copy(up.applyAxisAngle(dir, THREE.MathUtils.degToRad(roll)));
    out.lookAt(...l); out.updateProjectionMatrix(); out.updateMatrixWorld(true);
    out.userData.look = new THREE.Vector3(...l); out.userData.shot = shot.id;
    return out;
  }
  const prevCam = new THREE.PerspectiveCamera(35, W / H, 0.005, 12);

  // ---------------------------------------------------------------- the frame
  function renderFrame(t) {
    const frame = Math.round(t * FILM.fps);
    const shot = shotAt(t).id;
    resetBike();
    title.group.visible = false; desk.ramp.visible = false; stand.visible = false;
    allCards.forEach((m) => (m.visible = false)); confetti.visible = false; sparks.visible = false;
    screenMat.uniforms.viewOn.value = 0;
    const flares = [];
    let letterbox = 0, fade = 0, mblurBoost = 1;

    // UI texture + sketch card
    ui.draw(t);
    drawSketch(sketchCard, remap(t, 18.05, 19.2) + (t < 18 ? 0 : 0));

    // --- bike states per shot
    bike.setVariant('old');
    if (shot === 'desk' || shot === 'title' || shot === 'scan' || shot === 'rise') {
      if (shot === 'scan' || shot === 'rise') flares.push({ p: bike.root.localToWorld(new THREE.Vector3(-0.435, 0.72, 0.03).multiplyScalar(BIKE.scale)), i: 0.9 * window01(t, 4.0, 4.7, 0.3), w: 1 });
    }
    if (shot === 'title') {
      title.group.visible = true; bike.root.visible = false; title.group.position.set(0.02, 0.0005, 0.22);
      title.glyphs.forEach((gl, i) => {
        const t0 = 1.62 + i * 0.09, k = remap(t, t0, t0 + 0.55);
        const h = gl.userData.home;
        const drop = 1 - easeOutBack(k, 1.3);
        gl.position.set(h.x + (1 - smooth(k)) * (i - 3) * 0.01, drop * 0.14, (1 - smooth(k)) * -0.05);
        gl.rotation.set((1 - easeOutCubic(k)) * -1.6, (1 - easeOutCubic(k)) * (i % 2 ? 0.7 : -0.7), (1 - easeOutCubic(k)) * 0.4);
        gl.scale.setScalar(0.4 + 0.6 * easeOutCubic(remap(t, t0, t0 + 0.25)));
      });
      flares.push({ p: new THREE.Vector3(0.18, 0.09, 0.34), i: 0.7 * window01(t, 2.45, 3.1, 0.25), w: 1 });
    }
    if (['prompt', 'adaptive', 'plan', 'verdict', 'checking', 'visuals'].includes(shot)) confetti.visible = shot === 'prompt' || shot === 'plan' || shot === 'visuals';
    if (shot === 'popout' || shot === 'wipe') {
      // the rusty bike emerges from the display, clipped by the screen plane like a portal
      const k = easeOutCubic(remap(t, 10.0, 10.9));
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(screenNormal, screenPt(0.5, 0.5, 0.0005));
      for (const m of bikeMats) m.clippingPlanes = [plane];
      const sc = lerp(0.38, 0.52, k);
      bike.root.scale.setScalar(sc);
      const base = screenPt(0.52, 0.97, lerp(-0.07, 0.09, k));
      bike.root.position.copy(base).add(new THREE.Vector3(-0.03 * sc, -0.045 * sc, 0));
      bike.root.quaternion.copy(screenQuat).multiply(tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), lerp(0.0, -0.55, k)));
      bike.root.quaternion.multiply(tmpQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -lerp(0.0, 0.18, k)));
      // open up into components
      const ex = easeOutCubic(remap(t, 10.75, 11.45));
      for (const p of Object.values(parts.old)) {
        const o = p.insert.clone().multiplyScalar(-0.16 * ex);
        if (p.name === 'wheelF' || p.name === 'wheelR') o.set(p.name === 'wheelF' ? 0.12 * ex : -0.12 * ex, -0.05 * ex, 0.0);
        p.group.position.copy(p.home.pos).add(o);
      }
      bike.frame.position.set(0, 0.03 * ex, 0);
      analyzeM.visible = t > 11.1;
      const ak = easeOutBack(remap(t, 11.1, 11.35));
      analyzeM.position.set(0, LAPTOP.baseH + 0.012, -0.07 + 0.045).add(new THREE.Vector3(...LAPTOP.pos).setY(0)).setY(LAPTOP.baseH + 0.014);
      analyzeM.quaternion.setFromEuler(new THREE.Euler(-1.05, 0, 0)); analyzeM.scale.setScalar(Math.max(0.001, ak));
    }
    if (shot === 'inspect') {
      layFlat();
      bike.root.updateMatrixWorld(true);
    } else bike.frame.position.set(0, shot === 'popout' || shot === 'wipe' ? bike.frame.position.y : 0, 0);

    if (shot === 'plan') {
      const n = [16.47, 16.92, 17.37, 17.82].filter((x) => t >= x).length;
      planHeaderM.visible = true; drawPlanHeader(planHeader, n, t);
      const hk = easeOutBack(remap(t, 15.85, 16.15));
      planHeaderM.position.copy(screenPt(0.5, 0.1, 0.03)); planHeaderM.quaternion.copy(screenQuat); planHeaderM.scale.setScalar(Math.max(0.001, hk));
      COPY.steps.forEach((st, i) => {
        const t0 = 16.0 + i * 0.45, k = easeOutBack(remap(t, t0, t0 + 0.35));
        const m = stepMs[i]; m.visible = k > 0.001;
        drawStepCard(stepCards[i], st, i, remap(t, t0 + 0.1, t0 + 0.45));
        const u = 0.5 + (i - 1.5) * 0.245;
        m.position.copy(screenPt(u, 0.66 + (i % 2) * 0.025, 0.03 + (i % 2) * 0.01));
        m.quaternion.copy(screenQuat).multiply(tmpQ.setFromEuler(new THREE.Euler(0, (1.5 - i) * 0.1 * (1 - k * 0.6), 0)));
        m.scale.setScalar(Math.max(0.001, k));
        const sk = easeOutBack(remap(t, t0 + 0.47, t0 + 0.67), 2.2);
        const sm = stampMs[i]; sm.visible = sk > 0.001;
        sm.position.copy(screenPt(u + 0.1, 0.57 + (i % 2) * 0.025, 0.045 + (i % 2) * 0.01)); sm.quaternion.copy(screenQuat); sm.scale.setScalar(Math.max(0.001, sk));
        if (sk > 0.3) flares.push({ p: sm.position.clone(), i: 0.35 * window01(t, t0 + 0.5, t0 + 0.8, 0.08), w: 1.2 });
      });
      // spark bursts
      sparks.visible = true;
      sparks.children.forEach((m) => {
        const i = m.userData.seed % 4, t0 = 16.47 + i * 0.45, k = remap(t, t0, t0 + 0.6);
        m.visible = k > 0 && k < 1;
        if (!m.visible) return;
        const r = rng(m.userData.seed * 13 + 1); const a = r() * 6.28, sp = 0.02 + r() * 0.03;
        const u = 0.5 + (i - 1.5) * 0.245 + 0.1;
        m.position.copy(screenPt(u, 0.57 + (i % 2) * 0.025, 0.05)).add(new THREE.Vector3(Math.cos(a) * sp * easeOutCubic(k), Math.sin(a) * sp * easeOutCubic(k) - k * k * 0.02, (r() - 0.5) * 0.02));
        m.scale.setScalar(1 - k);
      });
    }

    if (shot === 'assembly' || shot === 'wheel') {
      bike.setVariant('new');
      const lift = 0.27 * BIKE.scale;
      bike.root.position.copy(spot).setY(lift);
      // stand
      stand.visible = true;
      const clampW = bike.root.localToWorld(bike.P.cluster.clone().lerp(bike.P.htTop, 0.42).multiplyScalar(BIKE.scale));
      const sx = clampW.x, sz = spot.z - 0.085;
      sBase.position.set(sx, 0.003, sz); sPole.position.set(sx, clampW.y / 2, sz); sPole.scale.y = clampW.y + 0.004;
      sArm.position.set(sx, clampW.y, (sz + clampW.z) / 2); sArm.scale.y = Math.abs(clampW.z - sz);
      sClamp.position.copy(clampW); sClamp.rotation.set(0, 0, Math.atan2(bike.P.htTop.y - bike.P.cluster.y, bike.P.htTop.x - bike.P.cluster.x) + Math.PI / 2);
      sClamp.position.z -= 0.0;
      // parts arrive in real assembly order: fly to a pre-seat pose, then slide along the insert axis
      const seq = { fork: 'fork', wheelF: 'wheelF', wheelR: 'wheelR', bars: 'bars', cranks: 'cranks', crankL: 'cranks', pedalR: 'pedalR', pedalL: 'pedalL', saddle: 'saddle' };
      for (const [name, key] of Object.entries(seq)) {
        const p = parts.new[name]; if (!p) continue;
        let [ta, tb] = ASSEMBLY[key];
        if (name === 'crankL') { ta += 0.08; tb += 0.08; }
        const r = rng(name.length * 97 + name.charCodeAt(0));
        const pre = p.home.pos.clone().addScaledVector(p.insert, -(name.startsWith('pedal') ? 0.12 : name.startsWith('crank') ? 0.18 : 0.25));
        const from = pre.clone().add(new THREE.Vector3((r() - 0.5) * 0.6, 0.35 + r() * 0.3, 0.9 + r() * 0.4));
        if (name === 'crankL' || name === 'pedalL') from.z = pre.z - 0.9;
        const tm = lerp(ta, tb, 0.55);
        if (t < ta) { p.group.visible = false; continue; }
        if (t < tm) {
          const k = easeOutCubic(remap(t, ta, tm));
          const ctrl = from.clone().lerp(pre, 0.5).add(new THREE.Vector3(0, 0.25, 0));
          const a = from.clone().lerp(ctrl, k), b = ctrl.clone().lerp(pre, k);
          p.group.position.copy(a.lerp(b, k));
          const tumble = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 2, (r() - 0.5) * 2, (r() - 0.5) * 2));
          p.group.quaternion.copy(p.home.quat).multiply(tumble.slerp(new THREE.Quaternion(), k));
          p.group.scale.setScalar(lerp(0.6, 1, easeOutCubic(remap(t, ta, ta + 0.15))));
        } else {
          const k = easeOutCubic(remap(t, tm, tb));
          p.group.position.copy(pre.lerp(p.home.pos, k));
          if (name === 'pedalR' || name === 'pedalL') p.inner.rotation.z = (1 - k) * 6; // threading
        }
      }
      // chain threads on (instanced count)
      const ck = remap(t, ASSEMBLY.chain[0], ASSEMBLY.chain[1]);
      const ch = parts.new.chain.inner.children[0];
      ch.count = Math.floor(ch.userData.n * ck);
      parts.new.chain.group.visible = ck > 0;
      parts.new.chain.inner.children.slice(1).forEach((c) => (c.visible = ck > 0.05));
      // repaint sweep (rust → fresh) along the bike's length with a lime scan ring
      const rk = remap(t, ASSEMBLY.repaint[0], ASSEMBLY.repaint[1]);
      if (rk > 0) {
        const xw = lerp(spot.x - 0.15, spot.x + 0.2, easeInOutSine(rk));
        bike.frameFresh.visible = true;
        const pl1 = new THREE.Plane(new THREE.Vector3(-1, 0, 0), xw), pl2 = new THREE.Plane(new THREE.Vector3(1, 0, 0), -xw);
        bike.M.rustPaint.clippingPlanes = rk < 1 ? [pl1.clone().negate()] : null; bike.M.rustChrome.clippingPlanes = bike.M.rustPaint.clippingPlanes;
        bike.M.freshPaint.clippingPlanes = rk < 1 ? [pl2.clone().negate()] : null; bike.M.blackGloss.clippingPlanes = null;
        if (rk >= 1) bike.frameRust.visible = false;
        if (rk < 1) flares.push({ p: new THREE.Vector3(xw, lift + 0.12, spot.z + 0.02), i: 0.8 * Math.sin(Math.PI * rk), w: 1.5, col: [0.85, 1, 0.5] });
      }
      if (shot === 'wheel') {
        bike.frameRust.visible = false; bike.frameFresh.visible = true;
        for (const m of bikeMats) m.clippingPlanes = null;
        const k = t - 21.2; bike.spinWheels(9 * (1 - Math.exp(-k * 1.2)) / 1.2 + 0); // decaying freewheel
        flares.push({ p: bike.root.localToWorld(bike.P.frontAxle.clone().add(new THREE.Vector3(0.1, 0.3, 0.02)).multiplyScalar(BIKE.scale)), i: window01(t, 21.35, 21.85, 0.15) * 0.9, w: 1.4 });
      }
    }
    if (shot === 'visuals') {
      ['v1', 'v2', 'v3'].forEach((n, i) => {
        const t0 = 22.45 + i * 0.2, k = easeOutBack(remap(t, t0, t0 + 0.4));
        const m = imgMs[i]; m.visible = k > 0.001;
        drawImageCard(imgCards[i], thumbs[n], { circled: i === 0, t: remap(t, 22.95, 23.3) });
        m.position.copy(screenPt(0.33 + i * 0.17, lerp(0.84, 0.62 - (i === 0 ? 0.07 : 0), k), lerp(0.0, 0.04 + i * 0.008, k)));
        m.quaternion.copy(screenQuat).multiply(tmpQ.setFromEuler(new THREE.Euler(0, (i - 1) * -0.18 * k, (i - 1) * -0.04 * k)));
        m.scale.setScalar(Math.max(0.001, lerp(0.5, i === 0 ? 1.12 : 0.92, k)));
      });
    }
    if (shot === 'model') {
      screenMat.uniforms.viewOn.value = smooth(remap(t, 23.4, 23.6));
      // live viewport: finished bike turntable in the studio
      studioBike.setVariant('new'); studioBike.frameRust.visible = false; studioBike.frameFresh.visible = true;
      studioBike.root.rotation.y = -0.6 + (t - 23.4) * 0.45;
      studioBike.spinWheels((t - 23.4) * 3);
      sRing.scale.setScalar(1 + 0.04 * Math.sin(t * 4));
      sCam.position.set(2.6, 1.0, 3.2); sCam.lookAt(0.15, 0.55, 0); sCam.aspect = VP.w / VP.h; sCam.fov = 30; sCam.updateProjectionMatrix();
      renderer.setRenderTarget(viewRT); renderer.render(studio, sCam);
      const sk = easeOutBack(remap(t, 23.85, 24.05), 2.2);
      const sm = stampMs[4]; sm.visible = sk > 0.001;
      sm.position.copy(screenPt((VP.x + VP.w - 80) / 1280, (VP.y + 80) / 800, 0.02)); sm.quaternion.copy(screenQuat); sm.scale.setScalar(Math.max(0.001, sk * 1.6));
      if (sk > 0) flares.push({ p: sm.position.clone(), i: 0.5 * window01(t, 23.9, 24.3, 0.1), w: 1.3 });
    }
    if (shot === 'ride' || shot === 'flip' || shot === 'end') {
      bike.setVariant('new'); bike.frameRust.visible = false; bike.frameFresh.visible = true;
      desk.ramp.visible = true;
      const st = rideState(Math.min(t, 28.9));
      // pitch about the centre of mass, then keep both tyres above the desk/ramp
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), st.pitch);
      const piv = bbOff.clone();
      const off = piv.clone().sub(piv.clone().applyQuaternion(q));
      bike.root.quaternion.copy(q);
      bike.root.position.set(st.x, st.y + 0.0005, RIDE.z).add(off);
      if (st.air) {
        // ground clamp: lowest tyre point must stay ≥ desk
        const fa = bike.P.frontAxle.clone().multiplyScalar(BIKE.scale).applyQuaternion(q).add(bike.root.position);
        const ra = bike.P.rearAxle.clone().multiplyScalar(BIKE.scale).applyQuaternion(q).add(bike.root.position);
        const low = Math.min(fa.y, ra.y) - R;
        const ground = (x) => (x > RIDE.rampX0 && x < lipX + 0.03 ? clamp((x - RIDE.rampX0) / rampLen) * (lipY - 0.003) : 0);
        const gmin = Math.max(ground(fa.x), ground(ra.x));
        if (low < gmin) bike.root.position.y += gmin - low;
      }
      if (st.squash) bike.root.position.y += Math.min(0, st.squash);
      bike.spinWheels(st.dist / R);
      if (shot === 'flip') {
        letterbox = smooth(remap(t, 26.4, 26.8));
        const bp = bike.root.localToWorld(new THREE.Vector3(0.1, 0.6, 0.1).multiplyScalar(BIKE.scale));
        flares.push({ p: bp, i: 0.8 * window01(t, 27.0, 27.6, 0.2), w: 1.6 });
      }
      if (shot === 'end') { letterbox = 1; fade = 0.38 * smooth(remap(t, 28.4, 28.8)); }
    }

    // --- confetti drift
    if (confetti.visible) confetti.children.forEach((m) => {
      const d = m.userData; const k = t * d.sp + d.ph;
      m.position.copy(screenPt(d.u + Math.sin(k) * 0.02, d.v + Math.cos(k * 0.8) * 0.02, d.d));
      m.rotation.set(k * d.rx * 2, k * d.ry * 2, k);
    });

    // --- camera + motion blur estimate (180° shutter, same shot only)
    evalCamera(t, camera);
    const dtS = 0.5 / FILM.fps;
    let mb = [0, 0];
    if (shotAt(t - dtS).id === shot) {
      evalCamera(t - dtS, prevCam);
      const focusP = camera.userData.look;
      const a = focusP.clone().project(camera);
      const dirPrev = new THREE.Vector3(0, 0, -1).applyQuaternion(prevCam.quaternion);
      const pPrev = prevCam.position.clone().addScaledVector(dirPrev, camera.position.distanceTo(focusP)).project(camera);
      mb = [(a.x - pPrev.x) * 0.5, (a.y - pPrev.y) * 0.5];
    }
    // whip pan is a deliberate smear
    if (shot === 'checking') mblurBoost = 1 + 10 * smooth(remap(t, 9.72, 10.0));
    if (shot === 'popout') mblurBoost = 1 + 6 * (1 - smooth(remap(t, 10.0, 10.18)));
    post.u.mblur.value.set(clamp(mb[0] * mblurBoost, -0.06, 0.06), clamp(mb[1] * mblurBoost, -0.06, 0.06));

    // --- focus
    const F = FOCUS[shot] || { amount: 1 };
    const fz = shot === 'end' ? 0.12 : camera.position.distanceTo(camera.userData.look);
    post.u.focusZ.value = fz; post.u.cocAmt.value = F.amount * (shot === 'end' ? 2.5 : 1);
    if (shot === 'popout' || shot === 'wipe') post.u.focusZ.value = camera.position.distanceTo(bike.root.position);
    if (shot === 'ride' || shot === 'flip') post.u.focusZ.value = camera.position.distanceTo(bike.root.position);

    // --- flares → screen space
    const fl = post.u.flares.value;
    for (let i = 0; i < 4; i++) {
      const f = flares[i];
      if (!f || f.i <= 0.001) { fl[i].set(0, 0, 0, 0); continue; }
      const sp = f.p.clone().project(camera);
      if (sp.z > 1) { fl[i].set(0, 0, 0, 0); continue; }
      fl[i].set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5, f.i, f.w ?? 1);
      post.u.flareCol.value[i].setRGB(...(f.col || [1, 0.88, 0.72]));
    }
    post.u.time.value = t; post.u.letterbox.value = letterbox; post.u.fadeAmt.value = fade;
    post.u.dustAmt.value = shot === 'end' || shot === 'flip' ? 0.16 : 0.1;
    post.u.streakAmt.value = 0.2; post.u.bloomAmt.value = 0.15;

    // --- render
    renderer.setClearColor('#E2CCBD');
    post.render(scene, camera);

    // --- overlays (projected anchors)
    const ctx = {};
    if (shot === 'inspect') ctx.rects = { wheels: projectBox([parts.old.wheelF.group, parts.old.wheelR.group]), frame: projectBox([bike.frame]) };
    if (shot === 'ride' || shot === 'flip') { const b = toScreen(bike.root.localToWorld(new THREE.Vector3(0.15, 0.4, 0).multiplyScalar(BIKE.scale))); ctx.bikeScreen = [b[0], b[1]]; }
    overlay.update(t, frame, ctx);
    return true;
  }

  window.renderFrame = (t) => renderFrame(t);
  window.FILM = FILM;
  window.__ready = true;
  // interactive scrub: ?t=12.3
  const qs = new URLSearchParams(location.search);
  if (qs.has('t')) renderFrame(Number(qs.get('t')));
}

init().catch((e) => { console.error(e); window.__error = String(e && e.stack || e); });
