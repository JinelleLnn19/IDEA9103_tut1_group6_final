const BUILT_IN_AUDIO_PATH = "Akini Jing - Peacock Feather Fatality.mp3";

let audioState = {
  mode: "none",
  mic: null,
  soundFile: null,
  fft: null,
  amplitude: null,
  audioLevel: 0,
  smoothedLevel: 0,
  bassEnergy: 0,
  trebleEnergy: 0,
  ripples: [],
  threshold: 0.08,
  cooldownFrames: 18,
  lastTriggerFrame: -999,
  isMicStarted: false,
  isFileLoaded: false,
  isFilePlaying: false,
  controls: null,
  statusLabel: null,
  loadError: null,
  lilyMotion: 0,
  bassMotion: 0,
  trebleMotion: 0,
  visualActive: false
};

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

function preloadAudioMechanic() {
  audioState.soundFile = loadSound(
    BUILT_IN_AUDIO_PATH,
    function () {
      audioState.isFileLoaded = true;
      audioState.loadError = null;
    },
    function (error) {
      audioState.isFileLoaded = false;
      audioState.loadError = error;
      console.warn("Built-in audio could not load.", error);
    }
  );
}

function setupAudioMechanic() {
  audioState.mic = new p5.AudioIn();
  audioState.fft = new p5.FFT(0.86, 256);
  audioState.amplitude = new p5.Amplitude(0.82);

  if (audioState.soundFile && audioFileReady()) {
    audioState.soundFile.setVolume(0.72);
    audioState.amplitude.setInput(audioState.soundFile);
  }

  createAudioControls();
  updateAudioControls();
}

function updateAudioMechanic() {
  updateAudioAnalysis();
  maybeTriggerAudioRipple();
  updateAudioRipples();
  updateAudioLilyMovement();

  if (typeof audioLevel !== "undefined") {
    audioLevel = audioState.smoothedLevel;
  }
}

function drawAudioLayer() {
  drawActiveAudioPulse();
  drawAudioRipples();
  drawAudioLilyMovementLayer();
}

function startBuiltInAudio() {
  if (!audioState.soundFile || !audioFileReady()) {
    audioState.loadError = audioState.loadError || "Audio file is not loaded yet.";
    updateAudioControls();
    console.warn("Built-in audio is unavailable. Current path:", BUILT_IN_AUDIO_PATH);
    return;
  }

  userStartAudio();

  if (audioState.mic && audioState.isMicStarted) {
    audioState.mic.stop();
    audioState.isMicStarted = false;
  }

  audioState.mode = "file";
  audioState.fft.setInput(audioState.soundFile);
  audioState.amplitude.setInput(audioState.soundFile);

  const wasAlreadyPlaying = audioState.soundFile.isPlaying();
  if (!wasAlreadyPlaying) {
    audioState.soundFile.loop();
  }

  audioState.isFilePlaying = true;
  audioState.visualActive = true;

  if (!wasAlreadyPlaying) {
    createAudioRipple(width * 0.5, height * 0.58, 0.07, 0.12, 0.06);
    audioState.lastTriggerFrame = frameCount;
  }

  updateAudioControls();
}

function pauseBuiltInAudio() {
  if (audioState.soundFile && audioState.soundFile.isPlaying()) {
    audioState.soundFile.pause();
  }

  audioState.isFilePlaying = false;
  audioState.visualActive = false;

  if (audioState.mode === "file") {
    audioState.mode = "none";
  }

  updateAudioControls();
}

function startMicrophoneInput() {
  userStartAudio();
  pauseBuiltInAudio();

  if (!audioState.mic) {
    audioState.mic = new p5.AudioIn();
  }

  audioState.mic.start(
    function () {
      audioState.isMicStarted = true;
      audioState.mode = "mic";
      audioState.visualActive = true;
      audioState.fft.setInput(audioState.mic);
      audioState.amplitude.setInput(audioState.mic);
      updateAudioControls();
    },
    function (error) {
      audioState.isMicStarted = false;
      audioState.mode = "none";
      console.warn("Microphone input could not start.", error);
      updateAudioControls();
    }
  );
}

