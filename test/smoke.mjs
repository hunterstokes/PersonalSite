// Site smoke test — runs in CI on every PR (and locally via `node test/smoke.mjs`).
// Serves the repo with a tiny static server, then drives headless Chromium
// (SwiftShader WebGL) through the flows that have broken before:
// the intro lifecycle, its skip paths, the builds-page 3D viewer, and
// console-error-free loads of every page.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 8911;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml',
  '.pdf': 'application/pdf', '.txt': 'text/plain', '.json': 'application/json'
};

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, '');
  const file = join(ROOT, path === '' ? 'index.html' : path);
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((resolve) => server.listen(PORT, resolve));

const failures = [];
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures.push(name);
};

// SMOKE_CHROMIUM overrides the browser binary (for sandboxes with a
// preinstalled Chromium); CI omits it and uses Playwright's own install.
const browser = await chromium.launch({
  executablePath: process.env.SMOKE_CHROMIUM || undefined,
  args: ['--enable-unsafe-swiftshader']
});

function watchErrors(page, errors, label) {
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${label} console: ${m.text().slice(0, 160)}`);
  });
}

// ===== 1. Intro lifecycle on a fresh session =====
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors, 'intro');
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.waitForTimeout(1200);
  check('intro: content hidden while playing',
    await page.evaluate(() => getComputedStyle(document.querySelector('main')).opacity === '0'));
  check('intro: 3D canvas rendering',
    await page.evaluate(() => !!document.querySelector('#build-scene canvas')));
  check('intro: skip button present',
    await page.evaluate(() => !!document.querySelector('.intro-skip')));
  await page.waitForTimeout(8000); // intro (5.6s) + fades + cleanup
  check('intro: scene fully torn down',
    await page.evaluate(() => !document.getElementById('build-scene') && !document.querySelector('.intro-skip')));
  check('intro: site content visible after',
    await page.evaluate(() => getComputedStyle(document.querySelector('main')).opacity === '1'));
  check('intro: 2D hero canvas restored',
    await page.evaluate(() => document.getElementById('hero-canvas')?.style.display === ''));

  // same session reload skips the intro and never loads three.js
  await page.reload();
  await page.waitForTimeout(1200);
  check('reload: intro skipped',
    await page.evaluate(() => !document.querySelector('.intro-skip') && getComputedStyle(document.querySelector('main')).opacity === '1'));
  check('reload: three.js not downloaded',
    await page.evaluate(() => performance.getEntriesByType('resource').every((r) => !r.name.includes('three.module'))));
  check('intro: no JS errors', errors.length === 0);
  if (errors.length) console.log('  ' + errors.join('\n  '));
  await ctx.close();
}

// ===== 2. Escape skips the intro =====
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors, 'esc');
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  check('esc: skip works',
    await page.evaluate(() => !document.getElementById('build-scene') && getComputedStyle(document.querySelector('main')).opacity === '1'));
  check('esc: no JS errors', errors.length === 0);
  await ctx.close();
}

// ===== 3. Reduced motion shows the site immediately =====
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors, 'reduced-motion');
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.waitForTimeout(1200);
  check('reduced-motion: no intro, site visible',
    await page.evaluate(() => !document.querySelector('#build-scene canvas') && getComputedStyle(document.querySelector('main')).opacity === '1'));
  check('reduced-motion: no JS errors', errors.length === 0);
  await ctx.close();
}

// ===== 4. Builds page 3D viewer =====
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors, 'builds');
  await page.goto(`http://localhost:${PORT}/builds.html`);
  await page.evaluate(() => document.getElementById('tower-viewer').scrollIntoView());
  await page.waitForSelector('#tower-viewer canvas', { timeout: 15000 }).catch(() => {});
  check('builds: tower viewer canvas appears',
    await page.evaluate(() => !!document.querySelector('#tower-viewer canvas')));
  const box = await page.locator('#tower-viewer').boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }
  check('builds: drag does not error', errors.length === 0);
  if (errors.length) console.log('  ' + errors.join('\n  '));
  await ctx.close();
}

// ===== 5. Every page loads without console errors =====
for (const path of ['guide.html', 'game.html', 'resume.html', '404.html']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors, path);
  await page.goto(`http://localhost:${PORT}/${path}`);
  await page.waitForTimeout(1000);
  check(`${path}: loads without JS errors`, errors.length === 0);
  if (errors.length) console.log('  ' + errors.join('\n  '));
  await ctx.close();
}

await browser.close();
server.close();

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
