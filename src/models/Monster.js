const db = require('../config/database');

class Monster {
    static async findAll() {
        const [rows] = await db.query('SELECT * FROM monsters');
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM monsters WHERE id = ?', [id]);
        return rows[0];
    }

    static async getPlayerInfo(userId) {
        const [rows] = await db.query('SELECT id, username, level, exp FROM users WHERE id = ?', [userId]);
        if (!rows[0]) return null;
        
        const player = rows[0];
        // Exponential EXP formula: easier at start, harder later
        player.exp_req = Math.floor(100 * Math.pow(player.level, 1.5)); 
        return player;
    }

    static async addPlayerExp(userId, expAmount) {
        const player = await this.getPlayerInfo(userId);
        if (!player) return null;

        player.exp += expAmount;
        let leveledUp = false;
        let expReq = Math.floor(100 * Math.pow(player.level, 1.5));

        while (player.exp >= expReq && player.level < 200) {
            player.exp -= expReq;
            player.level++;
            leveledUp = true;
            expReq = Math.floor(100 * Math.pow(player.level, 1.5));
        }

        await db.query('UPDATE users SET level = ?, exp = ? WHERE id = ?', [player.level, player.exp, userId]);
        
        // Debug log to verify DB update
        console.log(`Player ${userId} updated: Level ${player.level}, EXP ${player.exp}`);
        
        return { level: player.level, exp: player.exp, leveledUp };
    }

    static async findRandom(rarity = null) {
        let query = 'SELECT * FROM monsters';
        const params = [];
        
        if (rarity) {
            query += ' WHERE rarity = ?';
            params.push(rarity);
        }
        
        query += ' ORDER BY RAND() LIMIT 1';
        
        const [rows] = await db.query(query, params);
        return rows[0];
    }

    static async catchMonster(userId, monsterId, nickname, level, hp) {
        const [result] = await db.query(
            'INSERT INTO user_monsters (user_id, monster_id, nickname, level, current_hp, exp) VALUES (?, ?, ?, ?, ?, 0)',
            [userId, monsterId, nickname, level, hp]
        );
        return result.insertId;
    }

    static async setActive(userId, userMonsterId) {
        // 1. Set all user's monsters to inactive
        await db.query('UPDATE user_monsters SET is_active = FALSE WHERE user_id = ?', [userId]);
        
        // 2. Set selected monster to active
        await db.query('UPDATE user_monsters SET is_active = TRUE WHERE id = ? AND user_id = ?', [userMonsterId, userId]);
        return true;
    }

    static calculateStats(baseStats, level, rarity) {
        // Multiplier based on Rarity (Rebalanced)
        const rarityMult = {
            'N': 1.0,
            'R': 1.2,
            'SR': 1.4,
            'SSR': 1.7,
            'UR': 2.0,
            'LR': 2.3
        }[rarity] || 1.0;

        // Growth: 5% per level
        const levelMult = 1 + ((level - 1) * 0.05);
        
        const totalMult = rarityMult * levelMult;

        return {
            max_hp: Math.floor(baseStats.base_hp * totalMult),
            attack: Math.floor(baseStats.base_attack * totalMult),
            defense: Math.floor(baseStats.base_defense * totalMult),
            exp_req: Math.floor(100 * Math.pow(level, 1.3)) // Exponential Growth
        };
    }

    static async addExp(userMonsterId, expAmount, remainingHp) {
        // 1. Get current monster data
        const [rows] = await db.query(`
            SELECT um.*, m.base_hp, m.base_attack, m.base_defense, m.rarity
            FROM user_monsters um
            JOIN monsters m ON um.monster_id = m.id
            WHERE um.id = ?
        `, [userMonsterId]);

        if (!rows[0]) return null;
        let monster = rows[0];

        // 2. Add EXP
        monster.exp = (monster.exp || 0) + expAmount;
        let leveledUp = false;
        let oldLevel = monster.level;

        // 3. Level Up Logic
        // Calculate exp_req for current level
        let expReq = Math.floor(100 * Math.pow(monster.level, 1.3));

        while (monster.exp >= expReq) {
            monster.exp -= expReq;
            monster.level++;
            leveledUp = true;
            // Recalculate expReq for NEW level
            expReq = Math.floor(100 * Math.pow(monster.level, 1.3));
        }

        // 4. Update DB
        if (leveledUp) {
            // Full Heal on Level Up
            const stats = Monster.calculateStats(monster, monster.level, monster.rarity);
            monster.current_hp = stats.max_hp;
            
            await db.query(
                'UPDATE user_monsters SET level = ?, exp = ?, current_hp = ? WHERE id = ?',
                [monster.level, monster.exp, monster.current_hp, userMonsterId]
            );
        } else {
            // Update EXP AND Current HP (Persistence)
            // Use remainingHp if provided, otherwise keep current
            const newHp = (remainingHp !== undefined) ? remainingHp : monster.current_hp;
            
            await db.query(
                'UPDATE user_monsters SET exp = ?, current_hp = ? WHERE id = ?',
                [monster.exp, newHp, userMonsterId]
            );
        }

        return {
            level: monster.level,
            exp: monster.exp,
            leveledUp: leveledUp,
            oldLevel: oldLevel
        };
    }

    static async updateHp(userMonsterId, hp) {
        await db.query('UPDATE user_monsters SET current_hp = ? WHERE id = ?', [hp, userMonsterId]);
    }

    static async releaseMonster(userMonsterId, userId) {
        // Ensure we don't release the last monster if possible, or handle it in UI
        const [result] = await db.query('DELETE FROM user_monsters WHERE id = ? AND user_id = ?', [userMonsterId, userId]);
        return result.affectedRows > 0;
    }

    static async findActiveByUserId(userId) {
        const [rows] = await db.query(`
            SELECT um.*, m.name as base_name, m.base_attack, m.base_defense, m.base_hp, m.type, m.rarity
            FROM user_monsters um
            JOIN monsters m ON um.monster_id = m.id
            WHERE um.user_id = ? AND um.is_active = TRUE
            LIMIT 1
        `, [userId]);
        
        if (!rows[0]) return null;

        const m = rows[0];
        const stats = Monster.calculateStats(m, m.level, m.rarity);
        
        return { ...m, ...stats };
    }

    static async findByUserId(userId) {
        const [rows] = await db.query(`
            SELECT um.id, m.name, um.nickname, um.level, um.current_hp, um.is_active, um.exp,
                   m.base_attack, m.base_defense, m.base_hp, m.rarity, m.type
            FROM user_monsters um
            JOIN monsters m ON um.monster_id = m.id
            WHERE um.user_id = ?
        `, [userId]);

        return rows.map(row => {
            const stats = Monster.calculateStats(row, row.level, row.rarity);
            return { ...row, ...stats };
        });
    }
}

module.exports = Monster;
