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
let angleGrid = null;
let flowDrops = [];
let audioLevel = 0;

function setupPerlinLayer() {
  flowLayer = createGraphics(ART_W, ART_H);
  flowLayer.pixelDensity(1);

  flowWater = createGraphics(WARP_RES, WARP_RES);
  flowWater.pixelDensity(1);
  flowWater.loadPixels();
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

function renderFlowingWater() {
  flowZ += FLOW_SPEED;
  flowPhase += FLOW_SCROLL * (1 + audioLevel * FLOW_SPEED_BOOST);

  buildAngleGrid();

  const phase0 = flowPhase - Math.floor(flowPhase);
  const phase1 = (phase0 + 0.5) % 1;
  const blend = Math.abs(1 - 2 * phase0);

  const sx = ART_W / WARP_RES;
  const sy = ART_H / WARP_RES;
  const src = paintingLayer.pixels;
  const dst = flowWater.pixels;

  for (let by = 0; by < WARP_RES; by++) {
    for (let bx = 0; bx < WARP_RES; bx++) {
      const px = bx * sx;
      const py = by * sy;

      const ox = px < ART_W ? px | 0 : ART_W - 1;
      const oy = py < ART_H ? py | 0 : ART_H - 1;
      const oi = 4 * (oy * ART_W + ox);
      const or_ = src[oi];
      const og = src[oi + 1];
      const ob = src[oi + 2];

      const di = 4 * (by * WARP_RES + bx);

      if (!onWater(or_, og, ob)) {
        dst[di] = or_;
        dst[di + 1] = og;
        dst[di + 2] = ob;
        dst[di + 3] = 255;
        continue;
      }

      const angle = sampleAngle(px, py);
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      let ax = (px - dx * FLOW_AMP * phase0) | 0;
      let ay = (py - dy * FLOW_AMP * phase0) | 0;
      ax = ax < 0 ? 0 : ax >= ART_W ? ART_W - 1 : ax;
      ay = ay < 0 ? 0 : ay >= ART_H ? ART_H - 1 : ay;
      const ai = 4 * (ay * ART_W + ax);

      let bx2 = (px - dx * FLOW_AMP * phase1) | 0;
      let by2 = (py - dy * FLOW_AMP * phase1) | 0;
      bx2 = bx2 < 0 ? 0 : bx2 >= ART_W ? ART_W - 1 : bx2;
      by2 = by2 < 0 ? 0 : by2 >= ART_H ? ART_H - 1 : by2;
      const bi = 4 * (by2 * ART_W + bx2);

      dst[di] = src[ai] + (src[bi] - src[ai]) * blend;
      dst[di + 1] = src[ai + 1] + (src[bi + 1] - src[ai + 1]) * blend;
      dst[di + 2] = src[ai + 2] + (src[bi + 2] - src[ai + 2]) * blend;
      dst[di + 3] = 255;
    }
  }

  flowWater.updatePixels();
}

function buildAngleGrid() {
  const gridSize = FLOW_FIELD_GRID;
  if (!angleGrid) {
    angleGrid = new Float32Array(gridSize * gridSize);
  }

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const x = ((gx + 0.5) / gridSize) * ART_W;
      const y = ((gy + 0.5) / gridSize) * ART_H;
      angleGrid[gy * gridSize + gx] = flowValue(x, y) * TWO_PI * 2;
    }
  }
}

function sampleAngle(px, py) {
  const gridSize = FLOW_FIELD_GRID;
  let gx = ((px / ART_W) * gridSize) | 0;
  let gy = ((py / ART_H) * gridSize) | 0;
  gx = gx < 0 ? 0 : gx >= gridSize ? gridSize - 1 : gx;
  gy = gy < 0 ? 0 : gy >= gridSize ? gridSize - 1 : gy;
  return angleGrid[gy * gridSize + gx];
}

function updateFlowLayer() {
  if (typeof audioState !== "undefined") {
    audioLevel = audioState.smoothedLevel;
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
