const db = require('./src/config/database');

async function updateSchema() {
    try {
        console.log('Updating database schema...');
        
        // Menambahkan kolom is_active ke tabel user_monsters
        // Gunakan try-catch khusus query ini jaga-jaga kalau kolom sudah ada
        try {
            await db.query(`
                ALTER TABLE user_monsters 
                ADD COLUMN is_active BOOLEAN DEFAULT FALSE
            `);
            console.log('Success: Column is_active added to user_monsters.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Info: Column is_active already exists.');
            } else {
                throw err;
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

updateSchema();
