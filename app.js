const express = require('express');
const connectDB = require('./config/database');
const app = express();
const http = require('http');
const dotenv = require('dotenv');
const userRoutes = require('./src/routes/userRoutes');
const gameRoutes = require('./src/routes/gameRoutes');

dotenv.config();
const server = http.createServer(app);

// db connect
connectDB();

// Middleware
app.use(express.json());

// Use user routes under /api/auth
app.use("/api/auth", userRoutes); 
app.use("/api/game", gameRoutes);

// Server listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = server;
