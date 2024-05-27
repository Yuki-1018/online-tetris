function startTetris(blocks) {
  const player1Canvas = document.getElementById('player1Canvas');
  const player2Canvas = document.getElementById('player2Canvas');
  const player1Context = player1Canvas.getContext('2d');
  const player2Context = player2Canvas.getContext('2d');
  const rows = 20;
  const cols = 10;
  const blockSize = 30;
  const colors = {
    'I': 'cyan',
    'J': 'blue',
    'L': 'orange',
    'O': 'yellow',
    'S': 'green',
    'T': 'purple',
    'Z': 'red'
  };

  let player1Board = Array.from({ length: rows }, () => Array(cols).fill(null));
  let player2Board = Array.from({ length: rows }, () => Array(cols).fill(null));
  let currentBlock = null;
  let gameOver = false;

  function drawBoard(context, board) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c]) {
          context.fillStyle = colors[board[r][c]];
          context.fillRect(c * blockSize, r * blockSize, blockSize, blockSize);
        }
      }
    }
  }

  function drawPlayerBoards() {
    drawBoard(player1Context, player1Board);
    drawBoard(player2Context, player2Board);
    if (currentBlock) {
      currentBlock.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            player1Context.fillStyle = colors[currentBlock.type];
            player1Context.fillRect((currentBlock.x + x) * blockSize, (currentBlock.y + y) * blockSize, blockSize, blockSize);
          }
        });
      });
    }
  }

  function generateBlock(type) {
    const shapes = {
      'I': [[1, 1, 1, 1]],
      'J': [[1, 0, 0], [1, 1, 1]],
      'L': [[0, 0, 1], [1, 1, 1]],
      'O': [[1, 1], [1, 1]],
      'S': [[0, 1, 1], [1, 1, 0]],
      'T': [[0, 1, 0], [1, 1, 1]],
      'Z': [[1, 1, 0], [0, 1, 1]]
    };
    return {
      type,
      shape: shapes[type],
      x: Math.floor(cols / 2) - Math.ceil(shapes[type][0].length / 2),
      y: 0
    };
  }

  function moveBlock(dx, dy) {
    if (!currentBlock) return;
    const newX = currentBlock.x + dx;
    const newY = currentBlock.y + dy;
    if (!collision(newX, newY, currentBlock.shape)) {
      currentBlock.x = newX;
      currentBlock.y = newY;
      drawPlayerBoards();
    } else if (dy > 0) {
      placeBlock();
      checkLines();
      nextBlock();
    }
  }

  function rotateBlock() {
    if (!currentBlock) return;
    const newShape = currentBlock.shape[0].map((_, index) => currentBlock.shape.map(row => row[index])).reverse();
    if (!collision(currentBlock.x, currentBlock.y, newShape)) {
      currentBlock.shape = newShape;
      drawPlayerBoards();
    }
  }

  function collision(x, y, shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = x + c;
          const newY = y + r;
          if (newX < 0 || newX >= cols || newY >= rows || (newY >= 0 && player1Board[newY][newX])) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function placeBlock() {
    if (!currentBlock) return;
    currentBlock.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value && currentBlock.y + y >= 0) {
          player1Board[currentBlock.y + y][currentBlock.x + x] = currentBlock.type;
        }
      });
    });
    if (currentBlock.y < 0) {
      gameOver = true;
      socket.emit('gameOver', 'lose');
    }
    currentBlock = null;
  }

  function checkLines() {
    for (let r = rows - 1; r >= 0; r--) {
      if (player1Board[r].every(cell => cell)) {
        for (let y = r; y > 0; y--) {
          player1Board[y] = player1Board[y - 1];
        }
        player1Board[0] = Array(cols).fill(null);
        r++;
      }
    }
  }

  function nextBlock() {
    const type = blocks.shift();
    currentBlock = generateBlock(type);
    if (collision(currentBlock.x, currentBlock.y, currentBlock.shape)) {
      gameOver = true;
      socket.emit('gameOver', 'lose');
    } else {
      drawPlayerBoards();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    switch (e.key) {
      case 'ArrowLeft':
        moveBlock(-1, 0);
        break;
      case 'ArrowRight':
        moveBlock(1, 0);
        break;
      case 'ArrowDown':
        moveBlock(0, 1);
        break;
      case 'ArrowUp':
        rotateBlock();
        break;
    }
  });

  socket.on('opponentMove', ({ block, board }) => {
    player2Board = board;
    drawBoard(player2Context, player2Board);
  });

  function updateOpponent() {
    socket.emit('playerMove', { block: currentBlock, board: player1Board });
  }

  ['keydown', 'keyup'].forEach(event => {
    document.addEventListener(event, updateOpponent);
  });

  nextBlock();
  setInterval(() => {
    if (!gameOver) {
      moveBlock(0, 1);
    }
  }, 1000);
}
