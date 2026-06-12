// Intro loader — decides whether the circuit intro will play before
// downloading any animation code. The intro is plain 2D canvas (no
// three.js), so the homepage never pays for the 3D vendor module at all;
// that loads only on builds.html for the PC build viewer. Repeat loads in
// the same session and reduced-motion visitors get the site immediately.
(() => {
  const html = document.documentElement;
  const show = () => html.classList.remove('intro-pending', 'intro-fading');

  let play = false;
  try { play = !sessionStorage.getItem('hb-intro-played'); } catch { /* storage blocked */ }
  if (play && matchMedia('(prefers-reduced-motion: reduce)').matches) play = false;
  if (play && !document.getElementById('build-scene')) play = false;

  if (!play) {
    show();
    return;
  }
  import('./intro2d.js').catch(show);
})();
