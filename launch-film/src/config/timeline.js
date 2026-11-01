// ============================================================================
// THE EDIT. One source of truth for shot timing, copy, camera, and sound cues.
// Times are seconds from the start of the film (30.0 s total, rendered at FPS).
// The renderer (src/main.js), overlays (src/ui/overlay.js), screen UI (src/ui/screen.js)
// and the audio builder (scripts/audio.js) all read from this file.
// ============================================================================

export const FILM = { duration: 30, fps: 30, width: 1920, height: 1080 };

// ---------------------------------------------------------------- copy
export const COPY = {
  lockup: { left: 'Higgsfield MCP', right: 'Claude', sep: '×' },
  title3d: 'OPUS 5.5',
  hudFile: 'INPUT · IMG_0418.HEIC',
  hudMode: ['SCAN', 'PHOTO'],
  appModel: 'Opus 5.5',
  appMode: 'Adaptive',
  appModes: [
    ['Adaptive', 'Thinks as long as the task needs'],
    ['Fast', 'Quick answers for everyday tasks'],
    ['Extended', 'Deeper reasoning for hard problems'],
  ],
  mcpBadge: 'Higgsfield MCP · connected',
  newChat: 'New chat',
  homeTitle: 'What should we build today?',
  attachmentPdf: 'Diagnostic Report',
  prompt: ['Turn this rusty bike into ', 'a trail-ready ride'], // second half highlighted
  checking: 'Checking if this bike can handle a trail build',
  analyze: 'ANALYZE',
  condition: 'Condition',
  verdictBold: 'Frame is in perfect condition.',
  verdictRest: ' This frame is a prime candidate for a trail build.',
  usingHF: ['Using ', 'Higgsfield', ' to plan the build'],
  planTitle: 'Planning the build with Higgsfield MCP',
  steps: [
    { k: 'STEP 01', title: 'Fork & headset', sub: '120 mm travel, tapered steerer', icon: 'fork' },
    { k: 'STEP 02', title: 'Wheels & tyres', sub: '29 × 2.4" knobby, tubeless', icon: 'wheel' },
    { k: 'STEP 03', title: 'Cockpit & pedals', sub: '780 mm riser · flat pedals', icon: 'bars' },
    { k: 'STEP 04', title: 'Final assembly', sub: 'Ready for the trail', icon: 'bike' },
  ],
  sketchTitle: 'TRAIL BUILD · SKETCH 01',
  assemblySteps: [
    // [start time, caption]  — captions follow the part order below
    [18.15, 'Seating the suspension fork…'],
    [18.95, 'Mounting wheels into the dropouts…'],
    [19.6, 'Clamping the handlebars…'],
    [20.05, 'Threading in the pedals…'],
    [20.45, 'Dropping in the saddle…'],
    [20.75, 'Fresh paint, same proven frame'],
  ],
  readyBold: 'The bike is ready for any trail.',
  generating: 'Generating trail build design visuals',
  finalModel: 'Building the final 3D model',
  guideQ: 'Compile a universal build guide?',
  yes: 'Yes', no: 'No',
  guideFile: ['Full Build Guide', 'Document · ZIP', 'Download'],
  testRide: ['Test ride', ' · checking suspension travel…'],
  tagline: 'TRY OPUS 5.5 ON CLAUDE WITH HIGGSFIELD MCP',
  availability: 'Available on Claude via Higgsfield MCP and in Higgsfield Supercomputer',
};

