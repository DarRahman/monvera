const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- PERLIN NOISE IMPLEMENTATION ---
const Noise = (function() {
    const PERM = new Uint8Array(512);
    const GRAD3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
                   [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
                   [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    
    function dot(g, x, y) { return g[0]*x + g[1]*y; }
    
    function seed(s) {
        if(s > 0 && s < 1) s *= 65536;
        s = Math.floor(s);
        if(s < 256) s |= s << 8;
        
        for(let i = 0; i < 256; i++) {
            let v;
            if (i & 1) v = (i ^ (s & 255));
            else v = (i ^ ((s>>8) & 255));
            PERM[i] = PERM[i + 256] = v;
        }
    }

    function noise2d(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
        const u = fade(x);
        const v = fade(y);
        
        const n00 = dot(GRAD3[PERM[X+PERM[Y]] % 12], x, y);
        const n01 = dot(GRAD3[PERM[X+PERM[Y+1]] % 12], x, y-1);
        const n10 = dot(GRAD3[PERM[X+1+PERM[Y]] % 12], x-1, y);
        const n11 = dot(GRAD3[PERM[X+1+PERM[Y+1]] % 12], x-1, y-1);
        
        return 0.5 + 0.5 * (
            (1-u)*(1-v)*n00 + 
            (1-u)*v*n01 + 
            u*(1-v)*n10 + 
            u*v*n11
        ); // Returns approx 0.0 to 1.0
    }

    return { seed, noise2d };
})();

// Initialize Noise
const WORLD_SEED = 12345;
Noise.seed(WORLD_SEED);

// World & Camera System
const world = {
    width: 10000, // Increased from 4000 to 10000
    height: 10000
};

const camera = {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight
};

// Zoom Configuration
// 1.0 = Normal (1 pixel = 1 unit)
// 0.5 = Zoom Out (See 2x more area)
// 0.6 = Balanced "Far" view
const GAME_ZOOM = 0.6; 

// Set canvas size to match window size (Full Screen, No Black Bars)
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Update camera dimensions to match viewport, adjusted by Zoom
    camera.width = canvas.width / GAME_ZOOM;
    camera.height = canvas.height / GAME_ZOOM;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Prevent Browser Zoom (Ctrl+, Ctrl-, Ctrl+Scroll) to maintain game look
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && (
        e.key === '=' || 
        e.key === '-' || 
        e.key === '0' || 
        e.key === '+'
    )) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });

// Game State
const player = {
    x: world.width / 2, // Start in middle of world
    y: world.height / 2,
    size: 32,
    speed: 6, // Slightly faster for larger map
    color: '#000'
};

let isBattling = false;

// Monster Spawning System
const spawnedMonsters = [];
const MAX_MONSTERS = 100; // Increased from 5 to 100 for large map

// Rarity Config
const RARITY_CONFIG = {
    'N':   { color: '#9E9E9E', prob: 0.50 }, // Abu-abu (50%)
    'R':   { color: '#2196F3', prob: 0.30 }, // Biru (30%)
    'SR':  { color: '#9C27B0', prob: 0.15 }, // Ungu (15%)
    'SSR': { color: '#FFC107', prob: 0.04 }, // Emas (4%)
    'UR':  { color: '#E53935', prob: 0.009 }, // Merah Kristal (0.9%)
    'LR':  { color: '#EDE7F6', prob: 0.001 }  // Putih Bercahaya (0.1%)
};

function getRandomRarity() {
    const rand = Math.random();
    let cumulative = 0;
    for (const [rarity, config] of Object.entries(RARITY_CONFIG)) {
        cumulative += config.prob;
        if (rand < cumulative) return rarity;
    }
    return 'N'; // Fallback
}

// World Features (Town & Buildings)
const TOWN_SIZE = 1200;
const town = {
    x: (world.width - TOWN_SIZE) / 2,
    y: (world.height - TOWN_SIZE) / 2,
    width: TOWN_SIZE,
    height: TOWN_SIZE,
    color: '#111' // Slightly lighter black for town floor
};

// Procedural Generation Logic
const GRID_SIZE = 32;

