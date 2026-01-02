# Monvera Project Instructions

## Project Overview
Monvera is a web-based Monster Catching RPG (similar to Pokémon) built for a Database Administrator course (Semester 3 Teknik Informatika). It focuses on demonstrating database interactions (CRUD, Relations, Optimization) through real-time gameplay.

## Tech Stack
- **Backend:** Node.js, Express, Socket.io
- **Database:** MySQL (using `mysql2` library with promise pool)
- **Frontend:** Vanilla JavaScript, HTML5 Canvas
- **Styling:** CSS (Strict Monochrome)

## Visual & Design Guidelines (CRITICAL)
- **Theme:** STRICT Monochrome (Black & White).
- **Colors:**
  - Background: `#000000` (Black)
  - Foreground/Elements: `#FFFFFF` (White)
  - **Exception:** Rarity badges use specific hex colors (`RARITY_CONFIG` in `public/js/game.js`):
    - N: `#9E9E9E`, R: `#2196F3`, SR: `#9C27B0`, SSR: `#FFC107`, UR: `#E53935`, LR: `#EDE7F6`
- **Style:** 1-bit pixel art aesthetic with high contrast.
- **UI:** White borders on black backgrounds. Use custom `showAlert()` function (NOT browser `alert()`).

## Architecture & Patterns

### Backend (`src/`)
- **Structure:** MVC-like structure.
  - `config/database.js`: MySQL connection pool using `mysql2/promise`.
  - `controllers/monsterController.js`: Request handlers (catch, battle, equip, etc.).
  - `models/Monster.js`: Data access layer with **static methods** only (no instances).
  - `routes/api.js`: REST API endpoints mounted at `/api`.
- **Database Access (CRITICAL):**
  - **ALWAYS use Raw SQL** queries within Model static methods.
  - Pattern: `const [rows] = await db.query('SELECT ...', [params])`
  - **NEVER use ORMs** - This project demonstrates DBA skills through manual SQL.
  - **Stats Calculation:** Use `Monster.calculateStats(baseStats, level, rarity)` - computed in-app, NOT stored in DB (3NF compliance).

### Frontend (`public/`)
- **Game Loop:** `public/js/game.js` uses `requestAnimationFrame` in `gameLoop()`.
- **Canvas Rendering:** Fixed 2560x1440 internal resolution scaled to viewport (no zoom issues).
- **State Management:** Global variables (`player`, `isBattling`, `myActiveMonster`, `currentMonster`).
- **Communication:**
  - **REST API (`fetch`):** For persistent operations (catch, save HP, gain EXP).
  - **Socket.io:** Reserved for future multiplayer (currently only logs connections).
- **UI Patterns:**
  - Bootstrap 5 modals for "My Monsters" and "Pokedex".
  - Custom `showAlert(msg, callback)` for in-game notifications (monochrome themed).
  - Auto-refresh: Modal content updates when `#monstersModal` has class `show`.

## Core Game Systems

### 1. Rarity & Stats System
- **Rarity Tiers:** N (50%), R (30%), SR (15%), SSR (4%), UR (0.9%), LR (0.1%)
- **Stats Formula:** `base_stat * rarity_multiplier * (1 + (level - 1) * 0.05)`
- **Rarity Multipliers:** N: 1.0, R: 1.2, SR: 1.4, SSR: 1.7, UR: 2.0, LR: 2.3
- **EXP Requirement (Linear):** `100 + (level * 50)` (e.g., Level 1→2 needs 150 EXP)
- **Location:** `Monster.calculateStats()` in `src/models/Monster.js`

### 2. Battle System
- **Damage Formula:** `Math.max(1, (Attack * 1.0) - (Defense * 0.6))`
- **Defend Mechanic:** 50% damage reduction for one turn.
- **Turn Order:** Player → Enemy → Player (locked via `isPlayerTurn` flag).
- **HP Persistence:** `current_hp` saved to DB after every battle action via `/api/monster/hp`.

### 3. Auto-Heal System
- **Trigger:** Every 5 seconds when NOT in battle (in `update()` loop).
- **Rarity-Based Rates:** N: 15%, R: 12%, SR: 10%, SSR: 8%, UR: 6%, LR: 4% (of Max HP per tick).
- **Real-Time UI:** Auto-refreshes `#monstersModal` if open during healing.
- **Emergency Revival:** If all monsters have 0 HP, first monster auto-revives to 30% HP.

### 4. Catch & EXP Mechanics
- **Catch Chance:** `1.0 - (currentHP / maxHP)` (e.g., 10% HP left = 90% catch rate).
- **EXP on Catch:** `baseEXP * (1 - hpPercent)` - Lower HP = More EXP (reward for weakening).
- **EXP on Kill:** `(20 + enemyLevel * 10) * rarityMultiplier` (UR gives 5x EXP vs N).

## Critical Workflows
- **Run Server:** `npm start` → Starts on `http://localhost:3000`
- **Database Setup:**
  1. Create MySQL database: `db_monvera`
  2. Import schema: `mysql -u root db_monvera < database.sql`
  3. Run seeders: `node seed_monsters.js && node seed_users.js`
  4. Configure `.env`: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- **Debugging:**
  - Backend: Check terminal logs (`console.log` in controllers).
  - Frontend: Browser DevTools Console (game loop logs, API errors).
  - Database: phpMyAdmin at `http://localhost/phpmyadmin`

## Common Development Patterns

### Adding a New API Endpoint
```javascript
// 1. Model (src/models/Monster.js)
static async newMethod(param) {
  const [rows] = await db.query('SELECT * FROM table WHERE id = ?', [param]);
  return rows[0];
}

// 2. Controller (src/controllers/monsterController.js)
exports.newEndpoint = async (req, res) => {
  try {
    const result = await Monster.newMethod(req.body.param);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error' });
  }
};

// 3. Route (src/routes/api.js)
router.post('/new-endpoint', monsterController.newEndpoint);

// 4. Frontend (public/js/game.js)
const response = await fetch('/api/new-endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ param: value })
});
```

### Database Query Patterns
```javascript
// SELECT with JOIN & calculated stats
const [rows] = await db.query(`
  SELECT um.*, m.name, m.base_hp, m.rarity
  FROM user_monsters um
  JOIN monsters m ON um.monster_id = m.id
  WHERE um.user_id = ?
`, [userId]);

// UPDATE with conditions
await db.query(
  'UPDATE user_monsters SET current_hp = ? WHERE id = ?',
  [hp, monsterId]
);

// INSERT and return ID
const [result] = await db.query(
  'INSERT INTO user_monsters (user_id, monster_id, level, current_hp) VALUES (?, ?, ?, ?)',
  [userId, monsterId, level, hp]
);
return result.insertId;
```

## Project-Specific Conventions
1. **User ID Hardcoded:** Currently `userId = 1` everywhere (auth not implemented).
2. **No DELETE operations:** Monsters never deleted (only HP set to 0 = "fainted").
3. **Canvas Coordinates:** Use absolute positions (player boundary checks at edges).
4. **Modal State:** Check `modal.classList.contains('show')` before auto-refreshing content.
5. **File Naming:** Controllers/Models use camelCase (`monsterController.js`), not kebab-case.

## Known Limitations & Future Work
- **No Authentication:** Single-user mode (user_id = 1).
- **No Multiplayer:** Socket.io present but unused (placeholder for future).
- **No Item/Shop System:** Planned for Week 2 (Inventory tables).
- **No Stored Procedures/Triggers:** Planned for Week 1 (DBA feature showcase).
- **Fixed Map Size:** 2560x1440, no scrolling/camera system.
