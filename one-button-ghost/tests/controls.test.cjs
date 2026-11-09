const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function fixture() {
  const elements = {};
  const events = {};
  const shapes = [];
  const words = [];
  function element(id) {
    return elements[id] ||= { id, checked: true, textContent: "", handlers: {}, blur() {}, addEventListener(name, handler) { this.handlers[name] = handler; } };
  }
  const context = vm.createContext({
    console, Math, deltaTime: 1000 / 60, min: Math.min, CENTER: "center",
    document: { hidden: false, getElementById: element, addEventListener(name, handler) { events[name] = handler; } },
    window: { addEventListener(name, handler) { events[name] = handler; } },
    GameMusic: class {
      constructor() { this.enabled = true; this.playing = false; }
      unlock() { return Promise.resolve(true); }
      update(active) { this.playing = active && this.enabled; }
      stop() { this.playing = false; }
      coin() {}
      setEnabled(enabled) { this.enabled = enabled; }
    },
    createCanvas() { return { elt: element("canvas"), parent() {} }; },
    pixelDensity() {}, noSmooth() {}, noStroke() {}, textFont() {}, fill() {}, background() {}, textAlign() {}, textSize() {},
    rect(...values) { shapes.push(values); },
    text(value) { words.push(value); }
  });
  const run = code => vm.runInContext(code, context);
  for (const file of ["game.js", "sketch.js"]) run(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));
  run("setup()");
  return { context, elements, events, shapes, words, run, element };
}

test("Space uses one action, key repeat is ignored, and a third press cannot boost", () => {
  const f = fixture();
  const key = repeat => ({ code: "Space", repeat, target: f.element("body"), preventDefault() {} });
  f.events.keydown(key(false));
  f.events.keydown(key(false));
  assert.equal(f.run("game.ghost.jumps"), 1);
  f.events.keydown(key(true));
  assert.equal(f.run("game.ghost.jumps"), 1);
  f.events.keydown(key(false));
  f.events.keydown(key(false));
  assert.equal(f.run("game.ghost.jumps"), 2);
});

test("pointer clicks are not counted twice and keyboard activation still works", () => {
  const f = fixture();
  const button = f.element("action");
  button.handlers.pointerdown({ button: 0, preventDefault() {} });
  button.onclick({ detail: 1 });
  assert.equal(f.run("game.ghost.jumps"), 0);
  button.handlers.pointerdown({ button: 0, preventDefault() {} });
  button.onclick({ detail: 1 });
  assert.equal(f.run("game.ghost.jumps"), 1);
  button.onclick({ detail: 0 });
  assert.equal(f.run("game.ghost.jumps"), 2);
});

test("canvas taps double jump; blur pauses flight; sound focus does not trigger jumps", () => {
  const f = fixture();
  const tap = () => f.element("canvas").handlers.pointerdown({ button: 0, preventDefault() {} });
  tap(); tap();
  f.events.keydown({ code: "Space", repeat: false, target: f.element("sound"), preventDefault() {} });
  assert.equal(f.run("game.ghost.jumps"), 1);
  f.events.blur();
  assert.equal(f.run("game.paused"), true);
  tap();
  assert.equal(f.run("game.ghost.jumps"), 1);
  tap();
  assert.equal(f.run("game.ghost.jumps"), 2);
});

test("new obstacle drawings use finite coordinates and the interface explains double jumps", () => {
  const f = fixture();
  f.run('draw(); drawTower(game.createObstacle("tower", 400)); drawBat(game.createObstacle("bat", 600, "low")); drawBat(game.createObstacle("bat", 700, "high"));');
  assert.ok(f.shapes.length > 100);
  assert.ok(f.shapes.every(values => values.every(Number.isFinite)));
  assert.ok(f.words.includes("JUMP ×2"));
  assert.ok(f.words.includes("LOW BAT · JUMP ×2"));
  assert.ok(f.words.includes("HIGH BAT · STAY LOW"));
  f.run("game.action(); game.action(); updateUI();");
  assert.equal(f.element("action").textContent, "JUMP AGAIN");
  f.run("game.action(); updateUI();");
  assert.equal(f.element("action").textContent, "AIRBORNE");
});
