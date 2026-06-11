// Field Defender — vanilla canvas asteroids
(() => {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const W = 880;
  const H = 550;

  const hudScore = document.getElementById('hud-score');
  const hudLevel = document.getElementById('hud-level');
  const hudLives = document.getElementById('hud-lives');
  const hudHigh = document.getElementById('hud-high');
  const overlay = document.getElementById('game-overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const overlayScore = document.getElementById('overlay-score');
  const overlayBtn = document.getElementById('overlay-btn');

  const HIGH_KEY = 'hb-field-defender-high';

  let colors = { accent: '#4a9eff', text: '#e0e2e8', muted: '#8a8f9d', orange: '#f0913a' };
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    colors.accent = s.getPropertyValue('--accent').trim() || colors.accent;
    colors.text = s.getPropertyValue('--text').trim() || colors.text;
    colors.muted = s.getPropertyValue('--text-muted').trim() || colors.muted;
    colors.orange = s.getPropertyValue('--orange').trim() || colors.orange;
  }
  readColors();
  document.addEventListener('themechange', readColors);

  // Fixed logical resolution; CSS scales the element, dpr keeps it crisp
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // ===== Input =====
  const keys = { left: false, right: false, thrust: false, fire: false };

  const keyMap = {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'thrust', w: 'thrust', W: 'thrust',
    ' ': 'fire'
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (state === 'playing') setState('paused');
      else if (state === 'paused') setState('playing');
      return;
    }
    const action = keyMap[e.key];
    if (action) {
      keys[action] = true;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      if (state === 'menu' || state === 'gameover') startGame();
    }
  });

  window.addEventListener('keyup', (e) => {
    const action = keyMap[e.key];
    if (action) keys[action] = false;
  });

  document.querySelectorAll('.touch-btn').forEach(btn => {
    const action = btn.dataset.action;
    const press = (e) => { e.preventDefault(); keys[action] = true; };
    const release = (e) => { e.preventDefault(); keys[action] = false; };
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
  });

  // ===== Game state =====
  let state = 'menu'; // menu | playing | paused | gameover
  let ship, bullets, asteroids, particles;
  let score = 0;
  let level = 1;
  let lives = 3;
  let highScore = parseInt(localStorage.getItem(HIGH_KEY), 10) || 0;
  let fireCooldown = 0;
  let lastTime = 0;

  hudHigh.textContent = highScore;

  function setState(next) {
    state = next;
    if (next === 'playing') {
      overlay.classList.add('hidden');
    } else {
      overlay.classList.remove('hidden');
      overlayScore.textContent = '';
      if (next === 'menu') {
        overlayTitle.textContent = 'Field Defender';
        overlayText.textContent = "Debris is drifting into the field. Pilot your ship, blast it clear, and don't get hit.";
        overlayBtn.textContent = 'Start';
      } else if (next === 'paused') {
        overlayTitle.textContent = 'Paused';
        overlayText.textContent = 'The field will wait. Press P or the button to resume.';
        overlayBtn.textContent = 'Resume';
      } else if (next === 'gameover') {
        const isRecord = score > 0 && score >= highScore;
        overlayTitle.textContent = 'System Down';
        overlayText.textContent = isRecord
          ? 'New high score — the field has never been cleaner.'
          : 'The debris won this round. Recalibrate and try again.';
        overlayScore.textContent = `Final score: ${score}`;
        overlayBtn.textContent = 'Play Again';
      }
    }
  }

  overlayBtn.addEventListener('click', () => {
    overlayBtn.blur();
    if (state === 'paused') setState('playing');
    else if (state !== 'playing') startGame();
  });

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function wrap(obj) {
    if (obj.x < -obj.r) obj.x = W + obj.r;
    if (obj.x > W + obj.r) obj.x = -obj.r;
    if (obj.y < -obj.r) obj.y = H + obj.r;
    if (obj.y > H + obj.r) obj.y = -obj.r;
  }

  function makeShip() {
    return {
      x: W / 2, y: H / 2, r: 12,
      angle: -Math.PI / 2,
      vx: 0, vy: 0,
      invincible: 2.5,
      thrusting: false
    };
  }

  function makeAsteroid(x, y, size) {
    // size: 3 large, 2 medium, 1 small
    const r = size === 3 ? rand(34, 44) : size === 2 ? rand(20, 26) : rand(10, 14);
    const speed = (4 - size) * rand(28, 45) + level * 6;
    const dir = rand(0, Math.PI * 2);
    const verts = [];
    const n = Math.floor(rand(8, 12));
    for (let i = 0; i < n; i++) {
      verts.push(rand(0.72, 1.18));
    }
    return {
      x, y, r, size, verts,
      vx: Math.cos(dir) * speed,
      vy: Math.sin(dir) * speed,
      rot: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.8, 0.8)
    };
  }

  function spawnAsteroids(count) {
    for (let i = 0; i < count; i++) {
      // Spawn at the edge, never on top of the ship
      let x, y;
      do {
        x = Math.random() < 0.5 ? rand(0, W * 0.2) : rand(W * 0.8, W);
        y = rand(0, H);
      } while (Math.hypot(x - ship.x, y - ship.y) < 180);
      asteroids.push(makeAsteroid(x, y, 3));
    }
  }

  function startGame() {
    score = 0;
    level = 1;
    lives = 3;
    ship = makeShip();
    bullets = [];
    asteroids = [];
    particles = [];
    fireCooldown = 0;
    spawnAsteroids(3);
    updateHud();
    setState('playing');
  }

  function updateHud() {
    hudScore.textContent = score;
    hudLevel.textContent = level;
    hudLives.textContent = lives;
    hudHigh.textContent = highScore;
  }

  function explode(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const dir = rand(0, Math.PI * 2);
      const speed = rand(30, 160);
      particles.push({
        x, y,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        life: rand(0.3, 0.8),
        maxLife: 0.8,
        color
      });
    }
  }

  function destroyAsteroid(idx) {
    const a = asteroids[idx];
    asteroids.splice(idx, 1);
    score += a.size === 3 ? 20 : a.size === 2 ? 50 : 100;
    explode(a.x, a.y, a.size * 6, colors.muted);
    if (a.size > 1) {
      asteroids.push(makeAsteroid(a.x, a.y, a.size - 1));
      asteroids.push(makeAsteroid(a.x, a.y, a.size - 1));
    }
    if (asteroids.length === 0) {
      level++;
      ship.invincible = Math.max(ship.invincible, 2);
      spawnAsteroids(Math.min(2 + level, 8));
    }
    updateHud();
  }

  function hitShip() {
    lives--;
    explode(ship.x, ship.y, 28, colors.orange);
    updateHud();
    if (lives <= 0) {
      if (score > highScore) {
        highScore = score;
        localStorage.setItem(HIGH_KEY, String(highScore));
        updateHud();
      }
      setState('gameover');
    } else {
      ship = makeShip();
    }
  }

  // ===== Update =====
  function update(dt) {
    // Ship
    const TURN = 4.2;
    const THRUST = 320;
    const FRICTION = 0.45;
    if (keys.left) ship.angle -= TURN * dt;
    if (keys.right) ship.angle += TURN * dt;
    ship.thrusting = keys.thrust;
    if (keys.thrust) {
      ship.vx += Math.cos(ship.angle) * THRUST * dt;
      ship.vy += Math.sin(ship.angle) * THRUST * dt;
    }
    ship.vx -= ship.vx * FRICTION * dt;
    ship.vy -= ship.vy * FRICTION * dt;
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    wrap(ship);
    if (ship.invincible > 0) ship.invincible -= dt;

    // Fire
    fireCooldown -= dt;
    if (keys.fire && fireCooldown <= 0) {
      bullets.push({
        x: ship.x + Math.cos(ship.angle) * ship.r,
        y: ship.y + Math.sin(ship.angle) * ship.r,
        vx: Math.cos(ship.angle) * 520 + ship.vx,
        vy: Math.sin(ship.angle) * 520 + ship.vy,
        r: 2,
        life: 1.1
      });
      fireCooldown = 0.22;
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      wrap(b);
      if (b.life <= 0) bullets.splice(i, 1);
    }

    // Asteroids
    for (const a of asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.rotSpeed * dt;
      wrap(a);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Bullet ↔ asteroid collisions
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) < a.r) {
          bullets.splice(j, 1);
          destroyAsteroid(i);
          break;
        }
      }
    }

    // Ship ↔ asteroid collisions
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (Math.hypot(a.x - ship.x, a.y - ship.y) < a.r + ship.r * 0.7) {
          hitShip();
          break;
        }
      }
    }
  }

  // ===== Draw =====
  function drawShip() {
    if (ship.invincible > 0 && Math.floor(ship.invincible * 8) % 2 === 0) return;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    if (ship.thrusting) {
      ctx.strokeStyle = colors.orange;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-ship.r * 0.8, -4);
      ctx.lineTo(-ship.r * 1.6 - Math.random() * 6, 0);
      ctx.lineTo(-ship.r * 0.8, 4);
      ctx.stroke();
    }

    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ship.r * 1.2, 0);
    ctx.lineTo(-ship.r * 0.8, -ship.r * 0.75);
    ctx.lineTo(-ship.r * 0.4, 0);
    ctx.lineTo(-ship.r * 0.8, ship.r * 0.75);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < a.verts.length; i++) {
      const ang = (i / a.verts.length) * Math.PI * 2;
      const r = a.r * a.verts[i];
      const px = Math.cos(ang) * r;
      const py = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {
      ctx.globalAlpha = Math.max(p.life / p.maxLife, 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = colors.accent;
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const a of asteroids) drawAsteroid(a);
    if (state === 'playing' || state === 'paused') drawShip();
  }

  // ===== Loop =====
  function loop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    if (state === 'playing') {
      update(dt);
    } else if (state === 'menu' || state === 'gameover') {
      // Keep the field drifting behind the overlay
      for (const a of asteroids) {
        a.x += a.vx * dt * 0.4;
        a.y += a.vy * dt * 0.4;
        a.rot += a.rotSpeed * dt;
        wrap(a);
      }
    }
    draw();
    requestAnimationFrame(loop);
  }

  // Idle background: a few drifting asteroids behind the menu overlay
  ship = makeShip();
  bullets = [];
  particles = [];
  asteroids = [];
  for (let i = 0; i < 5; i++) {
    asteroids.push(makeAsteroid(rand(0, W), rand(0, H), Math.random() < 0.5 ? 3 : 2));
  }
  setState('menu');
  requestAnimationFrame(loop);
})();
