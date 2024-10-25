const { v4: uuidv4 } = require('uuid');
const Game = require('../models/game');
const { Chess } = require('chess.js');

const gameController = {
    // Create a new game
    createGame: async (req, res) => {
        try {
            //step 1 : get playerId from req.body
            const { playerId } = req.body;

            //step 2 : Generate unique game ID and invite link
            const gameId = uuidv4();
            const inviteLink = `${process.env.CLIENT_URL}/game/join/${gameId}`;

            //step 3 : Create new game instance
            const newGame = await Game.create({
                gameId,
                whitePlayer: playerId,
                inviteLink,
                status: 'pending'
            });
            //step 4 : Return game details
            return res.status(201).json({
                message: 'Game created successfully',
                game: newGame,
                inviteLink
            });
        } catch (error) {
            console.error('Create game error:', error);
            return res.status(500).json({
                error: 'Failed to create game',
                details: error.message
            });
        }
    },

    // Join an existing game
    joinGame: async (req, res) => {
        try {
            //step 1 : get gameId and playerId from req.params and req.body
            const { gameId } = req.params;
            const { playerId } = req.body;

            //step 2 : Find the game
            const game = await Game.findOne({ gameId });

            //step 3 : Validate game exists and is joinable
            if (!game) {
                return res.status(404).json({ error: 'Game not found' });
            }

            // step 4 : Check if game is pending
            if (game.status !== 'pending') {
                return res.status(400).json({ error: 'Game is no longer available' });
            }

            // step 5 : Check if player is already in the game
            if (game.whitePlayer.toString() === playerId) {
                return res.status(400).json({ error: 'Cannot join your own game' });
            }

            //step 6 : Update game with black player and activate it
            game.blackPlayer = playerId;
            game.status = 'active';
            game.lastMovedAt = new Date();
            await game.save();

            //step 7 : Return game details
            return res.status(200).json({
                message: 'Game joined successfully',
                game
            });
        } catch (error) {
            console.error('Join game error:', error);
            return res.status(500).json({
                error: 'Failed to join game',
                details: error.message
            });
        }
    },

    // Get game details
    getGame: async (req, res) => {
        try {
            const { gameId } = req.params;

            const game = await Game.findOne({ gameId })
                .populate('whitePlayer', 'username')
                .populate('blackPlayer', 'username');

            if (!game) {
                return res.status(404).json({ error: 'Game not found' });
            }

            // Ensure you're using the correct constructor for Chess
            const chess = new Chess(game.fen);  // Create a new Chess instance
            return res.status(200).json({
                game,
                boardState: chess.board()  // Get the current board state
            });
        } catch (error) {
            console.error('Get game error:', error);
            return res.status(500).json({
                error: 'Failed to retrieve game',
                details: error.message
            });
        }
    }

};
module.exports = gameController;