'use strict';

/* ----------------------------- Formats ----------------------------- */

const FORMATS = {
  phone:   { w: 1290, h: 2796, label: 'Phone (iPhone)' },
  tablet:  { w: 2732, h: 2048, label: 'Tablet (iPad)' },
  desktop: { w: 5120, h: 2880, label: 'Desktop (Mac)' },
  square:  { w: 2732, h: 2732, label: 'Square' },
};

const PREVIEW_MAX = 820;

/* ------------------------------ State ------------------------------- */

const state = {
  hex: '#3B82F6',
  style: 'gradient',
  colorScheme: 'random',
  angle: 0,
  format: 'phone',
  seed: randomSeed(),
};

/* --------------------------- Random helpers -------------------------- */

function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff);
}

// Deterministic PRNG (mulberry32) so a seed reproduces the same result.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

/* ---------------------------- Color helpers --------------------------- */

function hexToRgb(hex) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex(r, g, b) {
  const c = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function isValidHex(hex) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex); }

// Color-harmony schemes, expressed as hue offsets from the primary color
// plus how often each offset should be used (the primary hue dominates,
// the others act as accents).
const COLOR_SCHEMES = {
  complementary:  { anchors: [0, 180], weights: [0.65, 0.35] },
  monochromatic:  { anchors: [0], weights: [1] },
  analogous:      { anchors: [0, 30, -30], weights: [0.5, 0.25, 0.25] },
  triadic:        { anchors: [0, 120, 240], weights: [0.5, 0.25, 0.25] },
  tetradic:       { anchors: [0, 90, 180, 270], weights: [0.4, 0.2, 0.2, 0.2] },
};

const COLOR_SCHEME_NAMES = Object.keys(COLOR_SCHEMES);

