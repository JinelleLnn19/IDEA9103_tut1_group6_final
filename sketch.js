const ART_W = 1000;          // Fixed physical width of the core artistic creation space
const ART_H = 1000;          // Fixed physical height of the core artistic creation space
const SEED = 1916;           // Pseudo-random seed (Tribute to the year Monet began his grand "Water Lilies" murals)
const BRUSH_SCALE = 0.68;    // Global base scaling factor for oil brush strokes

let paintingLayer;           // p5.Graphics object: Used for one-time off-screen pre-rendering of the static oil painting
let interactiveBuffer;       // p5.Graphics object: Used to compute, refresh, and cache real-time frames under fluid distortion
let inputCtrl;               // Interaction controller instance: Hosts the input systems from input-controls.js
let floatingLilyPads = [];   // Dynamic array: Stores individual floating lily pads with independent drift and collision logic

function preload() {
  // Operation: Checks and preloads external audio mechanics to prevent runtime asynchronous blocking
  if (typeof preloadAudioMechanic === 'function') {
    preloadAudioMechanic();
  }
}

function setup() {
  pixelDensity(1);           // Force pixel density to 1 to prevent indexing overflows or lag on high-DPI (Retina) screens
  createCanvas(windowWidth, windowHeight); // Create a responsive global canvas covering the full viewport
  
  // This code was generated with assistance from ChatGPT
  // Operation: Instantiate the global InputController across files to capture and manage global input states
  inputCtrl = new window.InputController();

  // Operation: Execute the full oil painting rendering pipeline
  buildPainting();           // Run the base map generation algorithm
  paintingLayer.loadPixels(); // Extract raw RGBA pixel array of the static painting for subsequent distortion algorithms
  createFloatingLilyPads();  // Generate the first batch of dynamic, collidable floating lily pads based on preset cluster coordinates
  
  // Operation: Initialize the interactive graphic buffer layer, aligning its underlying pixel format with the main canvas
  interactiveBuffer = createGraphics(ART_W, ART_H);
  interactiveBuffer.pixelDensity(1);

  // Course extension module hook detection
  if (typeof setupPerlinLayer === 'function') {
    setupPerlinLayer();
  }
  if (typeof setupAudioMechanic === 'function') {
    setupAudioMechanic();
  }
}

