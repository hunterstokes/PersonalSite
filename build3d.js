// Loading intro ("Build the Machine") — choreography for the shared PC
// model in pcscene.js. Loaded on demand by intro-boot.js, which only
// imports this module (and three.js with it) when the intro will actually
// play: once per browser session, never under prefers-reduced-motion or
// without WebGL. The scene fades out, the site fades in, and everything
// is disposed afterward. Skippable via the Skip button or Escape.
import * as THREE from './vendor/three.module.min.js';
import { createPC, lerp, stage } from './pcscene.js';

(() => {
  const html = document.documentElement;
  const showSite = () => html.classList.remove('intro-pending', 'intro-fading');

  // Second line of defense — intro-boot.js already checked all of this
  const container = document.getElementById('build-scene');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let played = false;
  try { played = !!sessionStorage.getItem('hb-intro-played'); } catch { /* storage blocked */ }
  if (!container || reducedMotion || played) {
    showSite();
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    showSite();
    return;
  }
  try { sessionStorage.setItem('hb-intro-played', '1'); } catch { /* storage blocked */ }

  // The intro owns the screen; the 2D hero canvas comes back afterward
  const canvas2d = document.getElementById('hero-canvas');
  if (canvas2d) canvas2d.style.display = 'none';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  container.appendChild(renderer.domElement);

  const pc = createPC(scene);
  document.addEventListener('themechange', pc.applyPalette);

  // Camera path: die close-up → board overview → assembly view → tower reveal
  const KEYS = [
    // hero camera sits on the rig's rotation axis so its distance to the
    // off-center CPU stays constant as the scene slowly turns
    { p: 0, pos: [0, 1.3, 0], look: [0, 0.15, 0] },
    { p: 0.26, pos: [5.2, 6.2, 5.2], look: [0, 0.1, 0] },
    { p: 0.5, pos: [6.4, 7.0, 8.0], look: [0, 0.3, 0] },
    { p: 0.68, pos: [7.0, 6.4, 9.2], look: [0, 0.5, 0] },
    { p: 1, pos: [6.8, 4.8, 10.0], look: [0, 3.0, 0] }
  ];
  const chipWorld = new THREE.Vector3();
  function placeCamera(p, mx, my) {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = stage(p, a.p, b.p);
    const x = pc.rig.position.x + lerp(a.pos[0], b.pos[0], t) + mx * 0.9;
    const y = lerp(a.pos[1], b.pos[1], t) - my * 0.9;
    const z = lerp(a.pos[2], b.pos[2], t);
    camera.position.set(x, y, z);
    let lx = pc.rig.position.x + lerp(a.look[0], b.look[0], t);
    let ly = lerp(a.look[1], b.look[1], t);
    let lz = lerp(a.look[2], b.look[2], t);
    // the hero close-up keeps the off-center CPU framed as the scene turns
    const w = 1 - stage(p, 0.05, 0.3);
    if (w > 0) {
      pc.chip.getWorldPosition(chipWorld);
      lx = lerp(lx, chipWorld.x, w);
      ly = lerp(ly, chipWorld.y + 0.05, w);
      lz = lerp(lz, chipWorld.z, w);
    }
    camera.lookAt(lx, ly, lz);
  }

  // ===== Input =====
  let mx = 0, my = 0;
  function onMouse(e) {
    mx = e.clientX / innerWidth - 0.5;
    my = e.clientY / innerHeight - 0.5;
  }
  if (window.matchMedia('(pointer: fine)').matches) {
    addEventListener('mousemove', onMouse);
  }

  function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', onResize);

  // ===== Skip controls =====
  const skipBtn = document.createElement('button');
  skipBtn.className = 'intro-skip';
  skipBtn.type = 'button';
  skipBtn.textContent = 'Skip intro';
  document.body.appendChild(skipBtn);
  skipBtn.addEventListener('click', () => finish(true));
  function onKey(e) {
    if (e.key === 'Escape') finish(true);
  }
  addEventListener('keydown', onKey);

  // ===== Intro timeline =====
  const INTRO_MS = 5000, HOLD_MS = 600;
  let elapsed = 0, last = null, finished = false;

  function frame(t) {
    if (last === null) last = t;
    elapsed += Math.min(t - last, 100); // tab-away gaps don't fast-forward the build
    last = t;
    const time = t * 0.001;
    const p = stage(Math.min(elapsed / INTRO_MS, 1), 0.04, 0.96);
    pc.update(p, time);
    placeCamera(p, mx, my);
    renderer.render(scene, camera);
    if (!finished && elapsed >= INTRO_MS + HOLD_MS) finish(false);
  }

  function finish(skipped) {
    if (finished) return;
    finished = true;
    skipBtn.disabled = true;
    if (skipped) container.style.transition = 'opacity 0.45s ease';
    container.style.opacity = '0';
    // cross-fade: scene out, site content in
    html.classList.add('intro-fading');
    void document.body.offsetWidth;
    html.classList.remove('intro-pending');
    setTimeout(cleanup, skipped ? 500 : 1300);
  }

  function cleanup() {
    renderer.setAnimationLoop(null);
    renderer.dispose();
    container.remove();
    skipBtn.remove();
    removeEventListener('keydown', onKey);
    removeEventListener('mousemove', onMouse);
    removeEventListener('resize', onResize);
    document.removeEventListener('themechange', pc.applyPalette);
    document.removeEventListener('visibilitychange', onVisibility);
    if (canvas2d) canvas2d.style.display = '';
    setTimeout(() => html.classList.remove('intro-fading'), 1400);
  }

  function onVisibility() {
    if (!finished) renderer.setAnimationLoop(document.hidden ? null : frame);
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', onVisibility);
})();
