const { v4: uuidv4 } = require('uuid');
const Game = require('../models/game');
const { Chess } = require('chess.js');
const { off } = require('process');

const gameController = {
    // Create a new game
    createGame: async (req, res) => {
        try {
            const { playerId } = req.body;

            // Generate unique game ID and invite link
            const gameId = uuidv4();
            const inviteLink = `${process.env.CLIENT_URL}/game/join/${gameId}`;

            // Randomly assign player to white or black
            const isWhite = Math.random() < 0.5;
            const newGame = await Game.create({
                gameId,
                whitePlayer: isWhite ? playerId : null,
                blackPlayer: !isWhite ? playerId : null,
                inviteLink,
                status: 'pending'
            });

            // Return game details
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
            // Step 1: Get gameId and playerId from req.params and req.body
            const { gameId } = req.params;
            const { playerId } = req.body;
    
            // Step 2: Find the game
            const game = await Game.findOne({ gameId });
    
            // Step 3: Validate game exists and is joinable
            if (!game) {
                return res.status(404).json({ error: 'Game not found' });
            }
    
            // Step 4: Check if game is pending
            if (game.status !== 'pending') {
                return res.status(400).json({ error: 'Game is no longer available' });
            }
    
            // Step 5: Check if player is already in the game
            if (game.whitePlayer && game.whitePlayer.toString() === playerId) {
                return res.status(400).json({ error: 'Cannot join your own game' });
            }
    
            // Step 6: Check if both players are assigned
            if (game.whitePlayer && game.blackPlayer) {
                return res.status(400).json({ error: 'Game already has two players' });
            }
    
            // Step 7: Assign player to white or black
            if (!game.whitePlayer) {
                game.whitePlayer = playerId;  // Assign to white if no white player
            } else {
                game.blackPlayer = playerId;  // Assign to black if white is already assigned
            }
    
            // Step 8: Activate game and update last moved time
            game.status = 'active';
            game.lastMovedAt = new Date();
            await game.save();
    
            // Step 9: Return game details with assigned roles
            return res.status(200).json({
                message: 'Game joined successfully',
                game: {
                    ...game._doc,  // Spread operator to return game details
                    assignedColor: !game.whitePlayer ? 'white' : 'black'  // Indicate assigned color
                }
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
    },
    makeMove: async (req, res) => {
        try {
            const { gameId } = req.params;
            const { from, to, promotion } = req.body;

            const game = await Game.findOne({ gameId });
            if (!game) {
                return res.status(404).json({ error: 'Game not found' });
            }

            if (game.status !== 'active') {
                return res.status(400).json({ error: 'Game is not active. Cannot make a move.' });
            }

            const chess = new Chess(game.fen);
            const move = chess.move({ from, to, promotion });

            if (!move) {
                return res.status(400).json({ error: 'Invalid move' });
            }

            game.fen = chess.fen();
            game.lastMovedAt = new Date();
            game.moveHistory.push(move.san);

            if (chess.isCheckmate()) {
                game.status = 'completed';
                game.result = chess.turn() === 'w' ? 'black' : 'white';
            } else if (chess.isStalemate() || chess.isDraw()) {
                game.status = 'completed';
                game.result = 'draw';
            }

            await game.save();

            return res.status(200).json({
                message: 'Move made successfully',
                game,
                boardState: chess.board()
            });
        } catch (error) {
            console.error('Make move error:', error);
            return res.status(500).json({
                error: 'Failed to make move',
                details: error.message
            });
        }
    },

    // Resign from a game
    resignGame: async (req, res) => {
        try {
            const { gameId } = req.params;
            const { playerId } = req.body;
            if (!playerId) {
                return res.status(400).json({ error: 'Player ID is required' });
            }
            // Step 1: Find the game
            const game = await Game.findOne({ gameId });
            if (!game) {
                return res.status(404).json({ error: 'Game not found' });
            }

            // Step 2: Check if the game status is active
            if (game.status !== 'active') {
                return res.status(400).json({ error: 'Game is not active. Cannot resign.' });
            }

            // Step 3: Determine the winner based on the resigning player
            game.status = 'completed';
            game.result = game.whitePlayer.toString() === playerId ? 'black' : 'white';  // Winner is the opposing color

            // Step 4: Save the updated game state
            await game.save();

            // Step 5: Return the updated game state
            return res.status(200).json({
                message: 'Game resigned successfully',
                game
            });
        } catch (error) {
            console.error('Resign game error:', error);
            return res.status(500).json({
                error: 'Failed to resign game',
                details: error.message
            });
        }
    }
};
module.exports = gameController;