function getWorldObject(x, y) {
    // 1. Check if inside Town (Safe Zone)
    if (x > town.x && x < town.x + town.width && 
        y > town.y && y < town.y + town.height) {
        return null;
    }

    // 2. Check if inside Landmarks (Safe Zone)
    for (const l of landmarks) {
        if (x > l.x && x < l.x + l.w && y > l.y && y < l.y + l.h) {
            return null;
        }
    }

    // 3. Fractal Noise (3 Octaves)
    const gx = Math.floor(x / GRID_SIZE);
    const gy = Math.floor(y / GRID_SIZE);
    
    // Octave 1: Large scale (Basic shape)
    const v1 = Noise.noise2d(gx * 0.015, gy * 0.015) * 0.65;
    
    // Octave 2: Medium scale (Variation)
    const v2 = Noise.noise2d(gx * 0.05, gy * 0.05) * 0.25;
    
    // Octave 3: Small scale (Rough edges)
    const v3 = Noise.noise2d(gx * 0.15, gy * 0.15) * 0.10;
    
    const value = v1 + v2 + v3;
    
    // Thresholds for Fractal Noise (Biomes)
    if (value > 0.65) return 'TREE';
    if (value < 0.32) return 'ROCK';
    if (value >= 0.48 && value <= 0.65) return 'TALL_GRASS';
    
    return null;
}
// Buildings in Town
const buildings = [
    { type: 'HEAL', x: town.x + 200, y: town.y + 200, w: 200, h: 150, label: 'HOSPITAL' },
    { type: 'SHOP', x: town.x + 800, y: town.y + 200, w: 200, h: 150, label: 'SHOP' }
];

// Interactive Landmarks (Special Zones)
const landmarks = [
    { 
        type: 'SHRINE', 
        x: 2000, y: 2000, 
        w: 300, h: 300, 
        color: '#222', 
        label: 'ANCIENT SHRINE',
        desc: 'A mysterious energy radiates here. [E] Pray'
    },
    { 
        type: 'ARENA', 
        x: 8000, y: 2000, 
        w: 400, h: 400, 
        color: '#333', 
        label: 'BATTLE ARENA',
        desc: 'Test your strength against champions. [E] Enter'
    },
    { 
        type: 'CAVE', 
        x: 2000, y: 8000, 
        w: 250, h: 250, 
        color: '#111', 
        label: 'DEEP CAVE',
        desc: 'Darkness consumes all light. [E] Explore'
    },
    { 
        type: 'TOWER', 
        x: 8000, y: 8000, 
        w: 200, h: 600, 
        color: '#444', 
        label: 'SKY TOWER',
        desc: 'Reach for the heavens. [E] Climb'
    }
];

function spawnMonster() {
    if (spawnedMonsters.length >= MAX_MONSTERS) return;
    
    const rarity = getRandomRarity();
    
    let x, y;
    let attempts = 0;
    let validPosition = false;

    // Try to find a spot outside the town AND not on an object
    while (!validPosition && attempts < 20) {
        x = Math.random() * (world.width - 50) + 25;
        y = Math.random() * (world.height - 50) + 25;
        
        // Check if inside town
        const inTown = (x > town.x && x < town.x + town.width && 
                        y > town.y && y < town.y + town.height);
        
        // Check if on object (Tree/Rock)
        const onObject = getWorldObject(x, y) !== null;

        if (!inTown && !onObject) {
            validPosition = true;
        } else {
            attempts++;
        }
    }

    if (!validPosition) return; // Skip spawn if no valid spot found

    spawnedMonsters.push({
        x: x,
        y: y,
        size: 24,
        rarity: rarity,
        color: RARITY_CONFIG[rarity].color
    });
}

// Initial spawn
for(let i=0; i<MAX_MONSTERS; i++) spawnMonster();

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key.toLowerCase() === 'e') checkInteraction();
});
window.addEventListener('keyup', (e) => keys[e.key] = false);

function checkInteraction() {
    if (isBattling) return;

    // Check Buildings (Town)
    buildings.forEach(b => {
        const centerBx = b.x + b.w/2;
        const centerBy = b.y + b.h/2;
        const dist = Math.hypot(player.x - centerBx, player.y - centerBy);
        
        if (dist < 250) { // Interaction range
            if (b.type === 'HEAL') {
                healAllMonsters();
            } else if (b.type === 'SHOP') {
                showAlert("Shop is under construction! Come back later.");
            }
        }
    });

    // Check Landmarks
    landmarks.forEach(l => {
        const centerLx = l.x + l.w/2;
        const centerLy = l.y + l.h/2;
        const dist = Math.hypot(player.x - centerLx, player.y - centerLy);
        
        if (dist < 400) {
            if (l.type === 'SHRINE') {
                showAlert("You pray at the Ancient Shrine...\nYour monsters feel blessed! (EXP Boost active)");
            } else if (l.type === 'ARENA') {
                showAlert("The Arena is closed for the season.\nCome back when you are stronger!");
            } else if (l.type === 'CAVE') {
                showAlert("The cave is too dark to enter without a Flashlight.");
            } else if (l.type === 'TOWER') {
                showAlert("The Sky Tower door is locked tight.");
            }
        }
    });
}

