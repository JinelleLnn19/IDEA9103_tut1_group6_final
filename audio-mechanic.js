/*
  AI note: I used ChatGPT to help check this file for possible syntax mistakes
  and to help me describe the audio logic in clearer comments. The AI was used
  like a reviewer, not as a replacement for understanding the code.

  Source note: The p5 sound parts were guided by official p5.js references:
  loadSound(), p5.AudioIn, p5.FFT, p5.Amplitude, and userStartAudio().
  Main links:
  https://p5js.org/reference/p5/loadSound/
  https://p5js.org/reference/p5.sound/p5.AudioIn/
  https://p5js.org/reference/p5.sound/p5.FFT/
  https://p5js.org/reference/p5.sound/p5.Amplitude/
  https://p5js.org/reference/p5/userStartAudio/
*/

// Built-in track for the audio mode
const BUILT_IN_AUDIO_PATH = "Akini Jing - Peacock Feather Fatality.mp3";

// One place to keep all audio-related state
let audioState = {
  mode: "none", // "none", "file", or "mic"
  mic: null, // The mic input, once it exists
  soundFile: null, // The loaded MP3 file
  fft: null, // Reads bass, treble, and waveform data
  amplitude: null, // Reads the overall volume
  audioLevel: 0, // Current volume, kept around 0 to 1
  smoothedLevel: 0, // A less jumpy version of the volume
  bassEnergy: 0, // Low-end energy
  trebleEnergy: 0, // High-end energy
  ripples: [], // Ripples currently on screen
  threshold: 0.08, // How loud it needs to be before a ripple starts
  cooldownFrames: 18, // Minimum gap between ripple triggers
  lastTriggerFrame: -999, // Last frame that created a ripple
  isMicStarted: false, // True once the mic is running
  isFileLoaded: false, // True once the MP3 is ready
  isFilePlaying: false, // True while the MP3 is playing
  controls: null, // The audio control bar
  statusLabel: null, // Small status text in the control bar
  loadError: null, // Stores the load error if the MP3 fails
  lilyMotion: 0, // Overall lily movement from the sound
  bassMotion: 0, // Slower motion from the bass
  trebleMotion: 0, // Faster shimmer from the treble
  visualActive: false, // Keeps the visual layer alive between quiet moments
  perlinDrive: 0, // Audio strength tuned for the Perlin water layer
  perlinPulse: 0, // Peakier audio value for larger Perlin water rings
  perlinBursts: [], // Larger sound-driven rings drawn into the Perlin overlay
  perlinLastBurstFrame: -999, // Last frame that created a Perlin water burst
  perlinLinked: false, // True once this file has wrapped the Perlin hooks
  perlinRenderLinked: false, // True once renderFlowingWater is wrapped
  perlinDropsLinked: false, // True once drawRaindrops is wrapped
  padDance: 0, // Smoothed audio strength for floating lily-pad movement
  padLift: 0, // Bass-heavy lift for brief flying motions
  padLastFlightFrame: -999 // Last frame that kicked lily pads upward
};

// Lily overlay anchors: [x ratio, y ratio, size ratio]
const AUDIO_LILY_OVERLAY_POINTS = [
  [0.12, 0.36, 0.9],
  [0.19, 0.42, 0.7],
  [0.25, 0.41, 0.85],
  [0.39, 0.24, 0.65],
  [0.59, 0.29, 0.72],
  [0.69, 0.3, 0.68],
  [0.61, 0.7, 0.75],
  [0.73, 0.69, 0.82],
  [0.85, 0.83, 0.95]
];

// Source: p5 loadSound() docs show using preload plus success/error callbacks for a sound file.
function preloadAudioMechanic() {
  // p5 calls one callback if the file loads, and the other if it fails
  audioState.soundFile = loadSound(
    BUILT_IN_AUDIO_PATH,
    function () {
      // The MP3 is ready to use
      audioState.isFileLoaded = true;
      audioState.loadError = null;
    },
    function (error) {
      // Keep the error so the UI can show a useful state
      audioState.isFileLoaded = false;
      audioState.loadError = error;
      console.warn("Built-in audio could not load.", error);
    }
  );
}

// Source: p5.AudioIn, p5.FFT, and p5.Amplitude docs helped the setup of mic, frequency, and volume readers.
function setupAudioMechanic() {
  // p5's mic input object
  audioState.mic = new p5.AudioIn();
  // FFT handles the frequency split. The first number smooths the readings
  audioState.fft = new p5.FFT(0.86, 256);
  // Amplitude gives us a simple overall loudness value
  audioState.amplitude = new p5.Amplitude(0.82);

  // If the built-in track is already ready, wire it into the volume analyzer
  if (audioState.soundFile && audioFileReady()) {
    // Keep the track at a comfortable level.
    audioState.soundFile.setVolume(0.72);
    audioState.amplitude.setInput(audioState.soundFile);
  }

  // Build the UI and make sure the labels match the current state
  createAudioControls();
  updateAudioControls();
  linkAudioToPerlinLayer();
}