// ---------------------------------------------------------------- shots
// id, start, end, and what the shot is. Camera keys live in CAMERA below.
export const SHOTS = [
  { id: 'desk', t0: 0.0, t1: 1.5, note: 'Top-down establishing: desk, laptop, phone with the rusty bike photo' },
  { id: 'title', t0: 1.5, t1: 3.3, note: 'Lockup + extruded OPUS 5.5 tumbling onto the mat' },
  { id: 'scan', t0: 3.3, t1: 5.4, note: 'The rusty bike on the desk, photo HUD, scan sweep' },
  { id: 'rise', t0: 5.4, t1: 6.2, note: 'Camera lifts over the bike and pushes into the laptop' },
  { id: 'prompt', t0: 6.2, t1: 8.0, note: 'Claude UI: attachments + typed prompt' },
  { id: 'adaptive', t0: 8.0, t1: 9.0, note: 'Macro: Adaptive mode, send' },
  { id: 'checking', t0: 9.0, t1: 10.0, note: 'Checking… then whip-pan' },
  { id: 'popout', t0: 10.0, t1: 11.6, note: 'The bike emerges from the screen and opens up; ANALYZE' },
  { id: 'wipe', t0: 11.6, t1: 12.0, note: 'Hand-drawn lime wipe' },
  { id: 'inspect', t0: 12.0, t1: 14.5, note: 'Parts laid flat on the mat: wheels 12%, frame 96%' },
  { id: 'verdict', t0: 14.5, t1: 15.8, note: 'Frame is in perfect condition. Using Higgsfield…' },
  { id: 'plan', t0: 15.8, t1: 18.0, note: 'Plan cards pop out of the screen 0/4 → 4/4' },
  { id: 'assembly', t0: 18.0, t1: 21.2, note: 'Frame → fork → wheels → bars → pedals → saddle, repaint sweep' },
  { id: 'wheel', t0: 21.2, t1: 22.0, note: 'NEW: macro on the knobby front wheel freewheeling' },
  { id: 'visuals', t0: 22.0, t1: 23.4, note: 'Design visuals pop out of the screen' },
  { id: 'model', t0: 23.4, t1: 25.2, note: 'Final 3D model viewport, build guide' },
  { id: 'ride', t0: 25.2, t1: 26.3, note: 'NEW: test ride across the desk' },
  { id: 'flip', t0: 26.3, t1: 28.4, note: 'Ruler ramp, continuous backflip, landing; tagline types on' },
  { id: 'end', t0: 28.4, t1: 30.0, note: 'End lockup' },
];
export const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];

// ---------------------------------------------------------------- bike action
export const ASSEMBLY = {
  // part name → [arrive start, seat end]; order follows real assembly
  fork: [18.1, 18.75],
  wheelF: [18.85, 19.3],
  wheelR: [19.05, 19.5],
  bars: [19.5, 19.95],
  cranks: [19.75, 20.15],
  pedalR: [20.0, 20.3],
  pedalL: [20.05, 20.35],
  chain: [20.15, 20.45],
  saddle: [20.35, 20.75],
  repaint: [20.7, 21.15],
};
export const RIDE = {
  startX: -0.6, z: 0.25, speed: 0.45, t0: 25.2,
  rampX0: -0.12, rampX1: 0.1, // ruler foot / eraser
  air: 0.95, apex: 0.085, // seconds aloft, metres above the lip
  stopX: 0.68,
};

