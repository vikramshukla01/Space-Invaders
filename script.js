const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ============================================================
// SPRITES
// ============================================================
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

const PLAYER_SCALE = 6; // 8*6=48 fits in 50px box
const ENEMY_SCALE  = 5; // 8*5=40 fits in 40px box

function drawSprite(ctx, sprite, x, y, scale, color) {
  if (!color) color = 'white';
  ctx.fillStyle = color;
  for (let r = 0; r < sprite.length; r++) {
    const row = sprite[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '1') ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
    }
  }
}

function drawSpriteInBox(ctx, sprite, boxX, boxY, boxW, boxH, scale, color) {
  if (!color) color = 'white';
  const offsetX = boxX + Math.floor((boxW - sprite[0].length * scale) / 2);
  const offsetY = boxY + Math.floor((boxH - sprite.length    * scale) / 2);
  drawSprite(ctx, sprite, offsetX, offsetY, scale, color);
}

// ============================================================
// DIFFICULTY CONFIG
// ============================================================
const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD'];
let difficultyIndex = 1; // starts on NORMAL

const DIFF_CONFIG = {
  EASY: {
    patternPool: ['CLASSIC', 'BANDS'],
    patternWeights: [0.6, 0.4],
    minEnemies: 35, maxEnemies: 45,
    baseFireRate: 0.6,       // shots/sec
    baseMaxBullets: 2,
    speedMult: 1.00,
    stepDown: 11,
  },
  NORMAL: {
    patternPool: ['CLASSIC', 'BANDS', 'WEDGE', 'COLUMNS'],
    patternWeights: [0.35, 0.25, 0.25, 0.15],
    minEnemies: 40, maxEnemies: 52,
    baseFireRate: 1.0,
    baseMaxBullets: 3,
    speedMult: 1.15,
    stepDown: 13,
  },
  HARD: {
    patternPool: ['CLASSIC', 'BANDS', 'WEDGE', 'COLUMNS', 'CHECKER'],
    patternWeights: [0.30, 0.20, 0.20, 0.18, 0.12],
    minEnemies: 48, maxEnemies: 60,
    baseFireRate: 1.5,
    baseMaxBullets: 4,
    speedMult: 1.35,
    stepDown: 15,
  },
};

function getDifficulty() { return DIFFICULTIES[difficultyIndex]; }
function getDiffConf()    { return DIFF_CONFIG[getDifficulty()]; }

// ============================================================
// LEVEL-RAMPED PARAMS (computed fresh each wave)
// ============================================================
function getLevelParams(level) {
  const base = getDiffConf();
  const L = level - 1;
  const fireRate    = Math.min(2.2,  base.baseFireRate  * (1 + 0.06 * L));
  const maxBullets  = Math.min(6,    base.baseMaxBullets + Math.floor(L / 4));
  const speedMult   = Math.min(2.0,  base.speedMult      * (1 + 0.03 * L));
  const minEnemies  = Math.min(base.maxEnemies, base.minEnemies + Math.floor(L / 2));
  return { fireRate, maxBullets, speedMult, minEnemies, maxEnemies: base.maxEnemies, stepDown: base.stepDown };
}

// ============================================================
// FORMATION GENERATOR  (5 rows x 11 cols, symmetric)
// ============================================================
const GRID_ROWS = 5;
const GRID_COLS = 11;

