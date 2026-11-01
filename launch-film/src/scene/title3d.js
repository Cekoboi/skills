// Extruded 3D title built from the display font (opentype.js → THREE.Shape → ExtrudeGeometry).
// Each glyph is its own mesh so it can tumble in and land independently. Text is editable in COPY.title3d.
import * as THREE from 'three';
import opentype from 'opentype.js';

export async function createTitle3D(text, fontUrl, { size = 0.07, depth = 0.016, color = '#C8644B' } = {}) {
  const buf = await fetch(fontUrl).then((r) => r.arrayBuffer());
  const font = opentype.parse(buf);
  const group = new THREE.Group(); group.name = 'title3d';
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0.0, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.3 });
  const faceMat = new THREE.MeshPhysicalMaterial({ color: '#D8775B', roughness: 0.5, clearcoat: 0.3 });
  const glyphs = [];
  let x = 0;
  const scale = size / font.unitsPerEm;
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const adv = glyph.advanceWidth * scale;
    if (ch !== ' ') {
      const path = glyph.getPath(0, 0, font.unitsPerEm);
      const sp = new THREE.ShapePath();
      for (const c of path.commands) {
        if (c.type === 'M') sp.moveTo(c.x, -c.y);
        else if (c.type === 'L') sp.lineTo(c.x, -c.y);
        else if (c.type === 'Q') sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
        else if (c.type === 'C') sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
      }
      const shapes = sp.toShapes(false);
      const geo = new THREE.ExtrudeGeometry(shapes, { depth: depth / scale, bevelEnabled: true, bevelThickness: depth * 0.18 / scale, bevelSize: depth * 0.12 / scale, bevelSegments: 4, curveSegments: 10 });
      geo.scale(scale, scale, scale);
      geo.computeBoundingBox();
      const bb = geo.boundingBox; const cx = (bb.min.x + bb.max.x) / 2;
      geo.translate(-cx, 0, -depth / 2);
      const mesh = new THREE.Mesh(geo, [faceMat, mat]);
      mesh.castShadow = true; mesh.receiveShadow = true;
      const holder = new THREE.Group(); holder.add(mesh);
      holder.userData.home = new THREE.Vector3(x + cx, 0, 0);
      group.add(holder); glyphs.push(holder);
    }
    x += adv;
  }
  for (const gl of glyphs) gl.userData.home.x -= x / 2;
  return { group, glyphs, width: x };
}
