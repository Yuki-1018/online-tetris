const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let rooms = {};

async function initializeDatabase() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    )
  `);

  return db;
}

initializeDatabase().then(db => {
  io.on('connection', (socket) => {
    socket.on('createRoom', async (roomName) => {
      try {
        await db.run('INSERT INTO rooms (name) VALUES (?)', roomName);
        rooms[roomName] = [];
        io.emit('updateRooms', rooms);
      } catch (error) {
        socket.emit('roomExists');
      }
    });

    socket.on('joinRoom', (roomName) => {
      if (rooms[roomName].length < 2) {
        rooms[roomName].push(socket.id);
        socket.join(roomName);
        io.to(roomName).emit('playerJoined', rooms[roomName].length);
        if (rooms[roomName].length === 2) {
          startGame(roomName);
        }
      } else {
        socket.emit('roomFull');
      }
    });

    socket.on('gameOver', (result) => {
      const roomName = Object.keys(rooms).find(room => rooms[room].includes(socket.id));
      if (roomName) {
        const opponentId = rooms[roomName].find(id => id !== socket.id);
        io.to(opponentId).emit('gameOver', 'win');
        socket.emit('gameOver', 'lose');
        setTimeout(() => {
          startGame(roomName);
        }, 3000);
      }
    });

    socket.on('disconnect', () => {
      const roomName = Object.keys(rooms).find(room => rooms[room].includes(socket.id));
      if (roomName) {
        rooms[roomName] = rooms[roomName].filter(id => id !== socket.id);
        io.to(roomName).emit('playerDisconnected');
        if (rooms[roomName].length === 0) {
          delete rooms[roomName];
        }
        io.emit('updateRooms', rooms);
      }
    });

    socket.on('playerMove', ({ block, board }) => {
      const roomName = Object.keys(rooms).find(room => rooms[room].includes(socket.id));
      if (roomName) {
        const opponentId = rooms[roomName].find(id => id !== socket.id);
        io.to(opponentId).emit('opponentMove', { block, board });
      }
    });
  });

  function startGame(roomName) {
    const blocks = generateBlocks();
    io.to(roomName).emit('startCountdown');
    setTimeout(() => {
      io.to(roomName).emit('startGame', blocks);
    }, 5000);
  }

  function generateBlocks() {
    const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    const blocks = [];
    for (let i = 0; i < 50; i++) {
      blocks.push(types[Math.floor(Math.random() * types.length)]);
    }
    return blocks;
  }

  server.listen(3000, () => {
    console.log('Server is running on port 3000');
  });
});
