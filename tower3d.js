// PC build viewer for builds.html — plays the full build animation when
// the viewer scrolls into view (traces grow, parts dock, the board tilts
// upright into the tower), flying the same camera path as the original
// intro, then settles into a frontal drag-to-orbit view of the finished
// rig. Loaded on demand by tower-boot.js.
import * as THREE from './vendor/three.module.min.js';
import { createPC, cameraPose, stage, lerp } from './pcscene.js';

(() => {
  const el = document.getElementById('tower-viewer');
  if (!el) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return; // no WebGL — the fallback text in the container stays
  }
  el.textContent = '';
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

  const pc = createPC(scene);
  document.addEventListener('themechange', () => {
    pc.applyPalette();
    if (reducedMotion) still();
  });

  function size() {
    const w = el.clientWidth, h = el.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  size();
  new ResizeObserver(() => { size(); if (reducedMotion) still(); }).observe(el);

  // drag (or touch-drag) to spin the rig at any point during or after the build
  let yaw = 0, dragging = false, lastX = 0;
  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    yaw += (e.clientX - lastX) * 0.008;
    lastX = e.clientX;
    if (reducedMotion) still();
  });
  const endDrag = () => { dragging = false; };
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);

  // after the build, the camera settles from the flight path into this
  // frontal orbit framing
  const ORBIT = { pos: [0, 5.4, 12.4], look: [0, 3.0, 0] };
  const BUILD_MS = 5000, SETTLE_MS = 900;
  let elapsed = 0, last = null;
  const chipWorld = new THREE.Vector3();

  function placeCamera(p) {
    const k = cameraPose(p);
    const blend = stage((elapsed - BUILD_MS) / SETTLE_MS, 0, 1);
    const px = lerp(k.pos[0], ORBIT.pos[0], blend);
    const py = lerp(k.pos[1], ORBIT.pos[1], blend);
    const pz = lerp(k.pos[2], ORBIT.pos[2], blend);
    camera.position.set(px, py, pz);
    let lx = lerp(k.look[0], ORBIT.look[0], blend);
    let ly = lerp(k.look[1], ORBIT.look[1], blend);
    let lz = lerp(k.look[2], ORBIT.look[2], blend);
    // the opening close-up keeps the off-center CPU framed
    const w = 1 - stage(p, 0.05, 0.3);
    if (w > 0) {
      pc.chip.getWorldPosition(chipWorld);
      lx = lerp(lx, chipWorld.x, w);
      ly = lerp(ly, chipWorld.y + 0.05, w);
      lz = lerp(lz, chipWorld.z, w);
    }
    camera.lookAt(lx, ly, lz);
  }

  function frame(t) {
    if (last === null) last = t;
    elapsed += Math.min(t - last, 100); // pausing offscreen doesn't fast-forward
    last = t;
    const p = stage(Math.min(elapsed / BUILD_MS, 1), 0.04, 0.96);
    pc.update(p, t * 0.001, yaw);
    placeCamera(p);
    renderer.render(scene, camera);
  }

  function still() {
    pc.update(1, 0, yaw);
    camera.position.set(...ORBIT.pos);
    camera.lookAt(...ORBIT.look);
    renderer.render(scene, camera);
  }

  const rebuildBtn = document.getElementById('tower-rebuild');

  if (reducedMotion) {
    // static finished rig; re-render only on drag, resize, and theme change
    still();
    return;
  }

  if (rebuildBtn) {
    rebuildBtn.hidden = false;
    rebuildBtn.addEventListener('click', () => {
      elapsed = 0;
      last = null;
    });
  }

  // render only while on screen and the tab is visible
  let onScreen = true;
  const sync = () => renderer.setAnimationLoop(onScreen && !document.hidden ? frame : null);
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (!onScreen) last = null; // don't count offscreen time toward the build
    sync();
  }).observe(el);
  document.addEventListener('visibilitychange', sync);
  sync();
})();