function draw() {
  background(24, 34, 42); // Render a dark grey-blue background reminiscent of a Monet exhibition gallery mood

  // --- Responsive Layout Adaption (Simulating CSS Object-fit: cover logic) ---
  // This code was generated with assistance from ChatGPT
  // Operation: Calculate the aspect ratio scale factor to center-crop and fill the viewport, ensuring the artwork does not stretch
  const scaleFactor = max(width / ART_W, height / ART_H);
  const drawW = ART_W * scaleFactor;
  const drawH = ART_H * scaleFactor;
  const offsetX = (width - drawW) * 0.5;
  const offsetY = (height - drawH) * 0.5;

  inputCtrl.update(); // Step forward and update key presses and particle lifetime decay logic

  if (typeof updateAudioMechanic === 'function') {
    updateAudioMechanic();
  }

  // Calculate the remapped relative coordinates of the current mouse position within the original 1000x1000 creative space
  const renderMouseX = (mouseX - offsetX) / scaleFactor;
  const renderMouseY = (mouseY - offsetY) / scaleFactor;
  
  /** @type {{x: number, y: number, w: number, h: number}} Encapsulates the actual screen viewport boundaries of the artwork */
  const artBox = { x: offsetX, y: offsetY, w: drawW, h: drawH }; 
  let perlinLayerDrawn = false;

  // --- Rendering Pipeline Routing ---
  // This code was generated with assistance from ChatGPT
  // Operation: Optimize rendering overhead. If the spacebar is held to freeze the simulation or if there are no active 
  // ripple particles on screen, completely skip the expensive per-pixel recalculation and draw the cached texture directly.
  if (inputCtrl.isStilled || inputCtrl.ripples.length === 0) {
    if (inputCtrl.isStilled) {
      image(paintingLayer, offsetX, offsetY, drawW, drawH); // Render the static, undistorted pre-rendered original painting
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
    // This code was generated with assistance from ChatGPT
    // Operation: When active interaction ripples exist, activate the underlying fluid physics engine, refresh the pixel deformation buffer, and draw
    applyWaterRipplePhysics(renderMouseX, renderMouseY);
    image(interactiveBuffer, offsetX, offsetY, drawW, drawH);

    if (typeof drawPerlinLayer === 'function') {
      drawPerlinLayer(artBox);
    }
  }

  // Operation: Update physics drift and render top-layer dynamic floating lily pads independently from the underlying pixel distortion
  updateFloatingLilyPads();
  drawFloatingLilyPads(artBox);

  if (typeof drawTimeBasedMechanic === 'function') {
    drawTimeBasedMechanic(artBox);
  }
  if (typeof drawAudioLayer === 'function') {
    drawAudioLayer();
  }

  // Operation: Pass the current canvas context and coordinate offsets across files to overlay smooth, semi-transparent light blue visual ripple lines
  inputCtrl.displayRipples(interactiveBuffer, scaleFactor, offsetX, offsetY);
}

/**
 * Underlying Fluid Simulation Core Algorithm: Inverse Pixel Lookup Mapping & Temporal Color Filtering
 * [Outside-of-Course Technique Description]: This method utilizes advanced pixel-level matrix manipulation (Direct Pixel Manipulation).
 * Instead of using conventional GPU geometric mesh deformations, the algorithm iterates through every single pixel of the interactiveBuffer.
 * It inversely calculates its physical distance to all active ripple generation sources. It uses a sine function (sin) to simulate the 
 * oscillatory decay of water waves, yielding pixel offsets (xOffset, yOffset). It then grabs the corresponding RGBA color from the original 
 * image's pixels array and fills it back into the target position, creating a highly realistic, fluid dissolving effect of the masterpiece.
 * @param {Number} mx - Corrected mouse X coordinate in creation space
 * @param {Number} my - Corrected mouse Y coordinate in creation space
 */
function applyWaterRipplePhysics(mx, my) {
  paintingLayer.loadPixels();
  interactiveBuffer.loadPixels(); // Activate the underlying pixel writing pipeline for the target graphic layer

  for (let y = 0; y < ART_H; y += 1) {
    for (let x = 0; x < ART_W; x += 1) {
      let xOffset = 0;
      let yOffset = 0;

      // This code was generated with assistance from ChatGPT
      // Operation: Loop through all active ripples from inputCtrl to calculate the accumulated water wave disturbance forces on the current pixel
      for (let r of inputCtrl.ripples) {
        let dx = x - r.x;
        let dy = y - r.y;
        let dist = Math.sqrt(dx * dx + dy * dy); // Apply Pythagorean theorem to calculate the absolute Euclidean distance from pixel to ripple center

        // If the current pixel is within the threshold of this ripple's expanding wave peak radius, apply physical wave deformation
        if (dist > 0 && Math.abs(dist - r.radius) < inputCtrl.triggerRadius) {
          // Compute local thrust intensity based on cosine/sine periodicity combined with the ripple particle's current alpha (energy decay)
          let strength = sin((dist - r.radius) * 0.15) * (r.alpha / 255.0) * 8.0;
          xOffset += (dx / dist) * strength; // Accumulate X-axis displacement along the radial normal direction
          yOffset += (dy / dist) * strength; // Accumulate Y-axis displacement along the radial normal direction
        }
      }

      // Restrict lookup boundaries to prevent sampling outside the 1000x1000 range, which causes memory pointer out-of-bounds errors
      let targetX = constrain(Math.floor(x + xOffset), 0, ART_W - 1);
      let targetY = constrain(Math.floor(y + yOffset), 0, ART_H - 1);

      // Calculate the 4-byte (RGBA) base index offsets in the one-dimensional flat pixels array for both source (src) and destination (dest) images
      let srcIdx = 4 * (targetY * ART_W + targetX);
      let destIdx = 4 * (y * ART_W + x);

      let rColor = paintingLayer.pixels[srcIdx];
      let gColor = paintingLayer.pixels[srcIdx + 1];
      let bColor = paintingLayer.pixels[srcIdx + 2];

      // This code was generated with assistance from ChatGPT
      // Operation: Read the dynamically updated temporal state (currentPalette) to apply dynamic pixel filter transformations
      if (inputCtrl.currentPalette === 1) {
        // Dawn Preset: Lower reds, inject ambient cool blue tones
        rColor = constrain(rColor * 0.85 + 20, 0, 255);
        bColor = constrain(bColor * 1.1 + 15, 0, 255);
      } else if (inputCtrl.currentPalette === 3) {
        // Dusk Preset: Significantly boost warm reds/golden yellows, heavily filter out blues to simulate sunset reflections sinking into the water
        rColor = constrain(rColor * 1.2 + 25, 0, 255);
        gColor = constrain(gColor * 0.95 + 10, 0, 255);
        bColor = constrain(bColor * 0.75, 0, 255);
      }

      // Write the final resolved color data back into the interactive graphic buffer memory
      interactiveBuffer.pixels[destIdx] = rColor;
      interactiveBuffer.pixels[destIdx + 1] = gColor;
      interactiveBuffer.pixels[destIdx + 2] = bColor;
      interactiveBuffer.pixels[destIdx + 3] = paintingLayer.pixels[srcIdx + 3]; // Maintain original image transparency
    }
  }
  interactiveBuffer.updatePixels(); // Batch-push the computed pixel matrix back to video memory for real-time rendering
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight); // Responsively reset the viewport when the host browser window dimensions abruptly change
}