function pickWeighted(rng, items, weights) {
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Build a small family of colors derived from the primary hex using the
// chosen color-harmony scheme, so accents stay complementary/triadic/etc.
// rather than arbitrary nearby hues. schemeName 'random' picks one per call.
function makePalette(hex, rng, count = 6, schemeName = 'random') {
  const base = hexToHsl(hex);
  const name = schemeName === 'random'
    ? COLOR_SCHEME_NAMES[Math.floor(rng() * COLOR_SCHEME_NAMES.length)]
    : schemeName;
  const scheme = COLOR_SCHEMES[name] || COLOR_SCHEMES.complementary;
  const colors = [];
  for (let i = 0; i < count; i++) {
    const anchor = pickWeighted(rng, scheme.anchors, scheme.weights);
    const jitter = (rng() * 2 - 1) * (name === 'monochromatic' ? 4 : 10);
    const h = base.h + anchor + jitter;
    const s = clamp(base.s * (0.6 + rng() * 0.5), 18, 100);
    const l = clamp(12 + rng() * 76, 8, 92);
    colors.push(hslToHex(h, s, l));
  }
  colors[Math.floor(rng() * count)] = hex; // anchor the exact primary color
  return colors;
}

function sampleGradientColor(stops, t) {
  t = clamp(t, 0, 1);
  const n = stops.length;
  const pos = t * (n - 1);
  const i = clamp(Math.floor(pos), 0, n - 2);
  const localT = pos - i;
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  return {
    r: lerp(a.r, b.r, localT),
    g: lerp(a.g, b.g, localT),
    b: lerp(a.b, b.b, localT),
  };
}

/* ----------------------------- Value noise ---------------------------- */

function buildNoiseGrid(size, rng) {
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();
  return grid;
}

function sampleGrid(grid, size, x, y) {
  const gx = ((x % size) + size) % size;
  const gy = ((y % size) + size) % size;
  return grid[gy * size + gx];
}

function bilinear(grid, size, fx, fy) {
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const v00 = sampleGrid(grid, size, x0, y0);
  const v10 = sampleGrid(grid, size, x0 + 1, y0);
  const v01 = sampleGrid(grid, size, x0, y0 + 1);
  const v11 = sampleGrid(grid, size, x0 + 1, y0 + 1);
  const a = lerp(v00, v10, tx);
  const b = lerp(v01, v11, tx);
  return lerp(a, b, ty);
}

// Fractal value noise, normalized to 0..1.
function makeFractalNoiseSampler(rng, octaveGridSizes = [4, 8, 16, 32]) {
  const octaves = octaveGridSizes.map((size) => ({ size, grid: buildNoiseGrid(size, rng) }));
  const amplitudes = octaves.map((_, i) => 1 / Math.pow(2, i));
  const ampSum = amplitudes.reduce((a, b) => a + b, 0);
  return function (u, v) {
    let total = 0;
    for (let i = 0; i < octaves.length; i++) {
      const { size, grid } = octaves[i];
      total += bilinear(grid, size, u * size, v * size) * amplitudes[i];
    }
    return total / ampSum;
  };
}

/* ------------------------------ Rendering ------------------------------ */

function withRotation(ctx, w, h, angleDeg, drawFn) {
  const diag = Math.hypot(w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((angleDeg * Math.PI) / 180);
  drawFn(diag);
  ctx.restore();
}

function drawBackgroundFill(ctx, w, h, palette) {
  const { r, g, b } = hexToRgb(palette[0]);
  ctx.fillStyle = rgbToHex(r, g, b);
  ctx.fillRect(0, 0, w, h);
}

function drawGradientStyle(ctx, w, h, palette, angle, rng) {
  withRotation(ctx, w, h, angle, (diag) => {
    const half = diag / 2;
    const grad = ctx.createLinearGradient(-half, -half, half, half);
    const stopCount = 4 + Math.floor(rng() * 3);
    const positions = [0, ...Array.from({ length: stopCount - 2 }, () => rng()), 1].sort((a, b) => a - b);
    positions.forEach((p, i) => {
      const color = palette[i % palette.length];
      grad.addColorStop(p, color);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(-half, -half, diag, diag);

    // Soft radial highlight for extra depth / uniqueness per seed.
    const hx = (rng() * 2 - 1) * half * 0.6;
    const hy = (rng() * 2 - 1) * half * 0.6;
    const hr = diag * (0.25 + rng() * 0.3);
    const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
    const glowColor = palette[Math.floor(rng() * palette.length)];
    glow.addColorStop(0, hexToRgba(glowColor, 0.35));
    glow.addColorStop(1, hexToRgba(glowColor, 0));
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = glow;
    ctx.fillRect(-half, -half, diag, diag);
    ctx.globalCompositeOperation = 'source-over';
  });
}

function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
}

function drawWavesStyle(ctx, w, h, palette, angle, rng) {
  drawBackgroundFill(ctx, w, h, palette);
  withRotation(ctx, w, h, angle, (diag) => {
    const half = diag / 2;
    const layers = 5 + Math.floor(rng() * 4);
    const steps = 80;
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const baseline = lerp(-half * 0.7, half * 0.9, t) + (rng() * 2 - 1) * diag * 0.03;
      const amplitude = diag * (0.02 + rng() * 0.06);
      const frequency = (0.8 + rng() * 2.2) / diag;
      const phase = rng() * Math.PI * 2;
      const color = palette[i % palette.length];
      const alpha = 0.35 + rng() * 0.4;

      ctx.beginPath();
      ctx.moveTo(-half, baseline + Math.sin(phase) * amplitude);
      for (let s = 0; s <= steps; s++) {
        const x = lerp(-half, half, s / steps);
        const y = baseline + Math.sin(x * frequency * Math.PI * 2 + phase) * amplitude;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(half, half);
      ctx.lineTo(-half, half);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(color, alpha);
      ctx.fill();
    }
  });
}

function drawTextureStyle(ctx, w, h, palette, angle, rng) {
  const tileSize = 384;
  const noise = makeFractalNoiseSampler(rng);
  const imageData = new ImageData(tileSize, tileSize);
  const data = imageData.data;
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const n = noise(x / tileSize, y / tileSize);
      const { r, g, b } = sampleGradientColor(palette, n);
      const idx = (y * tileSize + x) * 4;
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
    }
  }

  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = tileSize; tileCanvas.height = tileSize;
  tileCanvas.getContext('2d').putImageData(imageData, 0, 0);

  withRotation(ctx, w, h, angle, (diag) => {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tileCanvas, -diag / 2, -diag / 2, diag, diag);
  });
}

function drawMixedStyle(ctx, w, h, palette, angle, rng) {
  drawGradientStyle(ctx, w, h, palette, angle, rng);

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.globalCompositeOperation = 'overlay';
  drawTextureStyle(ctx, w, h, palette, angle + 15, rng);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.55;
  withRotation(ctx, w, h, angle, (diag) => {
    const half = diag / 2;
    const layers = 3 + Math.floor(rng() * 3);
    const steps = 80;
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const baseline = lerp(-half * 0.3, half * 0.95, t) + (rng() * 2 - 1) * diag * 0.03;
      const amplitude = diag * (0.02 + rng() * 0.05);
      const frequency = (0.8 + rng() * 2) / diag;
      const phase = rng() * Math.PI * 2;
      const color = palette[(i + 2) % palette.length];

      ctx.beginPath();
      ctx.moveTo(-half, baseline);
      for (let s = 0; s <= steps; s++) {
        const x = lerp(-half, half, s / steps);
        const y = baseline + Math.sin(x * frequency * Math.PI * 2 + phase) * amplitude;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(half, half);
      ctx.lineTo(-half, half);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(color, 0.3);
      ctx.fill();
    }
  });
  ctx.restore();
}

