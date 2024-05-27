const socket = io();

const homeScreen = document.getElementById('homeScreen');
const gameScreen = document.getElementById('gameScreen');
const status = document.getElementById('status');
const roomsList = document.getElementById('roomsList');
const createRoomBtn = document.getElementById('createRoomBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const downBtn = document.getElementById('downBtn');
const rotateBtn = document.getElementById('rotateBtn');

createRoomBtn.addEventListener('click', () => {
  const roomName = prompt('Enter room name:');
  if (roomName) {
    socket.emit('createRoom', roomName);
  }
});

socket.on('updateRooms', (rooms) => {
  roomsList.innerHTML = '';
  for (const roomName in rooms) {
    const roomElement = document.createElement('div');
    roomElement.textContent = roomName;
    const joinButton = document.createElement('button');
    joinButton.textContent = 'Join';
    joinButton.addEventListener('click', () => {
      socket.emit('joinRoom', roomName);
    });
    roomElement.appendChild(joinButton);
    roomsList.appendChild(roomElement);
  }
});

socket.on('roomExists', () => {
  alert('Room name already exists. Please choose another name.');
});

socket.on('roomFull', () => {
  alert('Room is full. Please choose another room.');
});

socket.on('playerJoined', (numPlayers) => {
  if (numPlayers === 2) {
    status.textContent = 'Both players joined. Game starting soon...';
  }
});

socket.on('startCountdown', () => {
  let countdown = 5;
  status.textContent = `Game starting in ${countdown}...`;
  const interval = setInterval(() => {
    countdown--;
    status.textContent = `Game starting in ${countdown}...`;
    if (countdown === 0) {
      clearInterval(interval);
    }
  }, 1000);
});

socket.on('startGame', (blocks) => {
  homeScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  startTetris(blocks);
});

socket.on('gameOver', (result) => {
  status.textContent = result === 'win' ? 'You Win!' : 'You Lose!';
  setTimeout(() => {
    socket.emit('restartGame');
  }, 3000);
});

socket.on('restartGame', (blocks) => {
  startTetris(blocks);
});

socket.on('playerDisconnected', () => {
  alert('The other player disconnected. Returning to home screen.');
  homeScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
});

leftBtn.addEventListener('click', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
});

rightBtn.addEventListener('click', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
});

downBtn.addEventListener('click', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
});

rotateBtn.addEventListener('click', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
});
