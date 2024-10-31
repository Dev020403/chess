const { io } = require('./app'); // Import your server instance

io.on('connection', (socket) => {
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
});
