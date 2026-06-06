// flowfield.js — Perlin-noise water layer for "Pond, Re-rendered".
// Core idea: a fractal-noise direction field warps the procedural painting,
// with two-tap flowmap blending so the looping motion has no visible seam.
// A second buffer holds the fading trails and the raindrop ripples.
//
// Comment convention: lines/blocks tagged "AI-assisted" mark code where AI(claude)
// helped (the performance pass — precomputed water mask + cos/sin lookup
// tables). Untagged code and comments are my own work.

const FLOW_NOISE_SCALE = 0.0035; // spatial frequency of the field; smaller = broader, calmer swirls
const FLOW_NOISE_LAYERS = 2;     // number of fBm octaves summed in flowValue()
const FLOW_SPEED = 0.0015;       // how fast the noise field drifts over time (z axis)
const WARP_RES = 560;            // resolution of the square warp buffer (later stretched to artBox)
const FLOW_FIELD_GRID = 48;      // direction-grid resolution: one angle per cell, not per pixel
const FLOW_AMP = 16;             // max pixel displacement of the warp
const FLOW_SCROLL = 0.012;       // base scroll speed of the displacement phase
const FLOW_DROP_CHANCE = 0.16;   // base chance of spawning a raindrop each frame
const FLOW_DROP_MAX = 12;        // cap on simultaneous raindrops
const FLOW_DROP_LIFE = 24;       // raindrop lifetime in frames
const FLOW_DROP_RADIUS = 12;     // max ring radius a raindrop expands to
const FLOW_TRAIL_FADE = 18;      // alpha erased from the trail layer per frame (higher = shorter trails)
const FLOW_SPEED_BOOST = 2.0;    // how much audio level accelerates the scroll

let flowWater;     // warp buffer (WARP_RES x WARP_RES)
let flowLayer;     // overlay buffer for trails + raindrops (full art size)
let flowZ = 0;     // time axis fed into the noise field
let flowPhase = 0; // accumulating displacement phase
let flowDrops = []; // active raindrops
let audioLevel = 0; // 0..1 audio reactivity, drives scroll speed + drop rate

// AI-assisted: store the direction grid as cos/sin instead of raw angles,
// so the per-pixel loop never has to call Math.cos / Math.sin.
let cosGrid = null;
let sinGrid = null;

// AI-assisted: precomputed static water field. The painting never changes, so
// which pixels are water (and their grid mapping) is worked out once, not per frame.
let waterIdx = null; // dst byte offset of each water pixel
let waterGi = null;  // direction-grid index of each water pixel
let waterPX = null;  // sample x of each water pixel
let waterPY = null;  // sample y of each water pixel
let waterCount = 0;

function setupPerlinLayer() {
  // Two buffers: flowLayer is the full-size overlay for trails/drops; flowWater
  // is the lower-res square buffer the warped water is rendered into.
  flowLayer = createGraphics(ART_W, ART_H);
  flowLayer.pixelDensity(1);

  flowWater = createGraphics(WARP_RES, WARP_RES);
  flowWater.pixelDensity(1);
  flowWater.loadPixels(); // load once; we write the pixels[] array directly every frame
}

// AI-assisted: call after regenerating paintingLayer or resizing the canvas so
// the precomputed water field is rebuilt on the next frame.
function invalidateWaterField() {
  waterIdx = null;
}

function drawPerlinLayer(artBox) {
  updateFlowLayer();

  // When the scene is stilled or input ripples are active, skip the flowing
  // water and show only the overlay (input.js owns ripple rendering then).
  if (!inputCtrl || inputCtrl.isStilled || inputCtrl.ripples.length > 0) {
    image(flowLayer, artBox.x, artBox.y, artBox.w, artBox.h);
    return false;
  }

  // Warped water first, then the trail/drop overlay composited on top.
  renderFlowingWater();
  image(flowWater, artBox.x, artBox.y, artBox.w, artBox.h);
  image(flowLayer, artBox.x, artBox.y, artBox.w, artBox.h);
  return true;
}

