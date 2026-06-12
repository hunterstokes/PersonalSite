// Viewer loader for builds.html — defers the ~750KB three.js download
// until the tower viewer actually scrolls into view, and skips it
// entirely on browsers without WebGL (the in-container fallback text
// stays in that case).
(() => {
  const el = document.getElementById('tower-viewer');
  if (!el) return;

  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;

  const load = () => import('./tower3d.js').catch(() => { /* fallback text stays */ });
  if (!('IntersectionObserver' in window)) {
    load();
    return;
  }
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      io.disconnect();
      load();
    }
  }, { rootMargin: '200px' });
  io.observe(el);
})();
