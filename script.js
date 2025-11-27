const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GRAVITY = 0.25; // Reduced gravity for slower fall
const PLAYER_SPEED = 3; // Reduced speed for better precision
const PLATFORM_WIDTH = 100; // Fixed Platform Width
const PLATFORM_HEIGHT = 15;
const MIN_Y_GAP = 80; // Minimum vertical distance between platforms
const INITIAL_MAX_Y_GAP = 100; // Initial max vertical distance (Reduced for easier start)
const INITIAL_SPEED = 1; // Reduced by 50% for easier start
const GAME_SPEED_INCREMENT = 0.1; // Speed increase per difficulty level (Reduced)
const MAX_Y_GAP_INCREMENT = 5; // Gap increase per difficulty level (Reduced)
const DIFFICULTY_INTERVAL = 10; // Increase difficulty every 10 score points (Slower leveling)

// Platform Types
const PLATFORM_TYPES = {
    NORMAL: 'NORMAL',
    SPIKE: 'SPIKE'
};

const TYPE_PROBABILITIES = {
    NORMAL: 0.95,
    SPIKE: 0.05
};

// Game State
let score = 0;
let isGameOver = false;
let currentPlatformSpeed = INITIAL_SPEED;
let currentMaxYGap = INITIAL_MAX_Y_GAP;
let nextSpawnDistance = 100; // Distance to wait before spawning next platform
let consecutiveSpikes = 0;

// Player Object
const player = {
    x: 200,
    y: 100,
    width: 20,
    height: 20,
    color: '#FF5733',
    dy: 0,
    dx: 0,
    onGround: false
};

// Platforms Array
let platforms = [];

// Input Handling
const keys = {
    left: false,
    right: false
};

document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;

    if (isGameOver && e.code === 'Space') {
        resetGame();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

// Touch Controls
let touchX = null;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
    // Scale touch coordinate if canvas is resized via CSS
    const scaleX = canvas.width / canvas.getBoundingClientRect().width;
    touchX *= scaleX;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
    const scaleX = canvas.width / canvas.getBoundingClientRect().width;
    touchX *= scaleX;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchX = null;
}, { passive: false });

function resetGame() {
    player.x = 200;
    player.y = 100;
    player.dy = 0;
    score = 0;
    isGameOver = false;
    currentPlatformSpeed = INITIAL_SPEED;
    currentMaxYGap = INITIAL_MAX_Y_GAP;
    currentMaxYGap = INITIAL_MAX_Y_GAP;
    nextSpawnDistance = 100;
    consecutiveSpikes = 0;

    platforms = [];
    // Initial Platform
    platforms.push({ x: 150, y: 500, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT, color: '#4CAF50', type: PLATFORM_TYPES.NORMAL });
}

function spawnPlatform() {
    const lastPlatform = platforms[platforms.length - 1];

    // Check if it's time to spawn a new platform
    if (!lastPlatform || (canvas.height - lastPlatform.y > nextSpawnDistance)) {

        // Horizontal Solvability Constraint
        // Calculate reachable range based on last platform's position
        // Heuristic: Max horizontal reach is roughly proportional to the vertical gap (time to fall)
        // A simple generous reach is +/- 250px.
        const maxReach = 250;

        let minX = 0;
        let maxX = canvas.width - PLATFORM_WIDTH;

        if (lastPlatform) {
            minX = Math.max(0, lastPlatform.x - maxReach);
            maxX = Math.min(canvas.width - PLATFORM_WIDTH, lastPlatform.x + PLATFORM_WIDTH + maxReach);
        }

        const x = Math.random() * (maxX - minX) + minX;

        // Determine Platform Type
        let type = PLATFORM_TYPES.NORMAL;

        // Safety: Prevent consecutive spikes
        if (consecutiveSpikes >= 1) {
            type = PLATFORM_TYPES.NORMAL;
        } else {
            const rand = Math.random();
            if (rand > TYPE_PROBABILITIES.NORMAL) {
                type = PLATFORM_TYPES.SPIKE;
            } else {
                type = PLATFORM_TYPES.NORMAL;
            }
        }

        // Update consecutive spikes counter
        if (type === PLATFORM_TYPES.SPIKE) {
            consecutiveSpikes++;
        } else {
            consecutiveSpikes = 0;
        }

        const color = (type === PLATFORM_TYPES.SPIKE) ? '#FF0000' : '#4CAF50';

        platforms.push({
            x: x,
            y: canvas.height,
            width: PLATFORM_WIDTH,
            height: PLATFORM_HEIGHT,
            color: color,
            type: type
        });

        score++;

        // Difficulty Scaling
        if (score > 0 && score % DIFFICULTY_INTERVAL === 0) {
            currentPlatformSpeed += GAME_SPEED_INCREMENT;
            currentMaxYGap += MAX_Y_GAP_INCREMENT;
            // Cap values if needed, but let's leave it open for now
        }

        // Calculate next spawn distance for the NEXT platform
        // Random between MIN_Y_GAP and currentMaxYGap
        nextSpawnDistance = MIN_Y_GAP + Math.random() * (currentMaxYGap - MIN_Y_GAP);
    }
}

function update() {
    if (isGameOver) return;

    // Horizontal Movement (Keyboard OR Touch)
    let moveLeft = keys.left;
    let moveRight = keys.right;

    if (touchX !== null) {
        // Simple "Move towards touch" logic
        // If touch is to the left of player center, move left
        // If touch is to the right of player center, move right
        // Add a small deadzone to prevent jitter
        if (touchX < player.x + player.width / 2 - 5) {
            moveLeft = true;
            moveRight = false;
        } else if (touchX > player.x + player.width / 2 + 5) {
            moveRight = true;
            moveLeft = false;
        }
    }

    if (moveLeft) player.x -= PLAYER_SPEED;
    if (moveRight) player.x += PLAYER_SPEED;

    // Boundary Checks
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Gravity
    player.dy += GRAVITY;
    player.y += player.dy;

    // Platform Logic
    spawnPlatform();

    player.onGround = false;
    for (let i = platforms.length - 1; i >= 0; i--) {
        let p = platforms[i];

        // Move Platform UP
        p.y -= currentPlatformSpeed;

        // Remove off-screen platforms
        if (p.y + p.height < 0) {
            platforms.splice(i, 1);
            continue;
        }

        // Collision Detection
        if (
            player.dy > 0 && // Falling
            player.y + player.height >= p.y &&
            player.y + player.height <= p.y + p.height + player.dy + 5 && // Tolerance
            player.x + player.width > p.x &&
            player.x < p.x + p.width
        ) {
            if (p.type === PLATFORM_TYPES.SPIKE) {
                isGameOver = true;
            } else {
                player.dy = 0;
                player.y = p.y - player.height;
                player.onGround = true;
            }
        }

        // Game Over Conditions
        if (player.y < 0 || player.y > canvas.height) {
            isGameOver = true;
        }
    }

}


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Platforms
    for (let p of platforms) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
    }

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw UI
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Level: ${Math.floor(score / DIFFICULTY_INTERVAL) + 1}`, 10, 60);

    if (isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('Press Space to Restart', canvas.width / 2, canvas.height / 2 + 40);
        ctx.textAlign = 'left';
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

resetGame();
gameLoop();
