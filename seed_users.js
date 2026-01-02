const db = require('./src/config/database');

async function seedUsers() {
    try {
        console.log('Seeding Users...');
        
        // Cek apakah user ID 1 sudah ada
        const [rows] = await db.query('SELECT * FROM users WHERE id = 1');
        
        if (rows.length === 0) {
            await db.query('INSERT INTO users (id, username, password) VALUES (1, "PlayerOne", "password123")');
            console.log('User "PlayerOne" (ID: 1) created successfully.');
        } else {
            console.log('User ID 1 already exists.');
        }

        // Cek apakah user punya monster
        const [userMonsters] = await db.query('SELECT * FROM user_monsters WHERE user_id = 1');
        if (userMonsters.length === 0) {
            console.log('Giving starter monster to PlayerOne...');
            // Ambil ID monster pertama (biasanya Ignisver/Fire)
            const [monsters] = await db.query('SELECT id, name, base_hp FROM monsters LIMIT 1');
            if (monsters.length > 0) {
                const starter = monsters[0];
                await db.query(
                    'INSERT INTO user_monsters (user_id, monster_id, nickname, level, current_hp, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                    [1, starter.id, starter.name, 5, starter.base_hp, true] // Langsung equip (is_active = true)
                );
                console.log(`Starter monster ${starter.name} given to PlayerOne.`);
            }
        } else {
            console.log('PlayerOne already has monsters.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seedUsers();