// ---------------------------------------------------------------- camera
// Keys: t, p (position), l (look-at), fov, roll(deg). `H` gives scene helpers:
//   H.screen(u,v,d)  world point on the laptop screen (u,v in 0..1 from top-left) pushed d metres along its normal
//   H.bike(x,y,z)    point relative to the bike hero spot
export const CAMERA = (H) => ({
  desk: [
    { t: 0.0, p: [0.12, 1.12, 0.32], l: [0.02, 0, 0.04], fov: 40, roll: -14 },
    { t: 1.5, p: [0.06, 0.86, 0.26], l: [0.0, 0, 0.03], fov: 40, roll: -4 },
  ],
  title: [
    { t: 1.5, p: [0.07, 0.16, 0.66], l: [0.02, 0.045, 0.22], fov: 30 },
    { t: 3.3, p: [-0.01, 0.13, 0.6], l: [0.02, 0.05, 0.22], fov: 30 },
  ],
  scan: [
    { t: 3.3, p: H.bike(0.42, 0.12, 0.42), l: H.bike(0.02, 0.075, 0), fov: 28 },
    { t: 5.4, p: H.bike(-0.08, 0.13, 0.55), l: H.bike(0.0, 0.075, 0), fov: 28 },
  ],
  rise: [
    { t: 5.4, p: H.bike(-0.08, 0.13, 0.55), l: H.bike(0.0, 0.075, 0), fov: 28 },
    { t: 5.85, p: H.bike(-0.02, 0.3, 0.3), l: H.screen(0.5, 0.55, 0), fov: 30 },
    { t: 6.2, p: H.screen(0.62, 0.5, 0.34, [0.1, 0.03, 0]), l: H.screen(0.5, 0.48, 0), fov: 32 },
  ],
  prompt: [
    { t: 6.2, p: H.screen(0.62, 0.5, 0.34, [0.1, 0.03, 0]), l: H.screen(0.5, 0.48, 0), fov: 32 },
    { t: 8.0, p: H.screen(0.58, 0.5, 0.27, [0.07, 0.02, 0]), l: H.screen(0.5, 0.5, 0), fov: 32 },
  ],
  adaptive: [
    { t: 8.0, p: H.screen(0.62, 0.6, 0.1, [0.02, 0.0, 0]), l: H.screen(0.67, 0.6, 0), fov: 30 },
    { t: 9.0, p: H.screen(0.7, 0.6, 0.085, [0.012, 0.0, 0]), l: H.screen(0.72, 0.6, 0), fov: 30 },
  ],
  checking: [
    { t: 9.0, p: H.screen(0.42, 0.42, 0.2), l: H.screen(0.42, 0.42, 0), fov: 34 },
    { t: 9.72, p: H.screen(0.45, 0.42, 0.17), l: H.screen(0.45, 0.42, 0), fov: 34 },
    { t: 10.0, p: H.screen(0.45, 0.42, 0.17, [0.04, 0, 0]), l: H.screen(0.05, 0.42, 0), fov: 34 },
  ],
  popout: [
    { t: 10.0, p: [-0.3, 0.27, 0.27], l: [0.0, 0.08, -0.09], fov: 32 },
    { t: 11.6, p: [-0.22, 0.24, 0.24], l: [0.01, 0.075, -0.07], fov: 32 },
  ],
  wipe: [
    { t: 11.6, p: [-0.22, 0.24, 0.24], l: [0.01, 0.075, -0.07], fov: 32 },
    { t: 12.0, p: [-0.2, 0.235, 0.23], l: [0.01, 0.075, -0.07], fov: 32 },
  ],
  inspect: [
    { t: 12.0, p: [-0.06, 0.52, 0.2], l: [-0.06, 0, 0.199], fov: 34, roll: 0 },
    { t: 14.5, p: [0.12, 0.47, 0.2], l: [0.12, 0, 0.199], fov: 34, roll: 0 },
  ],
  verdict: [
    { t: 14.5, p: H.screen(0.5, 0.5, 0.24, [-0.02, 0, 0]), l: H.screen(0.5, 0.5, 0), fov: 34 },
    { t: 15.8, p: H.screen(0.52, 0.5, 0.21, [0.02, 0, 0]), l: H.screen(0.52, 0.5, 0), fov: 34 },
  ],
  plan: [
    { t: 15.8, p: H.screen(0.5, 0.52, 0.36, [0, -0.01, 0]), l: H.screen(0.5, 0.45, 0), fov: 34 },
    { t: 18.0, p: H.screen(0.5, 0.52, 0.33, [0, -0.012, 0]), l: H.screen(0.5, 0.45, 0), fov: 34 },
  ],
  assembly: [
    { t: 18.0, p: H.bike(0.4, 0.14, 0.44), l: H.bike(0.02, 0.1, 0), fov: 28 },
    { t: 21.2, p: H.bike(0.07, 0.15, 0.53), l: H.bike(0.02, 0.1, 0), fov: 28 },
  ],
  wheel: [
    { t: 21.2, p: H.bike(0.27, 0.11, 0.2), l: H.bike(0.12, 0.1, 0.0), fov: 26 },
    { t: 22.0, p: H.bike(0.23, 0.105, 0.18), l: H.bike(0.12, 0.1, 0.0), fov: 26 },
  ],
  visuals: [
    { t: 22.0, p: H.screen(0.42, 0.5, 0.33, [-0.08, 0.01, 0]), l: H.screen(0.5, 0.5, 0), fov: 32 },
    { t: 23.4, p: H.screen(0.45, 0.5, 0.3, [-0.06, 0.01, 0]), l: H.screen(0.5, 0.5, 0), fov: 32 },
  ],
  model: [
    { t: 23.4, p: H.screen(0.58, 0.52, 0.27), l: H.screen(0.58, 0.52, 0), fov: 34 },
    { t: 25.2, p: H.screen(0.58, 0.54, 0.235), l: H.screen(0.58, 0.54, 0), fov: 34 },
  ],
  // ride/flip/end cameras track the bike; see main.js (rideCamera) — keys here are offsets
  ride: [],
  flip: [],
  end: [],
});