async function healAllMonsters() {
    showAlert("Healing your monsters...");
    try {
        // Fetch all monsters
        const response = await fetch('/api/my-monsters/1');
        const monsters = await response.json();
        
        // Heal each one
        for (const m of monsters) {
            if (m.current_hp < m.max_hp) {
                await fetch('/api/monster/hp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userMonsterId: m.id, hp: m.max_hp })
                });
            }
        }
        
        // Update local state
        if (myActiveMonster) {
            myActiveMonster.current_hp = myActiveMonster.max_hp;
            myMonsterHP = myActiveMonster.max_hp;
            updatePlayerHealthUI();
        }
        
        setTimeout(() => {
            showAlert("All monsters have been fully healed!");
        }, 1000);
        
    } catch (err) {
        console.error("Healing error:", err);
        showAlert("Failed to heal monsters.");
    }
}

function update() {
    if (isBattling) return; // Stop movement during battle

    // Auto-Heal System (Every 5 seconds)
    // Ensure healing happens even if player is idle
    if (!isBattling && myActiveMonster && Date.now() - lastHealTime > 5000) {
        autoHeal();
        lastHealTime = Date.now();
    }

    let moved = false;
    let nextX = player.x;
    let nextY = player.y;

    if (keys['ArrowUp'] || keys['w']) { nextY -= player.speed; moved = true; }
    if (keys['ArrowDown'] || keys['s']) { nextY += player.speed; moved = true; }
    if (keys['ArrowLeft'] || keys['a']) { nextX -= player.speed; moved = true; }
    if (keys['ArrowRight'] || keys['d']) { nextX += player.speed; moved = true; }

    // Collision Check with World Objects
    // Check all 4 corners of player box
    const corners = [
        {x: nextX, y: nextY},
        {x: nextX + player.size, y: nextY},
        {x: nextX, y: nextY + player.size},
        {x: nextX + player.size, y: nextY + player.size}
    ];

    let collision = false;
    for (const p of corners) {
        const obj = getWorldObject(p.x, p.y);
        if (obj === 'TREE' || obj === 'ROCK') {
            collision = true;
            break;
        }
    }

    if (!collision) {
        player.x = nextX;
        player.y = nextY;
    }

    // Boundary Checks (Keep player inside WORLD)
    if (player.x < 0) player.x = 0;
    if (player.y < 0) player.y = 0;
    if (player.x > world.width - player.size) player.x = world.width - player.size;
    if (player.y > world.height - player.size) player.y = world.height - player.size;

    // Update Camera to follow player
    camera.x = player.x - camera.width / 2;
    camera.y = player.y - camera.height / 2;

    // Clamp Camera to World Bounds
    camera.x = Math.max(0, Math.min(camera.x, world.width - camera.width));
    camera.y = Math.max(0, Math.min(camera.y, world.height - camera.height));

    // Check collision with monsters
    for (let i = 0; i < spawnedMonsters.length; i++) {
        const m = spawnedMonsters[i];
        // Simple box collision
        if (
            player.x < m.x + m.size &&
            player.x + player.size > m.x &&
            player.y < m.y + m.size &&
            player.y + player.size > m.y
        ) {
            const encounteredRarity = m.rarity; // Capture rarity before splicing
            spawnedMonsters.splice(i, 1); // Remove monster
            startBattle(encounteredRarity); // Pass rarity to battle
            // Respawn handled in endBattle()
            break;
        }
    }

    // Emit movement to server (throttle this in production)
    // socket.emit('playerMove', { x: player.x, y: player.y });
}

let currentMonster = null; // Store current monster data
let currentMonsterHP = 0;
let myActiveMonster = null; // Store player's equipped monster
let myMonsterHP = 0;
let isPlayerTurn = true;
let isDefending = false;

// Auto-Heal System
let lastHealTime = Date.now(); // New flag for defense