// Called every frame to keep the audio visuals alive
function updateAudioMechanic() {
  updateAudioAnalysis();
  updateAudioPerlinMotion();
  maybeTriggerAudioRipple();
  updateAudioRipples();
  updateAudioLilyMovement();
  updateAudioFloatingLilyPads();

  // Share the Perlin-tuned level with the rest of the sketch if that global exists
  if (typeof audioLevel !== "undefined") {
    audioLevel = audioState.perlinDrive;
  }
}

// Draw the pulse, ripples, and lily motion layer
function drawAudioLayer() {
  drawActiveAudioPulse();
  drawAudioRipples();
  drawAudioLilyMovementLayer();
}

// Push the existing floating lily pads from this audio file only.
function updateAudioFloatingLilyPads() {
  if (typeof floatingLilyPads === "undefined" || !Array.isArray(floatingLilyPads) || floatingLilyPads.length === 0) {
    return;
  }

  const isActive =
    audioState.mode !== "none" ||
    audioState.isFilePlaying ||
    audioState.isMicStarted ||
    audioState.visualActive;

  const targetDance = isActive
    ? constrain(audioState.smoothedLevel * 0.62 + audioState.bassEnergy * 0.36 + audioState.trebleEnergy * 0.24, 0, 1)
    : 0;
  const targetLift = isActive
    ? constrain(audioState.bassEnergy * 0.74 + audioState.smoothedLevel * 0.32, 0, 1)
    : 0;

  audioState.padDance = lerp(audioState.padDance, targetDance, targetDance > audioState.padDance ? 0.18 : 0.06);
  audioState.padLift = lerp(audioState.padLift, targetLift, targetLift > audioState.padLift ? 0.16 : 0.08);

  if (audioState.padDance < 0.01 || (typeof inputCtrl !== "undefined" && inputCtrl && inputCtrl.isStilled)) {
    return;
  }

  applyAudioPadFlutter();
  maybeTriggerAudioPadFlight();
}

// Add continuous shiver and small dancing currents to every floating lily pad.
function applyAudioPadFlutter() {
  const dance = constrain(audioState.padDance, 0, 1);
  const lift = constrain(audioState.padLift, 0, 1);
  const treble = constrain(audioState.trebleMotion, 0, 1);

  for (let i = 0; i < floatingLilyPads.length; i++) {
    const pad = floatingLilyPads[i];
    const phase = typeof pad.phase === "number" ? pad.phase : i * 0.73;
    const flutter = sin(frameCount * (0.07 + treble * 0.18) + phase * 1.9 + i * 0.41);
    const sway = cos(frameCount * (0.045 + dance * 0.1) + phase + i * 0.67);
    const liftWave = sin(frameCount * 0.058 + phase * 2.1);

    pad.vx += flutter * (0.012 + dance * 0.055 + treble * 0.028);
    pad.vy += sway * (0.008 + treble * 0.035) - lift * (0.012 + max(0, liftWave) * 0.026);
    pad.angularV += sin(frameCount * 0.12 + phase + i) * (0.00016 + dance * 0.0009 + treble * 0.00055);

    pad.vx = constrain(pad.vx, -2.4, 2.4);
    pad.vy = constrain(pad.vy, -2.4, 2.4);
    pad.angularV = constrain(pad.angularV, -0.035, 0.035);
  }
}

// Strong bass hits make a group of pads briefly leap before normal physics pulls them back.
function maybeTriggerAudioPadFlight() {
  const flightStrength = constrain(audioState.padLift * 0.72 + audioState.bassEnergy * 0.35, 0, 1);
  const cooldown = floor(map(flightStrength, 0.28, 1, 32, 12, true));

  if (flightStrength < 0.28 || frameCount - audioState.padLastFlightFrame <= cooldown) {
    return;
  }

  const impulse = 0.28 + flightStrength * 0.52;
  for (let i = 0; i < floatingLilyPads.length; i++) {
    const pad = floatingLilyPads[i];
    const phase = typeof pad.phase === "number" ? pad.phase : i * 0.73;
    const selector = sin(frameCount * 0.19 + i * 1.37 + phase);

    if (selector < -0.18) {
      continue;
    }

    const angle = phase + frameCount * 0.025 + i * 0.43;
    pad.vx += cos(angle) * impulse * 0.42;
    pad.vy -= impulse * (0.48 + max(0, sin(angle * 1.7)) * 0.22);
    pad.angularV += sin(angle) * flightStrength * 0.006;

    pad.vx = constrain(pad.vx, -2.4, 2.4);
    pad.vy = constrain(pad.vy, -2.4, 2.4);
    pad.angularV = constrain(pad.angularV, -0.035, 0.035);
  }

  audioState.padLastFlightFrame = frameCount;
}

