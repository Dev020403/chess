const { v4: uuidv4 } = require('uuid');
const Game = require('../models/game');
const { Chess } = require('chess.js');

// Helper functions
const helpers = {
    async findGame(gameId) {
        const game = await Game.findOne({ gameId });
        if (!game) {
            throw { status: 404, message: 'Game not found' };
        }
        return game;
    },

    verifyActiveGame(game) {
        if (game.status !== 'active') {
            throw { status: 400, message: 'Game is not active' };
        }
    },

    verifyPlayer(playerId, game) {
        if (!playerId) {
            throw { status: 400, message: 'Player ID is required' };
        }

        const isWhitePlayer = game.whitePlayer?.toString() === playerId;
        const isBlackPlayer = game.blackPlayer?.toString() === playerId;

        if (!isWhitePlayer && !isBlackPlayer) {
            throw { status: 403, message: 'Player is not part of this game' };
        }

        return { isWhitePlayer, isBlackPlayer };
    },

    async handleError(error, res, operation) {
        console.error(`${operation} error:`, error);
        return res.status(error.status || 500).json({
            error: error.message || `Failed to ${operation}`,
            details: error.details || error.message
        });
    }
};

const gameController = {
    createGame: async (req, res) => {
        try {
            const { playerId } = req.body;
            if (!playerId) {
                throw { status: 400, message: 'Player ID is required' };
            }

            const gameId = uuidv4();
            const inviteLink = `${process.env.CLIENT_URL}/game/join/${gameId}`;
            const isWhite = Math.random() < 0.5;

            const newGame = await Game.create({
                gameId,
                whitePlayer: isWhite ? playerId : null,
                blackPlayer: !isWhite ? playerId : null,
                inviteLink,
                status: 'pending'
            });

            return res.status(201).json({
                message: 'Game created successfully',
                game: newGame,
                inviteLink
            });
        } catch (error) {
            return helpers.handleError(error, res, 'create game');
        }
    },

    joinGame: async (req, res) => {
        try {
            const { gameId } = req.params;
            const { playerId } = req.body;
            const io = req.io; // Access io from request object

            const game = await helpers.findGame(gameId);

            if (game.status !== 'pending') {
                throw { status: 400, message: 'Game is no longer available' };
            }

            if (game.whitePlayer?.toString() === playerId) {
                throw { status: 400, message: 'Cannot join your own game' };
            }

            if (game.whitePlayer && game.blackPlayer) {
                throw { status: 400, message: 'Game already has two players' };
            }

            if (!game.whitePlayer) {
                game.whitePlayer = playerId;
            } else {
                game.blackPlayer = playerId;
            }

            game.status = 'active';
            game.lastMovedAt = new Date();
            await game.save();

            io.to(gameId).emit('gameStarted', {
                game: {
                    ...game._doc,
                    assignedColor: game.whitePlayer === playerId ? 'white' : 'black'
                },
                joinedPlayer: {
                    id: playerId,
                    color: game.whitePlayer === playerId ? 'white' : 'black'
                }
            });

            return res.status(200).json({
                message: 'Game joined successfully',
                game: {
                    ...game._doc,
                    assignedColor: game.whitePlayer === playerId ? 'white' : 'black'
                }
            });
        } catch (error) {
            return helpers.handleError(error, res, 'join game');
        }
    },

    getGame: async (req, res) => {
        try {
            const { gameId } = req.params;
            const game = await Game.findOne({ gameId })
                .populate('whitePlayer', 'username')
                .populate('blackPlayer', 'username');

            if (!game) {
                throw { status: 404, message: 'Game not found' };
            }

            const chess = new Chess(game.fen);
            return res.status(200).json({
                game,
                boardState: chess.board()
            });
        } catch (error) {
            return helpers.handleError(error, res, 'get game');
        }
    },

    makeMove: async (req, res) => {
        try {
            const { gameId } = req.params;
            const { from, to, promotion } = req.body;

            const game = await helpers.findGame(gameId);
            helpers.verifyActiveGame(game);

            const chess = new Chess(game.fen);
            const move = chess.move({ from, to, promotion });

            if (!move) {
                throw { status: 400, message: 'Invalid move' };
            }

            game.fen = chess.fen();
            game.lastMovedAt = new Date();
            game.moveHistory.push(move.san);
            game.drawOffer = null;

            if (chess.isCheckmate()) {
                game.status = 'completed';
                game.result = chess.turn() === 'w' ? 'black' : 'white';
            } else if (chess.isStalemate() || chess.isDraw()) {
                game.status = 'completed';
                game.result = 'draw';
            }

            await game.save();

            // Emit the move to all players in the game room
            req.io.to(gameId).emit('moveMade', {
                message: 'Move made successfully',
                game,
                boardState: chess.board()
            });

            return res.status(200).json({
                message: 'Move made successfully',
                game,
                boardState: chess.board()
            });
        } catch (error) {
            return helpers.handleError(error, res, 'make move');
        }
    },
    resignGame: async (req, res) => {
        try {
            const { gameId } = req.params;
            const { playerId } = req.body;

            const game = await helpers.findGame(gameId);
            helpers.verifyActiveGame(game);
            const { isWhitePlayer } = helpers.verifyPlayer(playerId, game);

            game.status = 'completed';
            game.result = isWhitePlayer ? 'black' : 'white';
            await game.save();

            // Emit game resigned event
            req.io.to(gameId).emit('gameResigned', {
                game,
                resignedBy: playerId,
                winner: isWhitePlayer ? 'black' : 'white'
            });

            return res.status(200).json({
                message: 'Game resigned successfully',
                game
            });
        } catch (error) {
            return helpers.handleError(error, res, 'resign game');
        }
    },

    offerDraw: async (req, res) => {
        try {
            const { gameId } = req.params;
            const { playerId } = req.body;

            const game = await helpers.findGame(gameId);
            helpers.verifyActiveGame(game);
            helpers.verifyPlayer(playerId, game);

            if (game.drawOffer?.offeredBy) {
                throw { status: 400, message: 'There is already a pending draw offer' };
            }

            game.drawOffer = {
                offeredBy: playerId,
                offeredAt: new Date()
            };
            await game.save();

            // Emit draw offer event
            req.io.to(gameId).emit('drawOffered', {
                game,
                offeredBy: playerId
            });

            return res.status(200).json({
                message: 'Draw offered successfully',
                game
            });
        } catch (error) {
            return helpers.handleError(error, res, 'offer draw');
        }
    },

    respondToDrawOffer: async (req, res) => {
        try {
            const { gameId } = req.params;
            const { playerId, accept } = req.body;

            const game = await helpers.findGame(gameId);
            helpers.verifyActiveGame(game);
            helpers.verifyPlayer(playerId, game);

            if (!game.drawOffer?.offeredBy) {
                throw { status: 400, message: 'No pending draw offer' };
            }

            if (game.drawOffer.offeredBy.toString() === playerId) {
                throw { status: 400, message: 'Cannot respond to your own draw offer' };
            }

            if (accept) {
                game.status = 'completed';
                game.result = 'draw';
            }
            game.drawOffer = null;
            await game.save();

            // Emit draw response event
            req.io.to(gameId).emit('drawResponse', {
                game,
                respondedBy: playerId,
                accepted: accept
            });

            return res.status(200).json({
                message: accept ? 'Draw accepted' : 'Draw declined',
                game
            });
        } catch (error) {
            return helpers.handleError(error, res, 'respond to draw offer');
        }
    }
};

module.exports = gameController;