async function startBattle(rarity = 'N') {
    isBattling = true;
    isPlayerTurn = true;
    isDefending = false;
    keys['ArrowUp'] = keys['ArrowDown'] = keys['ArrowLeft'] = keys['ArrowRight'] = false; // Reset keys
    
    // Disable Menu Buttons
    document.getElementById('btn-my-monsters').disabled = true;
    document.getElementById('btn-pokedex').disabled = true;

    // Show loading state
    document.getElementById('battle-ui').style.display = 'block';
    document.getElementById('monster-name').innerText = 'Loading...';
    document.getElementById('battle-message').innerText = '';
    // document.getElementById('battle-actions').style.display = 'grid'; // Already grid in new layout

    try {
        // 1. Fetch Wild Monster with specific Rarity
        const response = await fetch(`/api/monsters/random?rarity=${rarity}`);
        currentMonster = await response.json();
        currentMonsterHP = currentMonster.max_hp; // Use calculated max_hp
        
        // 2. Fetch My Active Monster
        const myMonResponse = await fetch('/api/my-monsters/active/1'); // Hardcoded User ID 1
        myActiveMonster = await myMonResponse.json();

        // Update Enemy UI
        document.getElementById('monster-name').innerHTML = `${currentMonster.name} <span class="badge" style="background-color:${RARITY_CONFIG[currentMonster.rarity].color}">${currentMonster.rarity}</span> <span class="badge bg-dark border border-white">Lv.${currentMonster.level}</span>`;
        document.getElementById('monster-type').innerText = currentMonster.type;
        // Set Enemy Sprite Color based on Rarity
        document.getElementById('enemy-sprite').style.backgroundColor = RARITY_CONFIG[currentMonster.rarity].color;
        
        // Setup Player UI
        const playerStatusDiv = document.getElementById('player-status');
        if (myActiveMonster) {
            playerStatusDiv.style.visibility = 'visible';
            document.getElementById('my-monster-name').innerHTML = `${myActiveMonster.nickname} <span class="badge" style="background-color:${RARITY_CONFIG[myActiveMonster.rarity].color}">${myActiveMonster.rarity}</span> <span class="badge bg-dark border border-white">Lv.${myActiveMonster.level}</span>`;
            document.getElementById('my-monster-type').innerText = myActiveMonster.type;
            
            // Set Player Sprite Color
            document.getElementById('player-sprite').style.backgroundColor = RARITY_CONFIG[myActiveMonster.rarity].color;

            myMonsterHP = myActiveMonster.current_hp; // Use current HP from DB
            updatePlayerHealthUI();
        } else {
            playerStatusDiv.style.visibility = 'hidden';
            myMonsterHP = 0;
        }

        updateHealthUI();
        
    } catch (err) {
        console.error('Error fetching battle data:', err);
        endBattle();
    }
}

function updateHealthUI() {
    const percent = (currentMonsterHP / currentMonster.max_hp) * 100;
    const bar = document.getElementById('monster-hp-bar');
    bar.style.width = percent + '%';
    
    // Update HP Text
    const hpText = document.getElementById('monster-hp-text');
    if (hpText) {
        hpText.innerText = Math.ceil(currentMonsterHP) + '/' + currentMonster.max_hp;
    }
    
    // Change color based on HP
    if(percent < 25) { bar.className = 'progress-bar bg-danger'; }
    else if(percent < 50) { bar.className = 'progress-bar bg-warning'; }
    else { bar.className = 'progress-bar bg-success'; }
}

function updatePlayerHealthUI() {
    if (!myActiveMonster) return;
    const maxHp = myActiveMonster.max_hp || 100; 
    
    const percent = (myMonsterHP / maxHp) * 100;
    const bar = document.getElementById('my-hp-bar');
    const text = document.getElementById('my-hp-text');
    const expText = document.getElementById('my-exp-text');
    
    bar.style.width = percent + '%';
    text.innerText = Math.ceil(myMonsterHP) + '/' + maxHp;
    
    // Fix EXP undefined issue
    const currentExp = myActiveMonster.exp || 0;
    const reqExp = myActiveMonster.exp_req || 100;
    expText.innerText = `EXP: ${currentExp}/${reqExp}`;
    
    if(percent < 25) { bar.className = 'progress-bar bg-danger'; }
    else if(percent < 50) { bar.className = 'progress-bar bg-warning'; }
    else { bar.className = 'progress-bar bg-success'; }
}

function showMessage(msg) {
    document.getElementById('battle-message').innerText = msg;
}