// Patch into the Perlin layer from here so the Perlin file itself stays untouched.
// Technique reference: MDN Function.apply(), used here to call the original function with same this/arguments.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply
function linkAudioToPerlinLayer() {
  if (audioState.perlinLinked) {
    return;
  }

  if (typeof renderFlowingWater === "function") {
    const originalRenderFlowingWater = renderFlowingWater;
    renderFlowingWater = function () {
      applyAudioPerlinDriveToGlobals();
      return originalRenderFlowingWater.apply(this, arguments);
    };
    audioState.perlinRenderLinked = true;
  }

  if (typeof drawRaindrops === "function") {
    const originalDrawRaindrops = drawRaindrops;
    drawRaindrops = function (g) {
      applyAudioPerlinDriveToGlobals();
      originalDrawRaindrops.apply(this, arguments);
      drawAudioPerlinBursts(g);
    };
    audioState.perlinDropsLinked = true;
  }

  audioState.perlinLinked = audioState.perlinRenderLinked || audioState.perlinDropsLinked;
}

// Convert raw audio analysis into a water-focused drive value.
function updateAudioPerlinMotion() {
  if (!audioState.perlinLinked) {
    linkAudioToPerlinLayer();
  }

  const targetDrive = getAudioPerlinDriveTarget();
  const driveEase = targetDrive > audioState.perlinDrive ? 0.18 : 0.055;
  audioState.perlinDrive = lerp(audioState.perlinDrive, targetDrive, driveEase);

  const targetPulse = constrain(
    audioState.bassEnergy * 0.72 + audioState.smoothedLevel * 0.46 + audioState.trebleEnergy * 0.14,
    0,
    1
  );
  const pulseEase = targetPulse > audioState.perlinPulse ? 0.2 : 0.08;
  audioState.perlinPulse = lerp(audioState.perlinPulse, targetPulse, pulseEase);

  maybeTriggerAudioPerlinBurst();
}

// Bass and volume push the pond; treble adds a small current-like lift.
function getAudioPerlinDriveTarget() {
  const isActive =
    audioState.mode !== "none" ||
    audioState.isFilePlaying ||
    audioState.isMicStarted ||
    audioState.visualActive;

  if (!isActive) {
    return 0;
  }

  const fileLift = audioState.mode === "file" && audioState.isFilePlaying ? 0.04 : 0;
  return constrain(
    fileLift + audioState.smoothedLevel * 0.7 + audioState.bassEnergy * 0.45 + audioState.trebleEnergy * 0.2,
    0,
    1
  );
}

// Feed the Perlin globals right before the Perlin layer renders a frame.
function applyAudioPerlinDriveToGlobals() {
  const drive = Number.isFinite(audioState.perlinDrive) ? constrain(audioState.perlinDrive, 0, 1) : 0;

  if (typeof audioLevel !== "undefined") {
    const currentLevel = Number.isFinite(audioLevel) ? audioLevel : 0;
    audioLevel = max(currentLevel, drive);
  }

  if (drive < 0.002) {
    return;
  }

  if (typeof flowZ !== "undefined") {
    flowZ += drive * 0.00075 + audioState.bassMotion * 0.00045;
  }

  if (typeof flowPhase !== "undefined") {
    flowPhase += drive * 0.0035 + audioState.trebleMotion * 0.0018;
  }
}

// Add larger rings to the Perlin overlay on musical hits.
function maybeTriggerAudioPerlinBurst() {
  if (audioState.mode === "none" || !audioState.visualActive) {
    return;
  }

  const burstStrength = constrain(
    audioState.perlinPulse * 0.72 + audioState.bassEnergy * 0.42 + audioState.smoothedLevel * 0.25,
    0,
    1
  );
  const cooldown = floor(map(burstStrength, 0.18, 1, 34, 10, true));

  if (burstStrength > 0.18 && frameCount - audioState.perlinLastBurstFrame > cooldown) {
    createAudioPerlinBurst(burstStrength);
    if (burstStrength > 0.58) {
      createAudioPerlinBurst(burstStrength * 0.74);
    }
    audioState.perlinLastBurstFrame = frameCount;
  }
}

