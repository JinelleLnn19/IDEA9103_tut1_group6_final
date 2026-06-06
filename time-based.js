// One full time cycle is 60 seconds.
// This does not mean the animation only plays for one minute.
// It means the day-to-night effect will repeat every 60 seconds.
const cycleDuration = 60000;

// This function converts the real running time into a value from 0 to 1.
// This value is easier to use for animation because 0 means the start of the cycle
// and 1 means the end of the cycle.
// After 60 seconds, millis() % cycleDuration returns to 0,
// so the whole time system can loop again.
function getCycleProgress() {
  return (millis() % cycleDuration) / cycleDuration;
}

// This function calculates all important time-based values.
// I use one function to store the time state because different visual parts,
// such as background colour, light position, reflection, flowers and fish,
// all need to follow the same day-night cycle.
function getTimeBasedState() {
  const cycleProgress = getCycleProgress();

  // These colours represent the main moments in one day.
  // They are not used as hard changes.
  // They will be blended smoothly later, so the atmosphere changes naturally.
  const dawn = color(112, 132, 171);
  const day = color(216, 229, 210);
  const sunset = color(220, 130, 104);
  const night = color(31, 38, 76);
  const nextDawn = color(112, 132, 171);

  // This calculates the current atmosphere colour by using several colour stops.
  // It works like a gradient over time.
  // This helps the scene move from dawn to day, then sunset, night, and back to dawn.
  const phaseColor = colorFromStops(cycleProgress, [
    [0, dawn],
    [0.28, day],
    [0.55, sunset],
    [0.78, night],
    [1, nextDawn]
  ]);

  // nightAmount controls how strong the night effect is.
  // I also include a small night amount at the very beginning of the loop,
  // so the transition from night back to dawn is not too sudden.
  const nightAmount = max(
    phaseAmount(cycleProgress, 0.68, 1, 0.84),
    phaseAmount(cycleProgress, 0, 0.08, 0.02)
  );

  // daylight becomes lower when the cycle moves into night.
  // This can help other parts know whether the scene should feel bright or dark.
  const daylight = 1 - phaseAmount(cycleProgress, 0.62, 0.96, 0.82);

  // warmLight is stronger during dawn and sunset.
  // These are the moments when the light should feel orange, pink, and golden.
  const warmLight = phaseAmount(cycleProgress, 0.02, 0.22, 0.1) + phaseAmount(cycleProgress, 0.45, 0.68, 0.58);

  // These amounts are used to describe different phases.
  // They are useful because different visual layers need different intensity.
  const dawnAmount = phaseAmount(cycleProgress, 0, 0.28, 0.1);
  const noonAmount = phaseAmount(cycleProgress, 0.18, 0.44, 0.3);
  const sunsetAmount = phaseAmount(cycleProgress, 0.44, 0.7, 0.58);

  // The light source moves from the left side to the right side.
  // I use values slightly outside the canvas range, from -0.12 to 1.12,
  // so the light can enter and leave the scene more naturally.
  const lightX = lerp(-0.12, 1.12, cycleProgress);

  // The light height changes a little with a sine curve.
  // This makes the light feel like it is following a soft arc in the sky,
  // instead of moving in a flat and mechanical line.
  const lightY = 0.28 - sin(cycleProgress * PI) * 0.22;

  // Return all calculated values as one object.
  // Other drawing functions can use this state without recalculating time again.
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

// This is the main drawing function for the time mechanic.
// It receives artBox, which defines the area of the artwork.
// Then it draws atmosphere colour, moving light, water reflection,
// lily highlights and fish rim lights.
function drawTimeBasedMechanic(artBox) {
  const state = getTimeBasedState();

  push();
  noStroke();

  // These layers are drawn in order.
  // The atmosphere comes first, then the light beam, reflection, flowers and fish.
  drawAtmosphereTint(artBox, state);
  drawSoftLightBeam(artBox, state);
  drawWaterReflection(artBox, state);
  drawLilyLightNotes(artBox, state);
  drawFishRimLights(artBox, state);

  pop();
}

// This function draws a coloured atmosphere layer over the whole artwork.
// It does not replace the original image.
// It works more like a transparent colour filter,
// so the mood can shift from morning to night.
function drawAtmosphereTint(artBox, state) {
  // The alpha changes depending on the time phase.
  // Night needs a stronger tint, while noon is lighter.
  const tintAlpha = 28 + state.dawnAmount * 18 + state.noonAmount * 10 + state.sunsetAmount * 34 + state.nightAmount * 76;

  // Draw the main phase colour over the artwork.
  fill(red(state.phaseColor), green(state.phaseColor), blue(state.phaseColor), tintAlpha);
  rect(artBox.x, artBox.y, artBox.w, artBox.h);

  // SOFT_LIGHT is used to make the colour blend more gently.
  // This is useful because Monet's painting style is soft and atmospheric,
  // not sharp or flat.
  blendMode(SOFT_LIGHT);

  // Dawn has warm but soft light.
  // This gives the pond an early morning feeling.
  if (state.dawnAmount > 0.01) {
    fill(255, 184, 128, 42 * state.dawnAmount);
    rect(artBox.x, artBox.y, artBox.w, artBox.h);
  }

  // Noon is brighter and more green-blue.
  // I keep it gentle because the painting should still feel calm.
  if (state.noonAmount > 0.01) {
    fill(218, 238, 217, 26 * state.noonAmount);
    rect(artBox.x, artBox.y, artBox.w, artBox.h);
  }

  // Sunset adds a stronger warm colour.
  // This creates the most emotional and colourful stage in the cycle.
  if (state.sunsetAmount > 0.01) {
    fill(255, 137, 78, 62 * state.sunsetAmount);
    rect(artBox.x, artBox.y, artBox.w, artBox.h);
  }

  // Return to normal blend mode after using special blend.
  blendMode(BLEND);

  // During noon, I add a light screen layer.
  // SCREEN makes the image brighter, like sunlight reflecting on water.
  if (state.noonAmount > 0.01) {
    blendMode(SCREEN);
    fill(232, 246, 222, 18 * state.noonAmount);
    rect(artBox.x, artBox.y, artBox.w, artBox.h);
    blendMode(BLEND);
  }

  // At night, I darken the whole scene first.
  // MULTIPLY helps create a deep blue shadow.
  if (state.nightAmount > 0.08) {
    blendMode(MULTIPLY);
    fill(13, 20, 62, 132 * state.nightAmount);
    rect(artBox.x, artBox.y, artBox.w, artBox.h);
    blendMode(BLEND);

    // Then I add a small cool blue screen layer.
    // This prevents the night scene from becoming completely black.
    blendMode(SCREEN);
    fill(58, 74, 145, 22 * state.nightAmount);
    rect(artBox.x, artBox.y, artBox.w, artBox.h);
    blendMode(BLEND);
  }
}

// This function draws the main moving light beam.
// The light beam is the most obvious visual sign of time passing.
// It moves from left to right across the water surface.
function drawSoftLightBeam(artBox, state) {
  // Convert the normalised lightX value into a real canvas x position.
  const lx = artBox.x + artBox.w * state.lightX;

  // The beam colour changes with the time of day.
  // It is warm during sunset and cooler at night.
  const warmBeam = lerpColor(color(255, 223, 154), color(255, 152, 92), state.sunsetAmount);
  const lightColor = lerpColor(warmBeam, color(190, 211, 255), state.nightAmount);

  // The beam becomes slightly weaker at night.
  // It also becomes more visible when warmLight is stronger.
  const beamAlpha = lerp(34, 22, state.nightAmount) * lerp(0.82, 1, state.warmLight);

  // Beam size depends on the artwork size.
  // This makes it responsive when the canvas changes size.
  const beamW = artBox.w * lerp(0.16, 0.24, state.warmLight);
  const beamH = artBox.h * 1.34;

  // The beam tilts slowly through the cycle.
  // This makes it feel less flat and more natural.
  const beamTilt = lerp(-0.18, 0.16, state.cycleProgress);

  // The beam centre also moves slightly up and down.
  // This gives the reflection a water-like feeling.
  const beamCenterY = artBox.y + artBox.h * 0.52 + sin(state.cycleProgress * TWO_PI) * artBox.h * 0.035;

  blendMode(SCREEN);

  // drawingContext is used here to add blur.
  // Blur makes the light softer and more like reflected light on water.
  drawingContext.save();
  drawingContext.filter = `blur(${max(22, artBox.w * 0.035)}px)`;

  push();
  translate(lx, beamCenterY);
  rotate(beamTilt);
  rectMode(CENTER);

  // Draw several rectangles on top of each other.
  // Larger rectangles are more transparent, so the beam has a soft glowing edge.
  for (let i = 5; i > 0; i--) {
    const t = i / 5;
    fill(red(lightColor), green(lightColor), blue(lightColor), beamAlpha * (1 - t * 0.38));
    rect(0, 0, beamW * (1 + t * 1.65), beamH * (0.82 + t * 0.12));
  }
  pop();

  drawingContext.restore();

  // Draw a smaller core beam after the blur layer.
  // This keeps the beam visible while the blurred part creates atmosphere.
  push();
  translate(lx, beamCenterY);
  rotate(beamTilt);
  rectMode(CENTER);
  fill(red(lightColor), green(lightColor), blue(lightColor), beamAlpha * 0.22);
  rect(0, 0, beamW * 0.72, beamH);
  pop();

  blendMode(BLEND);
}

// This function creates the reflection lines on the water.
// The reflection follows the moving light source,
// so the water surface looks connected to the day-night cycle.
function drawWaterReflection(artBox, state) {
  const lx = artBox.x + artBox.w * state.lightX;

  // Reflection colour also changes with time.
  // It is warmer in sunset and cooler at night.
  const warmReflection = lerpColor(color(248, 205, 129), color(255, 139, 93), state.sunsetAmount);
  const reflectionColor = lerpColor(warmReflection, color(151, 180, 255), state.nightAmount);

  // Reflection becomes weaker during the night.
  const reflectionPower = lerp(0.92, 0.62, state.nightAmount);

  blendMode(SCREEN);
  noFill();

  // Draw many small horizontal lines.
  // This is used to imitate water reflection instead of drawing one solid shape.
  for (let i = 0; i < 42; i++) {
    const t = i / 41;
    const y = artBox.y + artBox.h * lerp(0.18, 0.92, t);

    // Sine wave creates soft movement in the reflection.
    // It makes the water feel alive without needing a complex fluid simulation.
    const wave = sin((state.cycleProgress * TWO_PI * 3) + i * 0.67) * artBox.w * 0.025;

    // Lower reflection lines are wider.
    // This creates a natural spread on the pond surface.
    const spread = artBox.w * lerp(0.08, 0.34, t);

    // The alpha is stronger near the middle of the reflection area.
    const alphaValue = 18 * reflectionPower * (1 - abs(t - 0.45));

    stroke(red(reflectionColor), green(reflectionColor), blue(reflectionColor), alphaValue);

    // The stroke weight has a stable pseudo-random variation.
    // This makes the reflection lines look more like hand-made brush strokes.
    strokeWeight(artBox.h * randomSeededWave(i + 210, state.cycleProgress, 0.001, 0.0032));

    line(lx - spread + wave, y, lx + spread + wave * 0.35, y + sin(i) * artBox.h * 0.006);
  }

  blendMode(BLEND);
}

// This function adds small light notes on selected lily positions.
// It helps the lilies react to the moving light,
// instead of looking separate from the environment.
function drawLilyLightNotes(artBox, state) {
  // These are relative positions of important lily or flower areas.
  // They use percentages of the artBox, so they can scale with the canvas.
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

  // The highlight colour also changes between warm daylight and cool night light.
  const lightColor = lerpColor(color(255, 235, 168), color(170, 196, 255), state.nightAmount);

  blendMode(SCREEN);

  flowerPositions.forEach((flower, index) => {
    const x = artBox.x + artBox.w * flower[0];
    const y = artBox.y + artBox.h * flower[1];

    // Calculate how close each flower is to the current light beam.
    // Flowers nearer to the beam receive stronger light.
    const distanceFromLight = abs(x - lx) / artBox.w;
    const strength = constrain(1 - distanceFromLight * 1.8, 0, 1) * lerp(0.85, 0.55, state.nightAmount);

    // Pulse makes the highlight gently breathe.
    // This avoids a static overlay and gives a living feeling.
    const pulse = 0.72 + sin(state.cycleProgress * TWO_PI + index) * 0.18;

    fill(red(lightColor), green(lightColor), blue(lightColor), 36 * strength * pulse);
    ellipse(x, y, artBox.w * 0.07 * flower[2], artBox.h * 0.035 * flower[2]);
  });

  blendMode(BLEND);
}

// This function adds subtle rim lights to fish.
// The fish are dark, so this helps them remain visible,
// especially during sunset and night.
function drawFishRimLights(artBox, state) {
  // These are relative fish positions.
  // They are not fully animated fish here, but light notes that suggest movement under water.
  const fish = [
    [0.26, 0.59, 0.9],
    [0.46, 0.48, 0.68],
    [0.66, 0.58, 0.82],
    [0.78, 0.41, 0.62],
    [0.34, 0.82, 0.72]
  ];

  const lx = artBox.x + artBox.w * state.lightX;

  // Rim light colour becomes cooler at night.
  const rim = lerpColor(color(255, 204, 140), color(157, 190, 255), state.nightAmount);

  fish.forEach((item, index) => {
    // Add a small swimming motion using sine and cosine.
    // This keeps the fish from feeling like fixed decoration.
    const swim = sin(state.cycleProgress * TWO_PI + index * 1.7) * artBox.w * 0.018;
    const x = artBox.x + artBox.w * item[0] + swim;
    const y = artBox.y + artBox.h * item[1] + cos(state.cycleProgress * TWO_PI + index) * artBox.h * 0.008;
    const s = artBox.w * 0.042 * item[2];

    // Fish closer to the light source receive stronger rim light.
    const strength = constrain(1 - abs(x - lx) / (artBox.w * 0.55), 0, 1);

    push();
    translate(x, y);

    // Slight rotation makes the fish movement more organic.
    rotate(sin(state.cycleProgress * TWO_PI + index) * 0.12);

    noStroke();

    // Draw a dark fish body first.
    // This allows the light outline to stand out.
    fill(17, 29, 54, 58);
    ellipse(0, 0, s * 1.35, s * 0.42);
    triangle(-s * 0.6, 0, -s * 1.02, -s * 0.22, -s * 1.02, s * 0.22);

    // Draw only a subtle upper rim light.
    // This makes the fish look like it is catching reflection from the water surface.
    blendMode(SCREEN);
    stroke(red(rim), green(rim), blue(rim), 45 * strength + 14 * state.nightAmount);
    strokeWeight(max(1, artBox.w * 0.002));
    noFill();
    arc(0, -s * 0.03, s * 1.08, s * 0.34, PI * 1.05, TWO_PI * 0.98);
    blendMode(BLEND);

    pop();
  });
}

// This helper function blends between several colour stops.
// It allows the whole time system to have more than two colours.
// This is useful because the scene needs dawn, day, sunset, night, and next dawn.
function colorFromStops(progress, stops) {
  for (let i = 0; i < stops.length - 1; i++) {
    const current = stops[i];
    const next = stops[i + 1];

    // If progress is between two stops, calculate the local progress
    // and blend between those two colours.
    if (progress >= current[0] && progress <= next[0]) {
      const localT = smoothstep((progress - current[0]) / (next[0] - current[0]));
      return lerpColor(current[1], next[1], localT);
    }
  }

  // If no stop matches, return the last colour as a safe fallback.
  return stops[stops.length - 1][1];
}

// This helper function creates a soft phase amount.
// It rises from 0 to 1, then falls back to 0.
// This is useful for phases like dawn or sunset,
// because these phases should appear and disappear smoothly.
function phaseAmount(progress, start, end, peak) {
  if (progress < start || progress > end) {
    return 0;
  }

  if (progress <= peak) {
    return smoothstep((progress - start) / (peak - start));
  }

  return 1 - smoothstep((progress - peak) / (end - peak));
}

// Smoothstep creates smoother transition than a normal linear value.
// It makes the start and end of a transition softer,
// so colour and light changes do not feel too sudden.
function smoothstep(t) {
  const clamped = constrain(t, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

// This creates repeatable pseudo-random wave values.
// I use this instead of random() because random() would change every frame
// and make the reflection flicker too much.
// This function gives variation, but it stays visually stable.
function randomSeededWave(index, progress, minValue, maxValue) {
  const raw = (sin(index * 12.9898 + progress * TWO_PI) + 1) * 0.5;
  return lerp(minValue, maxValue, raw);
}