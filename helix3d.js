// 3D DNA helix — scroll-driven homepage experience ("Scroll the Sequence").
// The camera rides down the strand as the page scrolls. Falls back silently
// to the 2D hero canvas in script.js when WebGL is unavailable, and renders
// a single static frame under prefers-reduced-motion.
import * as THREE from './vendor/three.module.min.js';

(() => {
  const container = document.getElementById('helix-scene');
  if (!container) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return; // no WebGL — the 2D hero canvas in script.js stays active
  }

  // 3D is live: retire the 2D fallback canvas
  const canvas2d = document.getElementById('hero-canvas');
  if (canvas2d) canvas2d.style.display = 'none';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 12);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  container.appendChild(renderer.domElement);

  // ===== Theme-aware palette =====
  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function glowTexture(hex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, hex);
    g.addColorStop(0.35, hex + 'aa');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  // Shared materials, recolored on theme change
  const mats = {
    strandA: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5 }),
    strandB: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.38 }),
    rung: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 }),
    ring: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.75 }),
    polyA: new THREE.MeshBasicMaterial({ wireframe: true }),
    polyB: new THREE.MeshBasicMaterial({ wireframe: true }),
    spriteA: new THREE.SpriteMaterial({ transparent: true, opacity: 0.9 }),
    spriteB: new THREE.SpriteMaterial({ transparent: true, opacity: 0.55 }),
    particles: new THREE.PointsMaterial({ size: 0.05, transparent: true, opacity: 0.35 })
  };

  function applyPalette() {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const accent = cssVar('--accent', '#4a9eff');
    const muted = cssVar('--text-muted', '#8a8f9d');
    const line = dark ? '#2a3550' : '#b9c6da';

    scene.fog = new THREE.Fog(new THREE.Color(cssVar('--bg', dark ? '#0f1115' : '#f4f6f9')), 9, 30);
    mats.strandA.color.set(accent);
    mats.strandB.color.set(muted);
    mats.rung.color.set(line);
    mats.ring.color.set(line);
    mats.polyA.color.set(dark ? '#7ab8ff' : accent);
    mats.polyB.color.set(muted);
    mats.spriteA.map = glowTexture(accent);
    mats.spriteA.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    mats.spriteB.map = glowTexture(dark ? '#aab2c4' : muted);
    mats.spriteA.needsUpdate = true;
    mats.spriteB.needsUpdate = true;
    mats.particles.color.set(accent);
  }
  applyPalette();
  document.addEventListener('themechange', applyPalette);

  // ===== Helix geometry =====
  const helix = new THREE.Group();
  const TURNS = 7, RADIUS = 2.4, HEIGHT = 56, PAIRS = 92;

  function strandLine(offset, material) {
    const pts = [];
    for (let i = 0; i <= 400; i++) {
      const t = i / 400;
      const ang = t * Math.PI * 2 * TURNS + offset;
      pts.push(new THREE.Vector3(Math.cos(ang) * RADIUS, (0.5 - t) * HEIGHT, Math.sin(ang) * RADIUS));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material);
  }
  helix.add(strandLine(0, mats.strandA));
  helix.add(strandLine(Math.PI, mats.strandB));

  const polyGeos = [
    new THREE.IcosahedronGeometry(0.16, 0),
    new THREE.OctahedronGeometry(0.18, 0),
    new THREE.TetrahedronGeometry(0.2, 0),
    new THREE.DodecahedronGeometry(0.15, 0)
  ];
  const spinners = [];

  for (let i = 0; i < PAIRS; i++) {
    const t = i / PAIRS;
    const ang = t * Math.PI * 2 * TURNS;
    const y = (0.5 - t) * HEIGHT;
    const pa = new THREE.Vector3(Math.cos(ang) * RADIUS, y, Math.sin(ang) * RADIUS);
    const pb = new THREE.Vector3(Math.cos(ang + Math.PI) * RADIUS, y, Math.sin(ang + Math.PI) * RADIUS);
    helix.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([pa, pb]), mats.rung));

    const ga = new THREE.Mesh(polyGeos[i % 4], mats.polyA);
    ga.position.copy(pa);
    const gb = new THREE.Mesh(polyGeos[(i + 2) % 4], mats.polyB);
    gb.position.copy(pb);
    spinners.push(ga, gb);

    const sa = new THREE.Sprite(mats.spriteA);
    sa.position.copy(pa);
    sa.scale.setScalar(0.42);
    const sb = new THREE.Sprite(mats.spriteB);
    sb.position.copy(pb);
    sb.scale.setScalar(0.34);
    helix.add(ga, gb, sa, sb);
  }

  for (let i = 0; i < 12; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(RADIUS + 0.7, 0.008, 6, 80), mats.ring);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = HEIGHT / 2 - (i / 11) * HEIGHT;
    helix.add(ring);
  }

  scene.add(helix);

  // Ambient particles for depth
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(200 * 3);
  for (let i = 0; i < pos.length; i++) pos[i] = (Math.random() - 0.5) * 28;
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(pGeo, mats.particles));

  // ===== Input & layout =====
  let mx = 0, my = 0, scroll = 0;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if (finePointer && !reducedMotion) {
    addEventListener('mousemove', (e) => {
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
    });
  }

  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    scroll = max > 0 ? Math.min(Math.max(scrollY / max, 0), 1) : 0;
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function layout() {
    const phone = innerWidth < 600;
    helix.position.x = phone ? 0 : 3.6;
    // Keep body copy readable over the scene on narrow screens
    container.style.opacity = phone ? '0.45' : '1';
  }
  layout();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    layout();
  });

  // ===== Render =====
  const TOP = HEIGHT / 2 - 5;
  const TRAVEL = HEIGHT - 10;
  let camY = TOP;

  function frame(t) {
    const time = t * 0.001;
    const target = TOP - scroll * TRAVEL;
    camY += (target - camY) * 0.06;
    camera.position.y = camY + (-my * 1.0);
    camera.position.x = mx * 1.1;
    camera.lookAt(helix.position.x, camY, 0);

    helix.rotation.y = time * 0.1 + scroll * Math.PI * 2.2;

    for (let i = 0; i < spinners.length; i++) {
      spinners[i].rotation.x = time * 0.6 + i;
      spinners[i].rotation.y = time * 0.4 + i * 0.7;
    }
    renderer.render(scene, camera);
  }

  if (reducedMotion) {
    // Single static frame; re-render only on scroll (no smoothing) and theme change
    const still = () => {
      camY = TOP - scroll * TRAVEL;
      camera.position.y = camY;
      camera.lookAt(helix.position.x, camY, 0);
      renderer.render(scene, camera);
    };
    still();
    addEventListener('scroll', still, { passive: true });
    document.addEventListener('themechange', still);
  } else {
    renderer.setAnimationLoop(frame);
    document.addEventListener('visibilitychange', () => {
      renderer.setAnimationLoop(document.hidden ? null : frame);
    });
  }
})();
