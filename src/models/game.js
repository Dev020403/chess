// models/game.js
const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    gameId: {
        type: String,
        required: true,
        unique: true
    },
    whitePlayer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    blackPlayer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'abandoned'],
        default: 'pending'
    },
    fen: {
        type: String,
        default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    },
    inviteLink: {
        type: String,
        required: true
    },
    result: {
        type: String,
        enum: ['white', 'black', 'draw', null],
        default: null
    },
    lastMovedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    moveHistory: {
        type: [String],
        default: []
    },
    drawOffer: {
        offeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        offeredAt: {
            type: Date,
            default: null
        }
    }
});

module.exports = mongoose.model('Game', gameSchema);