function weightedChoice(pool, weights) {
  let r = Math.random();
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function generateFormationMask(level) {
  const conf = getDiffConf();
  const params = getLevelParams(level);
  const pattern = weightedChoice(conf.patternPool, conf.patternWeights);

  // Build half-grid (cols 0..5), then mirror
  // half[row][col0..5] -> mirror to col 10..6
  const half = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    half.push([false, false, false, false, false, false]);
  }

  const halfCols = 6; // cols 0..5 (col 5 is the center col)

  if (pattern === 'CLASSIC') {
    // Start full, punch holes
    const holeProb = 0.18;
    for (let r = 0; r < GRID_ROWS; r++)
      for (let c = 0; c < halfCols; c++)
        half[r][c] = Math.random() > holeProb;

  } else if (pattern === 'BANDS') {
    // Dense top, sparse bottom
    const densities = [0.95, 0.85, 0.70, 0.50, 0.30];
    for (let r = 0; r < GRID_ROWS; r++)
      for (let c = 0; c < halfCols; c++)
        half[r][c] = Math.random() < densities[r];

  } else if (pattern === 'WEDGE') {
    // Center-heavy: more likely if col closer to center (col 5)
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < halfCols; c++) {
        const distFromCenter = halfCols - 1 - c; // 0=center, 5=edge
        const prob = 0.9 - distFromCenter * 0.12;
        half[r][c] = Math.random() < prob;
      }
    }

  } else if (pattern === 'COLUMNS') {
    // Pick 3-4 strong cols out of 6, fill them densely, others sparse
    const numStrong = 3 + Math.floor(Math.random() * 2);
    const colIndices = [0,1,2,3,4,5].sort(() => Math.random() - 0.5);
    const strongCols = new Set(colIndices.slice(0, numStrong));
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < halfCols; c++) {
        half[r][c] = strongCols.has(c)
          ? Math.random() > 0.10
          : Math.random() > 0.75;
      }
    }

  } else { // CHECKER
    for (let r = 0; r < GRID_ROWS; r++)
      for (let c = 0; c < halfCols; c++)
        half[r][c] = (r + c) % 2 === 0;
  }

  // Build full 5x11 mask (mirror: col c mirrors to col 10-c; col5 stays)
  const mask = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row = new Array(GRID_COLS).fill(false);
    for (let c = 0; c < halfCols; c++) {
      row[c] = half[r][c];
      if (c < 5) row[10 - c] = half[r][c]; // mirror (col5 is center, no mirror needed)
    }
    mask.push(row);
  }

  // ---- Repair pass ----
  // 1. Count enemies
  function countMask(m) {
    let n = 0;
    for (let r = 0; r < GRID_ROWS; r++) for (let c = 0; c < GRID_COLS; c++) if (m[r][c]) n++;
    return n;
  }

  // 2. Bottom row must have >= 1 enemy
  const bottomRow = mask[GRID_ROWS - 1];
  if (!bottomRow.some(Boolean)) {
    // Force center pair
    bottomRow[5] = true; bottomRow[4] = true; bottomRow[6] = true;
  }

  // 3. Top rows not both empty (rows 0 and 1)
  const topHasEnemy = mask[0].some(Boolean) || mask[1].some(Boolean);
  if (!topHasEnemy) {
    // Add a center enemy to row 0
    mask[0][5] = true; mask[0][4] = true; mask[0][6] = true;
  }

  // 4. Clamp to [minEnemies, maxEnemies]
  let count = countMask(mask);

  // Need more enemies? Add from empty cells (prefer inner cols)
  if (count < params.minEnemies) {
    const empties = [];
    for (let r = 0; r < GRID_ROWS; r++)
      for (let c = 0; c < GRID_COLS; c++)
        if (!mask[r][c]) empties.push([r, c]);
    // Sort by distance from center col (inner first)
    empties.sort((a, b) => Math.abs(a[1] - 5) - Math.abs(b[1] - 5));
    let i = 0;
    while (count < params.minEnemies && i < empties.length) {
      const [r, c] = empties[i++];
      mask[r][c] = true;
      // Maintain symmetry
      const mirror = 10 - c;
      if (mirror !== c && !mask[r][mirror]) {
        mask[r][mirror] = true;
        count++;
      }
      count++;
    }
  }

  // Too many enemies? Remove from outer cols, top rows first
  if (count > params.maxEnemies) {
    const filled = [];
    for (let r = 0; r < GRID_ROWS; r++)
      for (let c = 0; c < GRID_COLS; c++)
        if (mask[r][c]) filled.push([r, c]);
    // Sort: outermost cols first, top rows first
    filled.sort((a, b) => {
      const distA = Math.abs(a[1] - 5), distB = Math.abs(b[1] - 5);
      if (distA !== distB) return distB - distA;
      return a[0] - b[0];
    });
    let i = 0;
    while (count > params.maxEnemies && i < filled.length) {
      const [r, c] = filled[i++];
      // Don't clobber bottom row if it would become empty
      if (r === GRID_ROWS - 1 && mask[GRID_ROWS-1].filter(Boolean).length <= 1) continue;
      // Don't clobber top rows exclusively
      if (r <= 1 && (mask[0].filter(Boolean).length + mask[1].filter(Boolean).length) <= 1) continue;
      mask[r][c] = false;
      const mirror = 10 - c;
      if (mirror !== c && mask[r][mirror] && count > params.maxEnemies) {
        mask[r][mirror] = false;
        count--;
      }
      count--;
    }
  }

  return mask;
}