// Auto-Heal Function (Rarity-based healing rate)
async function autoHeal() {
    if (!myActiveMonster || myActiveMonster.current_hp >= myActiveMonster.max_hp) return;
    
    // Rarity-based heal percentage (Lower rarity = faster heal)
    const healRates = {
        'N': 0.15,   // 15% heal per tick (Fast for beginners)
        'R': 0.12,   // 12%
        'SR': 0.10,  // 10%
        'SSR': 0.08, // 8%
        'UR': 0.06,  // 6%
        'LR': 0.04   // 4% (Slowest for legendary)
    };
    
    const healPercent = healRates[myActiveMonster.rarity] || 0.10;
    const healAmount = Math.ceil(myActiveMonster.max_hp * healPercent);
    myActiveMonster.current_hp = Math.min(myActiveMonster.current_hp + healAmount, myActiveMonster.max_hp);
    myMonsterHP = myActiveMonster.current_hp;
    
    // Save to DB
    await fetch('/api/monster/hp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userMonsterId: myActiveMonster.id, 
            hp: myActiveMonster.current_hp 
        })
    });
    
    console.log(`[Auto-Heal] ${myActiveMonster.nickname} healed ${healAmount} HP (${myActiveMonster.current_hp}/${myActiveMonster.max_hp})`);

    // If My Monsters modal is open, refresh the list to show real-time healing
    const modalEl = document.getElementById('monstersModal');
    if (modalEl && modalEl.classList.contains('show')) {
        loadMyMonsters();
    }
}

// Global functions for UI buttons
window.runAway = async function() {
    if (myActiveMonster) {
        // Save HP before running
        await fetch('/api/monster/hp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMonsterId: myActiveMonster.id, hp: myMonsterHP })
        });
    }
    endBattle();
};

window.attackMonster = async function() {
    if (!currentMonster || !isBattling || !isPlayerTurn) return;

    if (!myActiveMonster) {
        showAlert("You don't have any monster equipped! You can't attack!");
        return;
    }

    isPlayerTurn = false; // Lock buttons

    // Balanced Damage Formula: (Atk * 1.0) - (Def * 0.6)
    const rawDamage = (myActiveMonster.attack * 1.0) - (currentMonster.defense * 0.6);
    const baseDamage = Math.max(1, rawDamage);
    
    const variance = (Math.random() * 0.2) + 0.9; // 0.9 to 1.1
    const damage = Math.floor(baseDamage * variance);

    currentMonsterHP -= damage;
    showMessage(`${myActiveMonster.nickname} attacked! Dealt ${damage} damage.`);

    if (currentMonsterHP < 0) currentMonsterHP = 0;
    updateHealthUI();

    if (currentMonsterHP <= 0) {
        // Call Win API
        try {
            const response = await fetch('/api/battle/win', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 1, // Hardcoded
                    userMonsterId: myActiveMonster.id,
                    enemyLevel: currentMonster.level,
                    enemyRarity: currentMonster.rarity,
                    remainingHp: myMonsterHP // Send remaining HP to save
                })
            });
            const result = await response.json();
            
            let msg = `${currentMonster.name} fainted! You won!\nGained ${result.expGain} EXP.`;
            if (result.leveledUp) {
                msg += `\nLevel Up! Now Level ${result.level}!`;
            }
            
            setTimeout(() => {
                showAlert(msg, () => endBattle());
            }, 500);
        } catch (err) {
            console.error(err);
            setTimeout(() => {
                showAlert(`${currentMonster.name} fainted! You won!`, () => endBattle());
            }, 500);
        }
    } else {
        // Enemy Turn
        setTimeout(enemyTurn, 1000);
    }
};

window.defendMonster = function() {
    if (!currentMonster || !isBattling || !isPlayerTurn) return;
    
    isPlayerTurn = false;
    isDefending = true;
    showMessage(`${myActiveMonster.nickname} is defending!`);
    
    setTimeout(enemyTurn, 1000);
};

function enemyTurn() {
    if (!isBattling) return;

    showMessage(`${currentMonster.name} is attacking...`);

    setTimeout(() => {
        // Enemy Damage Calculation (Balanced)
        let rawDamage = (currentMonster.attack * 1.0) - (myActiveMonster.defense * 0.6);
        let baseDamage = Math.max(1, rawDamage);
        
        // If player is defending, reduce damage by 50%
        if (isDefending) {
            baseDamage = Math.floor(baseDamage * 0.5);
            isDefending = false; // Reset flag
        }

        const variance = (Math.random() * 0.2) + 0.9;
        const damage = Math.floor(baseDamage * variance);

        myMonsterHP -= damage;
        showMessage(`${currentMonster.name} dealt ${damage} damage to ${myActiveMonster.nickname}!`);
        
        if (myMonsterHP < 0) myMonsterHP = 0;
        updatePlayerHealthUI();

        if (myMonsterHP <= 0) {
            // Save HP (0) to DB
            fetch('/api/monster/hp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userMonsterId: myActiveMonster.id, hp: 0 })
            });

            setTimeout(() => {
                showAlert(`${myActiveMonster.nickname} fainted! You blacked out...`, () => endBattle());
            }, 500);
        } else {
            isPlayerTurn = true; // Unlock buttons
            // showMessage("Your turn!");
        }
    }, 1000);
}

