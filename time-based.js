const cycleDuration = 60000;

function getCycleProgress() {
  return (millis() % cycleDuration) / cycleDuration;
}

function getTimeBasedState() {
  const cycleProgress = getCycleProgress();
  const dawn = color(112, 132, 171);
  const day = color(216, 229, 210);
  const sunset = color(220, 130, 104);
  const night = color(31, 38, 76);
  const nextDawn = color(112, 132, 171);

  const phaseColor = colorFromStops(cycleProgress, [
    [0, dawn],
    [0.28, day],
    [0.55, sunset],
    [0.78, night],
    [1, nextDawn]
  ]);

  const nightAmount = max(
    phaseAmount(cycleProgress, 0.68, 1, 0.84),
    phaseAmount(cycleProgress, 0, 0.08, 0.02)
  );
  const daylight = 1 - phaseAmount(cycleProgress, 0.62, 0.96, 0.82);
  const warmLight = phaseAmount(cycleProgress, 0.02, 0.22, 0.1) + phaseAmount(cycleProgress, 0.45, 0.68, 0.58);
  const dawnAmount = phaseAmount(cycleProgress, 0, 0.28, 0.1);
  const noonAmount = phaseAmount(cycleProgress, 0.18, 0.44, 0.3);
  const sunsetAmount = phaseAmount(cycleProgress, 0.44, 0.7, 0.58);
  const lightX = lerp(-0.12, 1.12, cycleProgress);
  const lightY = 0.28 - sin(cycleProgress * PI) * 0.22;

  return {
    cycleProgress,
    phaseColor,
    nightAmount,
    daylight,
    dawnAmount,
    noonAmount,
    sunsetAmount,
    warmLight: constrain(warmLight, 0, 1),
    lightX,
    lightY
  };
}

function drawTimeBasedMechanic(artBox) {
  const state = getTimeBasedState();

  push();
  noStroke();
  drawAtmosphereTint(artBox, state);
  drawSoftLightBeam(artBox, state);
  drawWaterReflection(artBox, state);
  drawLilyLightNotes(artBox, state);
  drawFishRimLights(artBox, state);
  pop();
}

function drawAtmosphereTint(artBox, state) {
  const tintAlpha = 28 + state.dawnAmount * 18 + state.noonAmount * 10 + state.sunsetAmount * 34 + state.nightAmount * 76;
  fill(red(state.phaseColor), green(state.phaseColor), blue(state.phaseColor), tintAlpha);
  rect(artBox.x, artBox.y, artBox.w, artBox.h);

  blendMode(SOFT_LIGHT);
  if (state.dawnAmount > 0.01) {
    fill(255, 184, 128, 42 * state.dawnAmount);
    rect(artBox.x, artBox.y, artBox.w, artBox.h);
  }

  if (state.noonAmount > 0.01) {
    fill(218, 238, 217, 26 * state.noonAmount);
    rect(artBox.x, artBox.y, artBox.w, artBox.h);
  }

  if (state.sunsetAmount > 0.01) {
    fill(255, 137, 78, 62 * state.sunsetAmount);
    rect(artBox.x, artBox.y, artBox.w, artBox.h);
  }
  blendMode(BLEND);

  if (state.noonAmount > 0.01) {
    blendMode(SCREEN);
    fill(232, 246, 222, 18 * state.noonAmount);
    rect(artBox.x, artBox.y, artBox.w, artBox.h);
    blendMode(BLEND);
  }

  if (state.nightAmount > 0.08) {
    blendMode(MULTIPLY);
    fill(13, 20, 62, 132 * state.nightAmount);
    rect(artBox.x, artBox.y, artBox.w, artBox.h);
    blendMode(BLEND);

    blendMode(SCREEN);
    fill(58, 74, 145, 22 * state.nightAmount);
    rect(artBox.x, artBox.y, artBox.w, artBox.h);
    blendMode(BLEND);
  }
}

function drawSoftLightBeam(artBox, state) {
  const lx = artBox.x + artBox.w * state.lightX;
  const warmBeam = lerpColor(color(255, 223, 154), color(255, 152, 92), state.sunsetAmount);
  const lightColor = lerpColor(warmBeam, color(190, 211, 255), state.nightAmount);
  const beamAlpha = lerp(34, 22, state.nightAmount) * lerp(0.82, 1, state.warmLight);
  const beamW = artBox.w * lerp(0.16, 0.24, state.warmLight);
  const beamH = artBox.h * 1.34;
  const beamTilt = lerp(-0.18, 0.16, state.cycleProgress);
  const beamCenterY = artBox.y + artBox.h * 0.52 + sin(state.cycleProgress * TWO_PI) * artBox.h * 0.035;

  blendMode(SCREEN);
  drawingContext.save();
  drawingContext.filter = `blur(${max(22, artBox.w * 0.035)}px)`;

  push();
  translate(lx, beamCenterY);
  rotate(beamTilt);
  rectMode(CENTER);
  for (let i = 5; i > 0; i--) {
    const t = i / 5;
    fill(red(lightColor), green(lightColor), blue(lightColor), beamAlpha * (1 - t * 0.38));
    rect(0, 0, beamW * (1 + t * 1.65), beamH * (0.82 + t * 0.12));
  }
  pop();

  drawingContext.restore();

  push();
  translate(lx, beamCenterY);
  rotate(beamTilt);
  rectMode(CENTER);
  fill(red(lightColor), green(lightColor), blue(lightColor), beamAlpha * 0.22);
  rect(0, 0, beamW * 0.72, beamH);
  pop();
  blendMode(BLEND);
}

