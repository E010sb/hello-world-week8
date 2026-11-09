# Ghost Hop — Elaine

A one-button, pixel-art game made with p5.js for short moments while waiting. A little ghost double-jumps over high towers, avoids roaming bats, and collects golden coins to a gentle chiptune loop. This is a standalone prototype of a loading-screen mini-game: it does not measure a real page load, display fake progress, or automatically open another page.

## Play

Open this entire folder in VS Code. Right-click `index.html` and select **Open with Live Server**. All scripts are bundled locally; there are no packages to install for the game.

Alternatively, run `python3 -m http.server 8768` in this folder and visit `http://localhost:8768`. Direct file opening was not verified because the test browser blocks file URLs.

Press **Space**, click the game, or use its single button. These are alternative inputs for the same action, not different controls.

- First press: start.
- During play: press once to jump, then press again in the air for a higher double jump. A third jump is ignored. Landing restores both jumps. Holding Space does not repeat jumps.
- Two small lights above the ghost show the jumps remaining. The button says JUMP AGAIN after the first jump. A small pixel burst marks the second jump.
- Clear any obstacle: earn one point. Speed gradually increases up to 370 pixels per second. The minimum spawn interval is 1.65 seconds, allowing recovery after double jumps.
- Short and tall graves require a jump. Three-spike rows are wider, so time a jump to clear the whole row.
- High castle towers are 112 pixels tall and need a double jump. Look for JUMP ×2. Tap the second time shortly after takeoff; waiting until you have already hit the tower is too late.
- Bats flap and roam horizontally and vertically relative to their scrolling path. Pink LOW BAT obstacles can dip into the ground route: double-jump over them. Lavender HIGH BAT obstacles leave a safe ground route: stay underneath. Text labels distinguish the two without relying on color alone. Contact ends the run.
- Each run begins with a short grave, then introduces a high tower, low bat, spikes, high bat, and tall grave. After that the types and bat phases are mixed randomly.
- Three coins form an arc above ground obstacles. Towers and low bats have higher coin arcs; high bats have coins near the floor. Coins are optional rewards, not a guarantee that every route collects every coin. COINS is a separate count and does not increase speed or obstacle score.
- A collected coin disappears, shows a brief +1, and makes a two-note chime. Coin count resets on each run.
- Hit any obstacle: game over, with a short tip for that obstacle type. Press again to restart; a short delay prevents accidental restarts.
- Switching away pauses the game, bat flight, and music. Press once to resume; this does not use a jump.
- BEST lasts for the current page session. Reloading resets it.
- Music begins after the first Start/Space action, stops on pause or game over, and continues when play resumes. Uncheck Sound to mute music and coin chimes. Sound is an optional setting, not a second gameplay action.

## Music

`music.js` synthesizes a short original melody and bass line with the browser's Web Audio API. No music downloads, external audio files, or extra libraries are needed. The loop uses a 64-step melody in an A-minor setting, at 120 beats per minute. Volume is kept modest. If audio is unavailable, the game still works silently.

The audio context is created/resumed in response to a user action. Technical reference: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices

## Code

- `game.js`: the `Game` class handles state, jump velocity, gravity, obstacles, coins, collisions, and score.
- `sketch.js`: p5.js draws the pixel ghost, coins and background, connects all gameplay inputs to one action, and updates the interface.
- `music.js`: the `GameMusic` class schedules the melody and coin chime and stops audio when required.
- `index.html` and `style.css`: page layout and styles.
- `libraries`: p5.js and its license. Keep this folder with the other files.

The game has three states: `ready`, `playing`, and `over`. A separate pause flag freezes play. Physics runs in fixed 1/60-second steps. `ghost.jumps` counts from 0 to 2. The first press sets upward velocity to -510; the second resets it to -600. Gravity adds 1400 pixels/second²; landing resets the count.

`createObstacle()` assigns type, size, and position. Ground obstacles scroll left at a shared speed. `moveBat()` adds a 36-pixel horizontal sine motion to a scrolling anchor and a separate vertical sine motion. Each bat gets a starting phase. High bats move between y=148 and 212; low bats between y=236 and 284. These bounded routes keep the roaming motion readable. The collision check uses the current x and y, not the original anchor. Wing flapping uses the same flight timer. Hit boxes are slightly inset. The ghost is drawn with nested loops over character strings.

## Week 8 process record — November 9, 2026

### Intention and prediction