// AI-assisted: runs once. Builds the static water mask, and for every non-water
// pixel writes its fixed colour straight into the warp buffer (those pixels are
// never touched again). Water pixels are flattened into typed arrays so the
// per-frame loop only ever visits them.
function precomputeWaterField() {
  if (!paintingLayer || !paintingLayer.pixels || paintingLayer.pixels.length === 0) {
    return; // painting not ready yet — retry next frame
  }

  const sx = ART_W / WARP_RES;
  const sy = ART_H / WARP_RES;
  const src = paintingLayer.pixels;
  const dst = flowWater.pixels;
  const gridSize = FLOW_FIELD_GRID;

  const idx = [];
  const gi = [];
  const pxs = [];
  const pys = [];

  for (let by = 0; by < WARP_RES; by++) {
    const py = by * sy;
    const oy = py < ART_H ? py | 0 : ART_H - 1;
    let gy = ((py / ART_H) * gridSize) | 0;
    gy = gy < 0 ? 0 : gy >= gridSize ? gridSize - 1 : gy;

    for (let bx = 0; bx < WARP_RES; bx++) {
      const px = bx * sx;
      const ox = px < ART_W ? px | 0 : ART_W - 1;
      const oi = 4 * (oy * ART_W + ox);
      const di = 4 * (by * WARP_RES + bx);

      const r = src[oi];
      const g = src[oi + 1];
      const b = src[oi + 2];

      if (!onWater(r, g, b)) {
        dst[di] = r;
        dst[di + 1] = g;
        dst[di + 2] = b;
        dst[di + 3] = 255;
        continue;
      }

      let gx = ((px / ART_W) * gridSize) | 0;
      gx = gx < 0 ? 0 : gx >= gridSize ? gridSize - 1 : gx;

      idx.push(di);
      gi.push(gy * gridSize + gx);
      pxs.push(px);
      pys.push(py);
      dst[di + 3] = 255; // alpha is constant for every pixel — set once, never in the hot loop
    }
  }

  waterCount = idx.length;
  waterIdx = Int32Array.from(idx);
  waterGi = Int32Array.from(gi);
  waterPX = Float32Array.from(pxs);
  waterPY = Float32Array.from(pys);
}

function renderFlowingWater() {
  // AI-assisted: lazy one-time build of the water field.
  if (waterIdx === null) {
    precomputeWaterField();
    if (waterIdx === null) return; // still not ready, skip this frame
  }

  flowZ += FLOW_SPEED;
  flowPhase += FLOW_SCROLL * (1 + audioLevel * FLOW_SPEED_BOOST); // audio speeds up the scroll

  buildFlowGrid();

  // Two-tap flowmap blend: sample the painting at two displacement phases half a
  // cycle apart and cross-fade between them. As phase0 wraps 1 -> 0 the two taps
  // line up, so the looping displacement has no visible jump.
  const phase0 = flowPhase - Math.floor(flowPhase);
  const phase1 = (phase0 + 0.5) % 1;
  const blend = Math.abs(1 - 2 * phase0);

  // AI-assisted: hoist FLOW_AMP * phase out of the loop (saves a multiply per pixel).
  const ampP0 = FLOW_AMP * phase0;
  const ampP1 = FLOW_AMP * phase1;

  const src = paintingLayer.pixels;
  const dst = flowWater.pixels;
  const W = ART_W;
  const H = ART_H;

  // AI-assisted: single pass over water pixels only; the flow direction comes
  // from the precomputed cos/sin grid, so there is no per-pixel trig or division.
  // The warp + blend inside is the original technique above.
  for (let k = 0; k < waterCount; k++) {
    const di = waterIdx[k];
    const gIndex = waterGi[k];
    const px = waterPX[k];
    const py = waterPY[k];
    const dx = cosGrid[gIndex];
    const dy = sinGrid[gIndex];

    // tap A: walk the sample point back along the flow by phase0
    let ax = (px - dx * ampP0) | 0;
    let ay = (py - dy * ampP0) | 0;
    ax = ax < 0 ? 0 : ax >= W ? W - 1 : ax;
    ay = ay < 0 ? 0 : ay >= H ? H - 1 : ay;
    const ai = 4 * (ay * W + ax);

    // tap B: same idea, half a cycle ahead
    let bx2 = (px - dx * ampP1) | 0;
    let by2 = (py - dy * ampP1) | 0;
    bx2 = bx2 < 0 ? 0 : bx2 >= W ? W - 1 : bx2;
    by2 = by2 < 0 ? 0 : by2 >= H ? H - 1 : by2;
    const bi = 4 * (by2 * W + bx2);

    // cross-fade the two taps into the output pixel
    dst[di] = src[ai] + (src[bi] - src[ai]) * blend;
    dst[di + 1] = src[ai + 1] + (src[bi + 1] - src[ai + 1]) * blend;
    dst[di + 2] = src[ai + 2] + (src[bi + 2] - src[ai + 2]) * blend;
  }

  flowWater.updatePixels();
}

function buildFlowGrid() {
  // Coarse 48x48 direction grid: one flow angle per cell sampled from the noise
  // field, rebuilt each frame so the field animates. Sampling per cell rather
  // than per pixel is what keeps the warp cheap enough to run every frame.
  const gridSize = FLOW_FIELD_GRID;
  const n = gridSize * gridSize;
  if (!cosGrid) {
    cosGrid = new Float32Array(n);
    sinGrid = new Float32Array(n);
  }

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const x = ((gx + 0.5) / gridSize) * ART_W;
      const y = ((gy + 0.5) / gridSize) * ART_H;
      const a = flowValue(x, y) * TWO_PI * 2; // map noise 0..1 onto two full turns
      const i = gy * gridSize + gx;
      // AI-assisted: store cos/sin per cell so the pixel loop does only lookups.
      cosGrid[i] = Math.cos(a);
      sinGrid[i] = Math.sin(a);
    }
  }
}

