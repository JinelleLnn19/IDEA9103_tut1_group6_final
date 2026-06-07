# IDEA9103_tut1_group6_final project
<h2>Inspiration</h2>
<p>
The inspiration for our project mainly comes from Monet's water lily series, especially the way Monet repeatedly painted the same pond under different lighting, weather and atmospheric conditions. We no longer regard paintings as fixed images, but interpret them as living surfaces that can move, ripple, glow and respond.

We were also inspired by teamLab's water particle universe, which transforms water into a continuous digital stream shaped by space and motion. This influenced our idea of regarding the pond as an active environment rather than a static background.

Refik Anadol's data-driven visual works, such as machine illusions, have also shaped our direction. His works inspire us to imagine painting as a re-rendered information domain, where time, sound, randomness and user input can constantly reshape the visual atmosphere.

Through these references, our project reimagines Monet's pond as an interactive digital ecosystem. The final work retains the recognizable visual language of water lilies - water, water lily leaves, flowers, reflections and soft color fragments - while allowing audio, time, Berlin noise and user interaction as different forms of "weather" on the canvas.
</p>

<h2>Techniques</h2>
<li>
random() is used to create natural variation across the pond scene.   In this project, it helps generate slightly different positions, sizes, colours, ripple behaviours, and visual details.   This is important because Monet’s Water Lilies is not a rigid or mechanical image;   it is built from soft, organic variation.   By using random(), the water surface, highlights, lily pads, and small visual fragments avoid looking too repetitive or artificial.
</li>

<li>
color() is used to define and manage the colour palette of the project.   Since the artwork is inspired by Monet’s Water Lilies, colour is one of the most important visual elements.   The project uses blues, greens, purples, pinks, yellows, and soft neutral tones to recreate the feeling of water, reflection, flowers, and atmosphere.   Using color() also makes it easier to blend, adjust, and transition colours across different mechanics.
</li>

<li>
constrain() is used to keep values within a safe and controlled range.   This is important for interactive and audio-reactive elements because sound levels, movement offsets, ripple sizes, and colour values can otherwise become too extreme.   In this project, constrain() helps prevent the visual effects from becoming chaotic.   It keeps the lily pad movement, ripple intensity, brightness, and other dynamic values subtle enough so the base image remains readable.
</li>

<li>
sin() and cos() are used to create smooth, circular, and wave-like motion.   These functions are especially suitable for a pond-based artwork because water movement often appears as waves, ripples, floating motion, and gentle oscillation.   In the project, they help control lily pad shaking, ripple movement, subtle floating effects, and organic changes over time.   They make the interaction feel more natural instead of moving in straight or mechanical directions.
</li>

<li>
lerp() is used for smooth transitions between two numerical values.   In this project, it helps soften changes in movement, audio response, position, brightness, and other dynamic properties.   This is important because sudden changes would feel too harsh for a Monet-inspired pond.   By using lerp(), the project creates gradual transitions, making the water and lily elements feel calm, fluid, and atmospheric.
</li>

<li>
lerpColor() is used to smoothly transition between colours.   This supports the time-based mechanic, where the pond atmosphere changes between different times of day, such as morning, noon, and dusk.   Instead of switching colours suddenly, lerpColor() allows the canvas to shift gently between cool blues, saturated greens, and warm pink tones.   This connects directly to Monet’s study of changing light and atmosphere.
</li>

<li>
push() and pop() are used to isolate drawing styles and transformations.   They allow each visual element to have its own settings, such as rotation, transparency, stroke, fill, or blend mode, without accidentally affecting the rest of the canvas.   This is important in a multi-layered project where the base image, time effect, Perlin water movement, audio ripples, and user input effects all share the same canvas.
</li>

<li>
blendMode() is used to control how layers visually combine.   This is important because the project is built from overlapping water colours, reflection marks, ripples, highlights, and atmospheric overlays.   Different blend modes help create glowing, translucent, or painterly effects.   In this project, blendMode() helps the digital canvas feel closer to layered paint, light, and water reflection rather than flat graphic shapes.
</li>