function spawnEnemiesFromMask(mask) {
  const ENEMY_W = 40, ENEMY_H = 40;
  const PAD_X = 10, PAD_Y = 10;
  const totalW = GRID_COLS * ENEMY_W + (GRID_COLS - 1) * PAD_X;
  const startX = (canvas.width - totalW) / 2;
  const startY = 60;
  const result = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (mask[r][c]) {
        result.push(new Enemy(
          startX + c * (ENEMY_W + PAD_X),
          startY + r * (ENEMY_H + PAD_Y)
        ));
      }
    }
  }
  return result;
}

// ============================================================
// FAIR SHOOTING: bottom-most per column
// ============================================================
function getColumnShooters(enemyList) {
  const colMap = {};
  for (const e of enemyList) {
    // Map enemy x back to nearest column index for grouping
    // We identify column by x-bucket relative to formation
    const ENEMY_W = 40, PAD_X = 10;
    const totalW = GRID_COLS * ENEMY_W + (GRID_COLS - 1) * PAD_X;
    const startX = (canvas.width - totalW) / 2;
    const colIndex = Math.round((e.x - startX) / (ENEMY_W + PAD_X));
    const key = Math.max(0, Math.min(GRID_COLS - 1, colIndex));
    if (!colMap[key] || e.y > colMap[key].y) {
      colMap[key] = e;
    }
  }
  return Object.values(colMap);
}

// Fire accumulator (seconds)
let fireAccum = 0;

function enemyFireController(dt) {
  const params = getLevelParams(level);
  if (enemyBullets.length >= params.maxBullets) return;
  if (enemies.length === 0) return;

  fireAccum += dt * params.fireRate;
  if (fireAccum >= 1.0) {
    fireAccum -= 1.0;
    const shooters = getColumnShooters(enemies);
    if (shooters.length === 0) return;
    const shooter = shooters[Math.floor(Math.random() * shooters.length)];
    enemyBullets.push(new EnemyBullet(
      shooter.x + shooter.width / 2 - 2,
      shooter.y + shooter.height
    ));
  }
}

// ============================================================
// GAME STATE
// ============================================================
let isGameOver = false;
let isStartScreen = true;
let isPaused = false;
let score = 0;
let isFiring = false;
let canFire = true;
let lives = 3;
let level = 1;
let enemyDirection = 1;
let wallGapProbability = 0.4;
let lastTimestamp = 0;

// Keyboard movement
const keys = {};
let playerSpeed = 6;

// ============================================================
// CLASSES
// ============================================================
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
  moveBy(dx) {
    this.x += dx;
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
  update(spd) {
    this.x += enemyDirection * spd;
  }
}

class Bullet {
  constructor(x, y) {
    this.width = 5; this.height = 12;
    this.x = x; this.y = y;
    this.speed = 8;
  }
  draw() { ctx.fillStyle = 'yellow'; ctx.fillRect(this.x, this.y, this.width, this.height); }
  update() { this.y -= this.speed; }
}

class EnemyBullet {
  constructor(x, y) {
    this.width = 4; this.height = 12;
    this.x = x; this.y = y;
    this.speed = 5;
  }
  draw() { ctx.fillStyle = 'red'; ctx.fillRect(this.x, this.y, this.width, this.height); }
  update() { this.y += this.speed; }
}

class Wall {
  constructor(x, y) {
    this.width = 20; this.height = 20;
    this.x = x; this.y = y;
    this.health = 3;
  }
  draw() {
    ctx.fillStyle = 'rgba(0,200,0,' + (this.health / 3) + ')';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
  hit() { this.health--; return this.health <= 0; }
}

// ============================================================
// GAME OBJECTS
// ============================================================
let player;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let walls = [];

// ============================================================
// INIT / SPAWN
// ============================================================
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
  wallGapProbability = 0.4;
  canFire = true;
  isGameOver = false;
  isPaused = false;
  lastTimestamp = 0;
  bulletTimer = 0;
  fireAccum = 0;
  spawnWave();
}

function spawnWave() {
  enemies = [];
  bullets = [];
  enemyBullets = [];
  walls = [];
  fireAccum = 0;
  enemyDirection = 1;
  const mask = generateFormationMask(level);
  enemies = spawnEnemiesFromMask(mask);
  spawnWalls();
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
        walls.push(new Wall(
          startX + col * (20 + padding),
          startY + row * (20 + padding)
        ));
      }
    }
  }
}