// Focus: per shot, what the lens focuses on ('auto' = look-at point) and f-stop-ish blur amount.
export const FOCUS = {
  desk: { amount: 0.4 }, title: { amount: 1.0 }, scan: { amount: 1.1 }, rise: { amount: 0.7 },
  prompt: { amount: 0.9 }, adaptive: { amount: 1.4 }, checking: { amount: 0.8 }, popout: { amount: 0.9 },
  wipe: { amount: 0.9 }, inspect: { amount: 0.3 }, verdict: { amount: 0.8 }, plan: { amount: 0.9 },
  assembly: { amount: 1.0 }, wheel: { amount: 1.5 }, visuals: { amount: 0.9 }, model: { amount: 0.7 },
  ride: { amount: 1.0 }, flip: { amount: 0.7 }, end: { amount: 1.6, near: true },
};

// ---------------------------------------------------------------- sound cues
// Generated from the edit so SFX stay locked to picture. type → synth in scripts/audio.js
export function soundCues() {
  const c = [];
  const add = (t, type, gain = 1, extra = {}) => c.push({ t, type, gain, ...extra });
  add(0.0, 'riserSoft', 0.5);
  add(1.5, 'whoosh', 0.7);
  'OPUS 5.5'.replace(/ /g, '').split('').forEach((_, i) => add(1.72 + i * 0.09, 'clayTick', 0.55 + (i % 2) * 0.1));
  add(2.55, 'shimmer', 0.6);
  add(3.3, 'whooshLow', 0.6);
  add(3.55, 'shutter', 0.8);
  add(3.6, 'scan', 0.5);
  add(5.4, 'whoosh', 0.8);
  // typing
  for (let i = 0; i < 44; i++) add(6.75 + i * 0.03 + (i % 3) * 0.004, 'key', 0.22 + ((i * 7) % 5) * 0.03);
  add(8.35, 'click', 0.7);
  add(8.62, 'click', 0.6);
  add(8.8, 'send', 0.8);
  add(9.05, 'thinking', 0.4);
  add(9.75, 'whip', 1.0);
  add(10.15, 'pop', 0.7); add(10.6, 'whooshLow', 0.5);
  add(10.95, 'partsRattle', 0.6);
  add(11.15, 'pill', 0.7);
  add(11.6, 'brush', 1.0);
  add(12.45, 'alertLow', 0.6);
  add(13.45, 'confirm', 0.7);
  add(14.5, 'whoosh', 0.5);
  add(14.9, 'tick', 0.5);
  add(15.8, 'whoosh', 0.6);
  [16.25, 16.7, 17.15, 17.6].forEach((t, i) => { add(t, 'cardPop', 0.7); add(t + 0.22, 'stamp', 0.8, { pitch: i }); });
  add(18.0, 'whooshLow', 0.6);
  // assembly: each part seats with a metallic clunk; wheels add a spin
  add(18.62, 'clunk', 0.9, { pitch: 0 });
  add(19.18, 'clunk', 0.8, { pitch: 2 }); add(19.38, 'clunk', 0.8, { pitch: 1 }); add(19.3, 'freewheel', 0.35, { dur: 0.6 });
  add(19.85, 'clamp', 0.8);
  add(20.08, 'clunk', 0.6, { pitch: 3 });
  add(20.24, 'thread', 0.6); add(20.3, 'thread', 0.6);
  add(20.4, 'chain', 0.6);
  add(20.68, 'clunk', 0.8, { pitch: 1 });
  add(20.7, 'sweep', 0.8);
  add(21.2, 'freewheel', 0.8, { dur: 0.8 });
  add(21.45, 'glint', 0.6);
  add(22.0, 'whoosh', 0.6);
  [22.55, 22.75, 22.95].forEach((t) => add(t, 'cardPop', 0.6));
  add(23.4, 'whooshLow', 0.6);
  add(23.9, 'stamp', 0.9, { pitch: 3 });
  add(24.55, 'click', 0.8);
  add(24.7, 'confirm', 0.7);
  add(25.2, 'whoosh', 0.7);
  add(25.25, 'roll', 0.7, { dur: 3.1 });
  add(26.3, 'rampKnock', 0.6);
  add(26.5, 'riser', 0.9, { dur: 0.36 });
  add(26.86, 'launch', 1.0);
  add(26.95, 'whooshFlip', 1.0, { dur: 0.9 });
  add(27.81, 'land', 1.0);
  add(28.4, 'logoHit', 1.0);
  add(28.45, 'shimmer', 0.7);
  return c.sort((a, b) => a.t - b.t);
}

// Music: tempo grid used by scripts/audio.js. Bars are 4/4 at BPM.
export const MUSIC = { bpm: 116, key: 'F', dropAt: 26.86, outroAt: 28.4 };
