'use strict';

// ==================== PIECE DEFINITIONS ====================
// 21 pieces per player (all polyominoes from 1 to 5 squares)
// cells: [row, col] arrays in canonical orientation

const PIECE_DEFS = [
  { id: 0,  name: '1',  cells: [[0,0]] },
  { id: 1,  name: '2',  cells: [[0,0],[0,1]] },
  { id: 2,  name: 'I3', cells: [[0,0],[0,1],[0,2]] },
  { id: 3,  name: 'V3', cells: [[0,0],[1,0],[1,1]] },
  { id: 4,  name: 'I4', cells: [[0,0],[0,1],[0,2],[0,3]] },
  { id: 5,  name: 'T4', cells: [[0,0],[0,1],[0,2],[1,1]] },
  { id: 6,  name: 'O4', cells: [[0,0],[0,1],[1,0],[1,1]] },
  { id: 7,  name: 'L4', cells: [[0,0],[1,0],[2,0],[2,1]] },
  { id: 8,  name: 'S4', cells: [[0,1],[0,2],[1,0],[1,1]] },
  { id: 9,  name: 'F',  cells: [[0,1],[0,2],[1,0],[1,1],[2,1]] },
  { id: 10, name: 'I5', cells: [[0,0],[0,1],[0,2],[0,3],[0,4]] },
  { id: 11, name: 'L5', cells: [[0,0],[1,0],[2,0],[3,0],[3,1]] },
  { id: 12, name: 'N',  cells: [[0,0],[1,0],[1,1],[2,1],[3,1]] },
  { id: 13, name: 'P',  cells: [[0,0],[0,1],[1,0],[1,1],[2,0]] },
  { id: 14, name: 'T5', cells: [[0,0],[0,1],[0,2],[1,1],[2,1]] },
  { id: 15, name: 'U',  cells: [[0,0],[0,2],[1,0],[1,1],[1,2]] },
  { id: 16, name: 'V5', cells: [[0,0],[1,0],[2,0],[2,1],[2,2]] },
  { id: 17, name: 'W',  cells: [[0,0],[1,0],[1,1],[2,1],[2,2]] },
  { id: 18, name: 'X',  cells: [[0,1],[1,0],[1,1],[1,2],[2,1]] },
  { id: 19, name: 'Y',  cells: [[0,1],[1,0],[1,1],[2,1],[3,1]] },
  { id: 20, name: 'Z5', cells: [[0,0],[0,1],[1,1],[2,1],[2,2]] },
];

// ==================== TRANSFORMATIONS ====================

function normalize(cells) {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([,c]) => c));
  return cells.map(([r, c]) => [r - minR, c - minC]);
}

function rotateCW(cells) {
  return normalize(cells.map(([r, c]) => [c, -r]));
}

function flipH(cells) {
  return normalize(cells.map(([r, c]) => [r, -c]));
}

function cellsKey(cells) {
  return normalize([...cells]).map(([r,c]) => `${r},${c}`).sort().join('|');
}

function getOrientations(cells) {
  const seen = new Set();
  const result = [];
  let cur = normalize(cells);
  for (let f = 0; f < 2; f++) {
    for (let r = 0; r < 4; r++) {
      const key = cellsKey(cur);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(cur.map(x => [...x]));
      }
      cur = rotateCW(cur);
    }
    cur = flipH(cur);
  }
  return result;
}

const PIECE_ORIENTATIONS = PIECE_DEFS.map(p => getOrientations(p.cells));

// ==================== CONSTANTS ====================

const BOARD_SIZE = 20;

const PLAYERS = [
  { id: 0, name: 'プレイヤー1', color: '#3498db', dark: '#1a5276', startR: 0,  startC: 0  },
  { id: 1, name: 'プレイヤー2', color: '#e74c3c', dark: '#7b241c', startR: 0,  startC: 19 },
  { id: 2, name: 'プレイヤー3', color: '#2ecc71', dark: '#1d6a39', startR: 19, startC: 19 },
  { id: 3, name: 'プレイヤー4', color: '#f1c40f', dark: '#7d6608', startR: 19, startC: 0  },
];

// ==================== GAME STATE ====================

let G = {};

function initGame() {
  G = {
    board:     Array.from({ length: BOARD_SIZE }, () => new Int8Array(BOARD_SIZE).fill(-1)),
    pieces:    PLAYERS.map(() => new Set(PIECE_DEFS.map(p => p.id))),
    current:   0,
    passed:    [false, false, false, false],
    firstMove: [true,  true,  true,  true],
    lastPiece: [null,  null,  null,  null],
  };
}

