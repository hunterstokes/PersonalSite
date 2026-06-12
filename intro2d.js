// Circuit-to-name intro — plays once per browser session on the homepage.
// Phase 1 looks two-dimensional: the camera hangs almost straight above a
// ground plane while circuit traces race in and land in a scatter of pads.
// Then the pads launch upward into a floating dot-matrix of the name as
// the camera sweeps ~90° down to a front view, revealing the scene was 3D
// all along. Plain canvas with a hand-rolled perspective projection — no
// three.js on the homepage. Loaded on demand by intro-boot.js; skippable
// via the Skip button or Escape.
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
  try { sessionStorage.setItem('hb-intro-played', '1'); } catch { /* storage blocked */ }

  // The intro owns the screen; the 2D hero canvas comes back afterward
  const heroCanvas = document.getElementById('hero-canvas');
  if (heroCanvas) heroCanvas.style.display = 'none';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = innerWidth, H = innerHeight, F = H;
  function size() {
    W = innerWidth;
    H = innerHeight;
    F = H; // projection focal length
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener('resize', size);

  const cssVar = (n, f) => getComputedStyle(html).getPropertyValue(n).trim() || f;
  const accent = cssVar('--accent', '#4a9eff');
  const bright = '#dbe9ff';

  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const rand = rng(20260612);
  const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  // ===== The name as a dot matrix =====
  // Sampled from rendered text; each dot becomes a pad on the ground that
  // later rises to its letter position in a vertical sheet at z=0.
  function sampleName() {
    const c = document.createElement('canvas');
    c.width = 560;
    c.height = 240;
    const t = c.getContext('2d');
    t.fillStyle = '#fff';
    t.textAlign = 'center';
    t.font = '900 96px Inter, Arial, sans-serif';
    t.fillText('HUNTER', 280, 96);
    t.fillText('BROWN', 280, 212);
    const img = t.getImageData(0, 0, 560, 240).data;
    for (let step = 7; step <= 12; step++) {
      const pts = [];
      for (let y = 0; y < 240; y += step) {
        for (let x = 0; x < 560; x += step) {
          if (img[(y * 560 + x) * 4 + 3] > 120) pts.push([x, y]);
        }
      }
      if (pts.length <= 320) return pts;
    }
    return [];
  }

  const TEXT_S = 24 / 560; // world units per sampled pixel
  const dots = sampleName().map(([px, py], i) => {
    const X = (px - 280) * TEXT_S;
    const Y = (240 - py) * TEXT_S * 1.15 + 1.5;
    return {
      X, Y,
      zf: (rand() - 0.5) * 0.5,          // final sheet jitter
      gx: X + (rand() - 0.5) * 1.4,       // ground pad position
      gz: (rand() - 0.5) * 9,
      rise: 0.62 * ((X + 12) / 24) + rand() * 0.25 // left-to-right wave
    };
  });

  // ===== Traces on the ground plane (x, z), Manhattan-routed to the pads =====
  const traces = [];
  dots.forEach((d, i) => {
    let x, z;
    if (i % 4 === 0) { // long run from the edge of the world
      if (rand() < 0.5) { x = rand() < 0.5 ? -36 : 36; z = (rand() - 0.5) * 48; }
      else { z = rand() < 0.5 ? -26 : 26; x = (rand() - 0.5) * 64; }
    } else { // short local stub
      x = d.gx + (rand() - 0.5) * 16;
      z = d.gz + (rand() - 0.5) * 14;
    }
    const pts = [[x, z]];
    let horiz = rand() < 0.5;
    for (let s = 0; s < 2; s++) {
      if (horiz) x += (d.gx - x) * (0.4 + rand() * 0.35);
      else z += (d.gz - z) * (0.4 + rand() * 0.35);
      pts.push([x, z]);
      horiz = !horiz;
    }
    if (horiz) pts.push([d.gx, z]);
    else pts.push([x, d.gz]);
    pts.push([d.gx, d.gz]);
    let len = 0;
    for (let s = 1; s < pts.length; s++) len += Math.abs(pts[s][0] - pts[s - 1][0]) + Math.abs(pts[s][1] - pts[s - 1][1]);
    traces.push({ pts, len, delay: rand() * 0.4, dur: 0.35 + rand() * 0.35 });
  });

  // ===== Hand-rolled camera: orbits from overhead (looks 2D) to a front view =====
  let cam = null;
  function setCamera(k) {
    // k 0 → pitch 88° (top-down); k 1 → pitch 8° (front view of the name)
    const phi = lerp(88, 8, k) * Math.PI / 180;
    const ty = lerp(0, 7.1, k);          // target slides up to the text center
    const D = lerp(30, 31, k);
    const pos = [0, ty + D * Math.sin(phi), D * Math.cos(phi)];
    // look-at basis with world up (0,1,0)
    let fx = 0 - pos[0], fy = ty - pos[1], fz = 0 - pos[2];
    const fl = Math.hypot(fx, fy, fz);
    fx /= fl; fy /= fl; fz /= fl;
    let rx = -fz, rz = fx; // cross(f, up), y term is 0
    const rl = Math.hypot(rx, rz) || 1;
    rx /= rl; rz /= rl;
    const ux = rz * fy * -1 + 0, uy = rz * fx - rx * fz, uz = rx * fy; // cross(r, f) with r.y = 0
    // screen principal point drifts toward where the hero name lands
    const cx = lerp(W / 2, W < 700 ? W * 0.5 : W * 0.3, k);
    const cy = lerp(H / 2, H * 0.5, k);
    cam = { pos, fx, fy, fz, rx, rz, ux, uy, uz, cx, cy };
  }
  function project(px, py, pz) {
    const dx = px - cam.pos[0], dy = py - cam.pos[1], dz = pz - cam.pos[2];
    const zc = dx * cam.fx + dy * cam.fy + dz * cam.fz;
    if (zc < 1) return null;
    const xc = dx * cam.rx + dz * cam.rz;
    const yc = dx * cam.ux + dy * cam.uy + dz * cam.uz;
    return [cam.cx + F * xc / zc, cam.cy - F * yc / zc, zc];
  }

  function strokePartialWorld(tr, drawn) {
    const { pts } = tr;
    ctx.beginPath();
    let prev = project(pts[0][0], 0, pts[0][1]);
    if (prev) ctx.moveTo(prev[0], prev[1]);
    let remaining = drawn;
    let tipW = pts[0];
    for (let s = 1; s < pts.length && remaining > 0; s++) {
      const [ax, az] = pts[s - 1], [bx, bz] = pts[s];
      const segLen = Math.abs(bx - ax) + Math.abs(bz - az);
      let end;
      if (segLen <= remaining) {
        end = pts[s];
        remaining -= segLen;
      } else {
        const k = remaining / segLen;
        end = [ax + (bx - ax) * k, az + (bz - az) * k];
        remaining = 0;
      }
      tipW = end;
      const sp = project(end[0], 0, end[1]);
      if (sp) ctx.lineTo(sp[0], sp[1]);
    }
    ctx.stroke();
    return tipW;
  }

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

  // ===== Timeline =====
  // traces draw 0–2s (flat overhead view), dots launch upward 1.8–3.4s in a
  // left-to-right wave, camera sweeps down 2.1–3.7s, name holds to 4.6s
  const DRAW_MS = 2000, INTRO_MS = 4600;
  let elapsed = 0, last = null, finished = false, raf = 0;

  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (last === null) last = t;
    elapsed += Math.min(t - last, 100); // tab-away gaps don't fast-forward
    last = t;
    const time = t * 0.001;

    const camk = ease((elapsed - 2100) / 1600);
    const risep = (elapsed - 1800) / 1600;
    setCamera(camk);
    ctx.clearRect(0, 0, W, H);

    // ground traces fade back as the name takes over
    const traceAlpha = 0.45 * (1 - 0.7 * camk);
    const tp = elapsed / DRAW_MS;
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = accent;
    for (const tr of traces) {
      const k = ease((tp - tr.delay) / tr.dur);
      if (k <= 0) continue;
      ctx.globalAlpha = traceAlpha;
      const tipW = strokePartialWorld(tr, k * tr.len);
      if (k < 1) {
        const sp = project(tipW[0], 0, tipW[1]);
        if (sp) {
          ctx.globalAlpha = 0.9 * traceAlpha / 0.45;
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc(sp[0], sp[1], Math.min(90 / sp[2], 3), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // the pads rise off the plane into the name
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const rk = ease((risep - d.rise * 0.5) / 0.45);
      const px = lerp(d.gx, d.X, rk);
      const py = d.Y * rk;
      const pz = lerp(d.gz, d.zf, rk);
      const sp = project(px, py, pz);
      if (!sp) continue;
      // pads start small and dim on the plane, bloom as they rise
      const r = Math.min(Math.max(F * 0.14 / sp[2], 1.2), 5) * (0.5 + 0.5 * rk);
      const shimmer = elapsed > 3700 ? 0.8 + 0.2 * Math.sin(time * 3 + i) : 1;
      ctx.globalAlpha = (0.12 + 0.78 * rk) * shimmer;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(sp[0], sp[1], r * 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = Math.min(0.35 + 0.65 * rk, 1) * shimmer;
      ctx.fillStyle = rk > 0.95 ? bright : accent;
      ctx.beginPath();
      ctx.arc(sp[0], sp[1], r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!finished && elapsed >= INTRO_MS) finish(false);
  }

  function finish(skipped) {
    if (finished) return;
    finished = true;
    skipBtn.disabled = true;
    if (skipped) container.style.transition = 'opacity 0.45s ease';
    container.style.opacity = '0';
    // cross-fade: dot-matrix name out, real name in
    html.classList.add('intro-fading');
    void document.body.offsetWidth;
    html.classList.remove('intro-pending');
    setTimeout(cleanup, skipped ? 500 : 1300);
  }

  function cleanup() {
    cancelAnimationFrame(raf);
    container.remove();
    skipBtn.remove();
    removeEventListener('keydown', onKey);
    removeEventListener('resize', size);
    if (heroCanvas) heroCanvas.style.display = '';
    setTimeout(() => html.classList.remove('intro-fading'), 1400);
  }

  raf = requestAnimationFrame(frame);
})();
