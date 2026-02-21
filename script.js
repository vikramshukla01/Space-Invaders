const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const PLAYER_8x8 = [
  '00011000',
  '00111100',
  '01111110',
  '11111111',
  '11111111',
  '00111100',
  '01100110',
  '11000011',
];

const ALIEN_8x8 = [
  '00111100',
  '01111110',
  '11111111',
  '11011011',
  '11111111',
  '00100100',
  '01011010',
  '10100101',
];

const PLAYER_SCALE = 6;
const ENEMY_SCALE  = 5;

function drawSprite(ctx, sprite, x, y, scale, color) {
  if (!color) color = 'white';
  ctx.fillStyle = color;
  for (let r = 0; r < sprite.length; r++) {
    const row = sprite[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '1') {
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }
}

function drawSpriteInBox(ctx, sprite, boxX, boxY, boxW, boxH, scale, color) {
  if (!color) color = 'white';
  const spriteW = sprite[0].length * scale;
  const spriteH = sprite.length * scale;
  const offsetX = boxX + Math.floor((boxW - spriteW) / 2);
  const offsetY = boxY + Math.floor((boxH - spriteH) / 2);
  drawSprite(ctx, sprite, offsetX, offsetY, scale, color);
}

let isGameOver = false;
let isStartScreen = true;
let isPaused = false;
let score = 0;
let isFiring = false;
let canFire = true;
let lives = 3;
let level = 1;
let enemyDirection = 1;
let enemyFireRate = 1000;
let wallGapProbability = 0.4;
let lastEnemyFireTime = 0;

class Player {
  constructor() {
    this.width = 50;
    this.height = 50;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height - this.height - 10;
  }
  draw() {
    drawSpriteInBox(ctx, PLAYER_8x8, this.x, this.y, this.width, this.height, PLAYER_SCALE, 'white');
  }
  moveTo(x) {
    this.x = x - this.width / 2;
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
  }
}

class Enemy {
  constructor(x, y) {
    this.width = 40;
    this.height = 40;
    this.x = x;
    this.y = y;
  }
  draw() {
    drawSpriteInBox(ctx, ALIEN_8x8, this.x, this.y, this.width, this.height, ENEMY_SCALE, 'lime');
  }
  update() {
    this.x += enemyDirection * 0.5;
  }
}

class Bullet {
  constructor(x, y) {
    this.width = 5;
    this.height = 12;
    this.x = x;
    this.y = y;
    this.speed = 8;
  }
  draw() {
    ctx.fillStyle = 'yellow';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
  update() { this.y -= this.speed; }
}

class EnemyBullet {
  constructor(x, y) {
    this.width = 4;
    this.height = 12;
    this.x = x;
    this.y = y;
    this.speed = 5;
  }
  draw() {
    ctx.fillStyle = 'red';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
  update() { this.y += this.speed; }
}

class Wall {
  constructor(x, y) {
    this.width = 20;
    this.height = 20;
    this.x = x;
    this.y = y;
    this.health = 3;
  }
  draw() {
    ctx.fillStyle = 'rgba(0,200,0,' + (this.health / 3) + ')';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
  hit() {
    this.health--;
    return this.health <= 0;
  }
}

let player;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let walls = [];

function initGame() {
  player = new Player();
  enemies = [];
  bullets = [];
  enemyBullets = [];
  walls = [];
  score = 0;
  lives = 3;
  level = 1;
  enemyDirection = 1;
  enemyFireRate = 1000;
  wallGapProbability = 0.4;
  canFire = true;
  isGameOver = false;
  isPaused = false;
  lastEnemyFireTime = 0;
  bulletTimer = 0;
  spawnEnemies();
  spawnWalls();
}

function spawnEnemies() {
  const rows = 3 + level;
  const cols = 10;
  const padding = 10;
  const totalEnemyWidth = cols * 40 + (cols - 1) * padding;
  const startX = (canvas.width - totalEnemyWidth) / 2;
  const startY = 60;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (40 + padding);
      const y = startY + row * (40 + padding);
      enemies.push(new Enemy(x, y));
    }
  }
}

function spawnWalls() {
  const wallRows = 3;
  const wallCols = Math.floor(canvas.width / 25);
  const padding = 5;
  const totalWallWidth = wallCols * 20 + (wallCols - 1) * padding;
  const startX = (canvas.width - totalWallWidth) / 2;
  const startY = canvas.height - 260;
  for (let row = 0; row < wallRows; row++) {
    for (let col = 0; col < wallCols; col++) {
      if (Math.random() > wallGapProbability) {
        const x = startX + col * (20 + padding);
        const y = startY + row * (20 + padding);
        walls.push(new Wall(x, y));
      }
    }
  }
}

function drawHUD() {
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + score, 10, 30);
  ctx.textAlign = 'center';
  ctx.fillText('Level: ' + level, canvas.width / 2, 30);
  ctx.textAlign = 'right';
  let hearts = '';
  for (let i = 0; i < lives; i++) hearts += (i > 0 ? ' ' : '') + String.fromCharCode(9829);
  ctx.fillText('Lives: ' + hearts, canvas.width - 10, 30);
  ctx.textAlign = 'left';
}

function drawStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawSprite(ctx, ALIEN_8x8, canvas.width / 2 - 20, canvas.height / 2 - 200, 5, 'lime');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 64px monospace';
  ctx.fillText('SPACE INVADERS', canvas.width / 2, canvas.height / 2 - 90);

  ctx.fillStyle = 'white';
  ctx.font = '24px monospace';
  ctx.fillText('Move with mouse  |  Hold Left Click to shoot', canvas.width / 2, canvas.height / 2);
  ctx.fillText('Press P to pause', canvas.width / 2, canvas.height / 2 + 36);

  ctx.fillStyle = '#ffff00';
  ctx.font = 'bold 26px monospace';
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.fillText('PRESS ANY KEY OR CLICK TO START', canvas.width / 2, canvas.height / 2 + 110);
  }
  ctx.textAlign = 'left';
}

function drawGameOverScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 72px monospace';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 60);

  ctx.fillStyle = 'white';
  ctx.font = '32px monospace';
  ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2);

  ctx.fillStyle = '#ffff00';
  ctx.font = 'bold 24px monospace';
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.fillText('PRESS ANY KEY OR CLICK TO RESTART', canvas.width / 2, canvas.height / 2 + 70);
  }
  ctx.textAlign = 'left';
}

function drawPauseScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
  ctx.font = '24px monospace';
  ctx.fillText('Press P to resume', canvas.width / 2, canvas.height / 2 + 50);
  ctx.textAlign = 'left';
}

function moveEnemies() {
  let changeDirection = false;
  enemies.forEach(function(enemy) {
    enemy.update();
    if (enemy.x + enemy.width >= canvas.width || enemy.x <= 0) {
      changeDirection = true;
    }
  });
  if (changeDirection) {
    enemyDirection *= -1;
    enemies.forEach(function(enemy) {
      enemy.y += 20;
    });
  }
}

function checkCollisions() {
  enemies.forEach(function(enemy) {
    if (player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + enemy.height &&
        player.y + player.height > enemy.y) {
      loseLife();
    }
  });
}

function checkEnemyBulletCollisions() {
  for (let bi = enemyBullets.length - 1; bi >= 0; bi--) {
    const bullet = enemyBullets[bi];
    let hit = false;
    for (let wi = walls.length - 1; wi >= 0; wi--) {
      const wall = walls[wi];
      if (bullet.x < wall.x + wall.width &&
          bullet.x + bullet.width > wall.x &&
          bullet.y < wall.y + wall.height &&
          bullet.y + bullet.height > wall.y) {
        if (wall.hit()) walls.splice(wi, 1);
        enemyBullets.splice(bi, 1);
        hit = true;
        break;
      }
    }
    if (!hit) {
      if (bullet.x < player.x + player.width &&
          bullet.x + bullet.width > player.x &&
          bullet.y < player.y + player.height &&
          bullet.y + bullet.height > player.y) {
        enemyBullets.splice(bi, 1);
        loseLife();
      }
    }
  }
}

function loseLife() {
  lives--;
  if (lives <= 0) {
    isGameOver = true;
  }
}

function spawnEnemyBullets() {
  if (enemies.length > 0) {
    const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
    enemyBullets.push(new EnemyBullet(
      randomEnemy.x + randomEnemy.width / 2 - 2,
      randomEnemy.y + randomEnemy.height
    ));
  }
}

