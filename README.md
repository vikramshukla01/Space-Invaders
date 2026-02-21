# Space Invaders

A classic Space Invaders–style browser game. No build step — open and play.

## How to Run

1. Clone or download the repo.
2. Open `Index.html` in any modern browser (Chrome, Edge, Firefox).
3. That's it. No server, no build tools.

## Controls

| Action | Key / Input |
|---|---|
| Move left / right | `←` `→` or `A` `D` |
| Shoot | `Space` (hold) or hold **Left Click** |
| Move with mouse | Mouse (horizontal) |
| Start / Restart | `Enter` or **Click** |
| Pause / Resume | `P` |
| Cycle difficulty | `D` (on start screen only) |

## Difficulty Modes

Press `D` on the start screen to cycle:

| Mode | Enemies | Fire Rate | Speed |
|---|---|---|---|
| **EASY** | 35–45 | 0.6/sec | 1.0× |
| **NORMAL** | 40–52 | 1.0/sec | 1.15× |
| **HARD** | 48–60 | 1.5/sec | 1.35× |

## Gameplay

- Clear a wave → level increases → harder formation spawns.
- Each wave uses a randomly generated **5×11 symmetric formation** (pattern families: Classic, Bands, Wedge, Columns, Checker).
- Only the **bottom-most enemy in each column** can shoot — classic and fair.
- Difficulty controls formation density, fire pressure, enemy speed, and step-down distance. All ramp bounded by caps.

## Features

- Procedural pixel-art sprites (no external images)
- 5 formation pattern families with symmetry + repair constraints
- 3 difficulty modes with level-ramped parameters
- Fair column-based enemy shooting
- Start screen, gameplay loop, pause, game over, restart
- Score, level, difficulty, and lives HUD

## Known Limitations

- Mouse and keyboard both control the player — moves are merged (last input wins for mouse, additive for keyboard).
- No audio.
- Single player only.