function drawWaterReflection(artBox, state) {
  const lx = artBox.x + artBox.w * state.lightX;
  const warmReflection = lerpColor(color(248, 205, 129), color(255, 139, 93), state.sunsetAmount);
  const reflectionColor = lerpColor(warmReflection, color(151, 180, 255), state.nightAmount);
  const reflectionPower = lerp(0.92, 0.62, state.nightAmount);

  blendMode(SCREEN);
  noFill();
  for (let i = 0; i < 42; i++) {
    const t = i / 41;
    const y = artBox.y + artBox.h * lerp(0.18, 0.92, t);
    const wave = sin((state.cycleProgress * TWO_PI * 3) + i * 0.67) * artBox.w * 0.025;
    const spread = artBox.w * lerp(0.08, 0.34, t);
    const alphaValue = 18 * reflectionPower * (1 - abs(t - 0.45));

    stroke(red(reflectionColor), green(reflectionColor), blue(reflectionColor), alphaValue);
    strokeWeight(artBox.h * randomSeededWave(i + 210, state.cycleProgress, 0.001, 0.0032));
    line(lx - spread + wave, y, lx + spread + wave * 0.35, y + sin(i) * artBox.h * 0.006);
  }
  blendMode(BLEND);
}

function drawLilyLightNotes(artBox, state) {
  const flowerPositions = [
    [0.12, 0.36, 1.15],
    [0.19, 0.42, 0.8],
    [0.39, 0.238, 0.7],
    [0.59, 0.285, 0.72],
    [0.69, 0.285, 0.68],
    [0.73, 0.69, 0.82],
    [0.61, 0.705, 0.74],
    [0.85, 0.83, 1.08]
  ];

  const lx = artBox.x + artBox.w * state.lightX;
  const lightColor = lerpColor(color(255, 235, 168), color(170, 196, 255), state.nightAmount);

  blendMode(SCREEN);
  flowerPositions.forEach((flower, index) => {
    const x = artBox.x + artBox.w * flower[0];
    const y = artBox.y + artBox.h * flower[1];
    const distanceFromLight = abs(x - lx) / artBox.w;
    const strength = constrain(1 - distanceFromLight * 1.8, 0, 1) * lerp(0.85, 0.55, state.nightAmount);
    const pulse = 0.72 + sin(state.cycleProgress * TWO_PI + index) * 0.18;

    fill(red(lightColor), green(lightColor), blue(lightColor), 36 * strength * pulse);
    ellipse(x, y, artBox.w * 0.07 * flower[2], artBox.h * 0.035 * flower[2]);
  });
  blendMode(BLEND);
}

function drawFishRimLights(artBox, state) {
  const fish = [
    [0.26, 0.59, 0.9],
    [0.46, 0.48, 0.68],
    [0.66, 0.58, 0.82],
    [0.78, 0.41, 0.62],
    [0.34, 0.82, 0.72]
  ];
  const lx = artBox.x + artBox.w * state.lightX;
  const rim = lerpColor(color(255, 204, 140), color(157, 190, 255), state.nightAmount);

  fish.forEach((item, index) => {
    const swim = sin(state.cycleProgress * TWO_PI + index * 1.7) * artBox.w * 0.018;
    const x = artBox.x + artBox.w * item[0] + swim;
    const y = artBox.y + artBox.h * item[1] + cos(state.cycleProgress * TWO_PI + index) * artBox.h * 0.008;
    const s = artBox.w * 0.042 * item[2];
    const strength = constrain(1 - abs(x - lx) / (artBox.w * 0.55), 0, 1);

    push();
    translate(x, y);
    rotate(sin(state.cycleProgress * TWO_PI + index) * 0.12);
    noStroke();
    fill(17, 29, 54, 58);
    ellipse(0, 0, s * 1.35, s * 0.42);
    triangle(-s * 0.6, 0, -s * 1.02, -s * 0.22, -s * 1.02, s * 0.22);

    blendMode(SCREEN);
    stroke(red(rim), green(rim), blue(rim), 45 * strength + 14 * state.nightAmount);
    strokeWeight(max(1, artBox.w * 0.002));
    noFill();
    arc(0, -s * 0.03, s * 1.08, s * 0.34, PI * 1.05, TWO_PI * 0.98);
    blendMode(BLEND);
    pop();
  });
}

function colorFromStops(progress, stops) {
  for (let i = 0; i < stops.length - 1; i++) {
    const current = stops[i];
    const next = stops[i + 1];
    if (progress >= current[0] && progress <= next[0]) {
      const localT = smoothstep((progress - current[0]) / (next[0] - current[0]));
      return lerpColor(current[1], next[1], localT);
    }
  }

  return stops[stops.length - 1][1];
}

function phaseAmount(progress, start, end, peak) {
  if (progress < start || progress > end) {
    return 0;
  }

  if (progress <= peak) {
    return smoothstep((progress - start) / (peak - start));
  }

  return 1 - smoothstep((progress - peak) / (end - peak));
}

function smoothstep(t) {
  const clamped = constrain(t, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function randomSeededWave(index, progress, minValue, maxValue) {
  const raw = (sin(index * 12.9898 + progress * TWO_PI) + 1) * 0.5;
  return lerp(minValue, maxValue, raw);
}