function increaseDifficulty() {
  level++;
  enemyDirection = 1;
  enemyFireRate = Math.max(300, enemyFireRate - 100);
  wallGapProbability = Math.min(0.8, wallGapProbability + 0.05);
  enemies = [];
  bullets = [];
  enemyBullets = [];
  walls = [];
  spawnEnemies();
  spawnWalls();
}

canvas.addEventListener('mousemove', function(e) {
  if (!isStartScreen && !isGameOver && !isPaused && player) {
    const rect = canvas.getBoundingClientRect();
    player.moveTo(e.clientX - rect.left);
  }
});

canvas.addEventListener('mousedown', function(e) {
  if (e.button === 0) {
    if (isStartScreen) { startGame(); }
    else if (isGameOver) { restartGame(); }
    else { isFiring = true; }
  }
});

canvas.addEventListener('mouseup', function(e) {
  if (e.button === 0) isFiring = false;
});

document.addEventListener('keydown', function(e) {
  if (isStartScreen) { startGame(); return; }
  if (isGameOver) { restartGame(); return; }
  if (e.key === 'p' || e.key === 'P') {
    isPaused = !isPaused;
    if (!isPaused) requestAnimationFrame(gameLoop);
  }
});

function startGame() {
  isStartScreen = false;
  initGame();
  requestAnimationFrame(gameLoop);
}

function restartGame() {
  isGameOver = false;
  initGame();
  requestAnimationFrame(gameLoop);
}

let bulletTimer = 0;
const bulletInterval = 30;

function gameLoop(timestamp) {
  if (isPaused) {
    drawPauseScreen();
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (isGameOver) {
    drawGameOverScreen();
    requestAnimationFrame(gameLoop);
    return;
  }

  if (isFiring) {
    bulletTimer++;
    if (bulletTimer >= bulletInterval && canFire) {
      bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y));
      bulletTimer = 0;
    }
  } else {
    bulletTimer = 0;
  }

  if (!lastEnemyFireTime) lastEnemyFireTime = timestamp;
  if (timestamp - lastEnemyFireTime > enemyFireRate) {
    spawnEnemyBullets();
    lastEnemyFireTime = timestamp;
  }

  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const bullet = bullets[bi];
    bullet.update();
    bullet.draw();
    if (bullet.y + bullet.height < 0) { bullets.splice(bi, 1); continue; }

    let bulletHit = false;
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const enemy = enemies[ei];
      if (bullet.x < enemy.x + enemy.width &&
          bullet.x + bullet.width > enemy.x &&
          bullet.y < enemy.y + enemy.height &&
          bullet.y + bullet.height > enemy.y) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        score += 10;
        bulletHit = true;
        break;
      }
    }

    if (!bulletHit && bullets[bi]) {
      for (let wi = walls.length - 1; wi >= 0; wi--) {
        const wall = walls[wi];
        if (bullets[bi].x < wall.x + wall.width &&
            bullets[bi].x + bullets[bi].width > wall.x &&
            bullets[bi].y < wall.y + wall.height &&
            bullets[bi].y + bullets[bi].height > wall.y) {
          if (wall.hit()) walls.splice(wi, 1);
          bullets.splice(bi, 1);
          break;
        }
      }
    }
  }

  for (let bi = enemyBullets.length - 1; bi >= 0; bi--) {
    enemyBullets[bi].update();
    enemyBullets[bi].draw();
    if (enemyBullets[bi].y > canvas.height) enemyBullets.splice(bi, 1);
  }

  moveEnemies();

  enemies.forEach(function(enemy) { enemy.draw(); });
  walls.forEach(function(wall) { wall.draw(); });
  player.draw();

  checkCollisions();
  checkEnemyBulletCollisions();
  drawHUD();

  if (enemies.length === 0) increaseDifficulty();

  enemies.forEach(function(enemy) {
    if (enemy.y + enemy.height >= player.y) isGameOver = true;
  });

  requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', function() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (player) {
    player.y = canvas.height - player.height - 10;
  }
});

function bootLoop() {
  if (!isStartScreen) return;
  drawStartScreen();
  requestAnimationFrame(bootLoop);
}

requestAnimationFrame(bootLoop);
