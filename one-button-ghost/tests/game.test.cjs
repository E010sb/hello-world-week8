const test = require("node:test");
const assert = require("node:assert/strict");
const Game = require("../game.js");

function advance(game, frames) {
  for (let i = 0; i < frames; i++) game.update(1 / 60);
}

function playStep(game) {
  const next = game.obstacles.find(obstacle => !obstacle.scored);
  if (!next || (next.type === "bat" && next.band === "high")) return;
  const speed = Math.min(240 + game.score * 5, 370);
  const double = next.type === "tower" || (next.type === "bat" && next.band === "low");
  if (game.ghost.jumps === 0 && next.x - game.ghost.x < speed * (double ? 0.56 : 0.34)) game.action();
  else if (double && game.ghost.jumps === 1 && game.ghost.velocity > -300) game.action();
}

test("one action starts; two jumps are allowed; a third is ignored until landing", () => {
  const game = new Game();
  assert.equal(game.state, "ready");
  game.action();
  assert.equal(game.state, "playing");
  game.action();
  advance(game, 10);
  assert.ok(game.ghost.y < 294);
  game.action();
  assert.equal(game.ghost.jumps, 2);
  assert.equal(game.ghost.velocity, -600);
  const velocity = game.ghost.velocity;
  game.action();
  assert.equal(game.ghost.velocity, velocity);
  game.obstacles = [];
  game.spawnTimer = 10;
  advance(game, 90);
  assert.equal(game.ghost.y, 294);
  assert.equal(game.ghost.jumps, 0);
  game.action();
  assert.equal(game.ghost.jumps, 1);
});

test("an immediate or delayed second press reaches higher than a single jump", () => {
  function peak(secondAt) {
    const game = new Game();
    game.action();
    game.obstacles = [];
    game.spawnTimer = 10;
    game.action();
    let top = 294;
    for (let frame = 0; frame < 100; frame++) {
      if (frame === secondAt) game.action();
      game.update(1 / 60);
      top = Math.min(top, game.ghost.y);
    }
    return top;
  }
  assert.ok(peak(0) < peak(-1) - 25);
  assert.ok(peak(10) < peak(-1) - 80);
});

test("a tower cannot be cleared with one jump, but two timed jumps clear it", () => {
  for (const score of [0, 26]) {
    for (let start = 0; start < 120; start++) {
      const game = new Game();
      game.action();
      game.score = score;
      game.spawnTimer = 10;
      game.obstacles = [game.createObstacle("tower", 500)];
      for (let frame = 0; frame < 150 && game.state === "playing"; frame++) {
        if (frame === start) game.action();
        game.update(1 / 60);
      }
      assert.equal(game.state, "over");
      assert.equal(game.lastHit, "tower");
    }
    const game = new Game();
    game.action();
    game.score = score;
    game.spawnTimer = 10;
    game.obstacles = [game.createObstacle("tower", 500)];
    for (let frame = 0; frame < 180 && game.score === score; frame++) {
      playStep(game);
      game.update(1 / 60);
    }
    assert.equal(game.state, "playing");
    assert.equal(game.score, score + 1);
  }
});

test("low bats are double-jumpable at both speeds across 32 starting phases", () => {
  for (const score of [0, 26]) {
    for (let phase = 0; phase < 32; phase++) {
      const game = new Game(() => phase / 32);
      game.action();
      game.score = score;
      game.spawnTimer = 10;
      game.obstacles = [game.createObstacle("bat", 500, "low")];
      for (let frame = 0; frame < 180 && game.score === score; frame++) {
        playStep(game);
        game.update(1 / 60);
      }
      assert.equal(game.state, "playing", `phase ${phase}, score ${score}`);
      assert.equal(game.score, score + 1);
    }
  }
});

test("pause preserves jumps and resuming does not consume the second jump", () => {
  const game = new Game();
  game.action();
  game.action();
  advance(game, 5);
  const before = JSON.stringify(game.ghost);
  game.paused = true;
  advance(game, 60);
  assert.equal(JSON.stringify(game.ghost), before);
  game.action();
  assert.equal(game.ghost.jumps, 1);
  game.action();
  assert.equal(game.ghost.jumps, 2);
});

test("collision ends play; restart delay prevents accidental restart", () => {
  const game = new Game();
  game.action();
  for (let i = 0; i < 180 && game.state === "playing"; i++) game.update(1 / 60);
  assert.equal(game.state, "over");
  game.action();
  assert.equal(game.state, "over");
  advance(game, 25);
  game.action();
  assert.equal(game.state, "playing");
  assert.equal(game.score, 0);
});

test("pause freezes obstacles and the same action resumes", () => {
  const game = new Game();
  game.action();
  game.paused = true;
  const before = JSON.stringify(game.obstacles);
  advance(game, 60);
  assert.equal(JSON.stringify(game.obstacles), before);
  game.action();
  assert.equal(game.paused, false);
});

