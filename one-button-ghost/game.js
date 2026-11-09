class Game {
  constructor(random = Math.random) {
    this.random = random;
    this.state = "ready";
    this.best = 0;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.coinsCollected = 0;
    this.coins = [];
    this.coinFlash = 0;
    this.boostFlash = 0;
    this.ghost = { x: 120, y: 294, width: 32, height: 32, velocity: 0, jumps: 0 };
    this.obstacles = [this.createObstacle("grave", 600)];
    this.addCoins(this.obstacles[0]);
    this.spawned = 0;
    this.lastHit = "";
    this.spawnTimer = 1.8;
    this.distance = 0;
    this.paused = false;
    this.restartDelay = 0;
  }

  createObstacle(type, x, band) {
    const shapes = {
      grave: { width: 28, height: 36, y: 290 },
      tall: { width: 32, height: 58, y: 268 },
      spikes: { width: 60, height: 28, y: 298 },
      tower: { width: 40, height: 112, y: 214 },
      bat: { width: 48, height: 24, y: 180, flightTime: 0 }
    };
    const obstacle = { ...shapes[type], type, x, scored: false };
    if (type === "bat") {
      obstacle.band = band || (this.random() < 0.5 ? "low" : "high");
      obstacle.phase = this.random() * Math.PI * 2;
      obstacle.anchorX = x - Math.sin(obstacle.phase) * 36;
      this.moveBat(obstacle, 0);
    }
    return obstacle;
  }

  action() {
    if (this.paused) {
      this.paused = false;
    } else if (this.state !== "playing") {
      if (this.restartDelay > 0) return;
      this.reset();
      this.state = "playing";
    } else if (this.ghost.jumps < 2) {
      this.ghost.velocity = this.ghost.jumps === 0 ? -510 : -600;
      this.ghost.jumps++;
      if (this.ghost.jumps === 2) this.boostFlash = 0.22;
    }
  }

  update(dt) {
    this.restartDelay = Math.max(0, this.restartDelay - dt);
    if (this.state !== "playing" || this.paused) return;

    const speed = Math.min(240 + this.score * 5, 370);
    this.coinFlash = Math.max(0, this.coinFlash - dt);
    this.boostFlash = Math.max(0, this.boostFlash - dt);
    this.distance += speed * dt;
    this.ghost.velocity += 1400 * dt;
    this.ghost.y += this.ghost.velocity * dt;
    if (this.ghost.y >= 294) {
      this.ghost.y = 294;
      this.ghost.velocity = 0;
      this.ghost.jumps = 0;
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const introduction = ["tower", "bat", "spikes", "bat", "tall"];
      const types = ["grave", "tall", "spikes", "tower", "bat"];
      const type = this.spawned < introduction.length ? introduction[this.spawned] : types[Math.floor(this.random() * types.length)];
      const band = this.spawned === 1 ? "low" : this.spawned === 3 ? "high" : undefined;
      const obstacle = this.createObstacle(type, 820, band);
      this.spawned++;
      this.obstacles.push(obstacle);
      this.addCoins(obstacle);
      this.spawnTimer = Math.max(1.65, 2.05 - this.score * 0.01) + this.random() * 0.25;
    }

    for (const obstacle of this.obstacles) {
      if (obstacle.type === "bat") this.moveBat(obstacle, dt, speed);
      else obstacle.x -= speed * dt;
      if (this.hits(obstacle)) {
        this.state = "over";
        this.lastHit = obstacle.type || "grave";
        this.restartDelay = 0.4;
        this.best = Math.max(this.best, this.score);
        return;
      }
      if (!obstacle.scored && obstacle.x + obstacle.width < this.ghost.x) {
        obstacle.scored = true;
        this.score++;
        this.best = Math.max(this.best, this.score);
      }
    }
    for (const coin of this.coins) {
      coin.x -= speed * dt;
      if (this.touchesCoin(coin)) {
        coin.collected = true;
        this.coinsCollected++;
        this.coinFlash = 0.3;
      }
    }
    this.coins = this.coins.filter(coin => !coin.collected && coin.x > -12);
    this.obstacles = this.obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);
  }

  moveBat(bat, dt, speed = 0) {
    bat.anchorX -= speed * dt;
    bat.flightTime += dt;
    bat.x = bat.anchorX + Math.sin(bat.flightTime * 1.9 + bat.phase) * 36;
    const wave = Math.sin(bat.flightTime * 3.2 + bat.phase);
    bat.y = bat.band === "low" ? 260 + wave * 24 : 180 + wave * 32;
  }

  addCoins(obstacle) {
    for (let i = 0; i < 3; i++) {
      const highArc = obstacle.type === "tower" || (obstacle.type === "bat" && obstacle.band === "low");
      const y = highArc ? (i === 1 ? 148 : 164) : obstacle.type === "bat" ? 310 : i === 1 ? 228 : 244;
      this.coins.push({ x: obstacle.x + obstacle.width / 2 + (i - 1) * 24, y });
    }
  }

  touchesCoin(coin) {
    const ghost = this.ghost;
    return ghost.x + 4 < coin.x + 8 && ghost.x + ghost.width - 4 > coin.x - 8 &&
      ghost.y + 3 < coin.y + 8 && ghost.y + ghost.height - 3 > coin.y - 8;
  }

  hits(obstacle) {
    const ghost = this.ghost;
    const top = obstacle.y ?? 326 - obstacle.height;
    return ghost.x + 5 < obstacle.x + obstacle.width - 3 &&
      ghost.x + ghost.width - 5 > obstacle.x + 3 &&
      ghost.y + ghost.height - 3 > top + 3 &&
      ghost.y + 4 < top + obstacle.height - 3;
  }
}

if (typeof module !== "undefined") module.exports = Game;
