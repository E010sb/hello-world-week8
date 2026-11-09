const game = new Game();
const music = new GameMusic();
let elapsed = 0;
let previousUI = "";
let lastCoins = 0;
let soundUnavailable = false;
const ghostPixels = [
  "..WWWW..",
  ".WWWWWW.",
  "WWWWWWWW",
  "WWDWWDWW",
  "WWDWWDWW",
  "WPWWWWPW",
  "WWWWWWWW",
  "WW.WW.WW"
];

function setup() {
  const canvas = createCanvas(800, 420);
  canvas.parent("stage");
  pixelDensity(1);
  noSmooth();
  noStroke();
  textFont("Courier New");
  const press = event => {
    if (event.button !== 0) return;
    event.preventDefault();
    handleAction();
  };
  canvas.elt.addEventListener("pointerdown", press);
  const actionButton = document.getElementById("action");
  actionButton.addEventListener("pointerdown", press);
  actionButton.onclick = event => {
    if (event.detail === 0) handleAction();
  };
  document.getElementById("sound").onchange = event => {
    music.setEnabled(event.target.checked);
    if (event.target.checked && game.state === "playing" && !game.paused) unlockSound();
    event.target.blur();
  };
  window.addEventListener("keydown", event => {
    if (event.target.id === "sound") return;
    if (event.code === "Space" || (event.code === "Enter" && event.target === actionButton)) {
      event.preventDefault();
      if (!event.repeat) handleAction();
    }
  });
  window.addEventListener("blur", pauseGame);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseGame();
  });
  window.addEventListener("pagehide", pauseGame);
}

function handleAction() {
  game.action();
  if (game.state === "playing" && !game.paused) unlockSound();
}

function unlockSound() {
  music.unlock().then(ready => {
    soundUnavailable = !ready;
  });
}

function pauseGame() {
  if (game.state === "playing") game.paused = true;
  music.stop();
  elapsed = 0;
}

function draw() {
  elapsed += min(deltaTime / 1000, 0.1);
  while (elapsed >= 1 / 60) {
    game.update(1 / 60);
    elapsed -= 1 / 60;
  }
  music.update(game.state === "playing" && !game.paused);
  if (game.coinsCollected > lastCoins) music.coin();
  lastCoins = game.coinsCollected;
  drawNight();
  for (const obstacle of game.obstacles) {
    if (obstacle.type === "bat") drawBat(obstacle);
    else if (obstacle.type === "tower") drawTower(obstacle);
    else if (obstacle.type === "spikes") drawSpikes(obstacle);
    else drawGravestone(obstacle);
  }
  for (const coin of game.coins) drawCoin(coin);
  drawGhost();
  if (game.coinFlash > 0) {
    fill("#ffe598");
    textAlign(CENTER, CENTER);
    textSize(14);
    text("+1", game.ghost.x + 16, game.ghost.y - 14);
  }

  if (game.state !== "playing" || game.paused) {
    fill("#241933");
    rect(225, 93, 350, 96);
    fill("#eee4ff");
    textAlign(CENTER, CENTER);
    textSize(28);
    text(game.paused ? "TAKE A BREATHER" : game.state === "ready" ? "A LITTLE LEAP" : "BOO! TRY AGAIN", 400, 126);
    fill("#c8a6e5");
    textSize(14);
    text(game.paused ? "PRESS SPACE TO RESUME" : game.state === "ready" ? "START, THEN TAP TWICE TO JUMP HIGHER" : "PRESS SPACE TO RESTART", 400, 161);
  }
  updateUI();
}