window.catchMonster = async function() {
    if (!currentMonster || !isPlayerTurn) return;

    isPlayerTurn = false;
    showMessage("Throwing MonBall...");

    // Calculate Catch Chance
    // Rule: 100% HP = 0% Chance. Lower HP = Higher Chance.
    const hpPercent = currentMonsterHP / currentMonster.max_hp;
    const catchChance = 1.0 - hpPercent; // e.g., 10% HP left = 90% Catch Chance

    // Visual feedback
    console.log(`HP: ${(hpPercent*100).toFixed(1)}%, Catch Chance: ${(catchChance*100).toFixed(1)}%`);

    setTimeout(async () => {
        const roll = Math.random(); // 0.0 to 1.0

        if (roll > catchChance) {
            showMessage(`Failed! ${currentMonster.name} broke free!`);
            setTimeout(enemyTurn, 1000); // Enemy attacks if catch fails
            return;
        }

        // Hardcoded User ID 1 for now (Simulating logged in user)
        const userId = 1; 

        try {
            // Save HP of active monster before catching
            if (myActiveMonster) {
                await fetch('/api/monster/hp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userMonsterId: myActiveMonster.id, hp: myMonsterHP })
                });
            }

            const response = await fetch('/api/catch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    monsterId: currentMonster.id,
                    nickname: currentMonster.name, // Default nickname = monster name
                    level: currentMonster.level, // Use current wild monster level
                    hp: currentMonsterHP // Send current HP for EXP calculation
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                let msg = `Gotcha! ${currentMonster.name} was caught!`;
                if (result.expGain > 0) {
                    msg += `\nGained ${result.expGain} EXP.`;
                }
                if (result.expResult && result.expResult.leveledUp) {
                    msg += `\nLevel Up! Now Level ${result.expResult.level}!`;
                }
                showAlert(msg, () => endBattle());
            } else {
                showAlert('Failed to catch: ' + result.message);
                isPlayerTurn = true;
            }
        } catch (err) {
            console.error('Error catching monster:', err);
            showAlert('Error connecting to server');
            isPlayerTurn = true;
        }
    }, 1000);
};

async function endBattle() {
    document.getElementById('battle-ui').style.display = 'none';
    isBattling = false;
    currentMonster = null;
    
    // Reset heal timer so healing starts immediately after battle
    lastHealTime = Date.now();

    // Enable Menu Buttons
    document.getElementById('btn-my-monsters').disabled = false;
    document.getElementById('btn-pokedex').disabled = false;

    // Check if all monsters fainted (Emergency Revival)
    try {
        const response = await fetch('/api/my-monsters/1');
        const monsters = await response.json();
        
        // Update local active monster data to reflect post-battle state
        if (myActiveMonster) {
            const updatedActive = monsters.find(m => m.id === myActiveMonster.id);
            if (updatedActive) {
                myActiveMonster = updatedActive;
                myMonsterHP = updatedActive.current_hp;
            }
        }
        
        const allFainted = monsters.every(m => m.current_hp <= 0);
        
        if (allFainted && monsters.length > 0) {
            // Emergency Revival: Heal first monster to 30%
            const firstMonster = monsters[0];
            const reviveHp = Math.ceil(firstMonster.max_hp * 0.3);
            
            await fetch('/api/monster/hp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userMonsterId: firstMonster.id, 
                    hp: reviveHp 
                })
            });
            
            // Update local state if the revived monster is the active one
            if (myActiveMonster && myActiveMonster.id === firstMonster.id) {
                myActiveMonster.current_hp = reviveHp;
                myMonsterHP = reviveHp;
            }
            
            showAlert(`Emergency Revival!\n${firstMonster.nickname} was revived with 30% HP!`);
        }
    } catch (err) {
        console.error('Error checking fainted monsters:', err);
    }

    // Respawn monster after random delay (0-15 seconds)
    const delay = Math.random() * 15000;
    setTimeout(spawnMonster, delay);
}

// My Monsters Feature
let monstersModalInstance = null;

window.openMyMonsters = function() {
    if (isBattling) return; // Prevent opening during battle

    const modalEl = document.getElementById('monstersModal');
    if (!monstersModalInstance) {
        monstersModalInstance = new bootstrap.Modal(modalEl);
    }
    monstersModalInstance.show();
    loadMyMonsters();
};

// Pokedex Feature
let pokedexModalInstance = null;

window.openPokedex = function() {
    if (isBattling) return;

    const modalEl = document.getElementById('pokedexModal');
    if (!pokedexModalInstance) {
        pokedexModalInstance = new bootstrap.Modal(modalEl);
    }
    pokedexModalInstance.show();
    loadPokedex();
};

