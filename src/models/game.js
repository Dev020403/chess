const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    gameId: {
        type: Number,
        required: true,
        unique: true,
    },
    player1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    player2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    moves: [{
        from: String,
        to: String,
        san: String,
        timestamp: { type: Date, default: Date.now }
    }],
    status: {
        type: String,
        enum: ['pending', 'active', 'completed'],
        default: 'pending'
    },
    result: {
        type: String,
        enum: ['ongoing', 'draw', 'white_wins', 'black_wins'],
        default: 'ongoing'
    },
    inviteLink: {
        type: String,
        unique: true,
        sparse: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastMovedAt: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model('Game', gameSchema);