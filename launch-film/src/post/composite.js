// Single-camera post pipeline, tuned to stay affordable on a software GL renderer.
//   scene → HDR MSAA target (+depth)
//   ↓ half → quarter (blurred: DOF far layer + bloom source) → eighth (anamorphic streak)
//   composite: camera-motion blur · depth of field · bloom · streaks · lens flares/ghosts ·
//              glints · faint dust · grain · halftone · chromatic edge · vignette · grade · letterbox
import * as THREE from 'three';

const quadGeo = new THREE.BufferGeometry();
quadGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
quadGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }`;

const DOWN = `uniform sampler2D src; uniform vec2 texel; uniform float threshold; varying vec2 vUv;
void main(){ vec3 c = vec3(0.);
  c += texture2D(src, vUv + texel*vec2(-1.,-1.)).rgb; c += texture2D(src, vUv + texel*vec2(1.,-1.)).rgb;
  c += texture2D(src, vUv + texel*vec2(-1.,1.)).rgb;  c += texture2D(src, vUv + texel*vec2(1.,1.)).rgb;
  c *= 0.25; if (threshold > 0.) { float l = dot(c, vec3(.2126,.7152,.0722)); c *= smoothstep(threshold, threshold*1.6, l); }
  gl_FragColor = vec4(c,1.); }`;
const BLUR = `uniform sampler2D src; uniform vec2 dir; varying vec2 vUv;
void main(){ vec3 c = texture2D(src,vUv).rgb*0.2270270270;
  c += texture2D(src,vUv+dir*1.3846153846).rgb*0.3162162162; c += texture2D(src,vUv-dir*1.3846153846).rgb*0.3162162162;
  c += texture2D(src,vUv+dir*3.2307692308).rgb*0.0702702703; c += texture2D(src,vUv-dir*3.2307692308).rgb*0.0702702703;
  gl_FragColor = vec4(c,1.); }`;
const STREAK = `uniform sampler2D src; uniform vec2 texel; uniform float spread; varying vec2 vUv;
void main(){ vec3 c = vec3(0.); float wsum = 0.;
  for (int i=-12;i<=12;i++){ float f=float(i); float w = exp(-abs(f)*0.22); c += texture2D(src, vUv + vec2(texel.x*f*spread,0.)).rgb*w; wsum+=w; }
  gl_FragColor = vec4(c/wsum,1.); }`;

const COMPOSITE = `
precision highp float;
uniform sampler2D tMain, tDepth, tHalf, tQuarter, tBloom, tStreak;
uniform vec2 res; uniform float time, near, far, focusZ, cocAmt, nearOnly;
uniform vec2 mblur; uniform float exposure, bloomAmt, streakAmt, dustAmt, grainAmt, vignetteAmt, caAmt, halftoneAmt, letterbox, fadeAmt;
uniform vec3 fadeColor; uniform vec4 flares[4]; uniform vec3 flareCol[4];
varying vec2 vUv;
float linZ(float d){ float z = d*2.-1.; return 2.*near*far/(far+near-z*(far-near)); }
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
vec3 sampleMB(vec2 uv){
  if (length(mblur) < 0.0005) return texture2D(tMain, uv).rgb;
  vec3 c = vec3(0.); for (int i=0;i<12;i++){ float k = float(i)/11.-0.5; c += texture2D(tMain, uv + mblur*k).rgb; } return c/12.; }
vec3 neutral(vec3 color){ // Khronos PBR Neutral tone mapping
  const float startCompression = 0.8 - 0.04; const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b)); float offset = x < 0.08 ? x - 6.25*x*x : 0.04; color -= offset;
  float peak = max(color.r, max(color.g, color.b)); if (peak < startCompression) return color;
  const float d = 1. - startCompression; float newPeak = 1. - d*d/(peak + d - startCompression); color *= newPeak/peak;
  float g = 1. - 1./(desaturation*(peak-newPeak)+1.); return mix(color, newPeak*vec3(1.), g); }
