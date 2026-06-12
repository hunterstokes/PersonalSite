// 3D chip build — scroll-driven homepage experience ("Build the Machine").
// Opens close on a glowing CPU die; circuit traces grow outward into a
// motherboard as you scroll (components sprouting where they land), then
// the big parts fly in and dock — RAM, cooler, GPU, PSU — until a wireframe
// case closes around the finished build. Falls back silently to the 2D hero
// canvas in script.js when WebGL is unavailable, and renders a single
// static frame under prefers-reduced-motion.
import * as THREE from './vendor/three.module.min.js';

(() => {
  const container = document.getElementById('build-scene');
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
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(5, 9, 6);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x4a9eff, 0.6);
  rimLight.position.set(-6, 3, -5);
  scene.add(rimLight);

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const stage = (p, s, e) => { const t = clamp01((p - s) / (e - s)); return t * t * (3 - 2 * t); };
  // deterministic rng so the board layout is stable across loads
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ===== Theme-aware palette =====
  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  const mats = {
    pcb: new THREE.MeshLambertMaterial({ transparent: true }),
    body: new THREE.MeshLambertMaterial(),
    metal: new THREE.MeshLambertMaterial(),
    gold: new THREE.MeshLambertMaterial({ color: '#c9a14f' }),
    // real hardware is black regardless of site theme
    hw: new THREE.MeshLambertMaterial({ color: '#16181d' }),
    glow: new THREE.MeshBasicMaterial(),
    halo: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55 }),
    edge: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.45 }),
    trace: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 }),
    tips: new THREE.PointsMaterial({ size: 0.09, transparent: true, opacity: 0.9 }),
    wire: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.7 }),
    caseLine: new THREE.LineBasicMaterial({ transparent: true, opacity: 0 }),
    pane: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.BackSide }),
    glassPane: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide }),
    strip: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
    ring: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
    particles: new THREE.PointsMaterial({ size: 0.05, transparent: true, opacity: 0.3 })
  };

  function applyPalette() {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const accent = cssVar('--accent', '#4a9eff');
    scene.fog = new THREE.Fog(new THREE.Color(cssVar('--bg', dark ? '#0f1115' : '#f4f6f9')), 14, 36);
    mats.pcb.color.set(dark ? '#101e33' : '#d3deec');
    mats.body.color.set(dark ? '#1a2230' : '#aab7c9');
    mats.metal.color.set(dark ? '#6b7686' : '#8e9bad');
    for (const m of [mats.glow, mats.halo, mats.edge, mats.trace, mats.tips, mats.wire, mats.caseLine, mats.pane, mats.glassPane, mats.strip, mats.ring, mats.particles]) m.color.set(accent);
    rimLight.color.set(accent);
  }
  applyPalette();
  document.addEventListener('themechange', applyPalette);

  const edged = (mesh) => {
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), mats.edge));
    return mesh;
  };
  const tube = (pts, r) => new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 24, r, 8),
    mats.body
  );
  function textTexture(w, h, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    draw(ctx);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return { tex, ctx };
  }

  const rig = new THREE.Group();
  scene.add(rig);

  // Everything board-mounted lives in this group so the whole populated
  // motherboard can tilt upright into the tower for the finale.
  const mobo = new THREE.Group();
  rig.add(mobo);

  // ===== Motherboard & CPU (present from frame one) =====
  const board = edged(new THREE.Mesh(new THREE.BoxGeometry(9, 0.16, 7), mats.pcb));
  mobo.add(board);

  const chip = new THREE.Group();
  chip.add(edged(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, 1.15), mats.body)));
  // accent glow spills out from under the printed heat spreader
  const die = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 1.0), mats.glow);
  die.position.y = 0.1;
  chip.add(die);
  const ihs = textTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#262b35';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#3a4150';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 236, 236);
    ctx.fillStyle = '#cfd6e4';
    ctx.textAlign = 'center';
    ctx.font = '26px monospace';
    ctx.fillText('AMD RYZEN 7', 128, 105);
    ctx.font = 'bold 40px monospace';
    ctx.fillText('9800X3D', 128, 152);
    ctx.fillStyle = '#7b8496';
    ctx.font = '20px monospace';
    ctx.fillText('AM5', 128, 205);
  });
  const ihsPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: ihs.tex }));
  ihsPlate.rotation.x = -Math.PI / 2;
  ihsPlate.position.y = 0.125;
  chip.add(ihsPlate);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.015, 8, 64), mats.halo);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.12;
  chip.add(halo);
  // CPU socket sits up-and-rear of board center, ATX-style (local -z is the
  // top of the board once it tilts upright into the tower)
  const CX = -0.3, CZ = -0.6;
  chip.position.set(CX, 0.09, CZ);
  mobo.add(chip);

  // ===== Phase 1: circuit traces grow outward from the chip =====
  const rand = rng(1337);
  const clampTo = (v, m) => Math.min(Math.max(v, -m), m);
  const traces = [];
  for (let i = 0; i < 64; i++) {
    const side = i % 4, segs = [], n = 2 + Math.floor(rand() * 3);
    let x = CX + (rand() - 0.5), z = CZ + (rand() - 0.5);
    if (side === 0) x = CX + 0.62; else if (side === 1) x = CX - 0.62;
    else if (side === 2) z = CZ + 0.62; else z = CZ - 0.62;
    let horiz = side < 2;
    for (let s = 0; s < n; s++) {
      const len = (0.6 + rand() * 1.9) * (s === 0 ? 1.4 : 1);
      let nx = x, nz = z;
      if (horiz) nx = clampTo(x + (side === 1 ? -len : side === 0 ? len : (rand() < 0.5 ? -len : len)), 3.4);
      else nz = clampTo(z + (side === 3 ? -len : side === 2 ? len : (rand() < 0.5 ? -len : len)), 2.6);
      segs.push([x, z, nx, nz]);
      x = nx; z = nz; horiz = !horiz;
    }
    traces.push({ segs, end: [x, z], jitter: rand(), glb: [] });
  }

  // Global draw order: ring by ring outward, jittered per trace, so growth
  // radiates from the chip. Trace visibility is a drawRange cutoff.
  const order = [];
  traces.forEach((t, ti) => t.segs.forEach((seg, si) => order.push({ key: si + t.jitter, ti, seg })));
  order.sort((a, b) => a.key - b.key);
  const totalSegs = order.length;
  const tracePos = new Float32Array(totalSegs * 6);
  order.forEach((o, k) => {
    tracePos.set([o.seg[0], 0.12, o.seg[1], o.seg[2], 0.12, o.seg[3]], k * 6);
    traces[o.ti].glb.push({ k, x: o.seg[2], z: o.seg[3] });
  });
  traces.forEach((t) => { t.doneAt = (t.glb[t.glb.length - 1].k + 1) / totalSegs; });

  const traceGeo = new THREE.BufferGeometry();
  traceGeo.setAttribute('position', new THREE.BufferAttribute(tracePos, 3));
  mobo.add(new THREE.LineSegments(traceGeo, mats.trace));

  // Glowing tips at the active trace ends
  const tipPos = new Float32Array(traces.length * 3);
  const tipGeo = new THREE.BufferGeometry();
  tipGeo.setAttribute('position', new THREE.BufferAttribute(tipPos, 3));
  mobo.add(new THREE.Points(tipGeo, mats.tips));

  // Small parts sprout where finished traces end
  const rand2 = rng(777);
  const capGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.3, 10);
  const sprouts = [];
  for (const t of traces) {
    const kind = rand2();
    let mesh;
    if (kind < 0.45) mesh = new THREE.Mesh(capGeo, mats.metal);
    else if (kind < 0.8) mesh = edged(new THREE.Mesh(new THREE.BoxGeometry(0.3 + rand2() * 0.3, 0.1, 0.25 + rand2() * 0.25), mats.body));
    else mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), mats.glow);
    mesh.position.set(t.end[0], 0.2, t.end[1]);
    mesh.scale.setScalar(0.001);
    sprouts.push({ mesh, at: t.doneAt });
    mobo.add(mesh);
  }

  // Landmark sockets appear as wireframe ghosts, then solidify — they are
  // the docking points for the phase-2 components.
  const landmarks = [];
  function landmark(t, buildSolid) {
    const solid = buildSolid(false), wire = buildSolid(true);
    solid.visible = wire.visible = false;
    mobo.add(solid, wire);
    landmarks.push({ t, solid, wire });
  }
  const boxAt = (w, h, d, x, y, z, wireframe, mat) => {
    if (wireframe) {
      const m = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), mats.wire);
      m.position.set(x, y, z);
      return m;
    }
    const m = edged(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || mats.body));
    m.position.set(x, y, z);
    return m;
  };
  landmark(0.42, (wf) => { // four DDR slots right of the socket
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) g.add(boxAt(0.14, 0.12, 2.6, 2.05 + i * 0.3, 0.12, -1.0, wf));
    return g;
  });
  landmark(0.48, (wf) => { // VRM heatsinks wrap the socket's top and rear
    const g = new THREE.Group();
    g.add(boxAt(2.4, 0.35, 0.55, -0.3, 0.26, -2.2, wf, mats.metal));
    g.add(boxAt(0.55, 0.35, 2.2, -1.95, 0.26, -0.6, wf, mats.metal));
    return g;
  });
  landmark(0.55, (wf) => { // chipset heatsink, lower right
    const g = new THREE.Group();
    g.add(boxAt(1.1, 0.22, 1.1, 2.6, 0.18, 1.7, wf));
    if (!wf) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.5), mats.glow);
      led.position.set(2.6, 0.31, 1.7);
      g.add(led);
    }
    return g;
  });
  landmark(0.62, (wf) => { // rear I/O shroud along the back edge
    const g = new THREE.Group();
    g.add(boxAt(0.6, 0.5, 2.4, -4.0, 0.33, -2.0, wf, mats.metal));
    if (!wf) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 2.2), mats.glow);
      strip.position.set(-4.0, 0.6, -2.0);
      g.add(strip);
    }
    return g;
  });
  landmark(0.72, (wf) => { // PCIe x16 slot below the socket, anchored at the rear
    const g = new THREE.Group();
    g.add(boxAt(3.0, 0.14, 0.45, -2.2, 0.14, 1.3, wf));
    if (!wf) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 0.18), mats.glow);
      strip.position.set(-2.2, 0.22, 1.3);
      g.add(strip);
    }
    return g;
  });
  landmark(0.77, (wf) => boxAt(1.2, 0.12, 0.4, -2.7, 0.13, 2.1, wf)); // empty x1 slot

  // Smaller board fixtures pop in as the traces reach them
  const details = [];
  function detail(t, obj) {
    obj.scale.setScalar(0.001);
    mobo.add(obj);
    details.push({ obj, t });
  }
  { // mounting standoffs
    const g = new THREE.Group();
    for (const sx of [-4.2, 0, 4.2]) for (const sz of [-3.2, 0, 3.2]) {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 8), mats.gold);
      d.position.set(sx, 0.11, sz);
      g.add(d);
    }
    detail(0.3, g);
  }
  { // 24-pin ATX connector on the right edge
    const m = edged(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 1.3), mats.body));
    m.position.set(3.85, 0.26, -0.4);
    detail(0.5, m);
  }
  { // 8-pin EPS by the rear top corner
    const m = edged(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.3), mats.body));
    m.position.set(-3.0, 0.2, -3.1);
    detail(0.58, m);
  }
  { // M.2 heatsink plate between socket and PCIe
    const m = edged(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.5), mats.metal));
    m.position.set(-1.2, 0.12, 0.5);
    detail(0.64, m);
  }
  { // SATA ports on the right edge
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.4), mats.body);
      s.position.set(4.0, 0.19, 1.5 + i * 0.55);
      g.add(s);
    }
    detail(0.68, g);
  }
  { // CMOS battery
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16), mats.metal);
    m.position.set(0.6, 0.11, 2.4);
    detail(0.72, m);
  }
  { // front-panel header on the bottom edge
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.25), mats.body);
    m.position.set(2.2, 0.17, 3.2);
    detail(0.76, m);
  }
  // power cables bend over the board edges to behind the tray; anchoring
  // each group at its connector keeps the pop-in scale centered there
  function cableAt(x, z, pts, r, t) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.add(tube(pts, r));
    detail(t, g);
  }
  cableAt(3.85, -0.4, [[0, 0.45, 0], [0.5, 0.4, 0], [0.7, -0.2, 0]], 0.09, 0.54); // 24-pin ATX
  cableAt(-3.0, -3.1, [[0, 0.3, 0], [0, 0.35, -0.45], [0, -0.25, -0.6]], 0.07, 0.62); // 8-pin EPS

  // ===== Phase 2: components fly in and dock =====
  const parts = [];
  const spinFans = []; // fan blade groups that spin once their part is docked
  function part(group, from, to, s, e, parent = mobo) {
    group.position.copy(from);
    group.visible = false;
    parent.add(group);
    const rec = { group, from, to, s, e, docked: false };
    parts.push(rec);
    return rec;
  }
  function fan(radius, y, x, z, parentPart) {
    const g = new THREE.Group();
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.05, 8, 28), mats.metal);
    ringM.rotation.x = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.3, radius * 0.3, 0.08, 12), mats.glow);
    const blades = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.7, 0.02, radius * 0.22), mats.body);
      b.rotation.y = (i / 3) * Math.PI;
      blades.add(b);
    }
    g.add(ringM, hub, blades);
    g.position.set(x, y, z);
    spinFans.push({ blades, part: parentPart });
    return g;
  }

  // Two 32GB Vengeance RGB sticks drop into slots 2 and 4 (A2/B2);
  // the other two slots stay empty, like the real build
  const ramRGB = new THREE.MeshBasicMaterial();
  for (const [i, x] of [[0, 2.35], [1, 2.95]]) {
    const g = new THREE.Group();
    const stick = edged(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 2.3), mats.hw));
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 2.25), ramRGB);
    bar.position.y = 0.52;
    g.add(stick, bar);
    part(g, new THREE.Vector3(x, 4.5, -1.0), new THREE.Vector3(x, 0.62, -1.0),
      0.34 + i * 0.04, 0.46 + i * 0.04);
  }

  // VRM capacitors pop up beside the CPU
  const popParts = [];
  for (let i = 0; i < 8; i++) {
    const cap = new THREE.Mesh(capGeo, mats.metal);
    cap.position.set(0.9 + (i % 4) * 0.3, 0.25, -2.45 + Math.floor(i / 4) * 0.38);
    cap.scale.setScalar(0.001);
    mobo.add(cap);
    popParts.push({ mesh: cap, s: 0.36 + i * 0.018, e: 0.44 + i * 0.018 });
  }

  // AIO liquid cooler descends onto the CPU as one assembly: pump block on
  // the socket, hoses arcing to a radiator along the board's top edge
  // (which reads as a top-mounted radiator once the board tilts upright)
  let lcdDraw = null, lcdTemp = 0;
  {
    const g = new THREE.Group();
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 24), mats.hw);
    pump.position.y = 0.2;
    const pumpRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 32), mats.glow);
    pumpRing.rotation.x = Math.PI / 2;
    pumpRing.position.y = 0.36;
    // pump-cap LCD shows CPU temperature (faces the glass once vertical)
    const lcd = textTexture(128, 128, () => {});
    const lcdFace = new THREE.Mesh(new THREE.CircleGeometry(0.27, 32), new THREE.MeshBasicMaterial({ map: lcd.tex }));
    lcdFace.rotation.x = -Math.PI / 2;
    lcdFace.position.y = 0.366;
    lcdDraw = (temp) => {
      lcd.ctx.fillStyle = '#05070c';
      lcd.ctx.fillRect(0, 0, 128, 128);
      lcd.ctx.fillStyle = '#4a9eff';
      lcd.ctx.textAlign = 'center';
      lcd.ctx.font = 'bold 50px monospace';
      lcd.ctx.fillText(temp + '°', 64, 72);
      lcd.ctx.fillStyle = '#7b8496';
      lcd.ctx.font = '18px monospace';
      lcd.ctx.fillText('CPU', 64, 100);
      lcd.tex.needsUpdate = true;
    };
    g.add(lcdFace);
    const rad = edged(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.26, 0.9), mats.metal));
    rad.position.set(1.7, 0.17, -2.45);
    g.add(pump, pumpRing, rad,
      tube([[-0.1, 0.3, -0.35], [-0.5, 0.85, -1.4], [0.5, 0.3, -2.3]], 0.06),
      tube([[0.25, 0.3, -0.3], [-0.1, 0.95, -1.5], [0.8, 0.3, -2.35]], 0.06));
    part(g, new THREE.Vector3(CX, 4.2, CZ), new THREE.Vector3(CX, 0.04, CZ), 0.44, 0.58);
  }

  // GPU slides in over the PCIe slot
  {
    const g = new THREE.Group();
    g.add(edged(new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.45, 1.15), mats.hw)));
    // Radeon red stripe and model label on the edge that faces up through
    // the glass once the board is vertical
    const radeonRed = new THREE.MeshBasicMaterial({ color: '#e8232f' });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.05), radeonRed);
    stripe.position.set(0, -0.14, -0.59);
    const lbl = textTexture(512, 96, (ctx) => {
      ctx.clearRect(0, 0, 512, 96);
      ctx.fillStyle = '#e8232f';
      ctx.fillRect(14, 30, 44, 36);
      ctx.fillStyle = '#f2f4f8';
      ctx.textAlign = 'left';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText('RADEON', 76, 62);
      ctx.fillStyle = '#9aa3b5';
      ctx.font = '28px sans-serif';
      ctx.fillText('RX 7800 XT', 290, 60);
    });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.41), new THREE.MeshBasicMaterial({ map: lbl.tex, transparent: true }));
    label.rotation.y = Math.PI;
    label.position.set(0, 0.06, -0.578);
    g.add(stripe, label);
    const rec = part(g, new THREE.Vector3(10, 0.55, 1.3), new THREE.Vector3(-2.0, 0.55, 1.3), 0.52, 0.66);
    g.add(fan(0.38, 0.27, -0.75, 0, rec), fan(0.38, 0.27, 0.75, 0, rec));
  }

  // Dual 8-pin GPU power cables drape from the card down toward the board's
  // bottom edge — right into the PSU shroud once the board stands up
  {
    const gpuCables = new THREE.Group();
    gpuCables.add(
      tube([[-2.15, 0.62, 1.8], [-1.95, 0.4, 2.6], [-1.7, 0.25, 3.35]], 0.05),
      tube([[-1.85, 0.62, 1.8], [-1.7, 0.45, 2.6], [-1.5, 0.25, 3.35]], 0.05)
    );
    gpuCables.scale.setScalar(0.001);
    mobo.add(gpuCables);
    popParts.push({ mesh: gpuCables, s: 0.67, e: 0.73 });
  }

  // PSU slides into the tower's bottom shroud (rig space — it belongs to
  // the case, not the board, so it doesn't ride the tilt)
  {
    const g = new THREE.Group();
    g.add(edged(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.85, 1.7), mats.body)));
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 0.04), mats.metal);
    grille.position.z = 0.86;
    g.add(grille);
    part(g, new THREE.Vector3(-10, 0.5, 0), new THREE.Vector3(-1.6, 0.5, 0), 0.74, 0.84, rig);
  }

  // ===== Finale: a gaming tower assembles around the upright board =====
  const tower = new THREE.Group();
  tower.visible = false;
  rig.add(tower);

  const frameShell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5.8, 5.4, 3.2)), mats.caseLine);
  frameShell.position.y = 2.7;
  const framePanes = new THREE.Mesh(new THREE.BoxGeometry(5.8, 5.4, 3.2), mats.pane);
  framePanes.position.y = 2.7;
  // tempered-glass side panel facing the camera
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.2), mats.glassPane);
  glass.position.set(0, 2.7, 1.61);
  // glow strips along the case edges
  const strips = [
    [0.06, 5.4, 0.06, 2.9, 2.7, 1.6],
    [0.06, 5.4, 0.06, 2.9, 2.7, -1.6],
    [5.8, 0.06, 0.06, 0, 5.4, 1.6]
  ].map(([w, hh, d, x, y, z]) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mats.strip);
    s.position.set(x, y, z);
    return s;
  });
  const shroud = edged(new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.95, 3.1), mats.body));
  const feet = [-2, 2].map((x) => {
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.24, 3.0), mats.body);
    ft.position.set(x, -0.12, 0);
    return ft;
  });
  // case fans: three front intakes on the visible face, one top exhaust
  const towerState = { docked: false };
  const towerFans = [];
  for (let i = 0; i < 3; i++) {
    const wrap = new THREE.Group();
    wrap.add(fan(0.5, 0, 0, 0, towerState));
    wrap.rotation.z = Math.PI / 2;
    wrap.position.set(2.72, 1.5 + i * 1.2, 0);
    towerFans.push(wrap);
  }
  {
    const top = new THREE.Group();
    top.add(fan(0.5, 0, 0, 0, towerState));
    top.position.set(1.2, 5.3, 0);
    towerFans.push(top);
  }
  const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.018, 8, 90), mats.ring);
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.position.y = 0.05;
  ringMesh.visible = false;
  tower.add(frameShell, framePanes, glass, ...strips, shroud, ...feet, ...towerFans, ringMesh);

  // Ambient particles for depth
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(200 * 3);
  for (let i = 0; i < pPos.length; i++) pPos[i] = (Math.random() - 0.5) * 28;
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, mats.particles);
  scene.add(particles);

  // ===== Scroll → scene state =====
  function update(p, time) {
    // trace growth finishes at ~38% scroll, overlapping early assembly
    const f = Math.max(stage(p, 0, 0.38), 0.04);
    const cutoff = Math.floor(totalSegs * f);
    traceGeo.setDrawRange(0, cutoff * 2);

    let o = 0;
    for (const t of traces) {
      let last = null;
      for (const g of t.glb) { if (g.k < cutoff) last = g; else break; }
      const done = t.glb[t.glb.length - 1].k < cutoff;
      if (last && !(done && f > 0.97)) { tipPos[o] = last.x; tipPos[o + 1] = 0.16; tipPos[o + 2] = last.z; }
      else { tipPos[o] = 0; tipPos[o + 1] = -999; tipPos[o + 2] = 0; }
      o += 3;
    }
    tipGeo.attributes.position.needsUpdate = true;
    mats.tips.opacity = 0.55 + 0.35 * Math.sin(time * 3);
    mats.pcb.opacity = lerp(0.3, 1, f);

    for (const s of sprouts) s.mesh.scale.setScalar(Math.max(stage(f, s.at, s.at + 0.06), 0.001));

    for (const d of details) d.obj.scale.setScalar(Math.max(stage(f, d.t, d.t + 0.05), 0.001));

    for (const lm of landmarks) {
      lm.wire.visible = f >= lm.t - 0.15 && f < lm.t;
      lm.solid.visible = f >= lm.t;
      if (lm.solid.visible) lm.solid.scale.setScalar(lerp(0.7, 1, stage(f, lm.t, lm.t + 0.05)));
    }

    for (const pt of parts) {
      const t = stage(p, pt.s, pt.e);
      pt.docked = t >= 1;
      pt.group.visible = t > 0;
      if (t > 0) pt.group.position.lerpVectors(pt.from, pt.to, t);
    }
    for (const pp of popParts) pp.mesh.scale.setScalar(Math.max(stage(p, pp.s, pp.e), 0.001));
    for (const sf of spinFans) sf.blades.rotation.y = sf.part.docked ? time * 4 : 0;

    // the populated board tilts upright and shrinks into the tower
    const tp = stage(p, 0.7, 0.88);
    mobo.rotation.x = tp * Math.PI / 2;
    mobo.scale.setScalar(lerp(1, 0.55, tp));
    mobo.position.set(0, 2.6 * tp, 0.7 * tp);

    const ct = stage(p, 0.72, 0.96);
    tower.visible = ct > 0;
    mats.caseLine.opacity = 0.6 * ct;
    mats.pane.opacity = 0.04 * ct;
    mats.glassPane.opacity = 0.08 * ct;
    mats.strip.opacity = (0.65 + 0.25 * Math.sin(time * 2)) * stage(p, 0.86, 0.96);
    frameShell.scale.setScalar(lerp(1.2, 1, ct));
    framePanes.scale.copy(frameShell.scale);
    shroud.position.y = lerp(-1.8, 0.5, stage(p, 0.78, 0.88));
    towerFans.forEach((fw, i) => fw.scale.setScalar(Math.max(stage(p, 0.8 + i * 0.03, 0.9 + i * 0.03), 0.001)));
    towerState.docked = ct >= 0.999;
    const rt = stage(p, 0.92, 1);
    ringMesh.visible = rt > 0;
    mats.ring.opacity = 0.5 * rt;

    halo.scale.setScalar(1 + 0.05 * Math.sin(time * 2));
    ramRGB.color.setHSL((0.72 + time * 0.05) % 1, 0.65, 0.6);
    const temp = 38 + Math.round(3 * Math.sin(time * 0.2));
    if (lcdDraw && temp !== lcdTemp) {
      lcdDraw(temp);
      lcdTemp = temp;
    }
    rig.rotation.y = time * 0.05 + p * 0.5;
  }

  // Camera path: die close-up → board overview → assembly view → tower reveal
  const KEYS = [
    { p: 0, pos: [1.3, 1.4, 1.0], look: [0, 0.15, 0] },
    { p: 0.26, pos: [4.8, 5.6, 4.8], look: [0, 0.1, 0] },
    { p: 0.5, pos: [6.0, 6.4, 7.4], look: [0, 0.3, 0] },
    { p: 0.68, pos: [6.6, 6.0, 8.6], look: [0, 0.5, 0] },
    { p: 1, pos: [6.6, 4.4, 9.4], look: [0, 2.5, 0] }
  ];
  function placeCamera(p, mx, my) {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = stage(p, a.p, b.p);
    const x = rig.position.x + lerp(a.pos[0], b.pos[0], t) + mx * 0.9;
    const y = lerp(a.pos[1], b.pos[1], t) - my * 0.9;
    const z = lerp(a.pos[2], b.pos[2], t);
    camera.position.set(x, y, z);
    let lx = rig.position.x + lerp(a.look[0], b.look[0], t);
    let ly = lerp(a.look[1], b.look[1], t);
    let lz = lerp(a.look[2], b.look[2], t);
    // the hero close-up keeps the off-center CPU framed as the scene turns
    const w = 1 - stage(p, 0.05, 0.3);
    if (w > 0) {
      chip.getWorldPosition(chipWorld);
      lx = lerp(lx, chipWorld.x, w);
      ly = lerp(ly, chipWorld.y + 0.05, w);
      lz = lerp(lz, chipWorld.z, w);
    }
    camera.lookAt(lx, ly, lz);
  }
  const chipWorld = new THREE.Vector3();

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
    rig.position.x = phone ? 0 : 2.2;
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
  let sp = scroll; // smoothed scroll progress

  function frame(t) {
    const time = t * 0.001;
    sp += (scroll - sp) * 0.06;
    update(sp, time);
    placeCamera(sp, mx, my);
    renderer.render(scene, camera);
  }

  if (reducedMotion) {
    // Single static frame; re-render only on scroll (no smoothing) and theme change
    const still = () => {
      update(scroll, 0);
      placeCamera(scroll, 0, 0);
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
