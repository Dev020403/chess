const express = require('express');
const connectDB = require('./config/database');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./src/routes/userRoutes');
const gameRoutes = require('./src/routes/gameRoutes');

dotenv.config();

// Initialize express
const app = express();

// Create HTTP server
const http = require('http');
const server = http.createServer(app);

// Initialize Socket.IO
const socketIO = require('socket.io');
const io = socketIO(server, {
    cors: {
        origin: [
            "http://localhost:3000",
            "https://chess-frontend-seven-xi.vercel.app"
        ],
        // Adjust to your frontend URL
        methods: ["GET", "POST"]
    }
});

// db connect
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO event handlers
const setupSocket = (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinGame', (gameId, playerId) => {
        socket.join(gameId);
        console.log(`Player ${playerId} joined game ${gameId} with socket ID ${socket.id}`);

        // Notify other players in the game room
        socket.to(gameId).emit('playerJoined', {
            playerId: playerId,
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
};

// Initialize Socket.IO connection
io.on('connection', setupSocket);

// Middleware to make io accessible in routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use("/api/auth", userRoutes);
app.use("/api/game", gameRoutes);

// Server listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