vec3 toSRGB(vec3 c){ c = clamp(c,0.,1.); return mix(c*12.92, 1.055*pow(c, vec3(1./2.4))-0.055, step(0.0031308,c)); }
void main(){
  vec2 uv = vUv; vec2 asp = vec2(res.x/res.y, 1.);
  // chromatic edge: offset R/B radially
  vec2 cc = uv-0.5; float r2 = dot(cc*asp, cc*asp);
  vec2 ca = cc*caAmt*r2*0.02;
  vec3 col; col.g = sampleMB(uv).g; col.r = sampleMB(uv - ca).r; col.b = sampleMB(uv + ca).b;
  // depth of field
  float z = linZ(texture2D(tDepth, uv).r);
  float coc = (z - focusZ)/max(z, 0.001); if (nearOnly < 0.5) coc = abs(coc); else coc = max(-coc, 0.)*0. + abs(coc);
  coc = clamp(coc*cocAmt*2.2, 0., 1.);
  vec3 mid = texture2D(tHalf, uv).rgb, far_ = texture2D(tQuarter, uv).rgb;
  col = mix(col, mid, smoothstep(0.05, 0.35, coc)); col = mix(col, far_, smoothstep(0.35, 1., coc));
  // bloom + anamorphic streaks
  col += texture2D(tBloom, uv).rgb*bloomAmt;
  col += texture2D(tStreak, uv).rgb*streakAmt*vec3(1.0,0.82,0.7);
  // lens flares: core glow, horizontal streak, ghosts along the axis through centre
  for (int i=0;i<4;i++){ vec4 f = flares[i]; if (f.z <= 0.) continue; vec3 fc = flareCol[i];
    vec2 d = (uv - f.xy)*asp; float dist = length(d);
    col += fc*f.z*(exp(-dist*dist*900.)*1.4 + exp(-dist*dist*60.)*0.08);
    col += fc*f.z*exp(-abs(d.y)*180.)*exp(-abs(d.x)*3.2)*0.55;
    // four-point star glint
    float star = exp(-abs(d.x)*520.)*exp(-abs(d.y)*24.) + exp(-abs(d.y)*520.)*exp(-abs(d.x)*24.);
    col += fc*f.z*star*0.5*f.w;
    vec2 axis = vec2(0.5) - f.xy;
    for (int k=0;k<3;k++){ float s = k==0 ? 0.55 : (k==1 ? 1.25 : 1.75); float rad = k==0 ? 0.03 : (k==1 ? 0.06 : 0.018);
      vec2 gp = (uv - (f.xy + axis*s))*asp; float gd = length(gp);
      col += fc*f.z*0.05*smoothstep(rad, rad*0.6, gd)*(k==1 ? vec3(0.6,0.9,0.7) : vec3(1.,0.75,0.6)); }
  }
  col *= exposure;
  // dust motes: three parallax layers, very faint, lit more where the frame is bright
  float lum = dot(texture2D(tQuarter, uv).rgb, vec3(.3,.6,.1));
  float dust = 0.;
  for (int l=0;l<3;l++){ float fl = float(l); float sc = 18. + fl*14.;
    vec2 p = uv*asp*sc + vec2(time*(0.05+fl*0.03), -time*(0.12+fl*0.05)) + fl*17.3;
    vec2 cell = floor(p); vec2 fr = fract(p) - 0.5; float h = hash(cell);
    vec2 o = vec2(hash(cell+1.7), hash(cell+3.1)) - 0.5; float rr = length(fr - o*0.7);
    float sz = 0.03 + 0.05*hash(cell+9.);
    dust += step(0.86, h)*smoothstep(sz, 0., rr)*(0.5+0.5*sin(time*2.+h*40.)); }
  col += vec3(1.,0.95,0.88)*dust*dustAmt*(0.25+lum);
  // tone map + grade
  col = neutral(col);
  col = mix(col, col*vec3(1.03,1.0,0.95) + vec3(0.012,0.006,0.0), 0.8);
  col = (col - 0.5)*1.16 + 0.5;
  // vignette
  float v = smoothstep(1.15, 0.35, length(cc*vec2(1.0, 0.85))*1.25); col *= mix(1., v, vignetteAmt);
  col = mix(col, fadeColor, fadeAmt);
  vec3 outc = toSRGB(col);
  // halftone dots at the frame edge (print texture from the reference) + film grain
  vec2 px = uv*res; vec2 hc = fract(px/6.) - 0.5; float dotm = smoothstep(0.32, 0.22, length(hc));
  float edge = smoothstep(0.22, 0.5, max(abs(cc.x)*1.0, abs(cc.y)*1.1));
  outc *= 1. - dotm*halftoneAmt*edge*0.12;
  outc += (hash(px + fract(time*13.7)*91.) - 0.5)*grainAmt;
  // letterbox
  float lb = letterbox*0.105; if (uv.y < lb || uv.y > 1.-lb) outc = vec3(0.075,0.065,0.06);
  gl_FragColor = vec4(outc, 1.);
}`;

export class Post {
  constructor(renderer, w, h) {
    this.r = renderer; this.w = w; this.h = h;
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.main = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(w, h, THREE.FloatType) });
    this.main.depthTexture.format = THREE.DepthFormat;
    this.half = new THREE.WebGLRenderTarget(w / 2, h / 2, opts);
    this.halfB = new THREE.WebGLRenderTarget(w / 2, h / 2, opts);
    this.q1 = new THREE.WebGLRenderTarget(w / 4, h / 4, opts);
    this.q2 = new THREE.WebGLRenderTarget(w / 4, h / 4, opts);
    this.b1 = new THREE.WebGLRenderTarget(w / 8, h / 8, opts);
    this.b2 = new THREE.WebGLRenderTarget(w / 8, h / 8, opts);
    this.s1 = new THREE.WebGLRenderTarget(w / 8, h / 8, opts);
    this.s2 = new THREE.WebGLRenderTarget(w / 8, h / 8, opts);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mk = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.mDown = mk(DOWN, { src: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 0 } });
    this.mBlur = mk(BLUR, { src: { value: null }, dir: { value: new THREE.Vector2() } });
    this.mStreak = mk(STREAK, { src: { value: null }, texel: { value: new THREE.Vector2() }, spread: { value: 1 } });
    this.u = {
      tMain: { value: this.main.texture }, tDepth: { value: this.main.depthTexture }, tHalf: { value: this.halfB.texture }, tQuarter: { value: this.q1.texture },
      tBloom: { value: this.b1.texture }, tStreak: { value: this.s1.texture },
      res: { value: new THREE.Vector2(w, h) }, time: { value: 0 }, near: { value: 0.01 }, far: { value: 20 }, focusZ: { value: 1 }, cocAmt: { value: 1 }, nearOnly: { value: 0 },
      mblur: { value: new THREE.Vector2() }, exposure: { value: 0.86 }, bloomAmt: { value: 0.15 }, streakAmt: { value: 0.25 }, dustAmt: { value: 0.12 }, grainAmt: { value: 0.028 },
      vignetteAmt: { value: 0.55 }, caAmt: { value: 0.5 }, halftoneAmt: { value: 0.35 }, letterbox: { value: 0 }, fadeAmt: { value: 0 }, fadeColor: { value: new THREE.Color('#F3E9E0') },
      flares: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, flareCol: { value: [0, 1, 2, 3].map(() => new THREE.Color(1, 0.9, 0.8)) },
    };
    this.mComp = mk(COMPOSITE, this.u);
    this.quad = new THREE.Mesh(quadGeo, this.mDown); this.quad.frustumCulled = false;
    this.qScene = new THREE.Scene(); this.qScene.add(this.quad);
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qScene, this.cam); }
  render(scene, camera) {
    const r = this.r, w = this.w, h = this.h;
    r.setRenderTarget(this.main); r.render(scene, camera);
    this.u.near.value = camera.near; this.u.far.value = camera.far;
    // half + quarter blur chain
    this.mDown.uniforms.src.value = this.main.texture; this.mDown.uniforms.texel.value.set(0.5 / w, 0.5 / h); this.mDown.uniforms.threshold.value = 0;
    this.pass(this.mDown, this.half);
    this.mBlur.uniforms.src.value = this.half.texture; this.mBlur.uniforms.dir.value.set(1 / (w / 2), 0); this.pass(this.mBlur, this.halfB);
    this.mBlur.uniforms.src.value = this.halfB.texture; this.mBlur.uniforms.dir.value.set(0, 1 / (h / 2)); this.pass(this.mBlur, this.half);
    // copy blurred half to halfB for composite (mid DOF layer)
    this.mDown.uniforms.src.value = this.half.texture; this.mDown.uniforms.texel.value.set(0.25 / (w / 2), 0.25 / (h / 2)); this.pass(this.mDown, this.halfB);
    this.mDown.uniforms.src.value = this.half.texture; this.mDown.uniforms.texel.value.set(1 / w, 1 / h); this.pass(this.mDown, this.q1);
    for (let i = 0; i < 2; i++) {
      this.mBlur.uniforms.src.value = this.q1.texture; this.mBlur.uniforms.dir.value.set(1.5 / (w / 4), 0); this.pass(this.mBlur, this.q2);
      this.mBlur.uniforms.src.value = this.q2.texture; this.mBlur.uniforms.dir.value.set(0, 1.5 / (h / 4)); this.pass(this.mBlur, this.q1);
    }
    // bloom (thresholded) at 1/8
    this.mDown.uniforms.src.value = this.half.texture; this.mDown.uniforms.texel.value.set(2 / w, 2 / h); this.mDown.uniforms.threshold.value = 1.1;
    this.pass(this.mDown, this.b1); this.mDown.uniforms.threshold.value = 0;
    for (let i = 0; i < 2; i++) {
      this.mBlur.uniforms.src.value = this.b1.texture; this.mBlur.uniforms.dir.value.set(2 / (w / 8), 0); this.pass(this.mBlur, this.b2);
      this.mBlur.uniforms.src.value = this.b2.texture; this.mBlur.uniforms.dir.value.set(0, 2 / (h / 8)); this.pass(this.mBlur, this.b1);
    }
    // anamorphic streak from bloom source
    this.mStreak.uniforms.src.value = this.b1.texture; this.mStreak.uniforms.texel.value.set(8 / w, 8 / h); this.mStreak.uniforms.spread.value = 2.5; this.pass(this.mStreak, this.s2);
    this.mStreak.uniforms.src.value = this.s2.texture; this.mStreak.uniforms.spread.value = 6; this.pass(this.mStreak, this.s1);
    this.pass(this.mComp, null);
  }
}
