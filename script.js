const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const nextCanvas = document.getElementById('nextPiece');
const nextContext = nextCanvas.getContext('2d');
nextContext.scale(20, 20);

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playStoneSound() {
  try {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (e) {}
}

// mp3 effect of vibration stuff
function playSeismicSenseSound() {
  try {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(15, audioCtx.currentTime + 1.2);

    gain.gain.setValueAtTime(0.7, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
  } catch (e) {}
}

const blockStyles = [
  null,
  ['#2d6a4f', '#52b788', '#1b4332'],
  ['#7f5539', '#52796f', '#582f0e'],
  ['#6c757d', '#adb5bd', '#495057'],
  ['#b07d62', '#ddb892', '#7f4f24'],
  ['#3d5a80', '#98c1d9', '#293241'],
  ['#588157', '#a3b18a', '#344e41'],
  ['#c9ada7', '#f2e9e4', '#9a8c98']
];

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

function createPiece(type) {
  if (type === 'T') return [[0, 0, 0], [1, 1, 1], [0, 1, 0]];
  if (type === 'O') return [[2, 2], [2, 2]];
  if (type === 'L') return [[0, 3, 0], [0, 3, 0], [0, 3, 3]];
  if (type === 'J') return [[0, 4, 0], [0, 4, 0], [4, 4, 0]];
  if (type === 'I') return [[0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0]];
  if (type === 'S') return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
  if (type === 'Z') return [[7, 7, 0], [0, 7, 7], [0, 0, 0]];
}

function drawBlock(ctx, x, y, value) {
  const [main, top, shadow] = blockStyles[value];
  ctx.fillStyle = main;
  ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = top;
  ctx.fillRect(x, y, 1, 0.22);
  ctx.fillStyle = shadow;
  ctx.fillRect(x, y + 0.82, 1, 0.18);
  ctx.fillRect(x + 0.85, y, 0.15, 1);
  ctx.strokeStyle = 'rgba(11, 16, 14, 0.65)';
  ctx.lineWidth = 0.06;
  ctx.strokeRect(x, y, 1, 1);
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        drawBlock(context, x + offset.x, y + offset.y, value);
      }
    });
  });
}

function drawNextPiece() {
  nextContext.fillStyle = '#0b100e';
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (player.nextMatrix) {
    const matrix = player.nextMatrix;
    const offsetX = (4 - matrix[0].length) / 2;
    const offsetY = (4 - matrix.length) / 2;

    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          drawBlock(nextContext, x + offsetX, y + offsetY, value);
        }
      });
    });
  }
}

function draw() {
  context.fillStyle = '#0b100e';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = 'rgba(116, 198, 157, 0.04)';
  context.lineWidth = 0.05;
  for (let x = 0; x < 12; x++) {
    for (let y = 0; y < 20; y++) {
      context.strokeRect(x, y, 1, 1);
    }
  }

  drawMatrix(arena, {x: 0, y: 0});
  drawMatrix(player.matrix, player.pos);
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
    });
  });
}

function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) matrix.forEach(row => row.reverse());
  else matrix.reverse();
}

let lastSeismicThreshold = 0;

function addScore(points) {
  player.score += points;

  const currentThreshold = Math.floor(player.score / 1000);
  if (currentThreshold > lastSeismicThreshold) {
    lastSeismicThreshold = currentThreshold;
    triggerSeismicSense();
  }

  updateScore();
}

function triggerSeismicSense() {
  playSeismicSenseSound();
  const overlay = document.getElementById('seismicOverlay');
  overlay.classList.remove('seismic-active');
  void overlay.offsetWidth;
  overlay.classList.add('seismic-active');
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playStoneSound();
    playerReset();
    arenaSweep();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) player.pos.x -= dir;
}

function getRandomPiece() {
  const pieces = 'ILJOTSZ';
  return createPiece(pieces[pieces.length * Math.random() | 0]);
}

function playerReset() {
  if (!player.nextMatrix) {
    player.matrix = getRandomPiece();
  } else {
    player.matrix = player.nextMatrix;
  }
  player.nextMatrix = getRandomPiece();
  drawNextPiece();

  player.pos.y = 0;
  player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
  
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    lastSeismicThreshold = 0;
    updateScore();
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

function arenaSweep() {
  let rowCount = 1;
  outer: for (let y = arena.length - 1; y > 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    addScore(rowCount * 100);
    rowCount *= 2;
  }
}

function updateScore() {
  document.getElementById('score').innerText = player.score;
}

let dropCounter = 0;
let dropInterval = 1150;
let lastTime = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) playerDrop();
  draw();
  requestAnimationFrame(update);
}

const arena = createMatrix(12, 20);
const player = { pos: {x: 0, y: 0}, matrix: null, nextMatrix: null, score: 0 };

document.addEventListener('keydown', event => {
  if (event.code === 'ArrowLeft') playerMove(-1);
  else if (event.code === 'ArrowRight') playerMove(1);
  else if (event.code === 'ArrowDown') playerDrop();
  else if (event.code === 'KeyQ') playerRotate(-1);
  else if (event.code === 'KeyE') playerRotate(1);
});

playerReset();
updateScore();
update();
