// Circuit-to-name intro — plays once per browser session on the homepage.
// Phase 1 looks two-dimensional: the camera hangs almost straight above a
// ground plane while circuit traces race in and land in a scatter of pads.
// The pads then launch upward into a floating dot rendering of the hero
// name while the camera sweeps ~90° down to a front view — and because the
// dots are sampled from the real hero <h1> (same font, size, and screen
// position), they settle pixel-aligned onto the type and dissolve into it.
// Plain canvas with a hand-rolled perspective projection — no three.js on
// the homepage. Loaded on demand by intro-boot.js; Skip button or Escape.
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

  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const rand = rng(20260612);
  const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  // resolve any CSS color to [r, g, b] for blending
  const colorProbe = document.createElement('canvas');
  colorProbe.width = colorProbe.height = 1;
  const probeCtx = colorProbe.getContext('2d');
  function rgb(col) {
    probeCtx.fillStyle = col;
    probeCtx.fillRect(0, 0, 1, 1);
    return [...probeCtx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }

  function bail() {
    showSite();
    container.remove();
    removeEventListener('resize', size);
    if (heroCanvas) heroCanvas.style.display = '';
  }

  // ===== Sample the real hero name =====
  // The hidden site is fully laid out (it's only opacity:0), so the <h1>
  // can be measured and re-rendered offscreen in its exact font and
  // position; the dot targets ARE the landing page's glyph pixels.
  function sampleHeroName() {
    const h1 = document.querySelector('.hero-name');
    if (!h1) return null;
    const cs = getComputedStyle(h1);
    const runs = [];
    const range = document.createRange();
    const collect = (node, isAccent) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3 && n.textContent.trim()) {
          range.selectNodeContents(n);
          runs.push({ text: n.textContent, rect: range.getBoundingClientRect(), accent: isAccent });
        } else if (n.nodeType === 1) {
          collect(n, isAccent || n.classList.contains('accent'));
        }
      }
    };
    collect(h1, false);
    if (!runs.length) return null;

    const block = h1.getBoundingClientRect();
    const pad = 6;
    const c = document.createElement('canvas');
    c.width = Math.ceil(block.width) + pad * 2;
    c.height = Math.ceil(block.height) + pad * 2;
    const t = c.getContext('2d');
    t.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if (cs.letterSpacing !== 'normal') t.letterSpacing = cs.letterSpacing;
    const ascent = t.measureText('H').fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.78;
    t.fillStyle = '#fff';
    for (const run of runs) {
      t.fillText(run.text, run.rect.left - block.left + pad, run.rect.top - block.top + pad + ascent);
    }
    const img = t.getImageData(0, 0, c.width, c.height).data;
    for (let step = 5; step <= 11; step++) {
      const pts = [];
      for (let y = 0; y < c.height; y += step) {
        for (let x = 0; x < c.width; x += step) {
          if (img[(y * c.width + x) * 4 + 3] > 120) {
            const sx = x - pad + block.left, sy = y - pad + block.top;
            const isAccent = runs.some((r) => r.accent &&
              sx >= r.rect.left - 3 && sx <= r.rect.right + 3 &&
              sy >= r.rect.top - 3 && sy <= r.rect.bottom + 3);
            pts.push({ sx, sy, isAccent });
          }
        }
      }
      if (pts.length <= 340) return { pts, block, step, titleColor: cs.color };
    }
    return null;
  }

  // Wait briefly for the web font so the sampled glyphs match the landing
  // page, then build the scene
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 450))]).then(() => {
    const sample = sampleHeroName();
    if (!sample || !sample.pts.length) {
      bail();
      return;
    }
    run(sample);
  }).catch(bail);

  function run({ pts, block, step, titleColor }) {
    const titleRGB = rgb(titleColor);
    const accentRGB = rgb(accent);
    const blend = (k) => `rgb(${lerp(accentRGB[0], titleRGB[0], k) | 0},${lerp(accentRGB[1], titleRGB[1], k) | 0},${lerp(accentRGB[2], titleRGB[2], k) | 0})`;

    // map the screen-space glyph samples onto a vertical sheet in the world
    const bcx = block.left + block.width / 2;
    const bcy = block.top + block.height / 2;
    const K = block.width / 24; // px per world unit; text is 24 units wide
    const yBase = (block.height / K) / 2 + 1.5;
    const dots = pts.map(({ sx, sy, isAccent }) => ({
      sx, sy, isAccent,
      X: (sx - bcx) / K,
      Y: (bcy - sy) / K + yBase,
      zf: (rand() - 0.5) * 0.5,
      gx: (sx - bcx) / K + (rand() - 0.5) * 1.4,
      gz: (rand() - 0.5) * 9,
      rise: 0.62 * (((sx - bcx) / K + 12) / 24) + rand() * 0.25
    }));

    // ===== Traces on the ground plane, Manhattan-routed to the pads =====
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
      const tpts = [[x, z]];
      let horiz = rand() < 0.5;
      for (let s = 0; s < 2; s++) {
        if (horiz) x += (d.gx - x) * (0.4 + rand() * 0.35);
        else z += (d.gz - z) * (0.4 + rand() * 0.35);
        tpts.push([x, z]);
        horiz = !horiz;
      }
      if (horiz) tpts.push([d.gx, z]);
      else tpts.push([x, d.gz]);
      tpts.push([d.gx, d.gz]);
      let len = 0;
      for (let s = 1; s < tpts.length; s++) len += Math.abs(tpts[s][0] - tpts[s - 1][0]) + Math.abs(tpts[s][1] - tpts[s - 1][1]);
      traces.push({ pts: tpts, len, delay: rand() * 0.4, dur: 0.35 + rand() * 0.35 });
    });

    // ===== Hand-rolled camera: overhead (looks 2D) → front view =====
    let cam = null;
    function setCamera(k) {
      const phi = lerp(88, 8, k) * Math.PI / 180;
      const ty = lerp(0, yBase, k); // target slides up to the text center
      const D = lerp(30, 31, k);
      const pos = [0, ty + D * Math.sin(phi), D * Math.cos(phi)];
      let fx = -pos[0], fy = ty - pos[1], fz = -pos[2];
      const fl = Math.hypot(fx, fy, fz);
      fx /= fl; fy /= fl; fz /= fl;
      let rx = -fz, rz = fx;
      const rl = Math.hypot(rx, rz) || 1;
      rx /= rl; rz /= rl;
      const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
      // the principal point drifts so the world text lands over the real h1
      const cx = lerp(W / 2, bcx, k);
      const cy = lerp(H / 2, bcy, k);
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
      const tpts = tr.pts;
      ctx.beginPath();
      const start = project(tpts[0][0], 0, tpts[0][1]);
      if (start) ctx.moveTo(start[0], start[1]);
      let remaining = drawn;
      let tipW = tpts[0];
      for (let s = 1; s < tpts.length && remaining > 0; s++) {
        const [ax, az] = tpts[s - 1], [bx, bz] = tpts[s];
        const segLen = Math.abs(bx - ax) + Math.abs(bz - az);
        let end;
        if (segLen <= remaining) {
          end = tpts[s];
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
    // traces 0–2s (flat overhead), dots rise 1.8–3.4s in a wave, camera
    // sweeps 2.1–3.5s, dots settle onto the real type 3.3–4.2s, then the
    // handoff to the landing page is immediate
    const DRAW_MS = 2000, INTRO_MS = 4250;
    let elapsed = 0, last = null, finished = false, raf = 0;

    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (last === null) last = t;
      elapsed += Math.min(t - last, 100); // tab-away gaps don't fast-forward
      last = t;
      const time = t * 0.001;

      const camk = ease((elapsed - 2100) / 1400);
      const risep = (elapsed - 1800) / 1600;
      const settle = ease((elapsed - 3300) / 900);
      setCamera(camk);
      ctx.clearRect(0, 0, W, H);

      // ground traces fade back as the name takes over
      const traceAlpha = 0.45 * (1 - 0.85 * camk);
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
            ctx.globalAlpha = 0.9 * (1 - 0.85 * camk);
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(sp[0], sp[1], Math.min(90 / sp[2], 3), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // pads rise into the floating name, then settle onto the real type
      const textR = step * 0.62; // dot size that reads as solid glyphs
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const rk = ease((risep - d.rise * 0.5) / 0.45);
        const wp = project(lerp(d.gx, d.X, rk), d.Y * rk, lerp(d.gz, d.zf, rk));
        if (!wp) continue;
        const sx = lerp(wp[0], d.sx, settle);
        const sy = lerp(wp[1], d.sy, settle);
        const r3d = Math.min(Math.max(F * 0.14 / wp[2], 1.2), 5) * (0.5 + 0.5 * rk);
        const r = lerp(r3d, textR, settle);
        // glow bloom while floating; crisp pixels once settled
        const glowA = (0.12 + 0.78 * rk) * (1 - settle);
        if (glowA > 0.01) {
          ctx.globalAlpha = glowA;
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc(sx, sy, r * 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = Math.min(0.35 + 0.65 * rk, 1);
        ctx.fillStyle = d.isAccent ? accent : blend(settle);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!finished && elapsed >= INTRO_MS) finish(false);
    }

    function finish(skipped) {
      if (finished) return;
      finished = true;
      skipBtn.disabled = true;
      // quick handoff — the settled dots and the real name swap in place
      container.style.transition = 'opacity 0.5s ease';
      container.style.opacity = '0';
      html.classList.add('intro-fading');
      void document.body.offsetWidth;
      html.classList.remove('intro-pending');
      setTimeout(cleanup, 600);
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
  }
})();