// Store a large water ring in artwork coordinates, so it sits inside flowLayer.
function createAudioPerlinBurst(strength) {
  if (typeof ART_W === "undefined" || typeof ART_H === "undefined") {
    return;
  }

  const safeStrength = constrain(strength, 0, 1);
  const position = randomAudioPerlinWaterPosition();
  audioState.perlinBursts.push({
    x: position.x,
    y: position.y,
    age: 0,
    life: floor(30 + safeStrength * 28),
    maxRadius: 42 + safeStrength * 145 + audioState.bassEnergy * 68,
    alpha: 70 + safeStrength * 105,
    strokeWeight: 0.75 + safeStrength * 2.2,
    phase: random(TWO_PI)
  });

  if (audioState.perlinBursts.length > 12) {
    audioState.perlinBursts.splice(0, audioState.perlinBursts.length - 12);
  }
}

// Prefer actual water pixels when the Perlin layer exposes its classifier.
function randomAudioPerlinWaterPosition() {
  const artW = typeof ART_W !== "undefined" ? ART_W : 1000;
  const artH = typeof ART_H !== "undefined" ? ART_H : 1000;
  let fallback = {
    x: artW * random(0.08, 0.92),
    y: artH * random(0.18, 0.92)
  };

  for (let i = 0; i < 10; i++) {
    const x = artW * random(0.08, 0.92);
    const y = artH * random(0.16, 0.94);
    fallback = { x: x, y: y };

    if (typeof pixelIsWater !== "function" || pixelIsWater(x, y)) {
      return fallback;
    }
  }

  return fallback;
}

// Draw and age audio-made rings inside the same buffer as the Perlin raindrops.
function drawAudioPerlinBursts(g) {
  if (!g || audioState.perlinBursts.length === 0) {
    return;
  }

  g.push();
  g.noFill();
  g.blendMode(SCREEN);

  for (let i = audioState.perlinBursts.length - 1; i >= 0; i--) {
    const burst = audioState.perlinBursts[i];
    const t = constrain(burst.age / burst.life, 0, 1);
    const ease = 1 - Math.pow(1 - t, 2);
    const fade = Math.pow(1 - t, 1.35);
    const radius = burst.maxRadius * ease;
    const wobble = sin(frameCount * 0.03 + burst.phase) * burst.maxRadius * 0.035;
    const ringRadius = max(0, radius + wobble);
    const alpha = burst.alpha * fade;

    g.stroke(220, 244, 255, alpha * 0.72);
    g.strokeWeight(max(0.45, burst.strokeWeight * (1 - t * 0.35)));
    g.ellipse(burst.x, burst.y, ringRadius * 2.35, ringRadius * 0.74);

    g.stroke(255, 236, 196, alpha * 0.32);
    g.strokeWeight(max(0.3, burst.strokeWeight * 0.45));
    g.ellipse(burst.x, burst.y, ringRadius * 2.95, ringRadius * 0.94);

    if (t < 0.16) {
      g.noStroke();
      g.fill(236, 248, 255, alpha * (1 - t / 0.16) * 0.42);
      g.circle(burst.x, burst.y, 5 + audioState.perlinPulse * 8);
      g.noFill();
    }

    burst.age++;
    if (burst.age > burst.life) {
      audioState.perlinBursts.splice(i, 1);
    }
  }

  g.blendMode(BLEND);
  g.pop();
}

// Start the built-in track and use it as the audio source
function startBuiltInAudio() {
  // Bail out if the MP3 is missing or still loading
  if (!audioState.soundFile || !audioFileReady()) {
    // Keep the original error if we already have one
    audioState.loadError = audioState.loadError || "Audio file is not loaded yet.";
    updateAudioControls();
    console.warn("Built-in audio is unavailable. Current path:", BUILT_IN_AUDIO_PATH);
    return;
  }

  // Browser audio needs a real user gesture before it can play
  userStartAudio();

  // Only listen to one source at a time
  if (audioState.mic && audioState.isMicStarted) {
    audioState.mic.stop();
    audioState.isMicStarted = false;
  }

  // Point both analyzers at the MP3
  audioState.mode = "file";
  audioState.fft.setInput(audioState.soundFile);
  audioState.amplitude.setInput(audioState.soundFile);

  // Avoid restarting the track if it is already going
  const wasAlreadyPlaying = audioState.soundFile.isPlaying();
  if (!wasAlreadyPlaying) {
    audioState.soundFile.loop();
  }

  // Let the visual side know it should wake up
  audioState.isFilePlaying = true;
  audioState.visualActive = true;

  if (!wasAlreadyPlaying) {
    // Give the first click an immediate ripple
    createAudioRipple(width * 0.5, height * 0.58, 0.07, 0.12, 0.06);
    createAudioPerlinBurst(0.32);
    audioState.lastTriggerFrame = frameCount;
  }

  updateAudioControls();
}