async function loadPokedex() {
    const listContainer = document.getElementById('pokedex-list');
    listContainer.innerHTML = '<div class="text-center p-3">Loading Pokedex...</div>';

    try {
        const response = await fetch('/api/monsters');
        const monsters = await response.json();

        listContainer.innerHTML = '';

        monsters.forEach(m => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            
            col.innerHTML = `
                <div class="card bg-black border border-white text-white h-100">
                    <div class="card-body text-center">
                        <h5 class="card-title fw-bold">${m.name}</h5>
                        <span class="badge mb-2" style="background-color:${RARITY_CONFIG[m.rarity].color}">${m.rarity}</span>
                        <p class="card-text small">
                            Type: ${m.type}<br>
                            HP: ${m.base_hp} | ATK: ${m.base_attack} | DEF: ${m.base_defense}
                        </p>
                    </div>
                </div>
            `;
            listContainer.appendChild(col);
        });
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = '<div class="text-danger">Failed to load Pokedex.</div>';
    }
}

async function loadMyMonsters() {
    const listContainer = document.getElementById('my-monster-list');
    listContainer.innerHTML = '<div class="text-center p-3">Loading data...</div>';

    try {
        // Hardcoded User ID 1
        const response = await fetch('/api/my-monsters/1');
        const monsters = await response.json();

        listContainer.innerHTML = ''; // Clear loading

        if (monsters.length === 0) {
            listContainer.innerHTML = '<div class="alert alert-info">You haven\'t caught any monsters yet! Go find some in the tall grass.</div>';
            return;
        }

        monsters.forEach(m => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            
            const activeBadge = m.is_active ? '<span class="badge bg-success me-2">Equipped</span>' : '';
            
            let equipBtn = '';
            if (m.is_active) {
                equipBtn = '';
            } else if (m.current_hp <= 0) {
                equipBtn = '<span class="badge bg-danger">Fainted</span>';
            } else {
                equipBtn = `<button class="btn btn-sm btn-outline-primary" onclick="equipMonster(${m.id})">Equip</button>`;
            }

            item.innerHTML = `
                <div>
                    ${activeBadge}
                    <h5 class="mb-1 fw-bold d-inline">${m.nickname} <small class="text-muted">(${m.name})</small></h5>
                    <span class="badge ms-2" style="background-color:${RARITY_CONFIG[m.rarity].color}">${m.rarity}</span>
                    <p class="mb-1 small">
                        Level ${m.level} | HP: ${m.current_hp}/${m.max_hp} <br>
                        <span class="fw-bold">ATK: ${m.attack} | DEF: ${m.defense}</span> <br>
                        <span class="text-muted">EXP: ${m.exp}/${m.exp_req}</span>
                    </p>
                </div>
                <div>
                    ${equipBtn}
                </div>
            `;
            listContainer.appendChild(item);
        });

    } catch (err) {
        console.error(err);
        listContainer.innerHTML = '<div class="text-danger">Failed to load monsters.</div>';
    }
}

window.equipMonster = async function(userMonsterId) {
    try {
        const response = await fetch('/api/equip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 1, userMonsterId: userMonsterId })
        });
        
        if (response.ok) {
            // Refresh list ONLY, do not reopen modal
            loadMyMonsters();
        } else {
            showAlert('Failed to equip monster');
        }
    } catch (err) {
        console.error(err);
    }
};

