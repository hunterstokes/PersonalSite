# huntersb.com

Personal site for Hunter Brown — Field Service Engineer at Illumina.
Built with vanilla HTML, CSS, and JavaScript. No frameworks, no build step.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Homepage: hero, about, experience, projects, skills, now, contact |
| `game.html` | Field Defender — canvas arcade game (sound, difficulty modes, local leaderboard) |
| `builds.html` | PC build logs with spec tables |
| `resume.html` | HTML resume with print/save-PDF styling (self-contained styles) |
| `404.html` | Branded not-found page |

Shared assets: `style.css` (all pages except the resume), `script.js`
(theme, nav, reveals, spotlight, hero canvas, contact form), `game.js`
(the game), `fonts/` (self-hosted Inter + JetBrains Mono).

## Editing content

- **Experience / About / Skills** — edit the matching sections in `index.html`.
  Skills content mirrors `resume.html`; keep them in sync manually.
- **Now section** (`#now` in `index.html`) — meant to stay current; update the
  three cards and the "Updated" stamp freely.
- **PC builds** — replace the sample specs in `builds.html` with real parts and
  remove each card's `<span class="build-badge">` once updated.
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
3. **Disclosure**: the FTC requires the affiliate disclosure shown at the top
   of `builds.html` — keep it on any page with affiliate links. Links carry
   `rel="sponsored nofollow"` per Google's guidelines.

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
