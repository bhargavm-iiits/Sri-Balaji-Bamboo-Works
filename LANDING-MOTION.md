# Landing animation

The landing page adapts the owner's reference-video direction into native SVG, CSS and live HTML: bamboo stems rise, strips form a weave, rails assemble into a tied frame and the English/Kannada business title appears. The catalogue remains below the introduction.

The title, shop action and workshop link are real HTML controls. No video service, autoplay audio or animation dependency is required. landing.js defines the scene; landing.css defines choreography and reflow; motion.js connects the global preference.

Pause/resume and replay keep navigation usable. Motion Off and operating-system reduced-motion preferences show the static final composition. The scene pauses while off-screen. At narrow widths the frame expands with its content and the controls wrap inside it.

Three automated landing tests cover controls, navigation and reduced-motion behavior. Release browser checks verify the visible title, navigation and mobile composition; screen-reader testing has not been performed.
