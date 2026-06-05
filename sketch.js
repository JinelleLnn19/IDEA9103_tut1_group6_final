const ART_W = 1000;
const ART_H = 1000;
const SEED = 1916;
const BRUSH_SCALE = 0.68;

let paintingLayer;
let interactiveBuffer;
let inputCtrl;
let floatingLilyPads = [];

function preload() {
  if (typeof preloadAudioMechanic === 'function') {
    preloadAudioMechanic();
  }
}

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  
  inputCtrl = new window.InputController();

  buildPainting();
  paintingLayer.loadPixels();
  createFloatingLilyPads();
  
  interactiveBuffer = createGraphics(ART_W, ART_H);
  interactiveBuffer.pixelDensity(1);

  if (typeof setupPerlinLayer === 'function') {
    setupPerlinLayer();
  }

  if (typeof setupAudioMechanic === 'function') {
    setupAudioMechanic();
  }
}

function draw() {
  background(24, 34, 42);

  const scaleFactor = max(width / ART_W, height / ART_H);
  const drawW = ART_W * scaleFactor;
  const drawH = ART_H * scaleFactor;
  const offsetX = (width - drawW) * 0.5;
  const offsetY = (height - drawH) * 0.5;

  inputCtrl.update();

  if (typeof updateAudioMechanic === 'function') {
    updateAudioMechanic();
  }

  const renderMouseX = (mouseX - offsetX) / scaleFactor;
  const renderMouseY = (mouseY - offsetY) / scaleFactor;
  const artBox = { x: offsetX, y: offsetY, w: drawW, h: drawH };
  let perlinLayerDrawn = false;

  if (inputCtrl.isStilled || inputCtrl.ripples.length === 0) {
    if (inputCtrl.isStilled) {
      image(paintingLayer, offsetX, offsetY, drawW, drawH);
      if (typeof drawPerlinLayer === 'function') {
        drawPerlinLayer(artBox);
      }
    } else if (typeof drawPerlinLayer === 'function') {
      perlinLayerDrawn = drawPerlinLayer(artBox);
    }

    if (!inputCtrl.isStilled && !perlinLayerDrawn) {
      image(paintingLayer, offsetX, offsetY, drawW, drawH);
    }
  } else {
    applyWaterRipplePhysics(renderMouseX, renderMouseY);
    image(interactiveBuffer, offsetX, offsetY, drawW, drawH);

    if (typeof drawPerlinLayer === 'function') {
      drawPerlinLayer(artBox);
    }
  }

  updateFloatingLilyPads();
  drawFloatingLilyPads(artBox);

  if (typeof drawTimeBasedMechanic === 'function') {
    drawTimeBasedMechanic(artBox);
  }

  if (typeof drawAudioLayer === 'function') {
    drawAudioLayer();
  }

  inputCtrl.displayRipples(interactiveBuffer, scaleFactor, offsetX, offsetY);
}


function applyWaterRipplePhysics(mx, my) {
  paintingLayer.loadPixels();
  interactiveBuffer.loadPixels();

  for (let y = 0; y < ART_H; y += 1) {
    for (let x = 0; x < ART_W; x += 1) {
      let xOffset = 0;
      let yOffset = 0;

      for (let r of inputCtrl.ripples) {
        let dx = x - r.x;
        let dy = y - r.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && Math.abs(dist - r.radius) < inputCtrl.triggerRadius) {
          let strength = sin((dist - r.radius) * 0.15) * (r.alpha / 255.0) * 8.0;
          xOffset += (dx / dist) * strength;
          yOffset += (dy / dist) * strength;
        }
      }

      let targetX = constrain(Math.floor(x + xOffset), 0, ART_W - 1);
      let targetY = constrain(Math.floor(y + yOffset), 0, ART_H - 1);

      let srcIdx = 4 * (targetY * ART_W + targetX);
      let destIdx = 4 * (y * ART_W + x);

      let rColor = paintingLayer.pixels[srcIdx];
      let gColor = paintingLayer.pixels[srcIdx + 1];
      let bColor = paintingLayer.pixels[srcIdx + 2];

      if (inputCtrl.currentPalette === 1) {
        rColor = constrain(rColor * 0.85 + 20, 0, 255);
        bColor = constrain(bColor * 1.1 + 15, 0, 255);
      } else if (inputCtrl.currentPalette === 3) {
        rColor = constrain(rColor * 1.2 + 25, 0, 255);
        gColor = constrain(gColor * 0.95 + 10, 0, 255);
        bColor = constrain(bColor * 0.75, 0, 255);
      }

      interactiveBuffer.pixels[destIdx] = rColor;
      interactiveBuffer.pixels[destIdx + 1] = gColor;
      interactiveBuffer.pixels[destIdx + 2] = bColor;
      interactiveBuffer.pixels[destIdx + 3] = paintingLayer.pixels[srcIdx + 3];
    }
  }
  interactiveBuffer.updatePixels();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mouseMoved() {
  if (!inputCtrl) return;
  const scaleFactor = max(width / ART_W, height / ART_H);
  const mx = (mouseX - (width - ART_W * scaleFactor) * 0.5) / scaleFactor;
  const my = (mouseY - (height - ART_H * scaleFactor) * 0.5) / scaleFactor;
  inputCtrl.handleMouseMoved(mx, my);
}