// Pause the built-in track and quiet the visual layer
function pauseBuiltInAudio() {
  // Only pause if there is something actually playing
  if (audioState.soundFile && audioState.soundFile.isPlaying()) {
    audioState.soundFile.pause();
  }

  // Update the flags used by the analyzers and UI
  audioState.isFilePlaying = false;
  audioState.visualActive = false;

  if (audioState.mode === "file") {
    audioState.mode = "none";
  }

  updateAudioControls();
}

// Ask for mic access and switch the analyzers to the mic
function startMicrophoneInput() {
  // Same browser rule: audio starts after a user action
  userStartAudio();
  // Stop the track before listening to the mic
  pauseBuiltInAudio();

  // Recreate the mic object if something cleared it
  if (!audioState.mic) {
    audioState.mic = new p5.AudioIn();
  }

  // start() asks the browser for mic permission
  audioState.mic.start(
    function () {
      // Mic is live, so route the analyzers there
      audioState.isMicStarted = true;
      audioState.mode = "mic";
      audioState.visualActive = true;
      audioState.fft.setInput(audioState.mic);
      audioState.amplitude.setInput(audioState.mic);
      updateAudioControls();
    },
    function (error) {
      // Permission was denied, or the mic was not available
      audioState.isMicStarted = false;
      audioState.mode = "none";
      console.warn("Microphone input could not start.", error);
      updateAudioControls();
    }
  );
}

// Make one ripple from the current audio hit
function createAudioRipple(x, y, level, bass, treble) {
  // Clamp the inputs so one weird spike does not blow up the drawing
  const safeLevel = constrain(level, 0, 1);
  const safeBass = constrain(bass, 0, 1);
  const safeTreble = constrain(treble, 0, 1);
  // More bass pushes the ripple toward a warmer color
  const rippleColor = lerpColor(color(188, 215, 255), color(255, 232, 184), safeBass);

  // Store the ripple so it can expand over the next few frames
  audioState.ripples.push({
    x: x, // Ripple center x
    y: y, // Ripple center y
    radius: 6 + safeLevel * 10, // Louder hits start a little bigger
    maxRadius: 70 + safeLevel * 180 + safeBass * 65, // Bass lets it travel farther
    speed: 0.55 + safeLevel * 1.45 + safeTreble * 0.85 - safeBass * 0.12, // Treble feels quicker
    alpha: 58 + safeLevel * 96, // Louder hits show up more
    strokeWeight: 0.65 + safeLevel * 2.1 + safeBass * 1.2 - safeTreble * 0.2, // Line weight for the ripple
    colour: {
      // Save RGB pieces so drawing the stroke later is simple
      r: red(rippleColor),
      g: green(rippleColor),
      b: blue(rippleColor)
    }
  });

  // Keep the ripple list small
  if (audioState.ripples.length > 18) {
    // Drop the oldest extras
    audioState.ripples.splice(0, audioState.ripples.length - 18);
  }
}

// Grow and fade the active ripples
function updateAudioRipples() {
  // Walk backward so deleting items does not mess up the loop
  for (let i = audioState.ripples.length - 1; i >= 0; i--) {
    const ripple = audioState.ripples[i];
    // Move the ring outward.
    ripple.radius += ripple.speed;
    // Fade faster as it gets close to the end
    ripple.alpha -= 0.85 + ripple.radius / ripple.maxRadius;

    // Remove finished ripples
    if (ripple.alpha <= 0 || ripple.radius > ripple.maxRadius) {
      audioState.ripples.splice(i, 1);
    }
  }
}

// Draw all current ripples
function drawAudioRipples() {
  // Keep these drawing settings from leaking into other layers
  push();
  noFill();
  // Screen blend gives the ripples a soft glow
  blendMode(SCREEN);

  // Draw each ripple as two thin ellipses
  for (let ripple of audioState.ripples) {
    stroke(ripple.colour.r, ripple.colour.g, ripple.colour.b, min(150, ripple.alpha * 0.82));
    strokeWeight(max(0.45, ripple.strokeWeight));
    // Wide, flat ellipses read more like ripples on water
    ellipse(ripple.x, ripple.y, ripple.radius * 2, ripple.radius * 0.78);

    // A larger faint ring makes the ripple feel softer
    stroke(ripple.colour.r, ripple.colour.g, ripple.colour.b, ripple.alpha * 0.24);
    strokeWeight(max(0.25, ripple.strokeWeight * 0.35));
    ellipse(ripple.x, ripple.y, ripple.radius * 2.45, ripple.radius * 0.95);
  }

  // Go back to the normal drawing mode
  blendMode(BLEND);
  pop();
}

