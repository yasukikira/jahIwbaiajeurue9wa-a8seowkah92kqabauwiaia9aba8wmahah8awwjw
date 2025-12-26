const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CONFIG ---
canvas.width = 320;  // Retro Resolution
canvas.height = 240;
const TILE_SIZE = 32;

// --- GAME STATE ---
let gameState = "INTRO"; // INTRO, DIALOGUE, PLAYING, CLEARED
let floor = 1;
let playerName = "Adventurer";
let dialogueStep = 0;

// --- ENTITIES ---
const player = { x: 160, y: 120, w: 24, h: 24, speed: 3, color: '#00ff00', attacking: false, dir: 'down' };
const npc = { x: 50, y: 50, w: 24, h: 24, color: '#ffff00', talked: false };
const door = { x: 144, y: 0, w: 32, h: 10, open: false };
let enemies = [];
let slashes = []; // Sword swipe effects

// --- CONTROLS ---
const keys = { w: false, a: false, s: false, d: false, space: false };
let touchInput = { x: 0, y: 0, attack: false };

// --- SETUP ---
function startLevel() {
    // Reset Player Position
    player.x = 160;
    player.y = 200;
    
    // Generate Slimes (Increase count by floor)
    enemies = [];
    let count = floor + 2; 
    for(let i=0; i<count; i++) {
        enemies.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: Math.random() * (canvas.height - 100) + 20,
            w: 24, h: 24,
            hp: 2,
            speed: 0.5 + (floor * 0.1),
            color: 'red'
        });
    }
}

// --- MAIN LOOP ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState === "DIALOGUE" || gameState === "CLEARED") return;

    // 1. Player Movement (Keyboard + Touch)
    let dx = 0; let dy = 0;
    if (keys.w || touchInput.y < 0) dy = -player.speed;
    if (keys.s || touchInput.y > 0) dy = player.speed;
    if (keys.a || touchInput.x < 0) dx = -player.speed;
    if (keys.d || touchInput.x > 0) dx = player.speed;

    // Update Direction
    if (dy < 0) player.dir = 'up';
    if (dy > 0) player.dir = 'down';
    if (dx < 0) player.dir = 'left';
    if (dx > 0) player.dir = 'right';

    // Move & Collision with Walls
    player.x = Math.max(0, Math.min(canvas.width - player.w, player.x + dx));
    player.y = Math.max(0, Math.min(canvas.height - player.h, player.y + dy));

    // 2. Door Interaction (Level 1 Intro)
    if (floor === 1 && !npc.talked) {
        if (checkRectCollide(player, door)) {
            player.y += 10; // Bounce back
            showDialogue("Locked. Maybe talk to that guy in the corner?");
        }
    }

    // 3. NPC Interaction
    if (floor === 1 && checkRectCollide(player, npc) && keys.space) {
        startNpcDialogue();
        keys.space = false; // Prevent double trigger
    }

    // 4. Combat Logic
    if (gameState === "PLAYING") {
        // Door Logic (Exit)
        if (enemies.length === 0) {
            door.open = true;
            if (checkRectCollide(player, door)) {
                gameState = "CLEARED";
                document.getElementById('decision-box').classList.remove('hidden');
            }
        }

        // Sword Swing
        if (keys.space && !player.attacking) {
            performAttack();
        }

        // Enemy Logic
        enemies.forEach(enemy => {
            // Chase Player
            if (enemy.x < player.x) enemy.x += enemy.speed;
            if (enemy.x > player.x) enemy.x -= enemy.speed;
            if (enemy.y < player.y) enemy.y += enemy.speed;
            if (enemy.y > player.y) enemy.y -= enemy.speed;

            // Hit Player (Simple reset for now)
            if (checkRectCollide(player, enemy)) {
                // player.hp--; // Add HP logic later
                // Visual feedback like flashing red
            }
        });
    }
}

function performAttack() {
    player.attacking = true;
    
    // Create hitbox based on direction
    let swordBox = { x: player.x, y: player.y, w: 20, h: 20 };
    if (player.dir === 'up') swordBox.y -= 25;
    if (player.dir === 'down') swordBox.y += 25;
    if (player.dir === 'left') swordBox.x -= 25;
    if (player.dir === 'right') swordBox.x += 25;

    // Check Hits
    enemies = enemies.filter(e => {
        if (checkRectCollide(swordBox, e)) {
            e.hp--;
            return e.hp > 0; // Keep if alive
        }
        return true;
    });

    // Sword Visual
    slashes.push({ ...swordBox, timer: 10 });

    setTimeout(() => player.attacking = false, 300);
}

