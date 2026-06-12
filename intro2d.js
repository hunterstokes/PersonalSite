// 2D circuit intro — plays once per browser session on the homepage.
// Circuit traces race in from the screen edges and converge on a ring
// around the spot where the name lands in the hero; a pulse fires, the
// canvas fades out, and the site (name first) fades in. Plain canvas —
// no three.js, so the homepage never downloads the 3D vendor code.
// Loaded on demand by intro-boot.js; skippable via Skip button or Escape.
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
  let W = innerWidth, H = innerHeight;
  function size() {
    W = innerWidth;
    H = innerHeight;
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
  const muted = cssVar('--text-muted', '#8a8f9d');

  // Traces converge on a ring around where the hero name appears
  const T = { x: W < 700 ? W * 0.45 : W * 0.2, y: H * 0.52 };
  const RING = Math.min(150, W * 0.18);

  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const rand = rng(20260612);
  const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

  // Manhattan traces from the screen edges to the ring
  const traces = [];
  for (let i = 0; i < 70; i++) {
    const edge = i % 4;
    let x = edge === 0 ? 0 : edge === 1 ? W : rand() * W;
    let y = edge === 2 ? 0 : edge === 3 ? H : rand() * H;
    if (edge < 2) y = rand() * H;
    const ang = Math.atan2(y - T.y, x - T.x) + (rand() - 0.5) * 0.9;
    const ex = T.x + Math.cos(ang) * RING;
    const ey = T.y + Math.sin(ang) * RING * 0.75; // squashed: the name is wide
    const pts = [[x, y]];
    let horiz = rand() < 0.5;
    for (let s = 0; s < 3; s++) {
      const ft = (s + 1) / 4;
      if (horiz) x += (ex - x) * (0.35 + rand() * 0.4) + (rand() - 0.5) * 140 * (1 - ft);
      else y += (ey - y) * (0.35 + rand() * 0.4) + (rand() - 0.5) * 140 * (1 - ft);
      pts.push([x, y]);
      horiz = !horiz;
    }
    // close with a clean L into the ring point
    if (horiz) pts.push([ex, y]);
    else pts.push([x, ey]);
    pts.push([ex, ey]);

    let len = 0;
    for (let s = 1; s < pts.length; s++) len += Math.abs(pts[s][0] - pts[s - 1][0]) + Math.abs(pts[s][1] - pts[s - 1][1]);
    traces.push({ pts, len, delay: rand() * 0.35, dur: 0.45 + rand() * 0.3 });
  }

  // Walks the polyline up to a drawn length; returns the current tip
  function strokePartial(tr, drawn) {
    const { pts } = tr;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    let remaining = drawn;
    let tip = pts[0];
    for (let s = 1; s < pts.length && remaining > 0; s++) {
      const [ax, ay] = pts[s - 1], [bx, by] = pts[s];
      const segLen = Math.abs(bx - ax) + Math.abs(by - ay);
      if (segLen <= remaining) {
        ctx.lineTo(bx, by);
        tip = pts[s];
        remaining -= segLen;
      } else {
        const k = remaining / segLen;
        tip = [ax + (bx - ax) * k, ay + (by - ay) * k];
        ctx.lineTo(tip[0], tip[1]);
        remaining = 0;
      }
    }
    ctx.stroke();
    return tip;
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
  const DRAW_MS = 2600, PULSE_MS = 700;
  let elapsed = 0, last = null, finished = false, raf = 0;

  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (last === null) last = t;
    elapsed += Math.min(t - last, 100); // tab-away gaps don't fast-forward
    last = t;

    ctx.clearRect(0, 0, W, H);
    const tp = elapsed / DRAW_MS;
    ctx.lineWidth = 1.5;
    for (const tr of traces) {
      const k = ease((tp - tr.delay) / tr.dur);
      if (k <= 0) continue;
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.45;
      const tip = strokePartial(tr, k * tr.len);
      if (k < 1) {
        // glowing tip while the trace is racing
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(tip[0], tip[1], 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(tip[0], tip[1], 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // landed: a solder pad on the ring
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = muted;
        const [px, py] = tr.pts[tr.pts.length - 1];
        ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
      }
    }

    // converging pulse around the name's landing spot
    if (elapsed > DRAW_MS) {
      const q = Math.min((elapsed - DRAW_MS) / PULSE_MS, 1);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7 * (1 - q);
      ctx.beginPath();
      ctx.ellipse(T.x, T.y, RING + q * 80, RING * 0.75 + q * 60, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.25 * (1 - q);
      ctx.beginPath();
      ctx.ellipse(T.x, T.y, RING + q * Math.max(W, H) * 0.5, (RING + q * Math.max(W, H) * 0.5) * 0.75, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (!finished && elapsed >= DRAW_MS + PULSE_MS) finish(false);
  }

  function finish(skipped) {
    if (finished) return;
    finished = true;
    skipBtn.disabled = true;
    if (skipped) container.style.transition = 'opacity 0.45s ease';
    container.style.opacity = '0';
    // cross-fade: traces out, site (name first) in
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
