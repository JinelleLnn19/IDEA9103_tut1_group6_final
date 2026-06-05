const FLOW_NOISE_SCALE = 0.0035;
const FLOW_NOISE_LAYERS = 2;
const FLOW_SPEED = 0.0015;
const WARP_RES = 560;
const FLOW_FIELD_GRID = 48;
const FLOW_AMP = 16;
const FLOW_SCROLL = 0.012;
const FLOW_DROP_CHANCE = 0.16;
const FLOW_DROP_MAX = 12;
const FLOW_DROP_LIFE = 24;
const FLOW_DROP_RADIUS = 12;
const FLOW_TRAIL_FADE = 18;
const FLOW_SPEED_BOOST = 2.0;

let flowWater;
let flowLayer;
let flowZ = 0;
let flowPhase = 0;
let flowDrops = [];
let audioLevel = 0;

let cosGrid = null;
let sinGrid = null;

let waterIdx = null;
let waterGi = null;
let waterPX = null;
let waterPY = null;
let waterCount = 0;

function setupPerlinLayer() {
  flowLayer = createGraphics(ART_W, ART_H);
  flowLayer.pixelDensity(1);

  flowWater = createGraphics(WARP_RES, WARP_RES);
  flowWater.pixelDensity(1);
  flowWater.loadPixels();
}

function invalidateWaterField() {
  waterIdx = null;
}

function drawPerlinLayer(artBox) {
  updateFlowLayer();

  if (!inputCtrl || inputCtrl.isStilled || inputCtrl.ripples.length > 0) {
    image(flowLayer, artBox.x, artBox.y, artBox.w, artBox.h);
    return false;
  }

  renderFlowingWater();
  image(flowWater, artBox.x, artBox.y, artBox.w, artBox.h);
  image(flowLayer, artBox.x, artBox.y, artBox.w, artBox.h);
  return true;
}

function precomputeWaterField() {
  if (!paintingLayer || !paintingLayer.pixels || paintingLayer.pixels.length === 0) {
    return;
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
      dst[di + 3] = 255;
    }
  }

  waterCount = idx.length;
  waterIdx = Int32Array.from(idx);
  waterGi = Int32Array.from(gi);
  waterPX = Float32Array.from(pxs);
  waterPY = Float32Array.from(pys);
}

function renderFlowingWater() {
  if (waterIdx === null) {
    precomputeWaterField();
    if (waterIdx === null) return;
  }

  flowZ += FLOW_SPEED;
  flowPhase += FLOW_SCROLL * (1 + audioLevel * FLOW_SPEED_BOOST);

  buildFlowGrid();

  const phase0 = flowPhase - Math.floor(flowPhase);
  const phase1 = (phase0 + 0.5) % 1;
  const blend = Math.abs(1 - 2 * phase0);
  const ampP0 = FLOW_AMP * phase0;
  const ampP1 = FLOW_AMP * phase1;

  const src = paintingLayer.pixels;
  const dst = flowWater.pixels;
  const W = ART_W;
  const H = ART_H;

  for (let k = 0; k < waterCount; k++) {
    const di = waterIdx[k];
    const gIndex = waterGi[k];
    const px = waterPX[k];
    const py = waterPY[k];
    const dx = cosGrid[gIndex];
    const dy = sinGrid[gIndex];

    let ax = (px - dx * ampP0) | 0;
    let ay = (py - dy * ampP0) | 0;
    ax = ax < 0 ? 0 : ax >= W ? W - 1 : ax;
    ay = ay < 0 ? 0 : ay >= H ? H - 1 : ay;
    const ai = 4 * (ay * W + ax);

    let bx2 = (px - dx * ampP1) | 0;
    let by2 = (py - dy * ampP1) | 0;
    bx2 = bx2 < 0 ? 0 : bx2 >= W ? W - 1 : bx2;
    by2 = by2 < 0 ? 0 : by2 >= H ? H - 1 : by2;
    const bi = 4 * (by2 * W + bx2);

    dst[di] = src[ai] + (src[bi] - src[ai]) * blend;
    dst[di + 1] = src[ai + 1] + (src[bi + 1] - src[ai + 1]) * blend;
    dst[di + 2] = src[ai + 2] + (src[bi + 2] - src[ai + 2]) * blend;
  }

  flowWater.updatePixels();
}

function buildFlowGrid() {
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
      const a = flowValue(x, y) * TWO_PI * 2;
      const i = gy * gridSize + gx;
      cosGrid[i] = Math.cos(a);
      sinGrid[i] = Math.sin(a);
    }
  }
}

function updateFlowLayer() {
  if (typeof audioState !== "undefined") {
    const lvl = audioState.smoothedLevel;
    audioLevel = Number.isFinite(lvl) ? lvl : 0;
  } else {
    audioLevel = constrain(map(mouseY, height, 0, 0, 1), 0, 1);
  }

  flowLayer.push();
  flowLayer.drawingContext.globalCompositeOperation = "destination-out";
  flowLayer.noStroke();
  flowLayer.fill(0, 0, 0, FLOW_TRAIL_FADE);
  flowLayer.rect(0, 0, ART_W, ART_H);
  flowLayer.drawingContext.globalCompositeOperation = "source-over";
  flowLayer.pop();

  if (inputCtrl && inputCtrl.isStilled) {
    return;
  }

  drawRaindrops(flowLayer);
}

function flowValue(x, y) {
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
  const px = constrain(floor(x), 0, ART_W - 1);
  const py = constrain(floor(y), 0, ART_H - 1);
  const i = 4 * (py * ART_W + px);
  return [paintingLayer.pixels[i], paintingLayer.pixels[i + 1], paintingLayer.pixels[i + 2]];
}

function onWater(r, g, b) {
  if (r > 150 && r >= b + 25) return false;
  if (r > 190 && g > 175) return false;
  if (g > 125 && g >= b + 10 && g >= r - 20) return false;
  return true;
}

function pixelIsWater(x, y) {
  const [r, g, b] = samplePainting(x, y);
  return onWater(r, g, b);
}

function drawRaindrops(g) {
  const chance = FLOW_DROP_CHANCE * (0.3 + audioLevel * 1.2);
  if (flowDrops.length < FLOW_DROP_MAX && random() < chance) {
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

  for (let i = flowDrops.length - 1; i >= 0; i--) {
    const drop = flowDrops[i];
    const t = drop.age / FLOW_DROP_LIFE;
    const a = (1 - t) * 200;

    g.push();
    g.noFill();
    g.stroke(255, 250, 235, a);
    g.strokeWeight(1.2);
    g.circle(drop.x, drop.y, FLOW_DROP_RADIUS * t * 2);
    if (drop.age < 3) {
      g.noStroke();
      g.fill(255, 250, 235, 220 * (1 - drop.age / 3));
      g.circle(drop.x, drop.y, 2.6);
    }
    g.pop();

    drop.age++;
    if (drop.age > FLOW_DROP_LIFE) {
      flowDrops.splice(i, 1);
    }
  }
}