// ============================================================
// HUD + SCREENS
// ============================================================
function drawHUD() {
  ctx.fillStyle = 'white';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + score, 10, 28);

  ctx.textAlign = 'center';
  ctx.fillText('Level ' + level + '  [' + getDifficulty() + ']', canvas.width / 2, 28);

  ctx.textAlign = 'right';
  let hearts = '';
  for (let i = 0; i < lives; i++) hearts += (i > 0 ? ' ' : '') + '\u2665';
  ctx.fillText('Lives: ' + hearts, canvas.width - 10, 28);
  ctx.textAlign = 'left';
}

const DIFF_COLORS = { EASY: '#44ff88', NORMAL: '#ffdd44', HARD: '#ff4444' };

function drawStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawSprite(ctx, ALIEN_8x8, canvas.width / 2 - 20, canvas.height / 2 - 205, 5, 'lime');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 64px monospace';
  ctx.fillText('SPACE INVADERS', canvas.width / 2, canvas.height / 2 - 100);

  ctx.fillStyle = 'white';
  ctx.font = '20px monospace';
  ctx.fillText('Move: \u2190\u2192 / A\u2022D   |   Shoot: Space   |   Pause: P', canvas.width / 2, canvas.height / 2 - 20);
  ctx.fillText('Press D to toggle difficulty:', canvas.width / 2, canvas.height / 2 + 20);

  // Difficulty selector
  const diff = getDifficulty();
  ctx.fillStyle = DIFF_COLORS[diff] || '#ffdd44';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('[ ' + diff + ' ]', canvas.width / 2, canvas.height / 2 + 68);

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '16px monospace';
  ctx.fillText('EASY   NORMAL   HARD', canvas.width / 2, canvas.height / 2 + 98);

  ctx.fillStyle = '#ffff00';
  ctx.font = 'bold 24px monospace';
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.fillText('PRESS ENTER OR CLICK TO START', canvas.width / 2, canvas.height / 2 + 145);
  }
  ctx.textAlign = 'left';
}

function drawGameOverScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 72px monospace';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 70);
  ctx.fillStyle = 'white';
  ctx.font = '28px monospace';
  ctx.fillText('Score: ' + score + '  |  Level: ' + level, canvas.width / 2, canvas.height / 2 - 10);
  ctx.fillStyle = '#ffff00';
  ctx.font = 'bold 22px monospace';
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.fillText('PRESS ENTER OR CLICK TO RESTART', canvas.width / 2, canvas.height / 2 + 60);
  }
  ctx.textAlign = 'left';
}

function drawPauseScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 54px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
  ctx.font = '22px monospace';
  ctx.fillText('Press P to resume', canvas.width / 2, canvas.height / 2 + 52);
  ctx.textAlign = 'left';
}

// ============================================================
// COLLISION + LOGIC
// ============================================================
function checkCollisions() {
  for (const enemy of enemies) {
    if (player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + enemy.height &&
        player.y + player.height > enemy.y) {
      loseLife();
      return;
    }
  }
}

function checkEnemyBulletCollisions() {
  for (let bi = enemyBullets.length - 1; bi >= 0; bi--) {
    const b = enemyBullets[bi];
    let hit = false;
    for (let wi = walls.length - 1; wi >= 0; wi--) {
      const w = walls[wi];
      if (b.x < w.x + w.width && b.x + b.width > w.x &&
          b.y < w.y + w.height && b.y + b.height > w.y) {
        if (w.hit()) walls.splice(wi, 1);
        enemyBullets.splice(bi, 1);
        hit = true; break;
      }
    }
    if (!hit) {
      if (b.x < player.x + player.width && b.x + b.width > player.x &&
          b.y < player.y + player.height && b.y + b.height > player.y) {
        enemyBullets.splice(bi, 1);
        loseLife();
      }
    }
  }
}

function loseLife() {
  lives--;
  if (lives <= 0) isGameOver = true;
}

function moveEnemies() {
  const spd = getLevelParams(level).speedMult * 0.5;
  let changeDir = false;
  for (const e of enemies) {
    e.update(spd);
    if (e.x + e.width >= canvas.width || e.x <= 0) changeDir = true;
  }
  if (changeDir) {
    enemyDirection *= -1;
    const sd = getDiffConf().stepDown;
    for (const e of enemies) e.y += sd;
  }
}

