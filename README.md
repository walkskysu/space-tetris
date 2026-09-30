# Space Tetris

A playable orbital arcade built with vanilla JavaScript ES modules, HTML, and
CSS. No dependencies, downloaded assets, accounts, or external services.

## Run

Install Node.js 20 or newer, then from this directory:

```sh
npm start
```

Open **http://127.0.0.1:3000** and select **Start mission**. The Node-only static
server binds to loopback, so it is available only on your computer. Stop it with
Ctrl+C. No `npm install` is needed. On Windows PowerShell, use `npm.cmd start`
if execution policy blocks `npm.ps1`. To choose another port in PowerShell:
`$env:PORT=3001; npm.cmd start`.

## Controls

| Key | Action |
| --- | --- |
| Left / right arrows | Move |
| Down arrow | Soft drop |
| Up arrow | Rotate clockwise |
| Space | Hard drop and lock |
| P | Pause / resume |
| R | Restart immediately |

Labeled start, pause/resume, restart, and on-screen movement buttons support
mouse, touch, and keyboard activation. Tab to a button and press Enter or Space
to activate it; Space performs a hard drop when the playfield/page has focus.
Gameplay keys prevent page scrolling. Switching tabs or leaving the window
automatically pauses the game; resume when ready. Holding left, right, or down
uses normal keyboard repeat; rotate, hard drop, pause and restart act once
per press.

## Rules

Fill horizontal rows on a 10×20 board. All seven tetrominoes appear once per
shuffled bag. The outline shows the landing position, and the side panel previews
the next piece. A blocked downward step or hard drop locks immediately. Rotation
tries small horizontal wall kicks, then upward floor kicks (a simplified system,
not full guideline SRS). A blocked spawn or a lock above the board ends the game.

Clearing 1 / 2 / 3 / 4 rows earns 100 / 300 / 500 / 800 points times the current
level. Soft drop earns 1 point per cell; hard drop earns 2. Every 10 cleared lines
raises the level and speeds up gravity, from 800 ms per row to a 100 ms minimum.
Restart replays the current seed's piece sequence; reloading creates a new seed.

## Test

```sh
npm test
# Windows PowerShell:
npm.cmd test
```

Node's built-in test runner exits nonzero on regressions. Tests cover board and
stack collisions, wall/floor kicks and blocked rotations, all line-clear scores,
level progression, hard drops, gravity and locking, seeded seven-piece bags,
spawn/top-out, pause/resume, and complete restart behavior. Additional tests
exercise input wiring through a minimal DOM adapter and verify the static
server's HTTP responses. These checks do not replace visual browser testing.

## Structure

- `src/game.js`: deterministic engine with explicit seed and elapsed-time input;
  no DOM, rendering, timers, or external dependencies.
- `src/main.js`: canvas rendering, keyboard/touch controls, status announcements,
  and animation loop.
- `index.html` / `styles.css`: responsive interface and CSS starfield.
- `server.js`: loopback static server restricted to application assets.
- `test/`: engine, input, and server regression tests using `node:test`.

The canvas has a descriptive label, visible focus, and accompanying live status
announcements. Gameplay remains visual; this prototype does not provide a full
nonvisual board navigation mode.
