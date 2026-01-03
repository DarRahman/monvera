const db = require('./src/config/database');

async function updateSchema() {
    try {
        console.log('Updating database schema...');
        
        // 1. is_active
        try {
            await db.query('ALTER TABLE user_monsters ADD COLUMN is_active BOOLEAN DEFAULT FALSE');
            console.log('Success: Column is_active added.');
        } catch (err) { console.log('Info: is_active exists.'); }

        // 2. Player Level & EXP
        try {
            await db.query('ALTER TABLE users ADD COLUMN level INT DEFAULT 1');
            await db.query('ALTER TABLE users ADD COLUMN exp INT DEFAULT 0');
            console.log('Success: Player Level & EXP columns added.');
        } catch (err) { console.log('Info: Player Level/EXP exists.'); }

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

updateSchema();
