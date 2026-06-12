// Intro loader — decides whether the 3D build intro will play BEFORE
// downloading three.js (~750KB of vendor modules). Repeat loads in the
// same session, reduced-motion visitors, and no-WebGL browsers never pay
// for the 3D code at all; they get the site (and the 2D hero canvas)
// immediately. build3d.js re-checks everything as a second line of defense.
(() => {
  const html = document.documentElement;
  const show = () => html.classList.remove('intro-pending', 'intro-fading');

  let play = false;
  try { play = !sessionStorage.getItem('hb-intro-played'); } catch { /* storage blocked */ }
  if (play && matchMedia('(prefers-reduced-motion: reduce)').matches) play = false;
  if (play && !document.getElementById('build-scene')) play = false;
  if (play) {
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) play = false;
  }

  if (!play) {
    show();
    return;
  }
  import('./build3d.js').catch(show);
})();
