const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

router.post('/create', gameController.createGame);
router.post('/join/:gameId', gameController.joinGame);
router.get('/:gameId', gameController.getGame);
router.post('/:gameId/move', gameController.makeMove);

module.exports = router;