Elaine wanted a less repetitive game that people could play while a page loads. She requested roaming bat obstacles, a higher second jump, and taller obstacles. The pre-implementation plan was to preserve one-button controls and test whether the new obstacles remained avoidable. This is the implementation plan recorded by the AI, not an invented participant prediction or a claim that loading-time engagement has been measured.

Changed: double jumps; 112-pixel towers; high and low roaming bat routes; jump feedback; higher optional coin arcs; more recovery time between obstacles. Preserved: purple pixel style, ghost character, one gameplay button, coins, music, scoring, pause, and quick restart. The former version is preserved in `one-button-ghost-before-double-jump-2026-11-09.zip` beside this project folder.

### One before/after check

Using the preserved old `game.js` and the new `game.js`, the same scripted input was tested on an empty path at 60 updates per second: start, jump, then press again 10 frames (about 0.17 seconds) later.

| Measurement | Before | After |
|---|---|---|
| Single-jump rise above starting position | 88.7 px | 88.7 px |
| Rise with the second press at frame 10 | 88.7 px; press ignored | 187.2 px |
| Immediate second press | Ignored | 123.6 px rise |

Observation: the second input now produces additional height while the first jump stays unchanged. Separate simulations found that one jump could not clear the new tower at the sampled timings, whereas the two-jump strategy cleared it at the starting and maximum speeds. This supports the movement rule; it does not establish that people find the game more fun or understand it without instruction.

### Decisions, AI help, and sources

Elaine chose the waiting-page context, the higher second jump, roaming bats, and taller obstacles. Codex implemented the code and selected initial movement numbers, two readable bat bands, labels, and recovery spacing. Those tuning choices still need Elaine's playtest and approval. Codex also wrote and ran automated checks and updated this record. No classmate observations or human difficulty ratings have been supplied.

Original prompt:

> 我觉得现在这个游戏ghost hop太简单了 我想的是人们在等待页面加载或者loading的时候可以玩，蝙蝠可以自由移动像个障碍物，给主体加上连续跳跃两次可以跳的更高，添加更高的障碍物。

First AI response, before implementation:

> 可以，把它定位成“等待加载时顺手玩一局”的小游戏。我会保留单按钮操作：第一次按跳跃，空中再按一次跳得更高；蝙蝠增加上下和前后移动，并加入需要二段跳才能越过的高障碍。
>
> 我会使用 Sites 技能修改现有本地游戏，保留改动前的版本供作业对比，并检查新障碍是否能合理躲避。这一步先做游戏体验，不接入真实网页的加载流程。

The earlier one-button jumping concept was compared to Chrome's dinosaur game. The ghost, moon, towers, coins, and bats are drawn directly in the project code; no external sprite images are used. Music is synthesized in `music.js`. The drawing library is [p5.js](https://p5js.org/), with its license included in `libraries/p5-LICENSE.txt`.

The p5.js copy comes from the earlier coursework project; its original package URL was tagged 2.3.3, while its internal version string reports 2.3.1. The [Week 8 brief](https://course-production-b83a.up.railway.app/course/weeks/week08/README.md) also requests a class-contract proposal. That remains a separate student decision; this update does not claim that the complete assignment has been submitted.

### Remaining question

Can a first-time player learn the double jump and distinguish the two bat routes during a short wait, without a spoken explanation? Ask a classmate to try it before explaining, then record what they actually do. Also not yet tested: integration with a real loading page, when to end the game as loading completes, and real touch-device play. No fake progress bar or artificial waiting time has been added.

## Checks

Optional developer tests: `node --test tests/*.test.cjs` (Node.js is not needed to play).

The 30 automated tests pass. They cover the second jump and third-press limit, landing/reset/pause, higher jump peaks, single-jump tower failure versus double-jump success, all 36 ordered obstacle pairs at minimum spacing and maximum speed with eight sampled bat phases, low bats at two speeds and 32 phases, and forty seeded five-minute simulated runs. Existing score, coin, and mock-audio checks still pass. Mock input/drawing checks cover Space repeat suppression, pointer/click deduplication, canvas taps, button labels, and finite drawing coordinates.

The local server returned HTTP 200 for the page and all game scripts. A browser screenshot confirmed the revised start screen, controls, instructions, and preserved pixel-art scene. Browser interaction tooling then failed, so this revision's live double-jump timing and moving-obstacle appearance have not been verified in a browser playtest. Mock drawing/input checks are not a browser playtest. Earlier full browser checks belong to the previous version. Physical speaker output and touch input on a phone remain unverified. `tests/obstacle-preview.html` is only a developer visual check; open the root `index.html` to play.
