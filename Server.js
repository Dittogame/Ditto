const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Simple word bank
const words = ['apple', 'banana', 'cherry', 'dragon', 'elephant'];
let currentWord = '';
let players = [];
let gameState = {
  board: Array(5).fill().map(() => Array(5).fill('')),
  scores: {},
  currentPlayer: null
};

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Choose a random word from the list
function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Add new player
  if (players.length < 2) {
    players.push(socket.id);
    gameState.scores[socket.id] = 0;
    socket.emit('playerId', socket.id);
    io.emit('players', players);

    // Start game when two players are connected
    if (players.length === 2) {
      gameState.currentPlayer = players[0];
      currentWord = getRandomWord();
      io.emit('gameStart', { word: currentWord, currentPlayer: gameState.currentPlayer });
    }
  } else {
    socket.emit('gameFull');
    socket.disconnect();
    return;
  }

  // Handle tile click
  socket.on('tileClick', (data) => {
    const { row, col, letter } = data;
    if (socket.id === gameState.currentPlayer) {
      gameState.board[row][col] = letter;
      io.emit('updateBoard', gameState.board);
    }
  });

  // Handle word submission
  socket.on('submitWord', (submittedWord) => {
    if (socket.id === gameState.currentPlayer && submittedWord === currentWord) {
      gameState.scores[socket.id] += submittedWord.length;
      io.emit('updateScores', gameState.scores);

      // Switch player
      gameState.currentPlayer = players[players.indexOf(gameState.currentPlayer) + 1] || players[0];
      currentWord = getRandomWord();
      gameState.board = Array(5).fill().map(() => Array(5).fill(''));
      io.emit('nextTurn', { word: currentWord, currentPlayer: gameState.currentPlayer, board: gameState.board });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    players = players.filter(id => id !== socket.id);
    delete gameState.scores[socket.id];
    io.emit('players', players);
    if (players.length < 2) {
      gameState.currentPlayer = null;
      io.emit('gameEnd');
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));