function mouseMoved() {
  if (!inputCtrl) return;
  const scaleFactor = max(width / ART_W, height / ART_H);
  const mx = (mouseX - (width - ART_W * scaleFactor) * 0.5) / scaleFactor;
  const my = (mouseY - (height - ART_H * scaleFactor) * 0.5) / scaleFactor;
  inputCtrl.handleMouseMoved(mx, my); // Pass transformed canvas coordinates into the controller to update micro-ripples
}

function mousePressed() {
  if (!inputCtrl) return;
  const scaleFactor = max(width / ART_W, height / ART_H);
  const mx = (mouseX - (width - ART_W * scaleFactor) * 0.5) / scaleFactor;
  const my = (mouseY - (height - ART_H * scaleFactor) * 0.5) / scaleFactor;
  inputCtrl.handleMousePressed(mx, my); // Pass transformed canvas coordinates into the controller to trigger intense ripples
}

function keyPressed() {
  if (inputCtrl) inputCtrl.handleKeyPressed(); // Route and distribute single key press events
}

/**
 * Core Generative Art Module: Impressionist Algorithmic Oil Painting Pipeline
 * Operation: Adheres to a layered rendering aesthetic, synthesizing everything from macro water backgrounds and irregular 
 * curved reflections to micro leaf clusters using procedural algorithms.
 */
function buildPainting() {
  randomSeed(SEED);
  noiseSeed(SEED); // Anchor the random number generator's path to ensure identical visual composition on every load

  paintingLayer = createGraphics(ART_W, ART_H);
  paintingLayer.pixelDensity(1);
  paintingLayer.colorMode(RGB, 255);
  paintingLayer.noStroke();

  // --- Classical Impressionist Multi-Layer Coloring Process ---
  paintWaterBase();       // Step 1: Horizontally scan underlying deep water body and blended base color strokes
  paintReflections();     // Step 2: Generate vertically swaying green reflections of riverside willows and bright short strokes
  paintDistantPads();     // Step 3: Scatter small, static mid-to-distant background lily pads
  
  // Step 4: Automate clustered brush strokes on primary visual focal groups following Monet's original composition
  paintPadCluster(190, 760, 235, 120, 22, 0.9);   // Large bottom-left leaf cluster
  paintPadCluster(760, 765, 275, 140, 27, 0.98);  // Main foreground cluster on the bottom-right
  paintPadCluster(250, 410, 250, 120, 21, 0.78);  // Mid-ground left cluster
  paintPadCluster(690, 300, 315, 105, 25, 0.72);  // Distant mid-ground right cluster
  paintPadCluster(560, 680, 135, 85, 10, 0.68);   // Center-bottom scattered transition cluster

  paintLilies();          // Step 5: Precisely draw multi-layered, blooming physical lily flowers directly over designated leaf clusters
  paintFineColorNotes();  // Step 6: Add Pointillism-style high-contrast ambient highlights and short accent strokes
  paintSurfaceStrokes();  // Step 7: Overlay surface-level short, fragmented water reflection strokes
  paintCanvasGrain();     // Step 8: Synthesize physical texture grids of linen canvas, adding a dark protective bounding border
}

function paintWaterBase() {
  const skyBlue = color(72, 94, 146);
  const pondGreen = color(67, 95, 70);
  const violet = color(87, 83, 143);
  const shadow = color(42, 51, 74);

  // Render horizontal gradient water base
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

  // Cover large areas with broad, coarse oil paint blending strokes of varying lengths
  for (let i = 0; i < 1550; i++) {
    const x = random(ART_W);
    const y = random(ART_H);
    const w = random(28, 170);
    const h = random(6, 32);
    const c = random([skyBlue, pondGreen, violet, shadow]);
    oilyStroke(
      paintingLayer, x, y, w, h,
      color(red(c) + random(-18, 18), green(c) + random(-18, 18), blue(c) + random(-20, 20), random(25, 70)),
      random(-0.14, 0.14),
      random(0.3, 0.9)
    );
  }
}