test("each cleared obstacle scores once; restart retains the session best", () => {
  const game = new Game();
  game.action();
  game.obstacles = [{ x: 80, width: 28, height: 36, scored: false }];
  advance(game, 3);
  assert.equal(game.score, 1);
  game.obstacles = [{ x: 120, width: 28, height: 36, scored: false }];
  advance(game, 1);
  assert.equal(game.state, "over");
  advance(game, 25);
  game.action();
  assert.equal(game.score, 0);
  assert.equal(game.best, 1);
});

test("the jump, double-jump, or wait strategy clears a simulated five-minute run", () => {
  const game = new Game(() => 0.5);
  game.action();
  for (let frame = 0; frame < 18000; frame++) {
    playStep(game);
    game.update(1 / 60);
    assert.equal(game.state, "playing");
  }
  assert.ok(game.score > 100);
});

test("three coins spawn in an arc above the first grave", () => {
  const game = new Game();
  assert.equal(game.coins.length, 3);
  assert.deepEqual(game.coins.map(coin => coin.y), [244, 228, 244]);
  assert.equal(game.coins[1].x, 614);
  assert.ok(game.coins.every(coin => !game.touchesCoin(coin)));
});

test("each ground obstacle can be jumped at low and maximum speeds", () => {
  for (const type of ["grave", "tall", "spikes"]) {
    for (const score of [0, 26]) {
      const game = new Game();
      game.action();
      game.score = score;
      game.obstacles = [game.createObstacle(type, 500)];
      game.coins = [];
      game.addCoins(game.obstacles[0]);
      game.spawnTimer = 10;
      const speed = Math.min(240 + score * 5, 370);
      for (let frame = 0; frame < 240 && game.score === score && game.state === "playing"; frame++) {
        if (game.obstacles[0].x - game.ghost.x < speed * 0.34 && game.ghost.y === 294) game.action();
        game.update(1 / 60);
      }
      assert.equal(game.state, "playing", type);
      assert.equal(game.score, score + 1, type);
      assert.equal(game.coinsCollected, 3, type);
    }
  }
});

test("staying grounded passes a high bat and collects its low coins", () => {
  const game = new Game();
  game.action();
  game.obstacles = [game.createObstacle("bat", 400, "high")];
  game.coins = [];
  game.addCoins(game.obstacles[0]);
  game.spawnTimer = 10;
  advance(game, 100);
  assert.equal(game.state, "playing");
  assert.equal(game.score, 1);
  assert.equal(game.coinsCollected, 3);
  assert.equal(game.ghost.y, 294);
});

test("jumping into a bat ends play with a specific cause", () => {
  const game = new Game(() => 0);
  game.action();
  game.obstacles = [game.createObstacle("bat", 120, "high")];
  game.ghost.y = 180;
  advance(game, 1);
  assert.equal(game.state, "over");
  assert.equal(game.lastHit, "bat");
});

test("high bats roam on both axes but always leave ground clearance", () => {
  const game = new Game(() => 0);
  const bat = game.createObstacle("bat", 120, "high");
  const heights = [];
  const positions = [];
  for (let frame = 0; frame < 240; frame++) {
    game.moveBat(bat, 1 / 60);
    heights.push(bat.y);
    positions.push(bat.x);
    assert.ok(bat.y >= 148 && bat.y <= 212);
    assert.ok(bat.y + bat.height < game.ghost.y);
    assert.equal(game.hits(bat), false);
  }
  assert.ok(Math.min(...heights) < 149);
  assert.ok(Math.max(...heights) > 211);
  assert.ok(Math.max(...positions) - Math.min(...positions) > 70);
});

test("low bats can reach the player and their hit box follows both coordinates", () => {
  const game = new Game(() => 0);
  const bat = game.createObstacle("bat", 120, "low");
  assert.equal(game.hits(bat), false);
  game.moveBat(bat, Math.PI / 6.4);
  game.ghost.x = bat.x;
  assert.equal(bat.y, 284);
  assert.equal(game.hits(bat), true);
  game.ghost.x = bat.x + 100;
  assert.equal(game.hits(bat), false);
  game.moveBat(bat, Math.PI / 3.2);
  game.ghost.x = bat.x;
  assert.equal(bat.y, 236);
  assert.equal(game.hits(bat), false);
});

