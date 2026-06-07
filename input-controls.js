class InputController {
  constructor() {
    // This code was generated with the assistance of Gemini
    // Execution: Initialize the core data structures and physical parameters for the interaction module
    this.ripples = [];           // Array to store all active dynamic ripple particle objects
    this.isStilled = false;       // State machine boolean: controls immediate freezing of the water surface (triggered by holding Spacebar)
    this.currentPalette = 2;      // Color palette index preset: 1 = Dawn, 2 = Noon, 3 = Dusk

    // --- Interaction Physics Parameters ---
    this.triggerRadius = 75;      // Physics threshold radius: pixel range for mouse repulsion and ripple distortion effects
    this.rippleDecay = 2.5;       // Alpha decay rate per frame for strong ripples (ensures complete fade-out in ~2 seconds)
    this.springConstant = 0.05;   // Spring constant (k): simulates the physical restoration tendency of the distorted water surface
    this.damping = 0.88;          // Physical damping coefficient: attenuates ripple energy to prevent infinite oscillation
  }

  /**
   * Core state update method per frame
   * Automatically invoked inside the main program's draw() loop to drive the physical simulation lifecycle
   */
  update() {
    // This code was generated with the assistance of Gemini
    // Execution: Monitor the keyboard Spacebar hold state in real-time to drive the surface freeze state machine
    if (keyIsPressed && key === ' ') {
      this.isStilled = true;
    } else {
      this.isStilled = false;
    }

    if (this.isStilled) {
      // This code was generated with the assistance of Gemini
      // Execution: Loop through the array backwards to accelerate the alpha decay of existing ripples during the frozen state
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        this.ripples[i].alpha -= 10; 
        if (this.ripples[i].alpha <= 0) this.ripples.splice(i, 1); // Safely remove dead particles to free up memory
      }
      return; // Intercept and bypass the normal propagation logic below
    }

    // This code was generated with the assistance of Gemini
    // Execution: Iterate through the dynamic array to update the linear radius expansion and alpha dissipation of each ripple
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      let r = this.ripples[i];
      r.radius += r.growthRate; // Expand the radius outward linearly
      r.alpha -= r.decayRate;   // Dissipate energy and opacity over time

      // Safely remove the particle from the array once its life (alpha) is fully exhausted
      if (r.alpha <= 0) {
        this.ripples.splice(i, 1);
      }
    }
  }

  /**
   * Render visually generated interaction ripple lines
   * @param {p5.Graphics} pg - Receives the main program's rendering context buffer
   * @param {Number} scaleFactor - The current responsive scaling ratio of the main canvas
   * @param {Number} offsetX - X-axis translation offset when the main canvas is centered
   * @param {Number} offsetY - Y-axis translation offset when the main canvas is centered
   */
  displayRipples(pg, scaleFactor, offsetX, offsetY) {
    if (this.isStilled) return; // Do not render visual ripples when the surface is frozen

    push();
    // Absolute screen coordinates must be inversely re-mapped via translate() and scale() to guarantee perfect pixel alignment across various screen resolutions.
    translate(offsetX, offsetY);
    scale(scaleFactor);
    
    noFill(); // Ripples are rendered as outlines only
    for (let r of this.ripples) {
      // Apply a translucent bright white/light blue color scheme that blends seamlessly into Monet's cool-toned water surface
      stroke(235, 245, 255, r.alpha * 0.4);
      
      // [Technical Source & Details]: Divide the preset stroke weight by the current scaleFactor,
      // thereby counteracting the visual stroke thickening caused by p5.js canvas scaling, maintaining a sharp retina-level fidelity.
      // This technique is from https://p5js.org/reference/p5/strokeWeight/.
      strokeWeight(r.strokeW / scaleFactor); 
      ellipse(r.x, r.y, r.radius * 2); // Draw the circular wave pattern
    }
    pop();
  }

  /**
   * Mouse movement over the water surface interaction event (Simulates gentle touches)
   * @param {Number} mx - Scaled and offset-corrected X coordinate internal to the main canvas
   * @param {Number} my - Scaled and offset-corrected Y coordinate internal to the main canvas
   */
  handleMouseMoved(mx, my) {
    if (this.isStilled) return;

    // This code was generated with the assistance of Gemini
    // Execution: High-frequency capture of mouse displacement to inject gentle, subtle trail particles into the dynamic array
    if (mouseX !== pmouseX || mouseY !== pmouseY) {
      this.ripples.push({
        x: mx,
        y: my,
        radius: 2,         // Initial small radius
        growthRate: 1.2,   // Gentle propagation speed
        alpha: 130,        // Fainter initial transparency for subtle capillary waves
        decayRate: 4.5,    // Relatively rapid dissipation rate
        strokeW: 1.2,      // Thin line weight
        impact: 0.45       // Relatively mild physical impact force for pixel displacement distortion
      });
    }
  }

  /**
   * Mouse click on the water surface interaction event (Simulates dropping a stone into water)
   * @param {Number} mx - Scaled and offset-corrected X coordinate internal to the main canvas
   * @param {Number} my - Scaled and offset-corrected Y coordinate internal to the main canvas
   */
  handleMousePressed(mx, my) {
    if (this.isStilled) return;

    // This code was generated with the assistance of Gemini
    // Execution: Inject a high-energy, fast-expanding shockwave particle at specified coordinates upon user mouse click
    this.ripples.push({
      x: mx,
      y: my,
      radius: 4,                   // Intense initial core size
      growthRate: 3.5,             // Rapid outward expansion to simulate a stone dropping into water
      alpha: 240,                  // Maximum visual feedback intensity
      decayRate: this.rippleDecay, // Strictly controlled decay rate to ensure an elegant fade-out within ~2 seconds
      strokeW: 2.8,                // Thicker stroke weight to convey a sense of physical weight and mass impact
      impact: 1.85                 // Strong physical impact force for substantial pixel displacement deformation
    });
  }

  /**
   * Mouse movement / click on the water surface interaction event (Simulates ripple waves pushing floating lily pads)
   * This code was generated with assistance from ChatGPT
   * Operation: Read active particles out of inputCtrl, calculate distances to vector sources, and compound direct repel collisions with wave-propagating thrusts
   * @param {Object} pad - The floating lily pad physics object to apply forces to
   */
  applyInputForcesToFloatingPad(pad) {
    if (this.ripples.length === 0) return;

    for (let ripple of this.ripples) {
      const dx = pad.x - ripple.x;
      const dy = pad.y - ripple.y;
      const dist = sqrt(dx * dx + dy * dy);
      if (dist <= 0.001) continue; // Prevent mathematical divide-by-zero exceptions

      const nx = dx / dist; // X component of normal unit vector
      const ny = dy / dist; // Y component of normal unit vector
      
      const directRange = pad.radius * 1.25 + 42;                    // Proximity radius for direct mouse stroke repulsion
      const waveRange = pad.radius + this.triggerRadius * 0.72; // Proximity radius for outward sinusoidal wave push
      
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
   * Keyboard single press event router
   */
  handleKeyPressed() {
    // This code was generated with the assistance of Gemini
    // Execution: Dynamically switch the current active lighting palette index based on number keys 1, 2, or 3 for color map linkage
    if (key === '1') this.currentPalette = 1; // Switch to the cool-toned Dawn palette
    if (key === '2') this.currentPalette = 2; // Switch to the classic Noon palette
    if (key === '3') this.currentPalette = 3; // Switch to the golden-warm Dusk palette
  }
}

// Bind the encapsulated interaction class to the global browser window object, ensuring flawless cross-file instantiation by sketch.js
window.InputController = InputController;