function paintReflections() {
  const reflectionColors = [
    color(54, 91, 68, 90), color(79, 112, 80, 80), color(89, 106, 162, 85),
    color(48, 67, 95, 80), color(105, 96, 158, 55)
  ];

  // Render Monet's signature vertical weeping willow wind reflections
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
      const wobble = sin(j * 1.7 + random(-0.4, 0.4)) * random(4, 16); // Apply sine wobbling to simulate breeze-rippled reflections
      paintingLayer.curveVertex(x + wobble, yy);
    }
    paintingLayer.endShape();
  }

  // Lay down transition ripple strokes
  for (let i = 0; i < 620; i++) {
    const c = random([color(35, 45, 72, 100), color(120, 139, 177, 80), color(117, 139, 119, 65)]);
    oilyStroke(paintingLayer, random(ART_W), random(ART_H), random(16, 120), random(3, 13), c, random(-0.06, 0.06), random(0.35, 0.8));
  }
}

function paintDistantPads() {
  for (let i = 0; i < 82; i++) {
    const band = random([150, 235, 365, 530, 860]); // Discrete band stratification to simulate perspective horizon lines
    const x = random(30, ART_W - 30);
    const y = band + random(-55, 55);
    paintLilyPad(x, y, random(28, 76), random(10, 30), random(TWO_PI), random(0.42, 0.68));
  }
}