test("bat movement freezes on pause and game over, and new bats start fresh", () => {
  const game = new Game(() => 0);
  game.action();
  const bat = game.createObstacle("bat", 600, "high");
  game.obstacles = [bat];
  game.spawnTimer = 10;
  advance(game, 10);
  assert.ok(bat.x < 600);
  assert.notEqual(bat.y, 180);
  const before = JSON.stringify(bat);
  game.paused = true;
  advance(game, 60);
  assert.equal(JSON.stringify(bat), before);
  game.action();
  advance(game, 1);
  assert.notEqual(JSON.stringify(bat), before);
  game.state = "over";
  const stopped = JSON.stringify(bat);
  advance(game, 60);
  assert.equal(JSON.stringify(bat), stopped);
  game.action();
  assert.ok(game.obstacles.every(obstacle => obstacle.type !== "bat"));
  const fresh = game.createObstacle("bat", 820, "high");
  assert.equal(fresh.y, 180);
  assert.equal(fresh.x, 820);
  assert.equal(fresh.flightTime, 0);
});

test("all obstacle types collide when the ghost overlaps them", () => {
  for (const type of ["grave", "tall", "spikes", "tower", "bat"]) {
    const game = new Game();
    const obstacle = game.createObstacle(type, 120);
    game.ghost.y = obstacle.y;
    assert.equal(game.hits(obstacle), true, type);
    obstacle.x = 300;
    assert.equal(game.hits(obstacle), false, type);
  }
});

test("the introduction teaches a tower, low bat, spikes, high bat, then tall grave", () => {
  const game = new Game();
  game.action();
  const seen = [];
  for (let i = 0; i < 5; i++) {
    game.obstacles = [];
    game.spawnTimer = 0;
    advance(game, 1);
    const obstacle = game.obstacles[0];
    seen.push(obstacle.band || obstacle.type);
  }
  assert.deepEqual(seen, ["tower", "low", "spikes", "high", "tall"]);
  game.state = "over";
  game.action();
  assert.equal(game.spawned, 0);
  assert.equal(game.lastHit, "");
});

test("all 36 obstacle pairs are passable at minimum spacing, with sampled bat phases", () => {
  const types = ["grave", "tall", "spikes", "tower", "low", "high"];
  for (const first of types) {
    for (const second of types) {
      for (let phase = 0; phase < 8; phase++) {
      const game = new Game(() => phase / 8);
      game.action();
      game.score = 40;
      game.spawnTimer = 10;
      game.obstacles = [first, second].map((type, i) => game.createObstacle(type === "low" || type === "high" ? "bat" : type, 500 + i * 370 * 1.65, type));
      for (let frame = 0; frame < 400 && game.score < 42 && game.state === "playing"; frame++) {
        playStep(game);
        game.update(1 / 60);
      }
      assert.equal(game.state, "playing", `${first} then ${second}`);
      assert.equal(game.score, 42, `${first} then ${second}`);
      }
    }
  }
});

test("forty seeded five-minute runs remain playable through all difficulty levels", () => {
  for (let seed = 1; seed <= 40; seed++) {
    let state = seed;
    const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
    const game = new Game(random);
    game.action();
    for (let frame = 0; frame < 18000; frame++) {
      playStep(game);
      game.update(1 / 60);
      assert.equal(game.state, "playing", `seed ${seed}, frame ${frame}`);
    }
    assert.ok(game.score > 140);
  }
});

test("a touched coin counts once and does not change obstacle score", () => {
  const game = new Game();
  game.action();
  game.ghost.y = 220;
  game.coins = [{ x: 136, y: 230 }];
  advance(game, 1);
  assert.equal(game.coinsCollected, 1);
  assert.equal(game.coins.length, 0);
  assert.equal(game.score, 0);
  assert.ok(game.coinFlash > 0);
  advance(game, 2);
  assert.equal(game.coinsCollected, 1);
});

test("coins freeze while paused, missed coins expire, and restart clears the count", () => {
  const game = new Game();
  game.action();
  game.paused = true;
  const before = JSON.stringify(game.coins);
  advance(game, 20);
  assert.equal(JSON.stringify(game.coins), before);
  game.action();
  game.coins = [{ x: -20, y: 228 }];
  advance(game, 1);
  assert.equal(game.coins.length, 0);
  assert.equal(game.coinsCollected, 0);
  game.coinsCollected = 12;
  game.state = "over";
  game.action();
  assert.equal(game.coinsCollected, 0);
  assert.equal(game.coins.length, 3);
});

test("all three coins are reachable in one safe jump at low and maximum speeds", () => {
  for (const score of [0, 26]) {
    const game = new Game();
    game.action();
    game.score = score;
    const speed = Math.min(240 + score * 5, 370);
    for (let frame = 0; frame < 240; frame++) {
      if (game.obstacles[0].x - game.ghost.x < speed * 0.34 && game.ghost.y === 294) game.action();
      game.update(1 / 60);
      if (game.score > score) break;
    }
    assert.equal(game.state, "playing");
    assert.equal(game.coinsCollected, 3);
    assert.equal(game.score, score + 1);
  }
});
