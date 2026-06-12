# huntersb.com

Personal site for Hunter Brown — Field Service Engineer at Illumina.
Built with vanilla HTML, CSS, and JavaScript. No frameworks, no build step.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Homepage: hero, about, experience, projects, skills, now, contact |
| `game.html` | Field Defender — canvas arcade game (sound, difficulty modes, local leaderboard) |
| `builds.html` | PC build logs with spec tables |
| `guide.html` | Interactive PC configurator (`guide.js` holds the parts catalog, presets, and prices) |
| `resume.html` | HTML resume with print/save-PDF styling (self-contained styles) |
| `404.html` | Branded not-found page |

Shared assets: `style.css` (all pages except the resume), `script.js`
(theme, nav, reveals, spotlight, hero canvas, contact form), `game.js`
(the game), `build3d.js` (the scroll-driven 3D chip build on the homepage),
`fonts/` (self-hosted Inter + JetBrains Mono), `vendor/` (self-hosted
three.js module + license).

### The animations

**Homepage circuit intro** (`intro2d.js`, loaded on demand by
`intro-boot.js`): once per browser session, circuit traces race in from
the screen edges and converge on a ring around the spot where the name
lands, a pulse fires, and the site cross-fades in. Plain 2D canvas — the
homepage never downloads three.js. The head script in `index.html` hides
the site before first paint (with a failsafe timeout); Skip button and
Escape end it early, and the "Replay intro" control in the footer clears
the session flag. Never plays under `prefers-reduced-motion`.

**PC build viewer** (`tower3d.js` on `builds.html`, lazy-loaded by
`tower-boot.js` when scrolled into view): plays the full ~5-second build
of the rig — traces grow into the true-scale ATX board, parts fly in and
dock, the board tilts upright into a glass-paneled tower — flying the
shared camera path, then settles into a frontal drag-to-orbit view with
a "Rebuild" control. `pcscene.js` is the single source of truth for the
3D model (`createPC`, `update(p, time, spin)`, `cameraPose`). Under
reduced motion the finished rig renders statically; without WebGL the
fallback text stays.

Visits that never load the animation code get the 2D hero canvas from
`script.js` — don't remove the 2D code path.

### CI

`.github/workflows/ci.yml` syntax-checks all JS and runs
`test/smoke.mjs` (Playwright) on every PR: the intro lifecycle and
teardown, both skip paths, reduced-motion bypass, the builds-page
viewer, and console-error-free loads of every page. Run it locally with
`npm i --no-save playwright && node test/smoke.mjs`.

### Resume PDF

`resume.pdf` is generated from `resume.html`'s print styles (headless
Chrome → Letter, 0.5in margins). Regenerate it after editing the resume
so the download link stays in sync.

## Editing content

- **Experience / About / Skills** — edit the matching sections in `index.html`.
  Skills content mirrors `resume.html`; keep them in sync manually.
- **Now section** (`#now` in `index.html`) — meant to stay current; update the
  three cards and the "Updated" stamp freely.
- **PC builds** — replace the sample specs in `builds.html` with real parts and
  remove each card's `<span class="build-badge">` once updated.
- **Build guide** — parts, prices, presets, and compatibility data all live in
  the `CATALOG` and `PRESETS` objects at the top of `guide.js`. When you
  refresh prices, also bump the `PRICES_REVIEWED` constant (it's displayed on
  the page). Compatibility fields: `platform` (CPU ↔ motherboard), `form` /
  `forms` (motherboard ↔ case), `radiator` / `radiators` (cooler ↔ case),
  `psuForm` / `form` (case ↔ PSU), and `watts` (drives the PSU sizing math).
  Builds are shareable — the current selection is encoded in the URL hash.
- **Contact form** — replace `YOUR_FORM_ID` in the form `action` in
  `index.html` with a [Formspree](https://formspree.io) form ID. Until then,
  submissions open the visitor's email app instead (graceful fallback).
- **Analytics** — optional. Create a free [GoatCounter](https://www.goatcounter.com)
  account, then uncomment the snippet in the `<head>` of `index.html`,
  `game.html`, and `builds.html` and set your site code.

## Monetization (PC builds affiliate links)

Every spec row on `builds.html` gets automatic "Amazon · Newegg" search links,
generated at page load from the part name in `script.js` — so updating a part
name updates its links too.

1. **Amazon**: join [Amazon Associates](https://affiliate-program.amazon.com),
   then set your tracking ID in the `AMAZON_AFFILIATE_TAG` constant at the top
   of the build-links block in `script.js` (e.g. `'huntersb-20'`). Every Amazon
   link is then credited to you.
2. **Newegg**: their affiliate program runs through CJ/Rakuten. Once enrolled,
   replace the plain Newegg search URL in the same block with your deep-link
   prefix.
3. **Direct product links**: once enrolled, add an `asin` field to any part in
   the guide's `CATALOG` (e.g. `asin: 'B0BTZB7F88'`) and its Amazon link
   becomes a direct product link, which converts better than search results.
4. **Click analytics**: when GoatCounter is enabled, shop-link clicks, preset
   choices, wizard runs, and copy/share actions are counted as events
   (`shop-amazon-…`, `preset-…`, etc.) — cookieless, no extra setup.
5. **Disclosure**: the FTC requires the affiliate disclosure shown at the top
   of `builds.html` and `guide.html` — keep it on any page with affiliate
   links. Links carry `rel="sponsored nofollow"` per Google's guidelines.

## Theming

Dark is the default; light theme overrides live on
`:root[data-theme="light"]` in `style.css`. The toggle persists to
`localStorage` and falls back to the system preference. An inline script in
each page's `<head>` applies the theme before first paint to avoid flashes.

## Local development

No tooling required:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

(Serving over HTTP matters for the font preloads; opening `index.html`
directly also works for everything else.)

## Deployment

`.github/workflows/deploy-pages.yml` deploys the repo to GitHub Pages on
every push to `main`. One-time setup: **Settings → Pages → Source: GitHub
Actions**, and add the custom domain there if serving at huntersb.com.

## Accessibility notes (please preserve)

- Skip-to-content links, `main` landmarks, labeled nav, and visible
  `:focus-visible` outlines on every page
- All motion (hero canvas, reveals, spotlight, game screen-shake) respects
  `prefers-reduced-motion`
- The game's touch controls and mute toggle carry ARIA labels/state; the
  difficulty picker uses real radio inputs
- Form fields keep explicit `<label>`s and the status line is a live region