// Draw the small pulsing glow while audio is active
function drawActiveAudioPulse() {
  // Ask the file directly too, in case the flags are a frame behind
  const fileIsPlaying = audioState.soundFile && audioState.soundFile.isPlaying();
  // Any of these means the audio layer should stay visible
  const isActive =
    audioState.mode !== "none" ||
    fileIsPlaying ||
    audioState.isFilePlaying ||
    audioState.isMicStarted ||
    audioState.visualActive;

  // Nothing to show right now
  if (!isActive) {
    return;
  }

  // Match the pulse to the scaled artwork
  const artBox = getAudioArtBox();
  // Keep a tiny baseline so the pulse does not vanish instantly
  const activeLevel = max(audioState.smoothedLevel, audioState.visualActive ? 0.04 : 0.01);
  const bassPulse = max(audioState.bassMotion, audioState.visualActive ? 0.04 : 0);
  const treblePulse = max(audioState.trebleMotion, audioState.visualActive ? 0.03 : 0);
  // Tiny sine and cosine offsets make it breathe instead of sitting still
  const centerX = artBox.x + artBox.w * (0.5 + sin(frameCount * 0.011) * 0.035);
  const centerY = artBox.y + artBox.h * (0.58 + cos(frameCount * 0.014) * 0.025);
  const radius = artBox.w * (0.045 + activeLevel * 0.075 + sin(frameCount * 0.028) * 0.006);

  push();
  noFill();
  blendMode(BLEND);

  // Main cool ring, mostly driven by volume
  stroke(242, 250, 255, 40 + activeLevel * 64);
  strokeWeight(0.9 + activeLevel * 2.4 + bassPulse * 1.2);
  ellipse(centerX, centerY, radius * 2.2, radius * 0.86);

  // Warm ring for bass
  stroke(255, 231, 183, 28 + bassPulse * 52);
  strokeWeight(0.65 + bassPulse * 1.7);
  ellipse(centerX, centerY, radius * 2.9, radius * 1.08);

  // Thin bright ring for treble
  stroke(198, 226, 255, 24 + treblePulse * 44);
  strokeWeight(0.45 + treblePulse * 1.1);
  ellipse(centerX, centerY, radius * 1.4, radius * 0.52);

  blendMode(BLEND);
  pop();
}

// Smooth the audio values into lily movement
function updateAudioLilyMovement() {
  // Louder audio means more motion, with a gentle cap
  const targetMotion = constrain(audioState.smoothedLevel * 0.78, 0, 0.35);
  // Lerp keeps the motion from snapping around
  audioState.lilyMotion = lerp(audioState.lilyMotion, targetMotion, 0.08);
  audioState.bassMotion = lerp(audioState.bassMotion, audioState.bassEnergy, 0.06);
  audioState.trebleMotion = lerp(audioState.trebleMotion, audioState.trebleEnergy, 0.08);
}

// Add subtle sound-driven movement around the lily points
function drawAudioLilyMovementLayer() {
  // Skip this layer when the movement is basically invisible
  if (audioState.lilyMotion < 0.01) {
    return;
  }

  const artBox = getAudioArtBox();
  // Bass gives slower, wider drifting
  const slowAmp = artBox.w * (0.002 + audioState.bassMotion * 0.012) * audioState.lilyMotion;
  // Treble adds a quicker shimmer
  const fastAmp = artBox.w * audioState.trebleMotion * 0.006 * audioState.lilyMotion;
  // Separate strengths for highlights and shadows
  const highlightAlpha = 8 + audioState.lilyMotion * 24;
  const shadowAlpha = 5 + audioState.bassMotion * 14;

  push();
  noFill();

  // Each anchor gets its own little wobble
  for (let i = 0; i < AUDIO_LILY_OVERLAY_POINTS.length; i++) {
    const point = AUDIO_LILY_OVERLAY_POINTS[i];
    // The point stores x, y, and size as artwork-relative ratios
    const baseX = artBox.x + artBox.w * point[0];
    const baseY = artBox.y + artBox.h * point[1];
    const size = artBox.w * 0.055 * point[2];
    // Offset by i so every point moves a little differently
    const slow = sin(frameCount * (0.018 + audioState.bassMotion * 0.018) + i * 1.7);
    const fast = sin(frameCount * (0.09 + audioState.trebleMotion * 0.16) + i * 2.3);
    // Final position shift and tiny rotation
    const dx = slow * slowAmp + fast * fastAmp;
    const dy = cos(frameCount * 0.02 + i) * slowAmp * 0.45;
    const rot = sin(frameCount * 0.022 + i) * audioState.lilyMotion * 0.09;

    // Draw this detail in its own tiny local space
    push();
    translate(baseX + dx, baseY + dy);
    rotate(rot);

    // Soft shadow under the moving highlight
    stroke(22, 34, 52, shadowAlpha);
    strokeWeight(max(0.45, size * 0.018));
    ellipse(size * 0.08, size * 0.08, size * 1.15, size * 0.42);

    // Light arc on top
    blendMode(SCREEN);
    stroke(230, 248, 204, highlightAlpha);
    strokeWeight(max(0.4, size * 0.01));
    arc(0, 0, size, size * 0.42, PI * 1.08, TWO_PI * 0.96);

    // Extra little glint when the treble pops
    if (audioState.trebleMotion > 0.25) {
      stroke(235, 245, 255, highlightAlpha * 0.36);
      strokeWeight(0.45);
      line(-size * 0.25, -size * 0.04, size * 0.28, size * 0.02);
    }

    blendMode(BLEND);
    pop();
  }

  pop();
}

