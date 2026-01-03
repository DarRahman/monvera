const db = require('./src/config/database');

const monsters = [
    // N (Common) - 10 Monsters
    { name: 'Slime', type: 'Water', rarity: 'N', hp: 50, atk: 10, def: 10 },
    { name: 'Jelly', type: 'Water', rarity: 'N', hp: 48, atk: 11, def: 9 },
    { name: 'Rat', type: 'Earth', rarity: 'N', hp: 45, atk: 12, def: 8 },
    { name: 'Mole', type: 'Earth', rarity: 'N', hp: 47, atk: 10, def: 11 },
    { name: 'Bat', type: 'Wind', rarity: 'N', hp: 40, atk: 13, def: 7 },
    { name: 'Pigeon', type: 'Wind', rarity: 'N', hp: 42, atk: 12, def: 8 },
    { name: 'Ember', type: 'Fire', rarity: 'N', hp: 48, atk: 14, def: 6 },
    { name: 'Coal', type: 'Fire', rarity: 'N', hp: 52, atk: 12, def: 10 },
    { name: 'Spark', type: 'Lightning', rarity: 'N', hp: 42, atk: 15, def: 5 },
    { name: 'Static', type: 'Lightning', rarity: 'N', hp: 44, atk: 14, def: 7 },

    // R (Rare) - 5 Monsters
    { name: 'Wolf', type: 'Earth', rarity: 'R', hp: 65, atk: 18, def: 14 },
    { name: 'Hawk', type: 'Wind', rarity: 'R', hp: 60, atk: 20, def: 12 },
    { name: 'Crab', type: 'Water', rarity: 'R', hp: 75, atk: 15, def: 22 },
    { name: 'Lizard', type: 'Fire', rarity: 'R', hp: 68, atk: 22, def: 12 },
    { name: 'Zap', type: 'Lightning', rarity: 'R', hp: 55, atk: 25, def: 9 },

    // SR (Super Rare) - 5 Monsters
    { name: 'Golem', type: 'Earth', rarity: 'SR', hp: 110, atk: 25, def: 35 },
    { name: 'Griffin', type: 'Wind', rarity: 'SR', hp: 95, atk: 32, def: 20 },
    { name: 'Shark', type: 'Water', rarity: 'SR', hp: 105, atk: 35, def: 25 },
    { name: 'Drake', type: 'Fire', rarity: 'SR', hp: 100, atk: 38, def: 22 },
    { name: 'Volt', type: 'Lightning', rarity: 'SR', hp: 90, atk: 42, def: 18 },

    // SSR (Specially Super Rare) - 5 Monsters
    { name: 'Titan', type: 'Earth', rarity: 'SSR', hp: 160, atk: 45, def: 55 },
    { name: 'Tempest', type: 'Wind', rarity: 'SSR', hp: 140, atk: 55, def: 35 },
    { name: 'Leviathan', type: 'Water', rarity: 'SSR', hp: 180, atk: 40, def: 50 },
    { name: 'Phoenix', type: 'Fire', rarity: 'SSR', hp: 150, atk: 60, def: 30 },
    { name: 'Thunderbird', type: 'Lightning', rarity: 'SSR', hp: 145, atk: 65, def: 25 },

    // UR (Ultra Rare) - 5 Monsters
    { name: 'Behemoth', type: 'Earth', rarity: 'UR', hp: 250, atk: 70, def: 90 },
    { name: 'Hurricane', type: 'Wind', rarity: 'UR', hp: 200, atk: 95, def: 55 },
    { name: 'Tsunami', type: 'Water', rarity: 'UR', hp: 280, atk: 65, def: 85 },
    { name: 'Inferno', type: 'Fire', rarity: 'UR', hp: 220, atk: 110, def: 50 },
    { name: 'Mjolnir', type: 'Lightning', rarity: 'UR', hp: 210, atk: 120, def: 40 },

    // LR (Legendary Rare) - 2 Monsters (Light & Darkness Only)
    { name: 'Genesis', type: 'Light', rarity: 'LR', hp: 400, atk: 150, def: 150 },
    { name: 'Void', type: 'Darkness', rarity: 'LR', hp: 350, atk: 180, def: 100 }
];

async function seed() {
    try {
        console.log('Resetting database...');
        
        // Reset Tables
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.query('TRUNCATE TABLE user_monsters');
        await db.query('TRUNCATE TABLE monsters');
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

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