function draw() {
    // Clear Screen
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Door
    ctx.fillStyle = door.open ? '#000' : '#8B4513';
    ctx.fillRect(door.x, door.y, door.w, door.h);

    // Draw Player (Replace this block with ctx.drawImage later)
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // Draw NPC (Only floor 1)
    if (floor === 1) {
        ctx.fillStyle = npc.color;
        ctx.fillRect(npc.x, npc.y, npc.w, npc.h);
    }

    // Draw Enemies
    enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x, e.y, e.w, e.h);
    });

    // Draw Sword Slashes
    ctx.fillStyle = 'white';
    slashes.forEach((s, index) => {
        ctx.fillRect(s.x, s.y, s.w, s.h);
        s.timer--;
        if(s.timer <= 0) slashes.splice(index, 1);
    });
}

// --- HELPER FUNCTIONS ---
function checkRectCollide(r1, r2) {
    return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
}

// --- DIALOGUE SYSTEM ---
const dialogueBox = document.getElementById('dialogue-box');
const dialogueText = document.getElementById('dialogue-text');
const nameInput = document.getElementById('name-input');
const nextBtn = document.getElementById('next-btn');

function showDialogue(text) {
    dialogueBox.classList.remove('hidden');
    dialogueText.innerText = text;
}

function startNpcDialogue() {
    gameState = "DIALOGUE";
    showDialogue("Stranger... wait. What is your name?");
    nameInput.classList.remove('hidden');
    
    nextBtn.onclick = () => {
        if (dialogueStep === 0) {
            let val = nameInput.value;
            if (!val) return;
            playerName = val;
            nameInput.classList.add('hidden');
            showDialogue(`${playerName}... My MOM! She is sick!`);
            dialogueStep++;
        } else if (dialogueStep === 1) {
            showDialogue("Only the potion on floor 100 can save her!");
            dialogueStep++;
        } else {
            dialogueBox.classList.add('hidden');
            gameState = "PLAYING";
            npc.talked = true;
            door.open = true; // Unlock tutorial room
            startLevel(); // Spawn first slimes
        }
    };
}

// --- GAME FLOW ---
function nextLevel() {
    floor++;
    document.getElementById('decision-box').classList.add('hidden');
    player.y = 200; // Reset to bottom
    door.open = false;
    startLevel(); // Spawn harder enemies
    gameState = "PLAYING";
}

function cashOut() {
    let code = `MOM-SAVED-${floor}-${Math.floor(Math.random()*9999)}`;
    document.getElementById('decision-box').innerHTML = `
        <h1>ESCAPE SUCCESSFUL!</h1>
        <p>Code: <span style="color:yellow">${code}</span></p>
    `;
}

// --- INPUT LISTENERS (Mobile & PC) ---
document.getElementById('action-btn').addEventListener('touchstart', (e) => { e.preventDefault(); keys.space = true; });
document.getElementById('action-btn').addEventListener('touchend', (e) => { e.preventDefault(); keys.space = false; });

const setTouch = (x, y) => { touchInput.x = x; touchInput.y = y; };
document.getElementById('up').addEventListener('touchstart', (e) => { e.preventDefault(); setTouch(0, -1); });
document.getElementById('down').addEventListener('touchstart', (e) => { e.preventDefault(); setTouch(0, 1); });
document.getElementById('left').addEventListener('touchstart', (e) => { e.preventDefault(); setTouch(-1, 0); });
document.getElementById('right').addEventListener('touchstart', (e) => { e.preventDefault(); setTouch(1, 0); });
document.querySelectorAll('.d-btn').forEach(btn => {
    btn.addEventListener('touchend', (e) => { e.preventDefault(); setTouch(0, 0); });
});

// PC Fallback
window.addEventListener('keydown', e => {
    if(e.key === 'w') keys.w = true;
    if(e.key === 's') keys.s = true;
    if(e.key === 'a') keys.a = true;
    if(e.key === 'd') keys.d = true;
    if(e.key === ' ') keys.space = true;
});
window.addEventListener('keyup', e => {
    if(e.key === 'w') keys.w = false;
    if(e.key === 's') keys.s = false;
    if(e.key === 'a') keys.a = false;
    if(e.key === 'd') keys.d = false;
    if(e.key === ' ') keys.space = false;
});

// Init
requestAnimationFrame(gameLoop);
  