// ==================== VALIDATION ====================

function inBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function absolute(cells, row, col) {
  return cells.map(([r, c]) => [r + row, c + col]);
}

function isValidPlacement(player, cells, row, col) {
  const placed = absolute(cells, row, col);
  const p = PLAYERS[player];

  // All cells must be in bounds and empty
  for (const [r, c] of placed) {
    if (!inBounds(r, c) || G.board[r][c] !== -1) return false;
  }

  // First move: must cover the player's starting corner
  if (G.firstMove[player]) {
    return placed.some(([r, c]) => r === p.startR && c === p.startC);
  }

  // Must touch own piece corner-to-corner (diagonal)
  // Must NOT touch own piece edge-to-edge
  let touchesCorner = false;
  const EDGES = [[-1,0],[1,0],[0,-1],[0,1]];
  const DIAGS = [[-1,-1],[-1,1],[1,-1],[1,1]];

  for (const [r, c] of placed) {
    for (const [dr, dc] of EDGES) {
      const nr = r+dr, nc = c+dc;
      if (inBounds(nr, nc) && G.board[nr][nc] === player) return false;
    }
    for (const [dr, dc] of DIAGS) {
      const nr = r+dr, nc = c+dc;
      if (inBounds(nr, nc) && G.board[nr][nc] === player) touchesCorner = true;
    }
  }
  return touchesCorner;
}

function placePiece(player, pieceId, cells, row, col) {
  const placed = absolute(cells, row, col);
  for (const [r, c] of placed) G.board[r][c] = player;
  G.pieces[player].delete(pieceId);
  G.firstMove[player] = false;
  G.lastPiece[player] = pieceId;
}

function hasAnyMove(player) {
  if (G.passed[player] || G.pieces[player].size === 0) return false;
  for (const pid of G.pieces[player]) {
    for (const orient of PIECE_ORIENTATIONS[pid]) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (isValidPlacement(player, orient, r, c)) return true;
        }
      }
    }
  }
  return false;
}

function calcScore(player) {
  let remaining = 0;
  for (const pid of G.pieces[player]) remaining += PIECE_DEFS[pid].cells.length;
  let score = -remaining;
  if (remaining === 0) {
    score += 15;
    if (G.lastPiece[player] === 0) score += 5; // monomino last
  }
  return score;
}

// ==================== UI STATE ====================

let UI = {
  selectedPieceId: null,
  orientIdx: 0,
  previewR: null,
  previewC: null,
  previewValid: false,
};

function resetUISelection() {
  UI.selectedPieceId = null;
  UI.orientIdx = 0;
  UI.previewR = null;
  UI.previewC = null;
  UI.previewValid = false;
}

// ==================== CANVAS ====================

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
let cellSize = 17;

function setupCanvas() {
  const container = document.getElementById('board-container');
  const w = container.clientWidth - 12;
  const h = container.clientHeight - 12;
  cellSize = Math.max(12, Math.floor(Math.min(w, h) / BOARD_SIZE));
  const px = cellSize * BOARD_SIZE;
  canvas.width = px;
  canvas.height = px;
  canvas.style.width = px + 'px';
  canvas.style.height = px + 'px';
}

const GRID_COLOR = '#b0b8c8';
const BG_COLOR   = '#d0d8e8';

function drawBoard() {
  const s = cellSize;
  const px = s * BOARD_SIZE;

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, px, px);

  // Grid lines
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= BOARD_SIZE; i++) {
    ctx.beginPath(); ctx.moveTo(i*s, 0); ctx.lineTo(i*s, px); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*s); ctx.lineTo(px, i*s); ctx.stroke();
  }

  // Placed cells
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = G.board[r][c];
      if (p !== -1) {
        ctx.fillStyle = PLAYERS[p].color;
        ctx.fillRect(c*s+1, r*s+1, s-2, s-2);
      }
    }
  }

  // Starting corner markers
  PLAYERS.forEach((p, i) => {
    if (G.firstMove[i]) {
      ctx.fillStyle = p.color + '55';
      ctx.fillRect(p.startC*s+1, p.startR*s+1, s-2, s-2);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.startC*s+1, p.startR*s+1, s-2, s-2);
    }
  });

  // Preview
  if (UI.selectedPieceId !== null && UI.previewR !== null) {
    const orient = PIECE_ORIENTATIONS[UI.selectedPieceId][UI.orientIdx];
    const placed = absolute(orient, UI.previewR, UI.previewC);
    const pColor = PLAYERS[G.current].color;
    for (const [r, c] of placed) {
      if (!inBounds(r, c)) continue;
      if (UI.previewValid) {
        ctx.fillStyle = pColor + 'cc';
        ctx.fillRect(c*s+1, r*s+1, s-2, s-2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(c*s+1.5, r*s+1.5, s-3, s-3);
      } else {
        ctx.fillStyle = 'rgba(255,60,60,0.55)';
        ctx.fillRect(c*s+1, r*s+1, s-2, s-2);
      }
    }
  }
}

