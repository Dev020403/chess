const express = require('express');
const connectDB = require('./config/database');
const app = express();
const http = require('http');
const dotenv = require('dotenv');
dotenv.config();
const server = http.createServer(app);

//db connect
connectDB();

// Middleware
app.use(express.json());

// Server listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = server;