function renderWallpaper(ctx, w, h, s) {
  ctx.clearRect(0, 0, w, h);
  const rng = mulberry32(s.seed);
  const palette = makePalette(s.hex, rng, 6, s.colorScheme);
  switch (s.style) {
    case 'gradient': drawGradientStyle(ctx, w, h, palette, s.angle, rng); break;
    case 'waves': drawWavesStyle(ctx, w, h, palette, s.angle, rng); break;
    case 'texture': drawTextureStyle(ctx, w, h, palette, s.angle, rng); break;
    case 'mixed': drawMixedStyle(ctx, w, h, palette, s.angle, rng); break;
    default: drawGradientStyle(ctx, w, h, palette, s.angle, rng);
  }
}

/* -------------------------------- UI ---------------------------------- */

const colorPicker = document.getElementById('colorPicker');
const hexInput = document.getElementById('hexInput');
const styleOptions = document.getElementById('styleOptions');
const schemeSelect = document.getElementById('schemeSelect');
const dial = document.getElementById('dial');
const dialNeedle = document.getElementById('dialNeedle');
const degreesInput = document.getElementById('degreesInput');
const formatSelect = document.getElementById('formatSelect');
const randomizeBtn = document.getElementById('randomizeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const seedValue = document.getElementById('seedValue');
const previewCanvas = document.getElementById('previewCanvas');
const previewCaption = document.getElementById('previewCaption');
const renderCanvas = document.getElementById('renderCanvas');

let renderScheduled = false;
function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    renderPreview();
  });
}

function renderPreview() {
  const fmt = FORMATS[state.format];
  const scale = Math.min(PREVIEW_MAX / Math.max(fmt.w, fmt.h), 1);
  const pw = Math.round(fmt.w * scale);
  const ph = Math.round(fmt.h * scale);
  if (previewCanvas.width !== pw || previewCanvas.height !== ph) {
    previewCanvas.width = pw;
    previewCanvas.height = ph;
  }
  const ctx = previewCanvas.getContext('2d');
  renderWallpaper(ctx, pw, ph, state);
  previewCaption.textContent = `${fmt.label} — ${fmt.w} × ${fmt.h}px`;
  seedValue.textContent = state.seed;
}

function updateNeedle() {
  dialNeedle.setAttribute('transform', `rotate(${state.angle} 60 60)`);
  dial.setAttribute('aria-valuenow', String(state.angle));
}

function setAngle(deg) {
  deg = ((Math.round(deg) % 360) + 360) % 360;
  state.angle = deg;
  degreesInput.value = String(deg);
  updateNeedle();
  scheduleRender();
}

/* Color inputs */
colorPicker.addEventListener('input', () => {
  hexInput.value = colorPicker.value.toUpperCase();
  state.hex = colorPicker.value;
  scheduleRender();
});

hexInput.addEventListener('input', () => {
  let v = hexInput.value.trim();
  if (v && v[0] !== '#') v = '#' + v;
  hexInput.value = v;
  if (isValidHex(v)) {
    state.hex = v;
    colorPicker.value = v.length === 4
      ? '#' + [...v.slice(1)].map((c) => c + c).join('')
      : v;
    scheduleRender();
  }
});

/* Style buttons */
styleOptions.addEventListener('click', (e) => {
  const btn = e.target.closest('.style-btn');
  if (!btn) return;
  styleOptions.querySelectorAll('.style-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  state.style = btn.dataset.style;
  scheduleRender();
});

/* Color scheme */
schemeSelect.addEventListener('change', () => {
  state.colorScheme = schemeSelect.value;
  scheduleRender();
});

/* Dial */
function angleFromPointer(clientX, clientY) {
  const rect = dial.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const rad = Math.atan2(dx, -dy); // 0 at top, clockwise positive
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

let dragging = false;
dial.addEventListener('pointerdown', (e) => {
  dragging = true;
  dial.setPointerCapture(e.pointerId);
  setAngle(angleFromPointer(e.clientX, e.clientY));
});
dial.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  setAngle(angleFromPointer(e.clientX, e.clientY));
});
dial.addEventListener('pointerup', (e) => {
  dragging = false;
  dial.releasePointerCapture(e.pointerId);
});
dial.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setAngle(state.angle + 5); e.preventDefault(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setAngle(state.angle - 5); e.preventDefault(); }
});

degreesInput.addEventListener('input', () => {
  const v = Number(degreesInput.value);
  if (!Number.isNaN(v)) setAngle(clamp(v, 0, 360));
});

/* Format */
formatSelect.addEventListener('change', () => {
  state.format = formatSelect.value;
  scheduleRender();
});

/* Randomize */
randomizeBtn.addEventListener('click', () => {
  state.seed = randomSeed();
  scheduleRender();
});

/* Download */
downloadBtn.addEventListener('click', () => {
  const fmt = FORMATS[state.format];
  renderCanvas.width = fmt.w;
  renderCanvas.height = fmt.h;
  const ctx = renderCanvas.getContext('2d');
  renderWallpaper(ctx, fmt.w, fmt.h, state);
  renderCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallpaper-${state.style}-${state.format}-${state.seed}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
});

/* Initial paint */
updateNeedle();
renderPreview();
