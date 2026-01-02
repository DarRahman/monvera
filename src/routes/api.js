const express = require('express');
const router = express.Router();
const monsterController = require('../controllers/monsterController');

// Route untuk mendapatkan semua monster (untuk Admin atau Pokedex)
router.get('/monsters', monsterController.getAllMonsters);

// Route untuk mendapatkan 1 monster acak (untuk encounter)
router.get('/monsters/random', monsterController.getRandomMonster);

// Route untuk menangkap monster (Simpan ke user_monsters)
router.post('/catch', monsterController.catchMonster);

// Route untuk claim starter pack
router.post('/starter', monsterController.claimStarterPack);

// Route untuk equip monster
router.post('/equip', monsterController.equipMonster);

// Route untuk battle win (EXP)
router.post('/battle/win', monsterController.winBattle);

// Route untuk update HP (Run/Catch)
router.post('/monster/hp', monsterController.updateHp);

// Route untuk mendapatkan monster aktif
router.get('/my-monsters/active/:userId', monsterController.getActiveMonster);

// Route untuk mendapatkan monster milik player tertentu
router.get('/my-monsters/:userId', monsterController.getPlayerMonsters);

module.exports = router;
