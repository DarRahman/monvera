const db = require('./src/config/database');

async function checkColumn() {
    try {
        const [rows] = await db.query("SHOW COLUMNS FROM user_monsters LIKE 'exp'");
        if (rows.length > 0) {
            console.log("Column 'exp' exists.");
        } else {
            console.log("Column 'exp' does NOT exist.");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkColumn();
