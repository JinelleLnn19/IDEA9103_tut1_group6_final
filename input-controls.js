
class InputController {
  constructor() {
    this.ripples = [];
    this.isStilled = false;
    this.currentPalette = 2;

    this.triggerRadius = 75;
    this.rippleDecay = 2.5;
    this.springConstant = 0.05;
    this.damping = 0.88;
  }

  
  update() {
    if (keyIsPressed && key === ' ') {
      this.isStilled = true;
    } else {
      this.isStilled = false;
    }

    if (this.isStilled) {
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        this.ripples[i].alpha -= 10;
        if (this.ripples[i].alpha <= 0) this.ripples.splice(i, 1);
      }
      return;
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      let r = this.ripples[i];
      r.radius += r.growthRate;
      r.alpha -= r.decayRate;

      if (r.alpha <= 0) {
        this.ripples.splice(i, 1);
      }
    }
  }

  
  displayRipples(pg, scaleFactor, offsetX, offsetY) {
    if (this.isStilled) return;

    push();
    translate(offsetX, offsetY);
    scale(scaleFactor);
    
    noFill();
    for (let r of this.ripples) {
      stroke(235, 245, 255, r.alpha * 0.4);
      strokeWeight(r.strokeW / scaleFactor);
      ellipse(r.x, r.y, r.radius * 2);
    }
    pop();
  }

  
  handleMouseMoved(mx, my) {
    if (this.isStilled) return;

    if (mouseX !== pmouseX || mouseY !== pmouseY) {
      this.ripples.push({
        x: mx,
        y: my,
        radius: 2,
        growthRate: 1.2,
        alpha: 130,
        decayRate: 4.5,
        strokeW: 1.2,
        impact: 0.45
      });
    }
  }

  
  handleMousePressed(mx, my) {
    if (this.isStilled) return;

    this.ripples.push({
      x: mx,
      y: my,
      radius: 4,
      growthRate: 3.5,
      alpha: 240,
      decayRate: this.rippleDecay,
      strokeW: 2.8,
      impact: 1.85
    });
  }

  
  handleKeyPressed() {
    if (key === '1') this.currentPalette = 1;
    if (key === '2') this.currentPalette = 2;
    if (key === '3') this.currentPalette = 3;
  }
}

window.InputController = InputController;
