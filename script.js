const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextContext = nextCanvas.getContext("2d");

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");

const startButton = document.getElementById("start");
const pauseButton = document.getElementById("pause");
const resetButton = document.getElementById("reset");

const cols = 10;
const rows = 20;
const blockSize = 30;
const colors = [
  null,
  "#59d8ff",
  "#7c5cff",
  "#f0b429",
  "#ff7ab6",
  "#68e38f",
  "#ff9248",
  "#f45d48",
];

canvas.width = cols * blockSize;
canvas.height = rows * blockSize;
context.scale(blockSize, blockSize);
nextContext.scale(30, 30);

const arena = createMatrix(cols, rows);
let lastTime = 0;
let dropCounter = 0;
let dropInterval = 1000;
let paused = true;

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
  lines: 0,
  level: 1,
  next: null,
};

function createMatrix(width, height) {
  const matrix = [];
  while (height--) {
    matrix.push(new Array(width).fill(0));
  }
  return matrix;
}

function createPiece(type) {
  switch (type) {
    case "T":
      return [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ];
    case "O":
      return [
        [2, 2],
        [2, 2],
      ];
    case "L":
      return [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3],
      ];
    case "J":
      return [
        [0, 4, 0],
        [0, 4, 0],
        [4, 4, 0],
      ];
    case "I":
      return [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
      ];
    case "S":
      return [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0],
      ];
    case "Z":
      return [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
      ];
    default:
      return [[1]];
  }
}

function drawMatrix(matrix, offset, ctx) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = colors[value];
        ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function draw() {
  context.fillStyle = "#0b0d12";
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(arena, { x: 0, y: 0 }, context);
  drawMatrix(player.matrix, player.pos, context);

  nextContext.fillStyle = "#0b0d12";
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (player.next) {
    const offset = {
      x: Math.floor((4 - player.next[0].length) / 2),
      y: Math.floor((4 - player.next.length) / 2),
    };
    drawMatrix(player.next, offset, nextContext);
  }
}

function collide(arenaMatrix, playerObj) {
  const [m, o] = [playerObj.matrix, playerObj.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arenaMatrix[y + o.y] && arenaMatrix[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function merge(arenaMatrix, playerObj) {
  playerObj.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arenaMatrix[y + playerObj.pos.y][x + playerObj.pos.x] = value;
      }
    });
  });
}

function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }

    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    rowCount += 1;
  }

  if (rowCount > 0) {
    const lineScores = [0, 40, 100, 300, 1200];
    player.score += lineScores[rowCount] * player.level;
    player.lines += rowCount;
    if (player.lines >= player.level * 10) {
      player.level += 1;
      dropInterval = Math.max(150, dropInterval - 100);
    }
  }
}

function playerReset() {
  const pieces = "TJLOSZI";
  if (!player.next) {
    player.next = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);
  }

  player.matrix = player.next;
  player.next = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);
  player.pos.y = 0;
  player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  if (collide(arena, player)) {
    arena.forEach((row) => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 1;
    dropInterval = 1000;
    paused = true;
  }
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    playerReset();
    updateScore();
  }
  dropCounter = 0;
}

function hardDrop() {
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  arenaSweep();
  playerReset();
  updateScore();
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }

  if (dir > 0) {
    matrix.forEach((row) => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function updateScore() {
  scoreEl.textContent = player.score;
  linesEl.textContent = player.lines;
  levelEl.textContent = player.level;
}

function update(time = 0) {
  if (!paused) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
      playerDrop();
    }
  } else {
    lastTime = time;
  }

  draw();
  requestAnimationFrame(update);
}

function togglePause() {
  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";
}

document.addEventListener("keydown", (event) => {
  if (event.code === "ArrowLeft") {
    playerMove(-1);
  } else if (event.code === "ArrowRight") {
    playerMove(1);
  } else if (event.code === "ArrowDown") {
    playerDrop();
  } else if (event.code === "ArrowUp") {
    playerRotate(1);
  } else if (event.code === "Space") {
    hardDrop();
  } else if (event.code === "KeyP") {
    togglePause();
  }
});

startButton.addEventListener("click", () => {
  if (paused) {
    paused = false;
    pauseButton.textContent = "Pause";
  }
});

pauseButton.addEventListener("click", () => {
  togglePause();
});

resetButton.addEventListener("click", () => {
  arena.forEach((row) => row.fill(0));
  player.score = 0;
  player.lines = 0;
  player.level = 1;
  dropInterval = 1000;
  playerReset();
  updateScore();
  paused = true;
  pauseButton.textContent = "Pause";
});

playerReset();
updateScore();
update();
