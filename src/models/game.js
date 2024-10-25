const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    gameId: {
        type: Number,
        required: true,
        unique: true,
    },
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moves: [{ from: String, to: String, san: String }],
    result: { type: String, enum: ['ongoing', 'draw', 'white_wins', 'black_wins'], default: 'ongoing' }
})