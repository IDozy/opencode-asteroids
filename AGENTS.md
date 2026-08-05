# AGENTS.md

## Project Shape
- Browser-only Asteroids clone; there is no package manifest, bundler, dependency install, test runner, linter, formatter, or CI config in this repo.
- Runtime entrypoint is `index.html`, which loads the single game script `game.js` via a plain `<script src="game.js"></script>`.
- Canvas size and simulation bounds are fixed in both files: `index.html` declares an `800x600` canvas and `game.js` uses `W = 800`, `H = 600`.

## Run And Verify
- Open `index.html` directly in a browser for the simplest manual check.
- Optional local server: `npx serve .`, then visit `http://localhost:3000` as documented in `README.md`.
- Verification is manual gameplay/browser console checking; do not invent `npm test`, lint, typecheck, or build commands unless a future manifest adds them.

## Code Notes
- `game.js` is organized as globals plus classes (`Bullet`, `Asteroid`, `Ship`, `Particle`) and procedural state/update/draw functions; keep changes in this file unless adding real new assets or pages.
- Game state is stored in module-level variables (`ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, `state`, `deadTimer`) initialized by `initGame()`.
- The main loop is `requestAnimationFrame(loop)` at the bottom of `game.js`; `loop()` clamps `dt` to `0.05` seconds before calling `update(dt)` and `draw()`.
- Input uses `KeyboardEvent.code` values (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`) and `pressed()` consumes one-shot key presses from `justPressed`.
- Existing UI/game text and comments are mostly Spanish; preserve that style for player-facing strings unless deliberately changing language.

## Gotchas
- Asteroids wrap around screen edges with `wrap()`; particles intentionally do not wrap.
- Large/medium asteroids split via `Asteroid.split()`; scoring comes from the `POINTS` array indexed by asteroid size (`1` small, `2` medium, `3` large).
- Ship respawn invincibility and blinking are handled inside `Ship.reset()`/`Ship.draw()`; collision checks skip the ship while `ship.invincible > 0`.
