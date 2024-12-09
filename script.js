const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const scoreElement = document.getElementById('score');
const restartButton = document.getElementById('restartButton');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let isGameOver = false;
let isPaused = false;
let score = 0;
let isFiring = false;
let canFire = true;
let lives = 3;
let level = 1;
let enemyDirection = 1;
let enemyFireRate = 1000;
let wallGapProbability = 0.4;

// Load images
const playerImg = new Image();
playerImg.src = 'C:/Users/vikra/OneDrive/Desktop/Space Invaders/player.png'; // Ensure this path is correct
const enemyImg = new Image();
enemyImg.src = 'C/Users/vikra/OneDrive/Desktop/SpaceInvaders/enemy.png'; // Ensure this path is correct

class Player {
    constructor() {
        this.width = 50;
        this.height = 50;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
    }

    draw() {
        ctx.drawImage(playerImg, this.x, this.y, this.width, this.height);
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
        ctx.drawImage(enemyImg, this.x, this.y, this.width, this.height);
    }

    update() {
        this.x += enemyDirection * 0.4;
    }
}

class Bullet {
    constructor(x, y) {
        this.width = 5;
        this.height = 10;
        this.x = x;
        this.y = y;
        this.speed = 7;
    }

    draw() {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.y -= this.speed;
    }
}

class EnemyBullet {
    constructor(x, y) {
        this.width = 5;
        this.height = 10;
        this.x = x;
        this.y = y;
        this.speed = 5;
    }

    draw() {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.y += this.speed;
    }
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
        ctx.fillStyle = `rgba(0, 255, 0, ${this.health / 3})`;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    hit() {
        this.health--;
        if (this.health <= 0) {
            return true;
        }
        return false;
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
    updateScoreAndLives();
    isGameOver = false;
    isPaused = false;
    spawnEnemies();
    spawnWalls();
}

function spawnEnemies() {
    const rows = 3 + level;
    const cols = 10;
    const padding = 10;
    const totalEnemyWidth = cols * 40 + (cols - 1) * padding;
    const startX = (canvas.width - totalEnemyWidth) / 2;
    const startY = 50;

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
    const startY = canvas.height - player.height - 200;

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

function updateScoreAndLives() {
    scoreElement.textContent = `Score: ${score} Lives: ${lives} Level: ${level}`;
}

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    player.moveTo(mouseX);
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        isFiring = true;
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        isFiring = false;
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') togglePause();
});

let bulletTimer = 0;
const bulletInterval = 30;

function togglePause() {
    isPaused = !isPaused;
    if (!isPaused) {
        gameLoop();
    }
}

function checkCollisions() {
    enemies.forEach((enemy) => {
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            loseLife();
        }
    });
}

function checkEnemyBulletCollisions() {
    enemyBullets.forEach((bullet, bulletIndex) => {
        let hitWall = false;
        walls.forEach((wall, wallIndex) => {
            if (bullet.x < wall.x + wall.width &&
                bullet.x + bullet.width > wall.x &&
                bullet.y < wall.y + wall.height &&
                bullet.y + bullet.height > wall.y) {
                if (wall.hit()) {
                    walls.splice(wallIndex, 1);
                }
                enemyBullets.splice(bulletIndex, 1);
                hitWall = true;
                return false;
            }
        });
        if (!hitWall) {
            if (bullet.x < player.x + player.width &&
                bullet.x + bullet.width > player.x &&
                bullet.y < player.y + player.height &&
                bullet.y + bullet.height > player.y) {
                enemyBullets.splice(bulletIndex, 1);
                loseLife();
            }
        }
    });
}

function loseLife() {
    lives--;
    updateScoreAndLives();
    if (lives <= 0) {
        isGameOver = true;
        scoreElement.textContent = `Game Over! Final Score: ${score}`;
        restartButton.style.display = 'block';
    }
}

function spawnEnemyBullets() {
    if (enemies.length > 0) {
        const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
        enemyBullets.push(new EnemyBullet(randomEnemy.x + randomEnemy.width / 2, randomEnemy.y + randomEnemy.height));
    }
}

function increaseDifficulty() {
    level++;
    enemyFireRate = Math.max(200, enemyFireRate - 100);
    wallGapProbability = Math.min(0.8, wallGapProbability + 0.05);
    updateScoreAndLives();
    resetGameState();
}

function moveEnemies() {
    let changeDirection = false;
    enemies.forEach(enemy => {
        enemy.update();
        if (enemy.x + enemy.width >= canvas.width || enemy.x <= 0) {
            changeDirection = true;
        }
    });

    if (changeDirection) {
        enemyDirection *= -1;
        enemies.forEach(enemy => {
            enemy.y += enemy.height;
        });
    }
}

function resetGameState() {
    enemies = [];
    bullets = [];
    enemyBullets = [];
    walls = [];
    spawnEnemies();
    spawnWalls();
}

function gameLoop() {
    if (isPaused) return;
    if (isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isFiring) {
        bulletTimer++;
        if (bulletTimer >= bulletInterval && canFire) {
            bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y));
            bulletTimer = 0;
        }
    }

    player.draw();
    checkCollisions();
    checkEnemyBulletCollisions();

    bullets.forEach((bullet, bulletIndex) => {
        bullet.update();
        bullet.draw();

        if (bullet.y < 0) {
            bullets.splice(bulletIndex, 1);
        }

        enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);
                score += 10;
                if (score % 1000 === 0) {
                    increaseDifficulty();
                }
                updateScoreAndLives();
            }
        });
    });

    enemyBullets.forEach((bullet, bulletIndex) => {
        bullet.update();
        bullet.draw();

        if (bullet.y > canvas.height) {
            enemyBullets.splice(bulletIndex, 1);
        }
    });

    moveEnemies();

    enemies.forEach(enemy => {
        enemy.draw();
    });

    walls.forEach(wall => {
        wall.draw();
    });

    if (enemies.length === 0) {
        increaseDifficulty();
    }

    requestAnimationFrame(gameLoop);
}

startButton.addEventListener('click', () => {
    menu.style.display = 'none';
    canvas.style.display = 'block'; // Show the canvas when the game starts
    initGame();
    gameLoop();
});

restartButton.addEventListener('click', () => {
    restartButton.style.display = 'none';
    initGame();
    gameLoop();
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - player.height - 10;
    updatePlayerPosition();
});

setInterval(() => {
    if (!isPaused && !isGameOver) {
        moveEnemies();
    }
}, 1000);

setInterval(() => {
    if (!isPaused && !isGameOver) {
        spawnEnemyBullets();
    }
}, enemyFireRate);

gameLoop();