// ==================== PIECE PANEL ====================

function buildPiecePanel() {
  const list = document.getElementById('piece-list');
  list.innerHTML = '';
  const player = G.current;
  const remaining = [...G.pieces[player]].sort((a,b) =>
    PIECE_DEFS[a].cells.length - PIECE_DEFS[b].cells.length || a - b
  );

  for (const pid of remaining) {
    const cells = PIECE_DEFS[pid].cells;
    const maxR = Math.max(...cells.map(([r]) => r)) + 1;
    const maxC = Math.max(...cells.map(([,c]) => c)) + 1;
    const dim = Math.max(maxR, maxC, 3);
    const pc = Math.floor(86 / dim);

    const cnv = document.createElement('canvas');
    cnv.width  = dim * pc;
    cnv.height = dim * pc;
    const pctx = cnv.getContext('2d');

    pctx.fillStyle = PLAYERS[player].color;
    const offR = Math.floor((dim - maxR) / 2);
    const offC = Math.floor((dim - maxC) / 2);
    for (const [r, c] of cells) {
      pctx.fillRect((c+offC)*pc+1, (r+offR)*pc+1, pc-2, pc-2);
    }

    const item = document.createElement('div');
    item.className = 'piece-item' + (pid === UI.selectedPieceId ? ' selected' : '');
    item.dataset.pid = pid;
    item.appendChild(cnv);
    item.addEventListener('click', () => selectPiece(pid));
    list.appendChild(item);
  }
}

// ==================== HEADER ====================

function updateHeader() {
  const p = PLAYERS[G.current];
  document.getElementById('player-dot').style.background = p.color;
  document.getElementById('player-name-label').textContent = p.name;

  document.getElementById('scores').innerHTML = PLAYERS.map((pl, i) => {
    const rem = [...G.pieces[i]].reduce((s, pid) => s + PIECE_DEFS[pid].cells.length, 0);
    const textColor = i === 3 ? '#333' : '#fff';
    return `<div class="score-chip${i === G.current ? ' active' : ''}"
      style="background:${pl.color}; color:${textColor}" title="${pl.name}: 残り${rem}マス">${rem}</div>`;
  }).join('');
}

// ==================== SELECTION & CONTROLS ====================

function selectPiece(pid) {
  UI.selectedPieceId = pid;
  UI.orientIdx = 0;
  UI.previewR = null;
  UI.previewC = null;
  UI.previewValid = false;
  updateConfirm();
  drawBoard();
  buildPiecePanel();
}

function updatePreview() {
  if (UI.selectedPieceId === null || UI.previewR === null) {
    UI.previewValid = false;
  } else {
    const orient = PIECE_ORIENTATIONS[UI.selectedPieceId][UI.orientIdx];
    UI.previewValid = isValidPlacement(G.current, orient, UI.previewR, UI.previewC);
  }
  updateConfirm();
}

function updateConfirm() {
  document.getElementById('btn-confirm').disabled = !UI.previewValid;
}

function doRotate(dir) {
  if (UI.selectedPieceId === null) return;
  const n = PIECE_ORIENTATIONS[UI.selectedPieceId].length;
  UI.orientIdx = ((UI.orientIdx + dir) % n + n) % n;
  updatePreview();
  drawBoard();
}

function doFlip() {
  if (UI.selectedPieceId === null) return;
  const n = PIECE_ORIENTATIONS[UI.selectedPieceId].length;
  const half = Math.floor(n / 2) || 1;
  UI.orientIdx = (UI.orientIdx + half) % n;
  updatePreview();
  drawBoard();
}

function doConfirm() {
  if (!UI.previewValid || UI.selectedPieceId === null) return;
  const orient = PIECE_ORIENTATIONS[UI.selectedPieceId][UI.orientIdx];
  placePiece(G.current, UI.selectedPieceId, orient, UI.previewR, UI.previewC);
  resetUISelection();
  nextTurn();
}