function drawNight() {
  background("#211832");
  for (let i = 0; i < 32; i++) {
    fill(i % 3 === 0 ? "#dcc2ec" : "#705981");
    rect((i * 97 + 29) % 790, (i * 47 + 23) % 215, 3, 3);
  }
  drawMoon();

  for (let i = 0; i < 9; i++) {
    const x = i * 120 - (game.distance * 0.15) % 120;
    const towerHeight = 75 + (i % 3) * 25;
    fill("#30233f");
    rect(x, 326 - towerHeight, 76, towerHeight);
    for (let top = 0; top < 3; top++) rect(x + top * 28, 316 - towerHeight, 20, 12);
    fill("#513b65");
    rect(x + 30, 350 - towerHeight, 12, 20);
  }
  fill("#b394ce");
  rect(0, 326, 800, 4);
  fill("#382749");
  rect(0, 330, 800, 90);
  for (let i = 0; i < 24; i++) {
    fill("#644878");
    rect(i * 40 - game.distance % 40, 342, 20, 4);
    fill("#49315c");
    rect(i * 40 + 10 - game.distance % 40, 373, 8, 4);
  }
}

function drawMoon() {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if ((x - 7.5) ** 2 + (y - 7.5) ** 2 < 56) {
        fill(x > 10 || y > 12 ? "#d5c0ea" : "#f1e5fa");
        rect(656 + x * 4, 28 + y * 4, 4, 4);
      }
    }
  }
  fill("#c6aedc");
  rect(672, 44, 12, 8);
  rect(676, 40, 4, 16);
  rect(692, 64, 12, 8);
  rect(696, 60, 4, 16);
  rect(672, 68, 8, 8);
  fill("#e3d1ef");
  rect(672, 44, 8, 4);
  rect(692, 64, 8, 4);
}

function drawGhost() {
  if (game.boostFlash > 0) {
    const spread = Math.round((0.22 - game.boostFlash) * 70);
    fill("#e0b2ff");
    rect(game.ghost.x - spread, game.ghost.y + 34, 12, 4);
    rect(game.ghost.x + 20 + spread, game.ghost.y + 34, 12, 4);
    rect(game.ghost.x + 14, game.ghost.y + 40 + spread / 2, 4, 8);
  }
  const palette = { W: "#f6edff", D: "#38214e", P: "#d29bda" };
  for (let y = 0; y < ghostPixels.length; y++) {
    for (let x = 0; x < ghostPixels[y].length; x++) {
      const shade = palette[ghostPixels[y][x]];
      if (shade) {
        fill(shade);
        rect(game.ghost.x + x * 4, Math.round(game.ghost.y) + y * 4, 4, 4);
      }
    }
  }
  if (game.state === "playing") {
    for (let i = 0; i < 2; i++) {
      fill(i < 2 - game.ghost.jumps ? "#e0b2ff" : "#665272");
      rect(game.ghost.x + 8 + i * 12, Math.round(game.ghost.y) - 11, 6, 4);
    }
  }
}

function drawTower(obstacle) {
  const x = Math.round(obstacle.x);
  const y = obstacle.y;
  fill("#b88bd2");
  rect(x, y + 8, 40, 104);
  for (let i = 0; i < 3; i++) rect(x + i * 14, y, 12, 12);
  fill("#79528f");
  rect(x + 32, y + 12, 8, 100);
  for (let row = 1; row < 6; row++) rect(x, y + row * 18, 32, 2);
  fill("#f6cf83");
  rect(x + 14, y + 25, 10, 16);
  rect(x + 14, y + 65, 10, 16);
  if (!obstacle.scored && x < 740) {
    fill("#e9caff");
    textAlign(CENTER, CENTER);
    textSize(12);
    text("JUMP ×2", x + 20, y - 16);
  }
}

function drawGravestone(obstacle) {
  const x = Math.round(obstacle.x);
  const y = 326 - obstacle.height;
  fill(obstacle.type === "tall" ? "#c598dc" : "#aa87c3");
  rect(x, y + 5, obstacle.width, obstacle.height - 5);
  rect(x + 4, y, obstacle.width - 8, 5);
  fill("#72528a");
  rect(x + obstacle.width - 5, y + 5, 5, obstacle.height - 5);
  fill("#382749");
  rect(x + obstacle.width / 2 - 2, y + 10, 4, 17);
  rect(x + obstacle.width / 2 - 6, y + 15, 12, 4);
}

