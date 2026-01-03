const Monster = require('../models/Monster');

exports.getAllMonsters = async (req, res) => {
    try {
        const monsters = await Monster.findAll();
        res.json(monsters);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getPlayerMonsters = async (req, res) => {
    try {
        const userId = req.params.userId;
        const monsters = await Monster.findByUserId(userId);
        res.json(monsters);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getPlayerInfo = async (req, res) => {
    try {
        const userId = req.params.userId;
        const player = await Monster.getPlayerInfo(userId);
        if (!player) {
            return res.status(404).json({ message: 'Player not found' });
        }
        res.json(player);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getRandomMonster = async (req, res) => {
    try {
        const { rarity, userId } = req.query;
        const monster = await Monster.findRandom(rarity);
        
        if (!monster) {
            return res.status(404).json({ message: 'No monsters found in database' });
        }

        // --- SCALE LEVEL BASED ON PLAYER ---
        let playerLevel = 1;
        if (userId) {
            const player = await Monster.getPlayerInfo(userId);
            if (player) playerLevel = player.level;
        }

        // Wild monster level: PlayerLevel +/- 2 (Min 1, Max 200)
        let minLvl = Math.max(1, playerLevel - 2);
        let maxLvl = Math.min(200, playerLevel + 2);
        const level = Math.floor(Math.random() * (maxLvl - minLvl + 1)) + minLvl;

        // Calculate stats for this level
        const stats = Monster.calculateStats(monster, level, monster.rarity);
        
        res.json({ ...monster, ...stats, level });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.catchMonster = async (req, res) => {
    try {
        const { userId, monsterId, nickname, level, hp } = req.body;
        
        // Basic validation
        if (!userId || !monsterId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // --- LIMIT CHECK (Max 10 Monsters) ---
        const existingMonsters = await Monster.findByUserId(userId);
        if (existingMonsters.length >= 10) {
            return res.status(400).json({ message: 'You can only carry 10 monsters! Release some first.' });
        }

        // Fetch monster base stats to calculate max HP for the caught level
        const monster = await Monster.findById(monsterId);
        if (!monster) {
            return res.status(404).json({ message: 'Monster not found' });
        }

        const caughtLevel = level || 1;
        const stats = Monster.calculateStats(monster, caughtLevel, monster.rarity);

        // Insert with FULL HP (stats.max_hp)
        const newId = await Monster.catchMonster(userId, monsterId, nickname || monster.name, caughtLevel, stats.max_hp);
        
        // --- EXP CALCULATION ---
        let expResult = null;
        let expGain = 0;

        // Find active monster to give EXP to
        const activeMonster = await Monster.findActiveByUserId(userId);
        
        if (activeMonster) {
            const maxHp = stats.max_hp;
            const currentHp = hp !== undefined ? hp : maxHp; // Default to Max HP (0 EXP) if not provided
            
            const rarityMult = {
                'N': 1.0, 'R': 1.5, 'SR': 2.0, 'SSR': 3.0, 'UR': 5.0, 'LR': 10.0
            }[monster.rarity] || 1.0;

            const baseExp = (50 + (caughtLevel * 15)) * rarityMult;
            
            let hpPercent = currentHp / maxHp;
            if (hpPercent < 0) hpPercent = 0;
            if (hpPercent > 1) hpPercent = 1;
            
            expGain = Math.floor(baseExp * (1 - hpPercent));
            
            if (expGain > 0) {
                expResult = await Monster.addExp(activeMonster.id, expGain);
                // Player gets 20% of catch EXP (reward for catching)
                const playerExpGain = Math.floor(expGain * 0.2);
                await Monster.addPlayerExp(userId, playerExpGain);
                
                res.json({ 
                    message: 'Monster caught successfully!', 
                    id: newId,
                    expGain: expGain,
                    playerExpGain: playerExpGain,
                    expResult: expResult
                });
                return;
            }
        }

        res.json({ 
            message: 'Monster caught successfully!', 
            id: newId,
            expGain: expGain,
            playerExpGain: 0,
            expResult: expResult
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.claimStarterPack = async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Check if user already has monsters
        const existingMonsters = await Monster.findByUserId(userId);
        if (existingMonsters.length > 0) {
            return res.status(400).json({ message: 'User already has monsters' });
        }

        // Get random N rarity monster
        const starter = await Monster.findRandom('N');
        if (!starter) {
             return res.status(500).json({ message: 'No starter monsters available' });
        }

        // Calculate stats for Level 1
        const stats = Monster.calculateStats(starter, 1, 'N');

        // Add to user collection (Level 1, Full HP)
        const newId = await Monster.catchMonster(userId, starter.id, starter.name, 1, stats.max_hp);
        
        // Set as active
        await Monster.setActive(userId, newId);

        res.json({ message: 'Starter pack claimed!', monster: starter });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.equipMonster = async (req, res) => {
    try {
        const { userId, userMonsterId } = req.body;
        await Monster.setActive(userId, userMonsterId);
        res.json({ message: 'Monster equipped successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getActiveMonster = async (req, res) => {
    try {
        const userId = req.params.userId;
        const monster = await Monster.findActiveByUserId(userId);
        res.json(monster || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.winBattle = async (req, res) => {
    try {
        const { userId, userMonsterId, enemyLevel, enemyRarity, remainingHp } = req.body;

        // Calculate EXP for Monster
        const rarityMult = {
            'N': 1.0, 'R': 1.5, 'SR': 2.0, 'SSR': 3.0, 'UR': 5.0, 'LR': 10.0
        }[enemyRarity] || 1.0;

        const expGain = Math.floor((50 + (enemyLevel * 15)) * rarityMult);
        const monsterResult = await Monster.addExp(userMonsterId, expGain, remainingHp);

        // --- PLAYER EXP ---
        // Player gets 10% of monster EXP
        const playerExpGain = Math.max(5, Math.floor(expGain * 0.1));
        console.log(`Awarding Player EXP: ${playerExpGain} to User ${userId}`);
        const playerResult = await Monster.addPlayerExp(userId, playerExpGain);

        res.json({
            message: 'Victory!',
            expGain: expGain,
            playerExpGain: playerExpGain,
            monster: monsterResult,
            player: playerResult
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateHp = async (req, res) => {
    try {
        const { userMonsterId, hp } = req.body;
        await Monster.updateHp(userMonsterId, hp);
        res.json({ message: 'HP Updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.releaseMonster = async (req, res) => {
    try {
        const { userId, userMonsterId } = req.body;
        
        // Check if it's the active monster
        const active = await Monster.findActiveByUserId(userId);
        if (active && active.id == userMonsterId) {
            return res.status(400).json({ message: 'Cannot release an active monster! Equip another one first.' });
        }

        const success = await Monster.releaseMonster(userMonsterId, userId);
        if (success) {
            res.json({ message: 'Monster released into the wild.' });
        } else {
            res.status(404).json({ message: 'Monster not found.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};
