document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Theme toggle =====
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  }

  // ===== Mobile nav =====
  const nav = document.querySelector('.nav');
  const burger = document.getElementById('nav-burger');
  if (nav && burger) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('nav-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ===== Fade-in reveals with stagger =====
  const targets = document.querySelectorAll(
    '.section-content, .timeline-item, .project-card, .contact-item'
  );
  targets.forEach(el => {
    el.classList.add('fade-in');
    // Stagger siblings within the same container
    const siblings = Array.from(el.parentElement.children).filter(c =>
      c.classList.contains(el.classList[0])
    );
    el.style.setProperty('--stagger', siblings.indexOf(el));
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  targets.forEach(el => observer.observe(el));

  // ===== Scroll-driven UI: progress bar, active nav, back-to-top =====
  const progress = document.querySelector('.scroll-progress');
  const backToTop = document.getElementById('back-to-top');
  const sections = document.querySelectorAll('.section, .hero');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  let scrollScheduled = false;
  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) {
      progress.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : '0';
    }

    if (backToTop) {
      backToTop.classList.toggle('visible', window.scrollY > 600);
    }

    let current = '';
    sections.forEach(section => {
      if (window.scrollY >= section.offsetTop - 120) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });

    scrollScheduled = false;
  }

  window.addEventListener('scroll', () => {
    if (!scrollScheduled) {
      scrollScheduled = true;
      requestAnimationFrame(onScroll);
    }
  });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  // ===== Cursor spotlight =====
  const spotlight = document.querySelector('.cursor-spotlight');
  if (spotlight && !reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    let spotScheduled = false;
    let mx = 0, my = 0;
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      spotlight.classList.add('active');
      if (!spotScheduled) {
        spotScheduled = true;
        requestAnimationFrame(() => {
          spotlight.style.setProperty('--spot-x', `${mx}px`);
          spotlight.style.setProperty('--spot-y', `${my}px`);
          spotScheduled = false;
        });
      }
    });
    document.documentElement.addEventListener('mouseleave', () => {
      spotlight.classList.remove('active');
    });
  }

  // ===== Contact form =====
  const form = document.getElementById('contact-form');
  if (form) {
    const status = document.getElementById('form-status');
    const submitBtn = form.querySelector('.form-submit');
    const hasEndpoint = !form.action.includes('YOUR_FORM_ID');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);

      if (!hasEndpoint) {
        // No form service configured yet — hand off to the visitor's email app
        const subject = encodeURIComponent(`Website message from ${data.get('name')}`);
        const body = encodeURIComponent(`${data.get('message')}\n\n— ${data.get('name')} (${data.get('email')})`);
        window.location.href = `mailto:hunterstokes@me.com?subject=${subject}&body=${body}`;
        status.textContent = 'Opening your email app to send the message…';
        status.className = 'form-status success';
        return;
      }

      submitBtn.disabled = true;
      status.textContent = 'Sending…';
      status.className = 'form-status';
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          status.textContent = "Message sent — thanks! I'll get back to you soon.";
          status.className = 'form-status success';
          form.reset();
        } else {
          throw new Error('Request failed');
        }
      } catch (err) {
        status.textContent = 'Something went wrong. Please email me directly at hunterstokes@me.com.';
        status.className = 'form-status error';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // ===== Hero subtitle typewriter =====
  const typeTarget = document.getElementById('type-text');
  if (typeTarget && !reducedMotion) {
    const phrases = [
      'Where hardware meets software.',
      'Butcher. Sushi chef. Engineer.',
      'Precision in every system.',
      'Diagnose. Repair. Optimize.'
    ];
    let phraseIdx = 0;
    let charIdx = phrases[0].length;
    let deleting = false;

    function tick() {
      const phrase = phrases[phraseIdx];
      if (deleting) {
        charIdx--;
        if (charIdx === 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
        }
      } else {
        charIdx++;
        if (charIdx >= phrase.length) {
          charIdx = phrase.length;
          deleting = true;
          typeTarget.textContent = phrase;
          setTimeout(tick, 3200);
          return;
        }
      }
      typeTarget.textContent = (deleting ? phrase : phrases[phraseIdx]).slice(0, charIdx);
      setTimeout(tick, deleting ? 35 : 70);
    }
    setTimeout(tick, 3200);
  }

  // ===== Hero DNA helix canvas =====
  const canvas = document.getElementById('hero-canvas');
  if (canvas && !reducedMotion) {
    const ctx = canvas.getContext('2d');
    let width, height, dpr;
    let accent = '#4a9eff';
    let muted = '#8a8f9d';

    function readColors() {
      const styles = getComputedStyle(document.documentElement);
      accent = styles.getPropertyValue('--accent').trim() || accent;
      muted = styles.getPropertyValue('--text-muted').trim() || muted;
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    readColors();
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('themechange', readColors);

    const BASE_PAIRS = 26;
    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, width, height);

      const cy = height * 0.5;
      const amplitude = Math.min(height * 0.22, 130);
      const margin = width * 0.04;
      const span = width - margin * 2;

      for (let i = 0; i <= BASE_PAIRS; i++) {
        const x = margin + (span * i) / BASE_PAIRS;
        const phase = (i / BASE_PAIRS) * Math.PI * 4 + t;
        const y1 = cy + Math.sin(phase) * amplitude;
        const y2 = cy + Math.sin(phase + Math.PI) * amplitude;
        // Depth from the strand crossing: rungs flatten and dim at crossover
        const depth = Math.abs(Math.sin(phase));

        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.10 + depth * 0.16;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();

        ctx.globalAlpha = 0.25 + depth * 0.45;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(x, y1, 1.8 + depth * 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = muted;
        ctx.beginPath();
        ctx.arc(x, y2, 1.8 + depth * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      t += 0.008;
      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  }
});