function drawSpikes(obstacle) {
  const x = Math.round(obstacle.x);
  fill("#855268");
  rect(x, 322, obstacle.width, 4);
  for (let i = 0; i < 3; i++) {
    const tip = x + i * 20 + 8;
    for (let row = 0; row < 6; row++) {
      fill("#dc91a6");
      rect(tip - row, 298 + row * 4, 4 + row * 2, 4);
      fill("#ffe0dc");
      rect(tip - row, 298 + row * 4, 2, 4);
    }
  }
}

function drawBat(obstacle) {
  const x = Math.round(obstacle.x);
  const y = Math.round(obstacle.y);
  const wingsUp = Math.floor(obstacle.flightTime * 8) % 2 === 0;
  fill(obstacle.band === "low" ? "#ef9eb4" : "#b9a4ef");
  rect(x + 16, y + 8, 16, 12);
  rect(x + 16, y + 4, 4, 8);
  rect(x + 28, y + 4, 4, 8);
  for (let i = 0; i < 4; i++) {
    const wingY = y + (wingsUp ? i * 3 : 14 - i * 2);
    rect(x + i * 4, wingY, 4, 8);
    rect(x + 44 - i * 4, wingY, 4, 8);
  }
  fill("#fff0b8");
  rect(x + 20, y + 10, 3, 3);
  rect(x + 26, y + 10, 3, 3);
  if (obstacle.x + obstacle.width > game.ghost.x && obstacle.x < 740) {
    fill("#f2bdcf");
    textAlign(CENTER, CENTER);
    textSize(12);
    text(obstacle.band === "low" ? "LOW BAT · JUMP ×2" : "HIGH BAT · STAY LOW", x + obstacle.width / 2, y - 16);
  }
}

function drawCoin(coin) {
  const x = Math.round(coin.x);
  const y = coin.y;
  const thin = Math.floor(game.distance / 25) % 4 === 1;
  fill("#b97a30");
  rect(x - (thin ? 3 : 7), y - 6, thin ? 6 : 14, 12);
  fill("#f4c95a");
  rect(x - (thin ? 2 : 5), y - 8, thin ? 4 : 10, 16);
  fill("#fff0ac");
  rect(x - (thin ? 1 : 3), y - 5, 2, 7);
}

function updateUI() {
  const next = game.obstacles.find(obstacle => !obstacle.scored);
  const key = `${game.state}-${game.paused}-${game.score}-${game.best}-${game.coinsCollected}-${game.ghost.jumps}-${music.enabled}-${music.playing}-${soundUnavailable}-${next?.type}-${next?.band}`;
  if (key === previousUI) return;
  previousUI = key;
  document.getElementById("sound-label").textContent = !music.enabled ? "Sound off" : soundUnavailable ? "Sound unavailable — try again" : music.playing ? "Music playing" : "Sound on";
  document.getElementById("score").textContent = String(game.score).padStart(2, "0");
  document.getElementById("best").textContent = String(game.best).padStart(2, "0");
  document.getElementById("coins").textContent = String(game.coinsCollected).padStart(2, "0");
  document.getElementById("action").textContent = game.paused ? "RESUME" : game.state === "ready" ? "START" : game.state === "over" ? "TRY AGAIN" : game.ghost.jumps === 1 ? "JUMP AGAIN" : game.ghost.jumps === 2 ? "AIRBORNE" : "JUMP";
  const mistake = game.lastHit === "bat" ? "Watch the bat: jump over low bats, stay under high bats." : game.lastHit === "tower" ? "Tap again in the air to clear the high tower!" : game.lastHit === "spikes" ? "Jump across the whole spike row!" : "Watch your jump timing!";
  let hint = "One tap to jump. Tap again in the air to go higher.";
  if (next?.type === "tower") hint = "HIGH TOWER — jump, then tap again in the air.";
  if (next?.type === "bat") hint = next.band === "low" ? "LOW BAT — use a double jump to fly over it." : "HIGH BAT — stay on the ground and let it pass.";
  document.getElementById("message").textContent = game.paused ? "Paused. Your ghost is safe." : game.state === "ready" ? "A little game while you wait. Tap twice to jump higher." : game.state === "over" ? `${mistake} ${game.score} obstacles · ${game.coinsCollected} coins.` : hint;
}