function mousePressed() {
  if (!inputCtrl) return;
  const scaleFactor = max(width / ART_W, height / ART_H);
  const mx = (mouseX - (width - ART_W * scaleFactor) * 0.5) / scaleFactor;
  const my = (mouseY - (height - ART_H * scaleFactor) * 0.5) / scaleFactor;
  inputCtrl.handleMousePressed(mx, my);
}

function keyPressed() {
  if (inputCtrl) inputCtrl.handleKeyPressed();
}

function buildPainting() {
  randomSeed(SEED);
  noiseSeed(SEED);

  paintingLayer = createGraphics(ART_W, ART_H);
  paintingLayer.pixelDensity(1);
  paintingLayer.colorMode(RGB, 255);
  paintingLayer.noStroke();

  paintWaterBase();
  paintReflections();
  paintDistantPads();
  paintPadCluster(190, 760, 235, 120, 22, 0.9);
  paintPadCluster(760, 765, 275, 140, 27, 0.98);
  paintPadCluster(250, 410, 250, 120, 21, 0.78);
  paintPadCluster(690, 300, 315, 105, 25, 0.72);
  paintPadCluster(560, 680, 135, 85, 10, 0.68);
  paintLilies();
  paintFineColorNotes();
  paintSurfaceStrokes();
  paintCanvasGrain();
}

function paintWaterBase() {
  const skyBlue = color(72, 94, 146);
  const pondGreen = color(67, 95, 70);
  const violet = color(87, 83, 143);
  const shadow = color(42, 51, 74);

  for (let y = 0; y < ART_H; y += 2) {
    const t = y / ART_H;
    const blended = lerpColor(skyBlue, pondGreen, t * 0.62);
    paintingLayer.stroke(
      red(blended) + random(-8, 9),
      green(blended) + random(-8, 9),
      blue(blended) + random(-8, 10),
      235
    );
    paintingLayer.strokeWeight(3);
    paintingLayer.line(0, y, ART_W, y + random(-1, 1));
  }

  for (let i = 0; i < 1550; i++) {
    const x = random(ART_W);
    const y = random(ART_H);
    const w = random(28, 170);
    const h = random(6, 32);
    const c = random([skyBlue, pondGreen, violet, shadow]);
    oilyStroke(
      paintingLayer,
      x,
      y,
      w,
      h,
      color(red(c) + random(-18, 18), green(c) + random(-18, 18), blue(c) + random(-20, 20), random(25, 70)),
      random(-0.14, 0.14),
      random(0.3, 0.9)
    );
  }
}

function paintReflections() {
  const reflectionColors = [
    color(54, 91, 68, 90),
    color(79, 112, 80, 80),
    color(89, 106, 162, 85),
    color(48, 67, 95, 80),
    color(105, 96, 158, 55)
  ];

  for (let i = 0; i < 280; i++) {
    const x = random(-60, ART_W + 60);
    const y = random(40, ART_H - 55);
    const h = random(85, 270);
    const c = random(reflectionColors);

    paintingLayer.noFill();
    paintingLayer.stroke(c);
    paintingLayer.strokeWeight(random(5, 18));
    paintingLayer.beginShape();
    for (let j = 0; j < 8; j++) {
      const yy = y + (h / 7) * j;
      const wobble = sin(j * 1.7 + random(-0.4, 0.4)) * random(4, 16);
      paintingLayer.curveVertex(x + wobble, yy);
    }
    paintingLayer.endShape();
  }

  for (let i = 0; i < 620; i++) {
    const c = random([color(35, 45, 72, 100), color(120, 139, 177, 80), color(117, 139, 119, 65)]);
    oilyStroke(
      paintingLayer,
      random(ART_W),
      random(ART_H),
      random(16, 120),
      random(3, 13),
      c,
      random(-0.06, 0.06),
      random(0.35, 0.8)
    );
  }
}