// ============================================================
// INPUT
// ============================================================
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
  keys[e.key] = true;

  if (isStartScreen) {
    if (e.key === 'd' || e.key === 'D') {
      difficultyIndex = (difficultyIndex + 1) % DIFFICULTIES.length;
      return;
    }
    if (e.key === 'Enter') { startGame(); return; }
    return;
  }
  if (isGameOver) {
    if (e.key === 'Enter') { restartGame(); return; }
    return;
  }
  if (e.key === 'p' || e.key === 'P') {
    isPaused = !isPaused;
    if (!isPaused) requestAnimationFrame(gameLoop);
    return;
  }
  if (e.key === ' ') {
    e.preventDefault();
    isFiring = true;
  }
});

document.addEventListener('keyup', function(e) {
  keys[e.key] = false;
  if (e.key === ' ') isFiring = false;
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

// ============================================================
// MAIN LOOP
// ============================================================
let bulletTimer = 0;
const bulletInterval = 22; // frames between shots while holding

function gameLoop(timestamp) {
  if (isPaused) { drawPauseScreen(); return; }

  const dt = lastTimestamp ? Math.min((timestamp - lastTimestamp) / 1000, 0.1) : 0;
  lastTimestamp = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (isGameOver) {
    drawGameOverScreen();
    requestAnimationFrame(gameLoop);
    return;
  }

  // Keyboard movement
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.moveBy(-playerSpeed);
  if (keys['ArrowRight'] || keys['d'] || keys['D']) player.moveBy(playerSpeed);

  // Player shoot: Space key (isFiring) or mouse hold
  if (isFiring) {
    bulletTimer++;
    if (bulletTimer >= bulletInterval && canFire) {
      bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y));
      bulletTimer = 0;
    }
  } else {
    bulletTimer = 0;
  }

  // Enemy fire controller (fair, bottom-per-column)
  enemyFireController(dt);

  // Player bullets
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    b.update(); b.draw();
    if (b.y + b.height < 0) { bullets.splice(bi, 1); continue; }

    let hit = false;
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (b.x < e.x + e.width && b.x + b.width > e.x &&
          b.y < e.y + e.height && b.y + b.height > e.y) {
        bullets.splice(bi, 1); enemies.splice(ei, 1);
        score += 10; hit = true; break;
      }
    }
    if (!hit && bullets[bi]) {
      for (let wi = walls.length - 1; wi >= 0; wi--) {
        const w = walls[wi];
        if (bullets[bi].x < w.x + w.width && bullets[bi].x + bullets[bi].width > w.x &&
            bullets[bi].y < w.y + w.height && bullets[bi].y + bullets[bi].height > w.y) {
          if (w.hit()) walls.splice(wi, 1);
          bullets.splice(bi, 1); break;
        }
      }
    }
  }

  // Enemy bullets
  for (let bi = enemyBullets.length - 1; bi >= 0; bi--) {
    enemyBullets[bi].update(); enemyBullets[bi].draw();
    if (enemyBullets[bi].y > canvas.height) enemyBullets.splice(bi, 1);
  }

  // Move enemies (rAF only - no setInterval)
  moveEnemies();

  // Draw entities
  enemies.forEach(function(e) { e.draw(); });
  walls.forEach(function(w)   { w.draw(); });
  player.draw();

  // Collisions
  checkCollisions();
  checkEnemyBulletCollisions();

  // HUD
  drawHUD();

  // Wave clear -> next level
  if (enemies.length === 0) {
    level++;
    wallGapProbability = Math.min(0.75, wallGapProbability + 0.04);
    spawnWave();
  }

  // Enemies reach player row = game over
  for (const e of enemies) {
    if (e.y + e.height >= player.y) { isGameOver = true; break; }
  }

  requestAnimationFrame(gameLoop);
}

// ============================================================
// RESIZE
// ============================================================
window.addEventListener('resize', function() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  if (player) player.y = canvas.height - player.height - 10;
});

// ============================================================
// BOOT: show start screen immediately
// ============================================================
function bootLoop() {
  if (!isStartScreen) return;
  drawStartScreen();
  requestAnimationFrame(bootLoop);
}
requestAnimationFrame(bootLoop);
