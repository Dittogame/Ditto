const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Simple word bank
const words = ['apple', 'banana', 'cherry', 'dragon', 'elephant'];
let currentWord = '';
let players = {};

// Serve static files (client-side)
app.use(express.static('public'));

// Choose a random word
function getRandomWord() {
    return words[Math.floor(Math.random() * words.length)];
}

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Add new player
    players[socket.id] = { score: 0 };
    
    // Send current word to new player (hidden)
    if (!currentWord) {
        currentWord = getRandomWord();
    }
    socket.emit('gameState', {
        word: currentWord.split('').map(() => '_').join(' '),
        players: players
    });

    // Broadcast new player to all
    io.emit('playerUpdate', players);

    // Handle guess
    socket.on('guess', (guess) => {
        guess = guess.toLowerCase().trim();
        const response = {
            correct: false,
            word: currentWord.split('').map(() => '_').join(' ')
        };

        if (guess === currentWord) {
            response.correct = true;
            players[socket.id].score += 10;
            currentWord = getRandomWord();
            response.word = currentWord.split('').map(() => '_').join(' ');
        }

        // Broadcast to all players
        io.emit('guessResult', {
            playerId: socket.id,
            guess: guess,
            response: response,
            players: players
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerUpdate', players);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