function paintDistantPads() {
  for (let i = 0; i < 82; i++) {
    const band = random([150, 235, 365, 530, 860]);
    const x = random(30, ART_W - 30);
    const y = band + random(-55, 55);
    paintLilyPad(x, y, random(28, 76), random(10, 30), random(TWO_PI), random(0.42, 0.68));
  }
}

function paintPadCluster(cx, cy, clusterW, clusterH, count, sizeScale) {
  for (let i = 0; i < count; i++) {
    const angle = random(TWO_PI);
    const radius = sqrt(random()) * 0.5;
    const x = cx + cos(angle) * clusterW * radius + random(-25, 25);
    const y = cy + sin(angle) * clusterH * radius + random(-18, 18);
    const w = random(48, 125) * sizeScale;
    const h = random(22, 58) * sizeScale;
    paintLilyPad(x, y, w, h, random(TWO_PI), random(0.75, 1.18));
  }
}

function paintLilyPad(x, y, w, h, angle, alphaScale) {
  drawLilyPadTo(paintingLayer, x, y, w, h, angle, alphaScale);
}

function drawLilyPadTo(g, x, y, w, h, angle, alphaScale) {
  const greens = [
    color(105, 145, 92, 160 * alphaScale),
    color(126, 158, 104, 150 * alphaScale),
    color(154, 171, 108, 135 * alphaScale),
    color(91, 128, 112, 145 * alphaScale),
    color(168, 124, 164, 80 * alphaScale)
  ];

  g.push();
  g.translate(x, y);
  g.rotate(angle);

  const shadow = color(24, 37, 62, 125 * alphaScale);
  oilyStroke(g, 4, 7, w * 1.08, h * 1.15, shadow, 0, 0.75);

  for (let i = 0; i < 10; i++) {
    const c = random(greens);
    oilyStroke(
      g,
      random(-w * 0.08, w * 0.08),
      random(-h * 0.12, h * 0.12),
      w * random(0.75, 1.15),
      h * random(0.5, 1),
      color(red(c) + random(-16, 16), green(c) + random(-13, 15), blue(c) + random(-15, 16), alpha(c)),
      random(-0.1, 0.1),
      random(0.5, 1)
    );
  }

  for (let i = 0; i < 3; i++) {
    const fleck = random([color(187, 205, 156, 115), color(87, 144, 132, 110), color(211, 159, 193, 80)]);
    oilyStroke(
      g,
      random(-w * 0.28, w * 0.28),
      random(-h * 0.25, h * 0.25),
      w * random(0.16, 0.42),
      h * random(0.12, 0.32),
      fleck,
      random(-0.25, 0.25),
      random(0.45, 0.8)
    );
  }

  const rim = random([color(202, 153, 188, 120), color(173, 197, 163, 105), color(211, 205, 151, 90)]);
  oilyStroke(g, 0, -h * 0.15, w * random(0.75, 1.1), h * 0.18, rim, random(-0.12, 0.12), 0.65);
  g.pop();
}

function createFloatingLilyPads() {
  floatingLilyPads = [];
  randomSeed(SEED + 371);

  for (let i = 0; i < 34; i++) {
    const band = random([150, 235, 365, 530, 860]);
    addFloatingLilyPad(
      random(30, ART_W - 30),
      band + random(-55, 55),
      random(28, 76),
      random(10, 30),
      random(TWO_PI),
      random(0.32, 0.5)
    );
  }

  addFloatingPadCluster(190, 760, 235, 120, 10, 0.82);
  addFloatingPadCluster(760, 765, 275, 140, 12, 0.9);
  addFloatingPadCluster(250, 410, 250, 120, 9, 0.72);
  addFloatingPadCluster(690, 300, 315, 105, 10, 0.68);
  addFloatingPadCluster(560, 680, 135, 85, 5, 0.64);
}