function createAudioRipple(x, y, level, bass, treble) {
  const safeLevel = constrain(level, 0, 1);
  const safeBass = constrain(bass, 0, 1);
  const safeTreble = constrain(treble, 0, 1);
  const rippleColor = lerpColor(color(188, 215, 255), color(255, 232, 184), safeBass);

  audioState.ripples.push({
    x: x,
    y: y,
    radius: 6 + safeLevel * 10,
    maxRadius: 70 + safeLevel * 180 + safeBass * 65,
    speed: 0.55 + safeLevel * 1.45 + safeTreble * 0.85 - safeBass * 0.12,
    alpha: 58 + safeLevel * 96,
    strokeWeight: 0.65 + safeLevel * 2.1 + safeBass * 1.2 - safeTreble * 0.2,
    colour: {
      r: red(rippleColor),
      g: green(rippleColor),
      b: blue(rippleColor)
    }
  });

  if (audioState.ripples.length > 18) {
    audioState.ripples.splice(0, audioState.ripples.length - 18);
  }
}

function updateAudioRipples() {
  for (let i = audioState.ripples.length - 1; i >= 0; i--) {
    const ripple = audioState.ripples[i];
    ripple.radius += ripple.speed;
    ripple.alpha -= 0.85 + ripple.radius / ripple.maxRadius;

    if (ripple.alpha <= 0 || ripple.radius > ripple.maxRadius) {
      audioState.ripples.splice(i, 1);
    }
  }
}

function drawAudioRipples() {
  push();
  noFill();
  blendMode(SCREEN);

  for (let ripple of audioState.ripples) {
    stroke(ripple.colour.r, ripple.colour.g, ripple.colour.b, min(150, ripple.alpha * 0.82));
    strokeWeight(max(0.45, ripple.strokeWeight));
    ellipse(ripple.x, ripple.y, ripple.radius * 2, ripple.radius * 0.78);

    stroke(ripple.colour.r, ripple.colour.g, ripple.colour.b, ripple.alpha * 0.24);
    strokeWeight(max(0.25, ripple.strokeWeight * 0.35));
    ellipse(ripple.x, ripple.y, ripple.radius * 2.45, ripple.radius * 0.95);
  }

  blendMode(BLEND);
  pop();
}

function drawActiveAudioPulse() {
  const fileIsPlaying = audioState.soundFile && audioState.soundFile.isPlaying();
  const isActive =
    audioState.mode !== "none" ||
    fileIsPlaying ||
    audioState.isFilePlaying ||
    audioState.isMicStarted ||
    audioState.visualActive;

  if (!isActive) {
    return;
  }

  const artBox = getAudioArtBox();
  const activeLevel = max(audioState.smoothedLevel, audioState.visualActive ? 0.04 : 0.01);
  const bassPulse = max(audioState.bassMotion, audioState.visualActive ? 0.04 : 0);
  const treblePulse = max(audioState.trebleMotion, audioState.visualActive ? 0.03 : 0);
  const centerX = artBox.x + artBox.w * (0.5 + sin(frameCount * 0.011) * 0.035);
  const centerY = artBox.y + artBox.h * (0.58 + cos(frameCount * 0.014) * 0.025);
  const radius = artBox.w * (0.045 + activeLevel * 0.075 + sin(frameCount * 0.028) * 0.006);

  push();
  noFill();
  blendMode(BLEND);

  stroke(242, 250, 255, 40 + activeLevel * 64);
  strokeWeight(0.9 + activeLevel * 2.4 + bassPulse * 1.2);
  ellipse(centerX, centerY, radius * 2.2, radius * 0.86);

  stroke(255, 231, 183, 28 + bassPulse * 52);
  strokeWeight(0.65 + bassPulse * 1.7);
  ellipse(centerX, centerY, radius * 2.9, radius * 1.08);

  stroke(198, 226, 255, 24 + treblePulse * 44);
  strokeWeight(0.45 + treblePulse * 1.1);
  ellipse(centerX, centerY, radius * 1.4, radius * 0.52);

  blendMode(BLEND);
  pop();
}

