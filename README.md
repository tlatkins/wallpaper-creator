# Wallpaper Creator

A static, client-side wallpaper generator. Pick a primary color and a
pattern style, and it generates a unique gradient, wave, or texture
wallpaper you can download at full resolution for your phone, tablet,
or desktop.

No build step, no dependencies — just HTML, CSS, and vanilla JavaScript
rendered to a `<canvas>`.

## Features

- **Primary color** — enter a hex code or pick with the color swatch.
- **Styles** — Gradient, Waves, Texture, or Mixed (all combined).
- **Color scheme** — Random, Complementary, Monochromatic, Analogous,
  Triadic, or Tetradic, all derived from your primary color.
- **Rotation** — drag the dial or type degrees (0–360) to rotate the
  pattern.
- **Randomize** — reseed for a new variation while keeping your color,
  style, and scheme. The seed is shown so a result can be reproduced.
- **Sizes** — Phone (1290×2796, iPhone), Tablet (2732×2048, iPad),
  Desktop (5120×2880, Mac), or Square (2732×2732) — all rendered at
  full resolution on download.

## Running locally

Open `index.html` directly in a browser, or serve the folder statically:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", set **Source** to **Deploy from a
   branch**, branch `main`, folder `/ (root)`, then **Save**.
4. GitHub publishes the site at `https://<username>.github.io/<repo>/`.