// Source: p5.FFT docs say analyze() should run before getEnergy(), and waveform() gives samples for RMS.
function updateAudioAnalysis() {
  // With no source, ease everything back down to silence.
  if (!audioState.fft || audioState.mode === "none") {
    audioState.audioLevel = lerp(audioState.audioLevel, 0, 0.08);
    audioState.smoothedLevel = lerp(audioState.smoothedLevel, 0, 0.08);
    audioState.bassEnergy = lerp(audioState.bassEnergy, 0, 0.08);
    audioState.trebleEnergy = lerp(audioState.trebleEnergy, 0, 0.08);
    audioState.isFilePlaying = false;
    return;
  }

  // File mode needs the track to still be playing
  if (audioState.mode === "file") {
    if (!audioState.soundFile || !audioState.soundFile.isPlaying()) {
      // The track stopped, so reset the audio state.
      audioState.isFilePlaying = false;
      audioState.mode = "none";
      updateAudioControls();
      return;
    }

    audioState.isFilePlaying = true;
  }

  // Pull fresh frequency data for this frame
  audioState.fft.analyze();

  // Use the stronger of the waveform RMS and p5's amplitude reading
  let level = max(getFftRmsLevel(), audioState.amplitude ? audioState.amplitude.getLevel() : 0);
  if (audioState.mode === "mic" && audioState.mic) {
    // The mic has its own level reading, so include that too
    level = max(level, audioState.mic.getLevel());
  }

  // p5 gives energy as 0 to 255; normalize it to 0 to 1
  const bass = audioState.fft.getEnergy("bass") / 255;
  const treble = audioState.fft.getEnergy("treble") / 255;
  // The file needs a bit more gain than the mic.
  const levelScale = audioState.mode === "file" ? 3.1 : 2.2;

  // Smooth the values so the animation feels more fluid
  audioState.audioLevel = lerp(audioState.audioLevel, constrain(level * levelScale, 0, 1), 0.18);
  audioState.smoothedLevel = lerp(audioState.smoothedLevel, audioState.audioLevel, 0.08);
  audioState.bassEnergy = lerp(audioState.bassEnergy, bass, 0.16);
  audioState.trebleEnergy = lerp(audioState.trebleEnergy, treble, 0.18);
}

// Decide whether this frame should spawn a new ripple
function maybeTriggerAudioRipple() {
  // No audio source, no ripple
  if (audioState.mode === "none") {
    return;
  }

  // Blend volume, bass, and treble into one trigger value
  const triggerStrength =
    audioState.smoothedLevel * 0.5 +
    audioState.bassEnergy * 0.13 +
    audioState.trebleEnergy * 0.08;
  // File playback gets a small boost so steady music still feels alive
  const filePulse =
    audioState.mode === "file" && audioState.isFilePlaying
      ? 0.015 + audioState.smoothedLevel * 0.38 + audioState.bassEnergy * 0.11 + audioState.trebleEnergy * 0.06
      : 0;
  // Use whichever trigger is stronger
  const finalTriggerStrength = max(triggerStrength, filePulse);

  // Trigger only if it is loud enough and the cooldown is over
  if (
    finalTriggerStrength > audioState.threshold &&
    frameCount - audioState.lastTriggerFrame > audioState.cooldownFrames
  ) {
    // Place the ripple somewhere on the pond area
    const position = randomAudioPondPosition();
    createAudioRipple(position.x, position.y, finalTriggerStrength, audioState.bassEnergy, audioState.trebleEnergy);
    // Remember when this ripple happened
    audioState.lastTriggerFrame = frameCount;
    // Stronger hits get a shorter cooldown, so they can ripple faster
    audioState.cooldownFrames = floor(map(finalTriggerStrength, audioState.threshold, 0.5, 30, 12, true));
  }
}

