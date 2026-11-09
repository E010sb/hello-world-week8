setup = function () {
  createCanvas(800, 420).parent("stage");
  pixelDensity(1);
  noSmooth();
  noStroke();
  textFont("Courier New");
  game.obstacles = [
    game.createObstacle("grave", 230),
    game.createObstacle("tall", 320),
    game.createObstacle("tower", 430),
    game.createObstacle("spikes", 540),
    game.createObstacle("bat", 680, "low"),
    game.createObstacle("bat", 680, "high")
  ];
  game.coins = [];
  for (const obstacle of game.obstacles) game.addCoins(obstacle);
};

draw = function () {
  drawNight();
  for (const obstacle of game.obstacles) {
    if (obstacle.type === "bat") {
      game.moveBat(obstacle, Math.min(deltaTime / 1000, 0.1));
      drawBat(obstacle);
    }
    else if (obstacle.type === "tower") drawTower(obstacle);
    else if (obstacle.type === "spikes") drawSpikes(obstacle);
    else drawGravestone(obstacle);
  }
  for (const coin of game.coins) drawCoin(coin);
  drawGhost();
  game.distance += 0.8;
};
