# Simple Endless Runner

A tiny single-file (HTML/CSS/JS) endless runner game.
Assets

- `assets/bg.svg` — background image used inside the canvas. You can replace this with any photo or SVG. If you replace with a raster photo, keep the same filename and path.
- `assets/obstacle.svg` — obstacle sprite used for moving objects. Replace with your own PNG/JPG/SVG as desired.
- `assets/player.svg` — the default player sprite. Replace this with your own image (PNG/JPG/SVG) if you want a different character.
- Open `index.html` in your browser (desktop or mobile). No build step required.

Audio

- The game synthesizes simple sounds (background loop, game-over tune, and jump click) using the WebAudio API — no external audio files are required.
- Most browsers block audio until a user gesture; the first tap/click/space will unlock audio and start the background music when the game starts.
- If you prefer to use real music files, replace the synth calls in `script.js` with HTMLAudioElement sources (e.g. `assets/bg.mp3`) and update the code to load/play them.

- New: you can add a short start sound that plays when a new run begins. Place a file named `assets/start.mp3` (or another supported format) and it will be played before the background music starts. If missing, the game uses a small synthesized flourish.

- Tap / Click / Space: Jump
- On Game Over: Tap / Click / Space to restart

Files

- `index.html` — main page and canvas
- `style.css` — simple layout and style
- `script.js` — game logic (physics, obstacles, input, scoring)

Notes & next steps

- The game uses `localStorage` to persist the best score.
- Improvements you can make:
  - Add sprites and animations
  - Add sounds
  - Make parallax background layers
  - Add powerups and multiple obstacle types

Enjoy!