function updateAudioLilyMovement() {
  const targetMotion = constrain(audioState.smoothedLevel * 0.78, 0, 0.35);
  audioState.lilyMotion = lerp(audioState.lilyMotion, targetMotion, 0.08);
  audioState.bassMotion = lerp(audioState.bassMotion, audioState.bassEnergy, 0.06);
  audioState.trebleMotion = lerp(audioState.trebleMotion, audioState.trebleEnergy, 0.08);
}

function drawAudioLilyMovementLayer() {
  if (audioState.lilyMotion < 0.01) {
    return;
  }

  const artBox = getAudioArtBox();
  const slowAmp = artBox.w * (0.002 + audioState.bassMotion * 0.012) * audioState.lilyMotion;
  const fastAmp = artBox.w * audioState.trebleMotion * 0.006 * audioState.lilyMotion;
  const highlightAlpha = 8 + audioState.lilyMotion * 24;
  const shadowAlpha = 5 + audioState.bassMotion * 14;

  push();
  noFill();

  for (let i = 0; i < AUDIO_LILY_OVERLAY_POINTS.length; i++) {
    const point = AUDIO_LILY_OVERLAY_POINTS[i];
    const baseX = artBox.x + artBox.w * point[0];
    const baseY = artBox.y + artBox.h * point[1];
    const size = artBox.w * 0.055 * point[2];
    const slow = sin(frameCount * (0.018 + audioState.bassMotion * 0.018) + i * 1.7);
    const fast = sin(frameCount * (0.09 + audioState.trebleMotion * 0.16) + i * 2.3);
    const dx = slow * slowAmp + fast * fastAmp;
    const dy = cos(frameCount * 0.02 + i) * slowAmp * 0.45;
    const rot = sin(frameCount * 0.022 + i) * audioState.lilyMotion * 0.09;

    push();
    translate(baseX + dx, baseY + dy);
    rotate(rot);

    stroke(22, 34, 52, shadowAlpha);
    strokeWeight(max(0.45, size * 0.018));
    ellipse(size * 0.08, size * 0.08, size * 1.15, size * 0.42);

    blendMode(SCREEN);
    stroke(230, 248, 204, highlightAlpha);
    strokeWeight(max(0.4, size * 0.01));
    arc(0, 0, size, size * 0.42, PI * 1.08, TWO_PI * 0.96);

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

function updateAudioAnalysis() {
  if (!audioState.fft || audioState.mode === "none") {
    audioState.audioLevel = lerp(audioState.audioLevel, 0, 0.08);
    audioState.smoothedLevel = lerp(audioState.smoothedLevel, 0, 0.08);
    audioState.bassEnergy = lerp(audioState.bassEnergy, 0, 0.08);
    audioState.trebleEnergy = lerp(audioState.trebleEnergy, 0, 0.08);
    audioState.isFilePlaying = false;
    return;
  }

  if (audioState.mode === "file") {
    if (!audioState.soundFile || !audioState.soundFile.isPlaying()) {
      audioState.isFilePlaying = false;
      audioState.mode = "none";
      updateAudioControls();
      return;
    }

    audioState.isFilePlaying = true;
  }

  audioState.fft.analyze();

  let level = max(getFftRmsLevel(), audioState.amplitude ? audioState.amplitude.getLevel() : 0);
  if (audioState.mode === "mic" && audioState.mic) {
    level = max(level, audioState.mic.getLevel());
  }

  const bass = audioState.fft.getEnergy("bass") / 255;
  const treble = audioState.fft.getEnergy("treble") / 255;
  const levelScale = audioState.mode === "file" ? 3.1 : 2.2;

  audioState.audioLevel = lerp(audioState.audioLevel, constrain(level * levelScale, 0, 1), 0.18);
  audioState.smoothedLevel = lerp(audioState.smoothedLevel, audioState.audioLevel, 0.08);
  audioState.bassEnergy = lerp(audioState.bassEnergy, bass, 0.16);
  audioState.trebleEnergy = lerp(audioState.trebleEnergy, treble, 0.18);
}

function maybeTriggerAudioRipple() {
  if (audioState.mode === "none") {
    return;
  }

  const triggerStrength =
    audioState.smoothedLevel * 0.5 +
    audioState.bassEnergy * 0.13 +
    audioState.trebleEnergy * 0.08;
  const filePulse =
    audioState.mode === "file" && audioState.isFilePlaying
      ? 0.015 + audioState.smoothedLevel * 0.38 + audioState.bassEnergy * 0.11 + audioState.trebleEnergy * 0.06
      : 0;
  const finalTriggerStrength = max(triggerStrength, filePulse);

  if (
    finalTriggerStrength > audioState.threshold &&
    frameCount - audioState.lastTriggerFrame > audioState.cooldownFrames
  ) {
    const position = randomAudioPondPosition();
    createAudioRipple(position.x, position.y, finalTriggerStrength, audioState.bassEnergy, audioState.trebleEnergy);
    audioState.lastTriggerFrame = frameCount;
    audioState.cooldownFrames = floor(map(finalTriggerStrength, audioState.threshold, 0.5, 30, 12, true));
  }
}

function getFftRmsLevel() {
  const waveform = audioState.fft.waveform();
  let sum = 0;

  for (let i = 0; i < waveform.length; i++) {
    sum += waveform[i] * waveform[i];
  }

  return sqrt(sum / waveform.length);
}

function randomAudioPondPosition() {
  const artBox = getAudioArtBox();

  return {
    x: constrain(artBox.x + artBox.w * random(0.06, 0.94), 0, width),
    y: constrain(artBox.y + artBox.h * random(0.18, 0.92), 0, height)
  };
}

function getAudioArtBox() {
  const baseWidth = typeof ART_W !== "undefined" ? ART_W : 1000;
  const baseHeight = typeof ART_H !== "undefined" ? ART_H : 1000;
  const scaleFactor = max(width / baseWidth, height / baseHeight);
  const drawW = baseWidth * scaleFactor;
  const drawH = baseHeight * scaleFactor;

  return {
    x: (width - drawW) * 0.5,
    y: (height - drawH) * 0.5,
    w: drawW,
    h: drawH
  };
}

function createAudioControls() {
  if (audioState.controls) {
    audioState.controls.remove();
  }

  const controls = createDiv();
  controls.id("audio-controls");
  controls.position(18, 18);
  controls.style("display", "flex");
  controls.style("gap", "8px");
  controls.style("align-items", "center");
  controls.style("z-index", "10");
  controls.style("font-family", "Arial, Helvetica, sans-serif");

  const fileButton = createButton("Play audio");
  fileButton.parent(controls);
  fileButton.mousePressed(function () {
    if (audioState.isFilePlaying) {
      pauseBuiltInAudio();
    } else {
      startBuiltInAudio();
    }
  });
  styleAudioButton(fileButton);

  const micButton = createButton("Use mic");
  micButton.parent(controls);
  micButton.mousePressed(startMicrophoneInput);
  styleAudioButton(micButton);

  const statusLabel = createSpan("Audio idle");
  statusLabel.parent(controls);
  statusLabel.style("color", "rgba(242, 239, 224, 0.84)");
  statusLabel.style("font-size", "12px");
  statusLabel.style("text-shadow", "0 1px 4px rgba(0, 0, 0, 0.45)");

  audioState.controls = controls;
  audioState.fileButton = fileButton;
  audioState.micButton = micButton;
  audioState.statusLabel = statusLabel;
}

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

function updateAudioControls() {
  if (!audioState.controls) {
    return;
  }

  audioState.fileButton.html(audioState.isFilePlaying ? "Pause audio" : "Play audio");

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

function audioFileReady() {
  return (
    audioState.isFileLoaded ||
    (audioState.soundFile &&
      typeof audioState.soundFile.isLoaded === "function" &&
      audioState.soundFile.isLoaded())
  );
}