function updateFlowLayer() {
  if (typeof audioState !== "undefined") {
    const lvl = audioState.smoothedLevel;
    // AI-assisted: guard against NaN/undefined so a bad audio frame can't poison flowPhase.
    audioLevel = Number.isFinite(lvl) ? lvl : 0;
  } else {
    audioLevel = constrain(map(mouseY, height, 0, 0, 1), 0, 1); // mouse fallback when no audio
  }

  // Fade the trail layer by erasing a little alpha each frame: "destination-out"
  // subtracts opacity instead of painting black, so old trails dissolve cleanly.
  flowLayer.push();
  flowLayer.drawingContext.globalCompositeOperation = "destination-out";
  flowLayer.noStroke();
  flowLayer.fill(0, 0, 0, FLOW_TRAIL_FADE);
  flowLayer.rect(0, 0, ART_W, ART_H);
  flowLayer.drawingContext.globalCompositeOperation = "source-over";
  flowLayer.pop();

  if (inputCtrl && inputCtrl.isStilled) {
    return; // hold off spawning new drops while the scene is stilled
  }

  drawRaindrops(flowLayer);
}

function flowValue(x, y) {
  // Fractional Brownian motion: sum FLOW_NOISE_LAYERS octaves of Perlin noise,
  // each at half the amplitude and double the frequency, then normalise to 0..1.
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;

  for (let i = 0; i < FLOW_NOISE_LAYERS; i++) {
    sum += amp * noise(x * FLOW_NOISE_SCALE * freq, y * FLOW_NOISE_SCALE * freq, flowZ * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }

  return sum / norm;
}

function samplePainting(x, y) {
  // Read the RGB of the procedural painting at a clamped integer coordinate.
  const px = constrain(floor(x), 0, ART_W - 1);
  const py = constrain(floor(y), 0, ART_H - 1);
  const i = 4 * (py * ART_W + px);
  return [paintingLayer.pixels[i], paintingLayer.pixels[i + 1], paintingLayer.pixels[i + 2]];
}

function onWater(r, g, b) {
  // Colour heuristic: decide whether a pixel is open water or a lily/leaf, so
  // only water receives the flowing warp. Reject the warm, bright, and green
  // ranges that belong to the lilies; treat everything else as water.
  if (r > 150 && r >= b + 25) return false;               // warm highlights (pink/cream petals)
  if (r > 190 && g > 175) return false;                   // bright near-white blooms
  if (g > 125 && g >= b + 10 && g >= r - 20) return false; // green pads / foliage
  return true;
}

function pixelIsWater(x, y) {
  const [r, g, b] = samplePainting(x, y);
  return onWater(r, g, b);
}

function drawRaindrops(g) {
  // Spawn rate rises with audio level, capped at FLOW_DROP_MAX.
  const chance = FLOW_DROP_CHANCE * (0.3 + audioLevel * 1.2);
  if (flowDrops.length < FLOW_DROP_MAX && random() < chance) {
    // Try up to 8 random points to find one that lands on water.
    let x;
    let y;
    let tries = 0;
    do {
      x = random(ART_W);
      y = random(ART_H);
      tries++;
    } while (tries < 8 && !pixelIsWater(x, y));

    if (pixelIsWater(x, y)) {
      flowDrops.push({ x, y, age: 0 });
    }
  }

  // Draw and age each drop: an expanding ring that fades out over its lifetime.
  for (let i = flowDrops.length - 1; i >= 0; i--) {
    const drop = flowDrops[i];
    const t = drop.age / FLOW_DROP_LIFE; // 0..1 progress through its life
    const a = (1 - t) * 200;             // ring alpha fades as it ages

    g.push();
    g.noFill();
    g.stroke(255, 250, 235, a);
    g.strokeWeight(1.2);
    g.circle(drop.x, drop.y, FLOW_DROP_RADIUS * t * 2); // ring grows with age
    if (drop.age < 3) {
      // brief bright splash at the centre on impact
      g.noStroke();
      g.fill(255, 250, 235, 220 * (1 - drop.age / 3));
      g.circle(drop.x, drop.y, 2.6);
    }
    g.pop();

    drop.age++;
    if (drop.age > FLOW_DROP_LIFE) {
      flowDrops.splice(i, 1); // remove expired drops
    }
  }
}