function paintPadCluster(cx, cy, clusterW, clusterH, count, sizeScale) {
  for (let i = 0; i < count; i++) {
    const angle = random(TWO_PI);
    const radius = sqrt(random()) * 0.5; // Use square root distribution to ensure generated particles aggregate toward the cluster center
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

/**
 * Fundamental Component Algorithm: Reusable Impressionist Oil Painting Lily Pad Synthesis
 * Operation: Overlays multiple color layers (shadows, base tones, rim highlights) on the specified target graphic panel 
 * to assemble a texturally rich, individual lily pad surface.
 */
function drawLilyPadTo(g, x, y, w, h, angle, alphaScale) {
  const greens = [
    color(105, 145, 92, 160 * alphaScale), color(126, 158, 104, 150 * alphaScale),
    color(154, 171, 108, 135 * alphaScale), color(91, 128, 112, 145 * alphaScale),
    color(168, 124, 164, 80 * alphaScale)
  ];

  g.push();
  g.translate(x, y);
  g.rotate(angle);

  // 1. Render a heavy underwater base oil shadow stroke with a semi-transparent dark blue tint shifted down-right
  const shadow = color(24, 37, 62, 125 * alphaScale);
  oilyStroke(g, 4, 7, w * 1.08, h * 1.15, shadow, 0, 0.75);

  // 2. Loop and randomly select colors to overlay, painting a rich localized organic green base layer with high-cohesion strokes
  for (let i = 0; i < 10; i++) {
    const c = random(greens);
    oilyStroke(
      g, random(-w * 0.08, w * 0.08), random(-h * 0.12, h * 0.12), w * random(0.75, 1.15), h * random(0.5, 1),
      color(red(c) + random(-16, 16), green(c) + random(-13, 15), blue(c) + random(-15, 16), alpha(c)),
      random(-0.1, 0.1), random(0.5, 1)
    );
  }

  // 3. Dot the center area with withered or ambient pinkish-purple reflective details and variegated color blocks
  for (let i = 0; i < 3; i++) {
    const fleck = random([color(187, 205, 156, 115), color(87, 144, 132, 110), color(211, 159, 193, 80)]);
    oilyStroke(g, random(-w * 0.28, w * 0.28), random(-h * 0.25, h * 0.25), w * random(0.16, 0.42), h * random(0.12, 0.32), fleck, random(-0.25, 0.25), random(0.45, 0.8));
  }

  // 4. Append bright, curved rim light oil strokes along the side to define the turned-up edges and volumetric form of the leaf
  const rim = random([color(202, 153, 188, 120), color(173, 197, 163, 105), color(211, 205, 151, 90)]);
  oilyStroke(g, 0, -h * 0.15, w * random(0.75, 1.1), h * 0.18, rim, random(-0.12, 0.12), 0.65);
  g.pop();
}

/**
 * Top-Level Dynamic Physical Layer: Off-Screen Independent Sprite Cache Initialization
 * [Outside-of-Course Technique Description]: To achieve high-framerate floating physics and soft oscillations for the 
 * lily pads without lagging, this system incorporates "Sprite Caching via Off-Screen Graphics". Instead of invoking dozens 
 * of high-overhead, processor-heavy procedural oilyStroke() functions per frame, the algorithm opens separate transparent 
 * createGraphics buffers during initialization, permanently baking each leaf layout into a static texture map. At runtime, 
 * it renders via hardware-accelerated image blitting and matrix translation, drastically freeing up CPU cycles during 
 * collision resolution, enabling hundreds of premium painted leaves to glide seamlessly at 60 FPS.
 */
function createFloatingLilyPads() {
  floatingLilyPads = [];
  randomSeed(SEED + 371); // Shift to an independent seed space to ensure floating elements look distinct from static ones

  for (let i = 0; i < 34; i++) {
    const band = random([150, 235, 365, 530, 860]);
    addFloatingLilyPad(random(30, ART_W - 30), band + random(-55, 55), random(28, 76), random(10, 30), random(TWO_PI), random(0.32, 0.5));
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
    addFloatingLilyPad(x, y, random(48, 125) * sizeScale, random(22, 58) * sizeScale, random(TWO_PI), random(0.56, 0.9));
  }
}

function addFloatingLilyPad(x, y, w, h, angle, alphaScale) {
  const seed = floor(random(1000000));
  const margin = ceil(max(w, h) * 0.8);
  const spriteW = ceil(w * 1.75 + margin * 2);
  const spriteH = ceil(h * 2.1 + margin * 2);
  const sprite = createGraphics(spriteW, spriteH); // Allocate dedicated canvas buffer for off-screen sprite mapping
  sprite.pixelDensity(1);
  sprite.colorMode(RGB, 255);
  sprite.clear(); // Keep background entirely empty and transparent

  randomSeed(seed);
  drawLilyPadTo(sprite, spriteW * 0.5, spriteH * 0.5, w, h, 0, alphaScale); // Bake static procedural strokes directly inside the sprite frame

  // This code was generated with assistance from ChatGPT
  // Operation: Push the dynamic entity into the physics pool, configuring motion metrics and caching pointers to its baked sprite texture
  floatingLilyPads.push({
    x, y, baseX: x, baseY: y, w, h, angle,
    vx: random(-0.08, 0.08),
    vy: random(-0.06, 0.06),
    angularV: random(-0.0015, 0.0015),
    radius: max(w, h) * 0.32,  // Base physical bounding radius for circular geometry collision detection
    phase: random(TWO_PI),      // Randomized initial Perlin noise phase unique to each instance for asynchronous timing
    sprite                      // Pointer to texture asset data
  });
}

/**
 * Physics Engine Step Solver: Autonomous Momentum, Hooke's Elastic Restoration Tendencies, & State Routing
 */
function updateFloatingLilyPads() {
  if (floatingLilyPads.length === 0) return;

  const stillness = inputCtrl && inputCtrl.isStilled;
  const soundLift = typeof audioState !== "undefined" ? audioState.smoothedLevel : 0; // Check volume level feedback from external audio response systems

  // This code was generated with assistance from ChatGPT
  // Operation: Loop through all instances, toggling motion models based on the InputController's global state machine
  for (let pad of floatingLilyPads) {
    if (!stillness) {
      // Mode A: Fluid Natural Drift Mode. Uses Perlin noise to simulate smooth multi-directional water/wind streams, 
      // adding audio amplitude to enhance drifting momentum.
      const n = noise(pad.baseX * 0.003, pad.baseY * 0.003, frameCount * 0.004 + pad.phase);
      const flowAngle = n * TWO_PI * 2;
      const driftPower = 0.012 + soundLift * 0.018;
      
      // Core Physics Formula: velocity += water drive force + (birthplace origin - current offset) * elasticity factor 
      // (Executes a gentle localized bounding pull following Hooke's Law)
      pad.vx += cos(flowAngle) * driftPower + (pad.baseX - pad.x) * 0.0014;
      pad.vy += sin(flowAngle) * driftPower * 0.72 + (pad.baseY - pad.y) * 0.0014;
      pad.angularV += sin(frameCount * 0.01 + pad.phase) * 0.00018; // Feeble self-rotation
      applyInputForcesToFloatingPad(pad); // Superimpose impact impulses caused by interactive user actions
    } else {
      // Mode B: Static Return Mode. Instantly triggered by holding spacebar; current speeds dissolve, and forces shift 
      // to high-tension Hooke constants, snapping the items back to their native spawn points.
      pad.vx += (pad.baseX - pad.x) * 0.002;
      pad.vy += (pad.baseY - pad.y) * 0.002;
      pad.angularV *= 0.92;
    }
  }

  // Operation: Call the rigid contact intersection resolver to fix overlapping stack artifacts
  resolveFloatingLilyPadCollisions();

  // Final velocity integration & physical workspace constraints
  for (let pad of floatingLilyPads) {
    pad.vx *= 0.94; // Kinetic friction damping (retains 94% velocity per frame) to prevent chaotic infinite oscillations from rounding errors
    pad.vy *= 0.94;
    pad.angularV *= 0.94;
    pad.x = constrain(pad.x + pad.vx, 20, ART_W - 20); // Rigid workspace wall bounds
    pad.y = constrain(pad.y + pad.vy, 20, ART_H - 20);
    pad.angle += pad.angularV; // Apply angular velocity updates to the heading angle
  }
}

/**
 * Physical Force Field Projection Method
 * This code was generated with assistance from ChatGPT
 * Operation: Read active particles out of inputCtrl, calculate distances to vector sources, and compound direct repel collisions with wave-propagating thrusts
 */
function applyInputForcesToFloatingPad(pad) {
  if (!inputCtrl || inputCtrl.ripples.length === 0) return;

  for (let ripple of inputCtrl.ripples) {
    const dx = pad.x - ripple.x;
    const dy = pad.y - ripple.y;
    const dist = sqrt(dx * dx + dy * dy);
    if (dist <= 0.001) continue; // Prevent mathematical divide-by-zero exceptions

    const nx = dx / dist; // X component of normal unit vector
    const ny = dy / dist; // Y component of normal unit vector
    
    const directRange = pad.radius * 1.25 + 42;                    // Proximity radius for direct mouse stroke repulsion
    const waveRange = pad.radius + inputCtrl.triggerRadius * 0.72; // Proximity radius for outward sinusoidal wave push
    
    const directHit = max(0, 1 - dist / directRange);              // Linear distance decay model
    const waveHit = max(0, 1 - abs(dist - ripple.radius) / waveRange); // Gaussian scaling model matching wave peak alignment
    
    // Extract dynamic impact multipliers from the active ripple state
    const ripplePower = (ripple.alpha / 255) * (ripple.impact || 1);
    const force = directHit * ripplePower * 0.42 + waveHit * ripplePower * 0.22; // Blend synchronized concurrent forces

    if (force > 0) {
      pad.vx += nx * force;          // Impulse injection: Modify linear horizontal momentum
      pad.vy += ny * force * 0.78;   // Impulse injection: Modify linear vertical momentum (attenuated for water surface perspective projection)
      pad.angularV += (nx * 0.7 + ny * 0.3) * force * 0.009; // Torque injection: Generate rotational skew due to uneven forces
    }
  }
}

/**
 * 2D Circular Rigid Body Collision Solver (Relaxation-based Collision Resolution)
 * This code was generated with assistance from ChatGPT
 * Operation: Classic double-nested full combinatorics loop iteration. Calculates center-to-center distances between pairs of leaves. 
 * Once the minimum safe contact distance is breached, it forces an equal and opposite kinetic pushback, completely eliminating 
 * visual clipping or clipping overlap artifacts.
 */
function resolveFloatingLilyPadCollisions() {
  for (let i = 0; i < floatingLilyPads.length; i++) {
    const a = floatingLilyPads[i];
    for (let j = i + 1; j < floatingLilyPads.length; j++) {
      const b = floatingLilyPads[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      
      // If the water is turbulent, widen the proximity safety margin by 12% to enhance kinetic feedback when waves knock leaves together
      const activeBoost = inputCtrl && inputCtrl.ripples.length > 0 ? 0.12 : 0;
      const minDist = (a.radius + b.radius) * (0.72 + activeBoost);
      const distSq = dx * dx + dy * dy;

      // If a physical overlapping intersection occurs
      if (distSq > 0.001 && distSq < minDist * minDist) {
        const dist = sqrt(distSq);
        const nx = dx / dist; // Collision axis X unit component
        const ny = dy / dist; // Collision axis Y unit component
        
        // Compute displacement parting values applying basic spring separation formulas
        const push = (minDist - dist) * (0.012 + activeBoost * 0.035);
        
        // Inflict equal and opposite displacement vectors to separate elements and modify velocity trajectories
        a.vx -= nx * push;
        a.vy -= ny * push;
        b.vx += nx * push;
        b.vy += ny * push;
        
        // Convert shearing lateral friction into opposing micro angular rotational energies
        a.angularV -= push * 0.0009;
        b.angularV += push * 0.0009;
      }
    }
  }
}

/**
 * Dynamic Floating Layer Rendering Routine
 * Operation: Restore the remapped master viewport space, step through the physics pool, simulate faint floating bobbing via 
 * sine expressions, and blit the baked off-screen sprite frames to the scene.
 */
function drawFloatingLilyPads(artBox) {
  if (floatingLilyPads.length === 0) return;

  push();
  translate(artBox.x, artBox.y);
  scale(artBox.w / ART_W, artBox.h / ART_H); // Align coordinates with current scaling viewport fractions
  imageMode(CENTER);                         // Flip image drawing reference to the geometric center for accurate rotation transforms
  
  // Increase global opacity during active interaction states to simulate reduced water reflectivity under surface agitation
  const activeAlpha = inputCtrl && inputCtrl.ripples.length > 0 ? 232 : 188;
  tint(255, activeAlpha);

  for (let pad of floatingLilyPads) {
    // Utilize orthogonal harmonic sine formulas to generate gentle breathing/bobbing offsets along unique phase cycles
    const bobX = sin(frameCount * 0.012 + pad.phase) * 1.8;
    const bobY = cos(frameCount * 0.014 + pad.phase) * 1.2;

    push();
    translate(pad.x + bobX, pad.y + bobY);
    rotate(pad.angle + sin(frameCount * 0.01 + pad.phase) * 0.025); // Overlay subtle pitching shakes induced by the bobbing motion
    image(pad.sprite, 0, 0); // Render pre-baked off-screen sprite texture
    pop();
  }

  noTint();
  pop();
}

function paintLilies() {
  // Hardcoded coordinate mapping sequences matching positions from Monet's original canvas: [X, Y, size scale, base petal hue]
  const flowers = [
    [120, 360, 1.15, color(173, 58, 61)],   // Deep red focal flower on the left
    [190, 420, 0.8, color(205, 84, 125)],   // Pink lily mid-left
    [390, 238, 0.7, color(238, 224, 180)],  // Pale yellow bud in the mid-ground
    [590, 285, 0.72, color(230, 220, 184)], // Milky white open blossom in the mid-ground
    [690, 285, 0.68, color(238, 221, 182)], // Pale yellow tiny lily mid-right
    [730, 690, 0.82, color(239, 216, 166)], // Bright golden flower foreground right
    [610, 705, 0.74, color(231, 198, 154)], // Solitary light yellow lily lower center
    [850, 830, 1.08, color(236, 218, 179)]  // Large full blossom bottom right background
  ];

  flowers.forEach((flower) => paintFlower(flower[0], flower[1], flower[2], flower[3]));
}

function paintFlower(x, y, scaleAmount, baseColor) {
  paintingLayer.push();
  paintingLayer.translate(x, y);
  paintingLayer.rotate(random(-0.18, 0.18));

  // 1. Render heavy underwater base support shadow strokes using a dense dark pink hue
  oilyStroke(paintingLayer, 0, 12 * scaleAmount, 82 * scaleAmount, 22 * scaleAmount, color(86, 26, 46, 115), 0, 0.75);

  // 2. Layer multi-tier centripetal Impressionist loose petals from the outer perimeter inward via polar coordinates
  for (let i = 0; i < 12; i++) {
    const angle = map(i, 0, 12, -PI * 0.9, PI * 0.9) + random(-0.16, 0.16);
    const px = cos(angle) * random(13, 28) * scaleAmount;
    const py = sin(angle) * random(3, 13) * scaleAmount;
    // Color interpolation gradient: Sun-facing petals blend seamlessly into bright cream yellow highlights
    const petalColor = lerpColor(baseColor, color(255, 241, 185, 210), random(0.35, 0.78));
    oilyStroke(
      paintingLayer, px, py, random(30, 56) * scaleAmount, random(8, 18) * scaleAmount,
      color(red(petalColor), green(petalColor), blue(petalColor), random(150, 220)),
      angle * 0.45, 0.9
    );
  }

  // 3. Dot highly saturated pure yellows and light oranges in the core center to construct rich stamen textures
  for (let i = 0; i < 7; i++) {
    oilyStroke(paintingLayer, random(-10, 10) * scaleAmount, random(-5, 7) * scaleAmount, random(12, 28) * scaleAmount, random(5, 11) * scaleAmount, color(246, 217, 83, random(150, 225)), random(-0.5, 0.5), 0.9);
  }

  paintingLayer.pop();
}

function paintSurfaceStrokes() {
  // Generate classical short, high-contrast oil brush strokes scattered flat across the surface blending cool, warm, dark, and light hues
  for (let i = 0; i < 1250; i++) {
    const c = random([
      color(169, 183, 204, 95), color(128, 159, 184, 80), color(216, 179, 194, 70),
      color(121, 154, 95, 75), color(55, 58, 93, 95)
    ]);
    oilyStroke(paintingLayer, random(ART_W), random(ART_H), random(8, 62), random(2, 10), c, random(-0.18, 0.18), random(0.35, 0.85));
  }

  // Overlay linear micro-scratch lines with high dry-brush textures to enhance horizontal visual tracking along the water plane
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
    color(207, 222, 204, 95), color(172, 198, 214, 85), color(233, 190, 207, 80),
    color(196, 207, 126, 80), color(84, 57, 93, 75), color(36, 52, 80, 80)
  ];

  // Incorporate Pointillism mechanics, loosely splattering delicate raw colors to create vibrant shimmering fields via retinal blending
  for (let i = 0; i < 760; i++) {
    const x = random(ART_W);
    const y = random(ART_H);
    const c = random(notes);
    oilyStroke(
      paintingLayer, x, y, random(5, 28), random(1.5, 6),
      color(red(c) + random(-12, 12), green(c) + random(-12, 12), blue(c) + random(-12, 12), alpha(c)),
      random(-0.28, 0.28), random(0.35, 0.75)
    );
  }

  // Choreograph radiant pure white / bright gold accent lines tracking across critical composition lines for sparkling reflections
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
  // Synthesize microscopic texture grain mimicking coarse linen canvas cross-weave structures pixel-by-pixel
  for (let y = 0; y < ART_H; y++) {
    for (let x = 0; x < ART_W; x++) {
      const idx = 4 * (y * ART_W + x);
      const grain = random(-9, 8); // Uniform white noise jitter
      const weave = ((x % 9 === 0) || (y % 11 === 0)) ? random(-9, 10) : 0; // Simulate orthogonal warp and weft intersections
      
      paintingLayer.pixels[idx] = constrain(paintingLayer.pixels[idx] + grain + weave, 0, 255);
      paintingLayer.pixels[idx + 1] = constrain(paintingLayer.pixels[idx + 1] + grain + weave, 0, 255);
      paintingLayer.pixels[idx + 2] = constrain(paintingLayer.pixels[idx + 2] + grain + weave, 0, 255);
    }
  }
  paintingLayer.updatePixels();

  // Lastly, outline a dark, dense inner frame along the borders to cushion edge-stretching artifacts when inverse lookup algorithms execute
  paintingLayer.noFill();
  paintingLayer.stroke(28, 30, 38, 90);
  paintingLayer.strokeWeight(20);
  paintingLayer.rect(10, 10, ART_W - 20, ART_H - 20);
}

/**
 * Core Custom Lower-Level Brush Engine: Procedural Thick Oil Paint Brush Stroke
 * Operation: Through multi-pass envelope shape squeezing and high-frequency sinusoidal wobble noise, this function 
 * distorts standard rigid ellipses into rich Impressionist paint strokes containing frayed edges and dry-bristle interior gaps.
 */
function oilyStroke(g, x, y, w, h, c, angle, opacity) {
  w *= BRUSH_SCALE;
  h *= BRUSH_SCALE;

  g.push();
  g.translate(x, y);
  g.rotate(angle);
  g.noStroke();

  // 1. Perform 5 layered rendering passes to simulate an impasto texture ranging from deep bases to dried, cracked top ridges
  const passes = 5;
  for (let i = 0; i < passes; i++) {
    const passAlpha = alpha(c) * opacity * random(0.32, 0.72);
    g.fill(red(c) + random(-10, 10), green(c) + random(-10, 10), blue(c) + random(-12, 12), passAlpha);
    g.beginShape();
    const steps = 16;
    
    // Stretch the upper envelope boundary from left to right, injecting a localized undulating wobble across 2*PI cycles
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const px = lerp(-w * 0.5, w * 0.5, t);
      const wobble = sin(t * PI * 2 + random(-0.8, 0.8)) * h * random(0.08, 0.22);
      const py = -h * 0.5 + wobble + random(-h * 0.12, h * 0.12);
      g.curveVertex(px, py); // Insert irregular control points into the polygon stream
    }
    // Inversely map the lower envelope boundary from right to left
    for (let j = steps; j >= 0; j--) {
      const t = j / steps;
      const px = lerp(-w * 0.5, w * 0.5, t);
      const wobble = sin(t * PI * 2 + random(-0.8, 0.8)) * h * random(0.08, 0.22);
      const py = h * 0.5 + wobble + random(-h * 0.12, h * 0.12);
      g.curveVertex(px, py);
    }
    g.endShape(CLOSE);
  }

  // 2. Score 2 fine horizontal lines across the stroke center using a brightened tint to manifest subtle stiff-bristle canvas grooves
  g.stroke(red(c) + 25, green(c) + 25, blue(c) + 20, alpha(c) * 0.3);
  g.strokeWeight(max(1, h * 0.08));
  for (let i = 0; i < 2; i++) {
    const yy = random(-h * 0.25, h * 0.25);
    g.line(-w * 0.42, yy, w * 0.42, yy + random(-h * 0.12, h * 0.12));
  }

  g.pop();
}