// Get RMS volume from the FFT waveform
function getFftRmsLevel() {
  // waveform() is a list of samples, usually from -1 to 1.
  const waveform = audioState.fft.waveform();
  let sum = 0;

  // Square each sample so negative and positive waves both count
  for (let i = 0; i < waveform.length; i++) {
    sum += waveform[i] * waveform[i];
  }

  // Average, then square root
  return sqrt(sum / waveform.length);
}

// Pick a random ripple spot inside the artwork area
function randomAudioPondPosition() {
  const artBox = getAudioArtBox();

  return {
    // Keep the final position inside the canvas.
    x: constrain(artBox.x + artBox.w * random(0.06, 0.94), 0, width),
    y: constrain(artBox.y + artBox.h * random(0.18, 0.92), 0, height)
  };
}

// Figure out where the scaled artwork sits on the canvas
function getAudioArtBox() {
  // Fall back to a square if the main sketch did not define the art size.
  const baseWidth = typeof ART_W !== "undefined" ? ART_W : 1000;
  const baseHeight = typeof ART_H !== "undefined" ? ART_H : 1000;
  // Scale to cover the whole canvas
  const scaleFactor = max(width / baseWidth, height / baseHeight);
  const drawW = baseWidth * scaleFactor;
  const drawH = baseHeight * scaleFactor;

  // Return the box the rest of this file can line up with
  return {
    x: (width - drawW) * 0.5,
    y: (height - drawH) * 0.5,
    w: drawW,
    h: drawH
  };
}

// Source: p5 DOM reference for createDiv(), createButton(), createSpan(), and mousePressed() event handlers.
// https://p5js.org/reference/p5/createDiv/
// https://p5js.org/reference/p5/createButton/
// https://p5js.org/reference/p5/createSpan/
// https://p5js.org/reference/p5.Element/mousePressed/
function createAudioControls() {
  // Remove the old controls if setup runs again.
  if (audioState.controls) {
    audioState.controls.remove();
  }

  // p5 DOM elements, styled inline for this sketch
  const controls = createDiv();
  controls.id("audio-controls");
  controls.position(18, 18);
  controls.style("display", "flex");
  controls.style("gap", "8px");
  controls.style("align-items", "center");
  controls.style("z-index", "10");
  controls.style("font-family", "Arial, Helvetica, sans-serif");

  // Main play/pause button for the MP3
  const fileButton = createButton("Play audio");
  fileButton.parent(controls);
  // Click toggles the built-in track
  fileButton.mousePressed(function () {
    if (audioState.isFilePlaying) {
      pauseBuiltInAudio();
    } else {
      startBuiltInAudio();
    }
  });
  styleAudioButton(fileButton);

  // Mic button uses live input instead
  const micButton = createButton("Use mic");
  micButton.parent(controls);
  micButton.mousePressed(startMicrophoneInput);
  styleAudioButton(micButton);

  // Small status label next to the buttons
  const statusLabel = createSpan("Audio idle");
  statusLabel.parent(controls);
  statusLabel.style("color", "rgba(242, 239, 224, 0.84)");
  statusLabel.style("font-size", "12px");
  statusLabel.style("text-shadow", "0 1px 4px rgba(0, 0, 0, 0.45)");

  // Save these so updateAudioControls() can edit them later
  audioState.controls = controls;
  audioState.fileButton = fileButton;
  audioState.micButton = micButton;
  audioState.statusLabel = statusLabel;
}

// Shared button styling
function styleAudioButton(button) {
  button.style("border", "1px solid rgba(242, 239, 224, 0.38)");
  button.style("background", "rgba(20, 34, 42, 0.58)");
  button.style("color", "#f2efe4");
  button.style("border-radius", "6px");
  button.style("padding", "7px 10px");
  button.style("font-size", "12px");
  button.style("cursor", "pointer");
  button.style("backdrop-filter", "blur(6px)");
}

// Keep the controls in sync with the current audio state
function updateAudioControls() {
  // Nothing to update yet.
  if (!audioState.controls) {
    return;
  }

  // Flip the button label based on playback
  audioState.fileButton.html(audioState.isFilePlaying ? "Pause audio" : "Play audio");

  // Show the active source, or the error state
  if (audioState.mode === "file") {
    audioState.statusLabel.html("Built-in audio");
  } else if (audioState.mode === "mic") {
    audioState.statusLabel.html("Microphone");
  } else if (audioState.loadError) {
    audioState.statusLabel.html("Audio file unavailable");
  } else {
    audioState.statusLabel.html("Audio idle");
  }
}

// Check whether the built-in MP3 is ready to play
function audioFileReady() {
  return (
    // Our own success flag.
    audioState.isFileLoaded ||
    // Or p5's built-in loaded check.
    (audioState.soundFile &&
      typeof audioState.soundFile.isLoaded === "function" &&
      audioState.soundFile.isLoaded())
  );
}