<li>
stroke() and strokeWeight() are used to define outlines and line thickness.   They are especially useful for ripple rings, reflection marks, water lines, and subtle tile boundaries.   In the audio mechanic, stroke thickness can respond to frequency or volume, allowing low-frequency sound to create heavier ripples and high-frequency sound to create lighter ones.   This makes the visual
</li>

<li>
fill() is used to colour the inside of shapes such as lily pads, flowers, mosaic tiles, and water fragments.   It helps establish the main visual identity of the scene.   Since the project does not use the original painting directly, filled shapes are essential for rebuilding the image through code.   The use of fill() allows the project to construct a recognisable coded version of Water Lilies.
</li>

<li>
ellipse()
ellipse() is used to draw rounded organic forms.   This is important for lily pads, flowers, ripples, and soft water details.   Unlike hard rectangles, ellipses help create a more natural feeling.   In this project, ellipse() supports the pond theme by representing floating pads, petal shapes, and circular ripple patterns.
</li>

<li>
rect() is used to create mosaic-like blocks, water fragments, and structured colour areas.  Since the project uses a coded reinterpretation rather than the original painting image, rectangular tiles help create a pixelated or mosaic-based visual language.  These blocks allow the scene to remain clearly code-generated while still referencing Monet’s fragmented colour fields.
</li>

<li>
line() is used for reflection strokes, water movement marks, and subtle directional details.  In a pond scene, lines can suggest movement, shimmer, and surface direction.  They help break up the image and add rhythm to the water surface without overwhelming the composition.
</li>

<li>
arc() is used for partial circular forms, such as curved ripple fragments or partial decorative shapes.  It is useful when a full circle would feel too heavy or too graphic.  In this project, arcs help create softer and more natural water-related details.
</li>

<li>
createGraphics() is used to create off-screen drawing layers.  This is useful for separating complex visual layers such as water textures, masks, overlays, or distortion effects.  In this project, off-screen buffers help keep the main canvas organised and allow different mechanics to generate effects without directly damaging the base image.
</li>

<li>
createCanvas() is used once to create the main p5.js canvas.  This is important because all four mechanics must share the same canvas.  The project avoids creating multiple canvases so that the base Water Lilies image, time layer, Perlin noise, audio response, and user input effects can all work together as one coherent visual system.
</li>

<li>
loadPixels(), updatePixels(), and . pixels are used for direct pixel-level manipulation.  This allows the project to create more detailed effects such as water distortion, subtle colour shifts, image-like texture changes, or noise-based surface treatment.  These functions are useful when shape drawing alone is not enough to create a rich water surface.  In this project, pixel access helps support the Perlin noise and water texture effects.
</li>

<li>
new p5. AudioIn() is used to access the browser microphone.  This supports the microphone interaction mode, where sound from the room becomes part of the artwork.  The microphone allows the pond to respond to clapping, speaking, or environmental sound, turning the visual scene into a listening surface.
</li>

<li>
new p5. FFT() is used to analyse the frequency content of audio.  This allows the project to respond differently to low and high frequencies.  For example, bass can produce thicker and slower ripples, while treble can produce thinner and faster visual effects.  This makes the audio interaction more detailed than simply reacting to volume.
</li>

<li>
new p5. Amplitude() is used to measure the overall loudness of the audio.  This is useful for controlling the strength of visual feedback, such as ripple size, lily pad movement, brightness, or vibration intensity.  In the project, amplitude helps translate sound energy into visible water movement.
</li>

<li>
loadSound() is used to load the built-in audio file for the project.  This supports the built-in audio playback mode, allowing the artwork to respond to a selected soundtrack even when the microphone is not being used.  The loaded audio drives visual feedback such as ripple generation, lily pad movement, and frequency-based changes.
</li>

<h2>Mechanic ownership</h2>


<h2>AI acknowledgement</h2>


<h2>External references</h2>
<li>
Refik Anadol. (n.d.). Datafall: Akbank. https://refikanadol.com/works/datafall-akbank/
</li>

<h2>Interaction instructions</h2>