function draw() {
    // Clear screen (Viewport)
    ctx.fillStyle = '#000'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Apply Global Game Zoom
    ctx.scale(GAME_ZOOM, GAME_ZOOM);
    
    // Apply Camera Translation
    ctx.translate(-camera.x, -camera.y);
    
    // Draw World Borders
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, world.width, world.height);

    // Draw Procedural Objects (Culling: Only visible ones)
    // Calculate visible grid range
    const startCol = Math.floor(Math.max(0, camera.x) / GRID_SIZE);
    const endCol = Math.floor(Math.min(world.width, camera.x + camera.width) / GRID_SIZE);
    const startRow = Math.floor(Math.max(0, camera.y) / GRID_SIZE);
    const endRow = Math.floor(Math.min(world.height, camera.y + camera.height) / GRID_SIZE);

    for (let gy = startRow; gy <= endRow; gy++) {
        for (let gx = startCol; gx <= endCol; gx++) {
            const x = gx * GRID_SIZE;
            const y = gy * GRID_SIZE;
            
            // Use center of cell for noise check to be consistent
            const obj = getWorldObject(x + GRID_SIZE/2, y + GRID_SIZE/2);
            
            if (obj === 'TREE') {
                // Draw Tree (Triangle)
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.moveTo(x + GRID_SIZE/2, y + 4);
                ctx.lineTo(x + 4, y + GRID_SIZE - 4);
                ctx.lineTo(x + GRID_SIZE - 4, y + GRID_SIZE - 4);
                ctx.fill();
            } else if (obj === 'ROCK') {
                // Draw Rock (Circle/Square)
                ctx.fillStyle = '#666';
                ctx.fillRect(x + 4, y + 8, GRID_SIZE - 8, GRID_SIZE - 12);
            } else if (obj === 'TALL_GRASS') {
                // Draw Tall Grass (Dark Green Box)
                ctx.fillStyle = '#1a3300'; // Dark Green
                ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
            }
        }
    }

    // Draw Town Zone
    ctx.fillStyle = town.color;
    ctx.fillRect(town.x, town.y, town.width, town.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(town.x, town.y, town.width, town.height);

    // Draw Landmarks
    landmarks.forEach(l => {
        // Base
        ctx.fillStyle = l.color;
        ctx.fillRect(l.x, l.y, l.w, l.h);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(l.x, l.y, l.w, l.h);

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(l.label, l.x + l.w/2, l.y + l.h/2);

        // Interaction Hint
        const centerLx = l.x + l.w/2;
        const centerLy = l.y + l.h/2;
        const dist = Math.hypot(player.x - centerLx, player.y - centerLy);
        if (dist < 400) {
            ctx.font = '16px monospace';
            ctx.fillText(l.desc, l.x + l.w/2, l.y - 20);
        }
    });

    // Draw Buildings
    buildings.forEach(b => {
        // Draw Building Body
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        
        // Draw Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.label, b.x + b.w/2, b.y + b.h/2);

        // Draw "Press E" hint if close
        const centerBx = b.x + b.w/2;
        const centerBy = b.y + b.h/2;
        const dist = Math.hypot(player.x - centerBx, player.y - centerBy);
        if (dist < 250) {
            ctx.font = '16px monospace';
            ctx.fillText("[E] Interact", b.x + b.w/2, b.y - 20);
        }
    });

    // Draw Player (White Box)
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x, player.y, player.size, player.size);
    
    // Optional: White Outline (if you want it to look like a hollow box, change fillStyle to black and keep stroke)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.size, player.size);

    // Draw Monsters (Blinking Colored Dots)
    const now = Date.now();
    if (Math.floor(now / 800) % 2 === 0) { // Blink every 800ms (Slower)
        spawnedMonsters.forEach(m => {
            // Only draw if visible
            if (m.x + m.size > camera.x && m.x < camera.x + camera.width &&
                m.y + m.size > camera.y && m.y < camera.y + camera.height) {
                
                ctx.fillStyle = m.color; // Use rarity color
                ctx.beginPath();
                ctx.arc(m.x + m.size/2, m.y + m.size/2, m.size/2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    ctx.restore();

    // Draw UI Elements (Fixed on screen, NOT zoomed)
    // e.g., Coordinates text
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.fillText(`Pos: ${Math.round(player.x)}, ${Math.round(player.y)}`, 20, 30);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Custom Alert System
function showAlert(msg, callback = null) {
    const alertEl = document.getElementById('custom-alert');
    const msgEl = document.getElementById('custom-alert-msg');
    const btnEl = document.getElementById('custom-alert-btn');

    msgEl.innerText = msg;
    alertEl.classList.remove('d-none');
    alertEl.classList.add('d-flex');

    // Remove old event listeners to prevent stacking
    const newBtn = btnEl.cloneNode(true);
    btnEl.parentNode.replaceChild(newBtn, btnEl);

    newBtn.addEventListener('click', () => {
        alertEl.classList.add('d-none');
        alertEl.classList.remove('d-flex');
        if (callback) callback();
    });
}

// Start game
async function initGame() {
    console.log("Initializing game...");
    // Check for starter pack
    try {
        const response = await fetch('/api/my-monsters/1');
        const monsters = await response.json();
        console.log("Existing monsters:", monsters);
        
        if (monsters.length === 0) {
            console.log("New player detected! Claiming starter pack...");
            const claimRes = await fetch('/api/starter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 1 })
            });
            
            const result = await claimRes.json();
            console.log("Starter claim result:", result);

            if (claimRes.ok) {
                showAlert("Welcome to Monvera! You received a Starter Monster: " + result.monster.name);
            } else {
                console.error("Failed to claim starter:", result.message);
            }
        }
    } catch (e) {
        console.error("Error checking starter:", e);
    }

    gameLoop();
}

initGame();