function addFloatingPadCluster(cx, cy, clusterW, clusterH, count, sizeScale) {
  for (let i = 0; i < count; i++) {
    const angle = random(TWO_PI);
    const radius = sqrt(random()) * 0.5;
    const x = cx + cos(angle) * clusterW * radius + random(-25, 25);
    const y = cy + sin(angle) * clusterH * radius + random(-18, 18);
    addFloatingLilyPad(
      x,
      y,
      random(48, 125) * sizeScale,
      random(22, 58) * sizeScale,
      random(TWO_PI),
      random(0.56, 0.9)
    );
  }
}

function addFloatingLilyPad(x, y, w, h, angle, alphaScale) {
  const seed = floor(random(1000000));
  const margin = ceil(max(w, h) * 0.8);
  const spriteW = ceil(w * 1.75 + margin * 2);
  const spriteH = ceil(h * 2.1 + margin * 2);
  const sprite = createGraphics(spriteW, spriteH);
  sprite.pixelDensity(1);
  sprite.colorMode(RGB, 255);
  sprite.clear();

  randomSeed(seed);
  drawLilyPadTo(sprite, spriteW * 0.5, spriteH * 0.5, w, h, 0, alphaScale);

  floatingLilyPads.push({
    x,
    y,
    baseX: x,
    baseY: y,
    w,
    h,
    angle,
    vx: random(-0.08, 0.08),
    vy: random(-0.06, 0.06),
    angularV: random(-0.0015, 0.0015),
    radius: max(w, h) * 0.32,
    phase: random(TWO_PI),
    sprite
  });
}

function updateFloatingLilyPads() {
  if (floatingLilyPads.length === 0) return;

  const stillness = inputCtrl && inputCtrl.isStilled;
  const soundLift = typeof audioState !== "undefined" ? audioState.smoothedLevel : 0;

  for (let pad of floatingLilyPads) {
    if (!stillness) {
      const n = noise(pad.baseX * 0.003, pad.baseY * 0.003, frameCount * 0.004 + pad.phase);
      const flowAngle = n * TWO_PI * 2;
      const driftPower = 0.012 + soundLift * 0.018;
      pad.vx += cos(flowAngle) * driftPower + (pad.baseX - pad.x) * 0.0014;
      pad.vy += sin(flowAngle) * driftPower * 0.72 + (pad.baseY - pad.y) * 0.0014;
      pad.angularV += sin(frameCount * 0.01 + pad.phase) * 0.00018;
      applyInputForcesToFloatingPad(pad);
    } else {
      pad.vx += (pad.baseX - pad.x) * 0.002;
      pad.vy += (pad.baseY - pad.y) * 0.002;
      pad.angularV *= 0.92;
    }
  }

  resolveFloatingLilyPadCollisions();

  for (let pad of floatingLilyPads) {
    pad.vx *= 0.94;
    pad.vy *= 0.94;
    pad.angularV *= 0.94;
    pad.x = constrain(pad.x + pad.vx, 20, ART_W - 20);
    pad.y = constrain(pad.y + pad.vy, 20, ART_H - 20);
    pad.angle += pad.angularV;
  }
}

function applyInputForcesToFloatingPad(pad) {
  if (!inputCtrl || inputCtrl.ripples.length === 0) return;

  for (let ripple of inputCtrl.ripples) {
    const dx = pad.x - ripple.x;
    const dy = pad.y - ripple.y;
    const dist = sqrt(dx * dx + dy * dy);
    if (dist <= 0.001) continue;

    const nx = dx / dist;
    const ny = dy / dist;
    const directRange = pad.radius * 1.25 + 42;
    const waveRange = pad.radius + inputCtrl.triggerRadius * 0.72;
    const directHit = max(0, 1 - dist / directRange);
    const waveHit = max(0, 1 - abs(dist - ripple.radius) / waveRange);
    const ripplePower = (ripple.alpha / 255) * (ripple.impact || 1);
    const force = directHit * ripplePower * 0.42 + waveHit * ripplePower * 0.22;

    if (force > 0) {
      pad.vx += nx * force;
      pad.vy += ny * force * 0.78;
      pad.angularV += (nx * 0.7 + ny * 0.3) * force * 0.009;
    }
  }
}

