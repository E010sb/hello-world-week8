const test = require("node:test");
const assert = require("node:assert/strict");
const GameMusic = require("../music.js");

class FakeAudio {
  constructor() { this.currentTime = 0; this.state = "suspended"; this.destination = {}; this.notes = []; }
  async resume() { this.state = "running"; }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
  }
  createOscillator() {
    const note = { frequency: {}, connect() {}, disconnect() {}, start(time) { this.startTime = time; }, stop(time) { this.stopTime = time; } };
    this.notes.push(note);
    return note;
  }
}

test("audio starts only after unlock; schedules music; pause and mute stop voices", async () => {
  global.window = { AudioContext: FakeAudio };
  const music = new GameMusic();
  music.update(true);
  assert.equal(music.context, null);
  assert.equal(music.playing, false);
  assert.equal(await music.unlock(), true);
  music.update(true);
  assert.equal(music.playing, true);
  assert.equal(music.context.notes.length, 2);
  music.coin();
  assert.equal(music.context.notes.length, 4);
  music.update(false);
  assert.equal(music.voices.size, 0);
  assert.equal(music.playing, false);
  music.update(true);
  music.setEnabled(false);
  assert.equal(music.voices.size, 0);
  const count = music.context.notes.length;
  music.update(true);
  music.coin();
  assert.equal(music.context.notes.length, count);
});

test("completed notes disconnect and are removed", async () => {
  global.window = { AudioContext: FakeAudio };
  const music = new GameMusic();
  await music.unlock();
  music.update(true);
  for (const voice of [...music.voices]) voice.oscillator.onended();
  assert.equal(music.voices.size, 0);
});

test("unsupported or blocked audio fails safely", async () => {
  global.window = {};
  const music = new GameMusic();
  assert.equal(await music.unlock(), false);
  music.update(true);
  assert.equal(music.playing, false);
  global.window.AudioContext = class { resume() { return Promise.reject(new Error("blocked")); } };
  assert.equal(await music.unlock(), false);
});
