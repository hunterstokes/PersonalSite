// Drag-to-orbit viewer of the finished PC for builds.html — the same
// model the homepage intro assembles, pinned at full build (p=1).
// Loaded on demand by tower-boot.js when the viewer scrolls into view.
import * as THREE from './vendor/three.module.min.js';
import { createPC } from './pcscene.js';

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
  camera.position.set(0, 5.4, 12.4);
  camera.lookAt(0, 3.0, 0);

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

  // drag (or touch-drag) to spin the rig; it keeps slowly turntabling on its own
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

  function frame(t) {
    pc.update(1, t * 0.001, yaw);
    renderer.render(scene, camera);
  }
  function still() {
    pc.update(1, 0, yaw);
    renderer.render(scene, camera);
  }

  if (reducedMotion) {
    // static model; re-render only on drag, resize, and theme change
    still();
    return;
  }

  // render only while on screen and the tab is visible
  let onScreen = true;
  const sync = () => renderer.setAnimationLoop(onScreen && !document.hidden ? frame : null);
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }).observe(el);
  document.addEventListener('visibilitychange', sync);
  sync();
})();
