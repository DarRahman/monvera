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

exports.getRandomMonster = async (req, res) => {
    try {
        const rarity = req.query.rarity; // Get rarity from query param
        const monster = await Monster.findRandom(rarity);
        
        if (!monster) {
            return res.status(404).json({ message: 'No monsters found in database' });
        }

        // Random Level 1-5
        const level = Math.floor(Math.random() * 5) + 1;

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

            const baseExp = (20 + (caughtLevel * 10)) * rarityMult;
            
            let hpPercent = currentHp / maxHp;
            if (hpPercent < 0) hpPercent = 0;
            if (hpPercent > 1) hpPercent = 1;
            
            expGain = Math.floor(baseExp * (1 - hpPercent));
            
            if (expGain > 0) {
                expResult = await Monster.addExp(activeMonster.id, expGain);
            }
        }

        res.json({ 
            message: 'Monster caught successfully!', 
            id: newId,
            expGain: expGain,
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

        // Calculate EXP
        // Base EXP = 20
        // Level Factor = Enemy Level * 10
        // Rarity Factor = N:1, R:1.5, etc.
        const rarityMult = {
            'N': 1.0, 'R': 1.5, 'SR': 2.0, 'SSR': 3.0, 'UR': 5.0, 'LR': 10.0
        }[enemyRarity] || 1.0;

        const expGain = Math.floor((20 + (enemyLevel * 10)) * rarityMult);

        const result = await Monster.addExp(userMonsterId, expGain, remainingHp);

        res.json({
            message: 'Victory!',
            expGain: expGain,
            ...result
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
