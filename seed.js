const db = require('./src/config/database');

const monsters = [
    {
        name: 'Ignisver',
        type: 'Fire',
        base_hp: 100,
        base_attack: 110,
        base_defense: 90,
        sprite_url: 'assets/monsters/ignisver.png'
    },
    {
        name: 'Aqualux',
        type: 'Water',
        base_hp: 110,
        base_attack: 95,
        base_defense: 95,
        sprite_url: 'assets/monsters/aqualux.png'
    },
    {
        name: 'Sylvaris',
        type: 'Nature',
        base_hp: 130,
        base_attack: 85,
        base_defense: 85,
        sprite_url: 'assets/monsters/sylvaris.png'
    },
    {
        name: 'Zephyron',
        type: 'Wind',
        base_hp: 90,
        base_attack: 130,
        base_defense: 80,
        sprite_url: 'assets/monsters/zephyron.png'
    },
    {
        name: 'Terravon',
        type: 'Earth',
        base_hp: 150,
        base_attack: 70,
        base_defense: 80,
        sprite_url: 'assets/monsters/terravon.png'
    }
];

async function seed() {
    try {
        console.log('Starting seeding process...');
        
        // 1. Hapus data lama (Reset)
        console.log('Clearing old data...');
        await db.query('DELETE FROM user_monsters'); // Hapus monster milik player dulu (Foreign Key)
        await db.query('DELETE FROM monsters');      // Hapus data master monster
        
        // Reset Auto Increment biar ID mulai dari 1 lagi
        await db.query('ALTER TABLE user_monsters AUTO_INCREMENT = 1');
        await db.query('ALTER TABLE monsters AUTO_INCREMENT = 1');

        // 2. Insert Data Baru yang sudah dibalance
        console.log('Inserting balanced monsters...');
        for (const monster of monsters) {
            await db.query(
                'INSERT INTO monsters (name, type, base_hp, base_attack, base_defense, sprite_url) VALUES (?, ?, ?, ?, ?, ?)',
                [monster.name, monster.type, monster.base_hp, monster.base_attack, monster.base_defense, monster.sprite_url]
            );
            console.log(`Inserted: ${monster.name} (HP: ${monster.base_hp}, ATK: ${monster.base_attack}, DEF: ${monster.base_defense})`);
        }

        console.log('Seeding & Balancing completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
