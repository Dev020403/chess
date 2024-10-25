const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    games: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }]
});

module.exports = mongoose.model('User', userSchema);