function resolveFloatingLilyPadCollisions() {
  for (let i = 0; i < floatingLilyPads.length; i++) {
    const a = floatingLilyPads[i];
    for (let j = i + 1; j < floatingLilyPads.length; j++) {
      const b = floatingLilyPads[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const activeBoost = inputCtrl && inputCtrl.ripples.length > 0 ? 0.12 : 0;
      const minDist = (a.radius + b.radius) * (0.72 + activeBoost);
      const distSq = dx * dx + dy * dy;

      if (distSq > 0.001 && distSq < minDist * minDist) {
        const dist = sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const push = (minDist - dist) * (0.012 + activeBoost * 0.035);
        a.vx -= nx * push;
        a.vy -= ny * push;
        b.vx += nx * push;
        b.vy += ny * push;
        a.angularV -= push * 0.0009;
        b.angularV += push * 0.0009;
      }
    }
  }
}

function drawFloatingLilyPads(artBox) {
  if (floatingLilyPads.length === 0) return;

  push();
  translate(artBox.x, artBox.y);
  scale(artBox.w / ART_W, artBox.h / ART_H);
  imageMode(CENTER);
  const activeAlpha = inputCtrl && inputCtrl.ripples.length > 0 ? 232 : 188;
  tint(255, activeAlpha);

  for (let pad of floatingLilyPads) {
    const bobX = sin(frameCount * 0.012 + pad.phase) * 1.8;
    const bobY = cos(frameCount * 0.014 + pad.phase) * 1.2;

    push();
    translate(pad.x + bobX, pad.y + bobY);
    rotate(pad.angle + sin(frameCount * 0.01 + pad.phase) * 0.025);
    image(pad.sprite, 0, 0);
    pop();
  }

  noTint();
  pop();
}

function paintLilies() {
  const flowers = [
    [120, 360, 1.15, color(173, 58, 61)],
    [190, 420, 0.8, color(205, 84, 125)],
    [390, 238, 0.7, color(238, 224, 180)],
    [590, 285, 0.72, color(230, 220, 184)],
    [690, 285, 0.68, color(238, 221, 182)],
    [730, 690, 0.82, color(239, 216, 166)],
    [610, 705, 0.74, color(231, 198, 154)],
    [850, 830, 1.08, color(236, 218, 179)]
  ];

  flowers.forEach((flower) => paintFlower(flower[0], flower[1], flower[2], flower[3]));
}

function paintFlower(x, y, scaleAmount, baseColor) {
  paintingLayer.push();
  paintingLayer.translate(x, y);
  paintingLayer.rotate(random(-0.18, 0.18));

  oilyStroke(paintingLayer, 0, 12 * scaleAmount, 82 * scaleAmount, 22 * scaleAmount, color(86, 26, 46, 115), 0, 0.75);

  for (let i = 0; i < 12; i++) {
    const angle = map(i, 0, 12, -PI * 0.9, PI * 0.9) + random(-0.16, 0.16);
    const px = cos(angle) * random(13, 28) * scaleAmount;
    const py = sin(angle) * random(3, 13) * scaleAmount;
    const petalColor = lerpColor(baseColor, color(255, 241, 185, 210), random(0.35, 0.78));
    oilyStroke(
      paintingLayer,
      px,
      py,
      random(30, 56) * scaleAmount,
      random(8, 18) * scaleAmount,
      color(red(petalColor), green(petalColor), blue(petalColor), random(150, 220)),
      angle * 0.45,
      0.9
    );
  }

  for (let i = 0; i < 7; i++) {
    oilyStroke(
      paintingLayer,
      random(-10, 10) * scaleAmount,
      random(-5, 7) * scaleAmount,
      random(12, 28) * scaleAmount,
      random(5, 11) * scaleAmount,
      color(246, 217, 83, random(150, 225)),
      random(-0.5, 0.5),
      0.9
    );
  }

  paintingLayer.pop();
}

function paintSurfaceStrokes() {
  for (let i = 0; i < 1250; i++) {
    const c = random([
      color(169, 183, 204, 95),
      color(128, 159, 184, 80),
      color(216, 179, 194, 70),
      color(121, 154, 95, 75),
      color(55, 58, 93, 95)
    ]);
    oilyStroke(
      paintingLayer,
      random(ART_W),
      random(ART_H),
      random(8, 62),
      random(2, 10),
      c,
      random(-0.18, 0.18),
      random(0.35, 0.85)
    );
  }

  for (let i = 0; i < 280; i++) {
    const x = random(ART_W);
    const y = random(ART_H);
    paintingLayer.stroke(random(190, 235), random(185, 220), random(165, 210), random(40, 95));
    paintingLayer.strokeWeight(random(1, 4));
    paintingLayer.line(x, y, x + random(-12, 18), y + random(-4, 4));
  }
}

function paintFineColorNotes() {
  const notes = [
    color(207, 222, 204, 95),
    color(172, 198, 214, 85),
    color(233, 190, 207, 80),
    color(196, 207, 126, 80),
    color(84, 57, 93, 75),
    color(36, 52, 80, 80)
  ];

  for (let i = 0; i < 760; i++) {
    const x = random(ART_W);
    const y = random(ART_H);
    const c = random(notes);
    oilyStroke(
      paintingLayer,
      x,
      y,
      random(5, 28),
      random(1.5, 6),
      color(red(c) + random(-12, 12), green(c) + random(-12, 12), blue(c) + random(-12, 12), alpha(c)),
      random(-0.28, 0.28),
      random(0.35, 0.75)
    );
  }

  for (let i = 0; i < 95; i++) {
    const x = random(70, ART_W - 70);
    const y = random([random(245, 380), random(650, 850), random(120, 210)]);
    paintingLayer.stroke(random(205, 245), random(208, 235), random(178, 220), random(80, 145));
    paintingLayer.strokeWeight(random(1.2, 3.5));
    paintingLayer.line(x, y, x + random(10, 48), y + random(-5, 5));
  }
}

function paintCanvasGrain() {
  paintingLayer.loadPixels();
  for (let y = 0; y < ART_H; y++) {
    for (let x = 0; x < ART_W; x++) {
      const idx = 4 * (y * ART_W + x);
      const grain = random(-9, 8);
      const weave = ((x % 9 === 0) || (y % 11 === 0)) ? random(-9, 10) : 0;
      paintingLayer.pixels[idx] = constrain(paintingLayer.pixels[idx] + grain + weave, 0, 255);
      paintingLayer.pixels[idx + 1] = constrain(paintingLayer.pixels[idx + 1] + grain + weave, 0, 255);
      paintingLayer.pixels[idx + 2] = constrain(paintingLayer.pixels[idx + 2] + grain + weave, 0, 255);
    }
  }
  paintingLayer.updatePixels();

  paintingLayer.noFill();
  paintingLayer.stroke(28, 30, 38, 90);
  paintingLayer.strokeWeight(20);
  paintingLayer.rect(10, 10, ART_W - 20, ART_H - 20);
}

function oilyStroke(g, x, y, w, h, c, angle, opacity) {
  w *= BRUSH_SCALE;
  h *= BRUSH_SCALE;

  g.push();
  g.translate(x, y);
  g.rotate(angle);
  g.noStroke();

  const passes = 5;
  for (let i = 0; i < passes; i++) {
    const passAlpha = alpha(c) * opacity * random(0.32, 0.72);
    g.fill(red(c) + random(-10, 10), green(c) + random(-10, 10), blue(c) + random(-12, 12), passAlpha);
    g.beginShape();
    const steps = 16;
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const px = lerp(-w * 0.5, w * 0.5, t);
      const wobble = sin(t * PI * 2 + random(-0.8, 0.8)) * h * random(0.08, 0.22);
      const py = -h * 0.5 + wobble + random(-h * 0.12, h * 0.12);
      g.curveVertex(px, py);
    }
    for (let j = steps; j >= 0; j--) {
      const t = j / steps;
      const px = lerp(-w * 0.5, w * 0.5, t);
      const wobble = sin(t * PI * 2 + random(-0.8, 0.8)) * h * random(0.08, 0.22);
      const py = h * 0.5 + wobble + random(-h * 0.12, h * 0.12);
      g.curveVertex(px, py);
    }
    g.endShape(CLOSE);
  }

  g.stroke(red(c) + 25, green(c) + 25, blue(c) + 20, alpha(c) * 0.3);
  g.strokeWeight(max(1, h * 0.08));
  for (let i = 0; i < 2; i++) {
    const yy = random(-h * 0.25, h * 0.25);
    g.line(-w * 0.42, yy, w * 0.42, yy + random(-h * 0.12, h * 0.12));
  }

  g.pop();
}