// ==================== TURN MANAGEMENT ====================

function nextTurn() {
  // Mark players who have no valid moves
  for (let i = 0; i < 4; i++) {
    if (!G.passed[i] && !hasAnyMove(i)) G.passed[i] = true;
  }

  // Game over if all passed
  if (G.passed.every(Boolean)) {
    showGameOver();
    return;
  }

  // Advance to next active player
  let next = (G.current + 1) % 4;
  let tries = 0;
  while (G.passed[next] && tries < 4) { next = (next + 1) % 4; tries++; }

  G.current = next;
  updateConfirm();
  updateHeader();
  buildPiecePanel();
  drawBoard();
}

function doPass() {
  const pname = PLAYERS[G.current].name;
  G.passed[G.current] = true;

  const msg = document.getElementById('pass-msg');
  msg.innerHTML = `<strong>${pname}</strong><br>パスします`;
  document.getElementById('modal-pass').style.display = 'flex';
}

document.getElementById('btn-pass-ok').addEventListener('click', () => {
  document.getElementById('modal-pass').style.display = 'none';
  resetUISelection();
  nextTurn();
});

// ==================== GAME OVER ====================

function showGameOver() {
  const scores = PLAYERS.map((p, i) => ({ ...p, score: calcScore(i), i }))
    .sort((a, b) => b.score - a.score);

  document.getElementById('final-scores').innerHTML = scores.map((p, rank) => {
    const textColor = p.i === 3 ? '#333' : 'white';
    const label = rank === 0 ? '🏆 1位' : `${rank+1}位`;
    return `<div class="result-row">
      <div class="result-dot" style="background:${p.color}"></div>
      <span class="result-rank">${label}</span>
      <span class="result-name">${p.name}</span>
      <span class="result-score">${p.score}点</span>
    </div>`;
  }).join('');

  document.getElementById('modal-gameover').style.display = 'flex';
}

document.getElementById('btn-restart').addEventListener('click', () => {
  document.getElementById('modal-gameover').style.display = 'none';
  initGame();
  resetUISelection();
  updateHeader();
  buildPiecePanel();
  updateConfirm();
  requestAnimationFrame(() => { setupCanvas(); drawBoard(); });
});

// ==================== BOARD TOUCH / CLICK ====================

function boardPos(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    r: Math.floor((clientY - rect.top)  / cellSize),
    c: Math.floor((clientX - rect.left) / cellSize),
  };
}

canvas.addEventListener('click', e => {
  if (UI.selectedPieceId === null) return;
  const { r, c } = boardPos(e.clientX, e.clientY);
  if (!inBounds(r, c)) return;

  if (r === UI.previewR && c === UI.previewC && UI.previewValid) {
    doConfirm();
    return;
  }
  UI.previewR = r;
  UI.previewC = c;
  updatePreview();
  drawBoard();
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (UI.selectedPieceId === null) return;
  const touch = e.touches[0];
  const { r, c } = boardPos(touch.clientX, touch.clientY);
  if (!inBounds(r, c)) return;
  UI.previewR = r;
  UI.previewC = c;
  updatePreview();
  drawBoard();
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (UI.selectedPieceId === null) return;
  const touch = e.touches[0];
  const { r, c } = boardPos(touch.clientX, touch.clientY);
  if (!inBounds(r, c)) return;
  UI.previewR = r;
  UI.previewC = c;
  updatePreview();
  drawBoard();
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  // If valid, confirm on tap (not drag)
  if (UI.previewValid && e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    const { r, c } = boardPos(touch.clientX, touch.clientY);
    if (r === UI.previewR && c === UI.previewC) doConfirm();
  }
}, { passive: false });

// ==================== BUTTON EVENTS ====================

document.getElementById('btn-rotate-l').addEventListener('click', () => doRotate(-1));
document.getElementById('btn-rotate-r').addEventListener('click', () => doRotate(1));
document.getElementById('btn-flip').addEventListener('click', doFlip);
document.getElementById('btn-confirm').addEventListener('click', doConfirm);
document.getElementById('btn-pass').addEventListener('click', doPass);

// ==================== RESIZE ====================

window.addEventListener('resize', () => { setupCanvas(); drawBoard(); });

// ==================== BOOT ====================

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

initGame();
updateHeader();
buildPiecePanel();
updateConfirm();

// レイアウト確定後にボードを描画（タイミング保証）
requestAnimationFrame(() => {
  setupCanvas();
  drawBoard();
});
