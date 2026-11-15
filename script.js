const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const nextCanvas = document.getElementById('nextPiece');
const nextContext = nextCanvas.getContext('2d');
nextContext.scale(20, 20);

const BEST_SCORE_KEY = 'tetsus_best_score_v1';
let audioCtx = null;
let isMuted = false;
let isPaused = false;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playStoneSound() {
  if (isMuted) return;
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

function playSeismicSenseSound() {
  if (isMuted) return;
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

function loadBestScore() {
  try {
    const saved = Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) || '0', 10);
    return Number.isFinite(saved) && saved > 0 ? saved : 0;
  } catch (e) {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(value));
  } catch (e) {}
}

function announceStatus(message) {
  const announcer = document.getElementById('statusAnnouncer');
  if (announcer) {
    announcer.textContent = message;
  }
}

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

function drawGhostMatrix(matrix, offset) {
  context.save();
  context.strokeStyle = 'rgba(149, 213, 178, 0.45)';
  context.fillStyle = 'rgba(116, 198, 157, 0.12)';
  context.lineWidth = 0.07;
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
        context.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
  context.restore();
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

function getGhostY() {
  const originalY = player.pos.y;
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  const ghostY = player.pos.y - 1;
  player.pos.y = originalY;
  return ghostY;
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

  drawMatrix(arena, { x: 0, y: 0 });
  if (player.matrix) {
    const ghostY = getGhostY();
    if (ghostY > player.pos.y) {
      drawGhostMatrix(player.matrix, { x: player.pos.x, y: ghostY });
    }
    drawMatrix(player.matrix, player.pos);
  }
}

function merge(arenaGrid, activePlayer) {
  activePlayer.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) arenaGrid[y + activePlayer.pos.y][x + activePlayer.pos.x] = value;
    });
  });
}

function collide(arenaGrid, activePlayer) {
  const [m, o] = [activePlayer.matrix, activePlayer.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arenaGrid[y + o.y] && arenaGrid[y + o.y][x + o.x]) !== 0) {
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
  if (player.score > player.bestScore) {
    player.bestScore = player.score;
    saveBestScore(player.bestScore);
  }

  const currentThreshold = Math.floor(player.score / 1000);
  if (currentThreshold > lastSeismicThreshold) {
    lastSeismicThreshold = currentThreshold;
    triggerSeismicSense();
  }

  updateHUD();
}

function triggerSeismicSense() {
  playSeismicSenseSound();
  const overlay = document.getElementById('seismicOverlay');
  overlay.classList.remove('seismic-active');
  void overlay.offsetWidth;
  overlay.classList.add('seismic-active');
}

function lockCurrentPiece() {
  merge(arena, player);
  playStoneSound();
  playerReset();
  arenaSweep();
}

function playerDrop() {
  if (isPaused) return;
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    lockCurrentPiece();
  }
  dropCounter = 0;
}

function playerHardDrop() {
  if (isPaused) return;
  let droppedRows = 0;
  while (!collide(arena, player)) {
    player.pos.y++;
    droppedRows++;
  }
  player.pos.y--;
  if (droppedRows > 1) {
    addScore((droppedRows - 1) * 2);
  }
  lockCurrentPiece();
  dropCounter = 0;
}

function playerMove(dir) {
  if (isPaused) return;
  player.pos.x += dir;
  if (collide(arena, player)) player.pos.x -= dir;
}

function getRandomPiece() {
  const pieces = 'ILJOTSZ';
  return createPiece(pieces[pieces.length * Math.random() | 0]);
}

function resetGame() {
  arena.forEach(row => row.fill(0));
  player.score = 0;
  player.lines = 0;
  player.level = 1;
  dropInterval = 1150;
  lastSeismicThreshold = 0;
  player.nextMatrix = null;
  isPaused = false;
  syncPauseUI();
  playerReset();
  updateHUD();
  announceStatus('Game restarted.');
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
    player.lines = 0;
    player.level = 1;
    dropInterval = 1150;
    lastSeismicThreshold = 0;
    updateHUD();
    announceStatus('Board cleared. New game started.');
  }
}

function playerRotate(dir) {
  if (isPaused) return;
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
  let clearedThisTurn = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    clearedThisTurn++;
    addScore(rowCount * 100);
    rowCount *= 2;
  }
  if (clearedThisTurn > 0) {
    player.lines += clearedThisTurn;
    player.level = Math.floor(player.lines / 10) + 1;
    dropInterval = Math.max(180, 1150 - (player.level - 1) * 90);
    updateHUD();
  }
}

function updateHUD() {
  document.getElementById('score').textContent = player.score;
  document.getElementById('bestScore').textContent = player.bestScore;
  document.getElementById('level').textContent = player.level;
  document.getElementById('lines').textContent = player.lines;
}

function syncPauseUI() {
  const pauseBtn = document.getElementById('pauseBtn');
  const banner = document.getElementById('pauseBanner');
  if (pauseBtn) {
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
  }
  if (banner) {
    banner.hidden = !isPaused;
  }
}

function togglePause() {
  isPaused = !isPaused;
  syncPauseUI();
  announceStatus(isPaused ? 'Game paused.' : 'Game resumed.');
}

function toggleMute() {
  isMuted = !isMuted;
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.setAttribute('aria-pressed', String(isMuted));
  }
  announceStatus(isMuted ? 'Audio muted.' : 'Audio enabled.');
}

let dropCounter = 0;
let dropInterval = 1150;
let lastTime = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  if (!isPaused) {
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

const arena = createMatrix(12, 20);
const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  nextMatrix: null,
  score: 0,
  bestScore: loadBestScore(),
  level: 1,
  lines: 0
};

document.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === 'ArrowLeft') playerMove(-1);
  else if (event.code === 'ArrowRight') playerMove(1);
  else if (event.code === 'ArrowDown') playerDrop();
  else if (event.code === 'Space') playerHardDrop();
  else if (event.code === 'KeyQ') playerRotate(-1);
  else if (event.code === 'KeyE') playerRotate(1);
  else if (event.code === 'KeyP') togglePause();
  else if (event.code === 'KeyM') toggleMute();
  else if (event.code === 'KeyR') resetGame();
});

document.getElementById('pauseBtn')?.addEventListener('click', togglePause);
document.getElementById('muteBtn')?.addEventListener('click', toggleMute);
document.getElementById('restartBtn')?.addEventListener('click', resetGame);

document.querySelectorAll('.touch-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'left') playerMove(-1);
    else if (action === 'right') playerMove(1);
    else if (action === 'down') playerDrop();
    else if (action === 'hard-drop') playerHardDrop();
    else if (action === 'rotate-left') playerRotate(-1);
    else if (action === 'rotate-right') playerRotate(1);
  });
});

playerReset();
updateHUD();
update();
