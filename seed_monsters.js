const db = require('./src/config/database');

const monsters = [
    // N (Common) - Multiplier ~1.0
    { name: 'Slime', type: 'Water', rarity: 'N', hp: 50, atk: 10, def: 10 },
    { name: 'Rat', type: 'Earth', rarity: 'N', hp: 45, atk: 12, def: 8 },
    { name: 'Bat', type: 'Wind', rarity: 'N', hp: 40, atk: 11, def: 9 },
    { name: 'Ember', type: 'Fire', rarity: 'N', hp: 48, atk: 13, def: 7 },
    { name: 'Spark', type: 'Lightning', rarity: 'N', hp: 42, atk: 14, def: 6 },

    // R (Rare) - Multiplier ~1.2
    { name: 'Wolf', type: 'Earth', rarity: 'R', hp: 60, atk: 15, def: 12 },
    { name: 'Hawk', type: 'Wind', rarity: 'R', hp: 55, atk: 16, def: 10 },
    { name: 'Crab', type: 'Water', rarity: 'R', hp: 65, atk: 14, def: 18 },
    { name: 'Lizard', type: 'Fire', rarity: 'R', hp: 58, atk: 17, def: 11 },
    { name: 'Static', type: 'Lightning', rarity: 'R', hp: 52, atk: 18, def: 9 },

    // SR (Super Rare) - Multiplier ~1.5
    { name: 'Golem', type: 'Earth', rarity: 'SR', hp: 90, atk: 20, def: 25 },
    { name: 'Griffin', type: 'Wind', rarity: 'SR', hp: 80, atk: 25, def: 15 },
    { name: 'Shark', type: 'Water', rarity: 'SR', hp: 85, atk: 24, def: 18 },
    { name: 'Drake', type: 'Fire', rarity: 'SR', hp: 82, atk: 26, def: 16 },
    { name: 'Volt', type: 'Lightning', rarity: 'SR', hp: 75, atk: 28, def: 14 },

    // SSR (Specially Super Rare) - Multiplier ~1.8
    { name: 'Titan', type: 'Earth', rarity: 'SSR', hp: 120, atk: 30, def: 35 },
    { name: 'Phoenix', type: 'Fire', rarity: 'SSR', hp: 110, atk: 38, def: 25 },
    { name: 'Leviathan', type: 'Water', rarity: 'SSR', hp: 130, atk: 32, def: 30 },
    { name: 'Tempest', type: 'Wind', rarity: 'SSR', hp: 100, atk: 40, def: 20 },
    { name: 'Thunderbird', type: 'Lightning', rarity: 'SSR', hp: 105, atk: 42, def: 18 },

    // UR (Ultra Rare) - Multiplier ~2.2
    { name: 'Behemoth', type: 'Earth', rarity: 'UR', hp: 180, atk: 50, def: 60 },
    { name: 'Inferno', type: 'Fire', rarity: 'UR', hp: 160, atk: 65, def: 45 },
    { name: 'Tsunami', type: 'Water', rarity: 'UR', hp: 170, atk: 55, def: 55 },
    { name: 'Hurricane', type: 'Wind', rarity: 'UR', hp: 150, atk: 70, def: 40 },
    { name: 'Mjolnir', type: 'Lightning', rarity: 'UR', hp: 155, atk: 75, def: 35 },

    // LR (Legendary Rare) - Multiplier ~3.0 (Light & Darkness Only)
    { name: 'Seraphim', type: 'Light', rarity: 'LR', hp: 250, atk: 100, def: 100 },
    { name: 'Diabolos', type: 'Darkness', rarity: 'LR', hp: 250, atk: 110, def: 90 },
    { name: 'Genesis', type: 'Light', rarity: 'LR', hp: 300, atk: 90, def: 120 },
    { name: 'Void', type: 'Darkness', rarity: 'LR', hp: 220, atk: 130, def: 80 }
];

async function seed() {
    try {
        console.log('Resetting database...');
        
        // Reset Tables
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.query('TRUNCATE TABLE user_monsters');
        await db.query('TRUNCATE TABLE monsters');
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        // Alter Table if needed (Manual check usually better, but here for safety)
        try {
            await db.query("ALTER TABLE monsters ADD COLUMN rarity ENUM('N', 'R', 'SR', 'SSR', 'UR', 'LR') NOT NULL DEFAULT 'N'");
        } catch (e) {} // Ignore if exists
        
        try {
            await db.query("ALTER TABLE user_monsters ADD COLUMN exp INT DEFAULT 0");
        } catch (e) {}

        console.log('Seeding monsters...');
        
        for (const m of monsters) {
            await db.query(
                'INSERT INTO monsters (name, type, rarity, base_hp, base_attack, base_defense) VALUES (?, ?, ?, ?, ?, ?)',
                [m.name, m.type, m.rarity, m.hp, m.atk, m.def]
            );
        }

        console.log('Done! ' + monsters.length + ' monsters seeded.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
