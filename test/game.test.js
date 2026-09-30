import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, SHAPES, WIDTH, HEIGHT, collides, clearLines, rotateClockwise } from '../src/game.js';

const empty = () => Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(null));
function running(seed = 42) { const game = new Game(seed); game.start(); return game; }
function setPiece(game, type, x, y, matrix = SHAPES[type]) {
  game.active = { type, x, y, matrix: matrix.map(row => [...row]) };
}

test('board is 10x20 and cells and rows are independent', () => {
  const game = new Game();
  assert.equal(game.board.length, 20);
  assert.ok(game.board.every(row => row.length === 10 && row.every(cell => cell === null)));
  game.board[0][0] = 'T';
  assert.equal(game.board[1][0], null);
});

test('collisions detect walls, floor, occupied cells and permit empty padding', () => {
  const board = empty();
  assert.equal(collides(board, SHAPES.O, -1, 0), true);
  assert.equal(collides(board, SHAPES.O, 9, 0), true);
  assert.equal(collides(board, SHAPES.O, 3, 19), true);
  assert.equal(collides(board, SHAPES.O, 3, -1), false);
  assert.equal(collides(board, SHAPES.O, 3, 18), false);
  board[18][4] = 'T';
  assert.equal(collides(board, SHAPES.O, 3, 17), true);
  assert.equal(collides(empty(), rotateClockwise(SHAPES.I), -2, 0), false);
});

test('movement cannot cross walls or locked blocks and rejected moves preserve position', () => {
  const game = running();
  setPiece(game, 'O', 0, 5);
  assert.equal(game.move(-1), false);
  assert.equal(game.active.x, 0);
  assert.equal(game.move(1), true);
  game.board[5][3] = 'T';
  assert.equal(game.move(1), false);
  assert.equal(game.active.x, 1);
});

test('rotation is clockwise, does not mutate input, and four turns restore every shape', () => {
  assert.deepEqual(rotateClockwise([[1, 2], [3, 4]]), [[3, 1], [4, 2]]);
  for (const shape of Object.values(SHAPES)) {
    const original = structuredClone(shape);
    let matrix = shape;
    for (let i = 0; i < 4; i++) matrix = rotateClockwise(matrix);
    assert.deepEqual(matrix, original);
    assert.deepEqual(shape, original);
  }
});

test('I rotations kick away from both walls and the floor', () => {
  const game = running();
  setPiece(game, 'I', -2, 5, rotateClockwise(SHAPES.I));
  assert.equal(game.rotate(), true);
  assert.equal(game.active.x, 0);
  setPiece(game, 'I', 7, 5, rotateClockwise(SHAPES.I));
  assert.equal(game.rotate(), true);
  assert.equal(game.active.x, 6);
  setPiece(game, 'I', 3, 18);
  assert.equal(game.rotate(), true);
  assert.equal(game.active.y, 16);
  assert.equal(collides(game.board, game.active.matrix, game.active.x, game.active.y), false);
});

test('blocked rotation leaves the entire piece unchanged', () => {
  const game = running();
  game.board = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill('Z'));
  setPiece(game, 'T', 3, 5);
  game.active.matrix.forEach((row, y) => row.forEach((cell, x) => {
    if (cell) game.board[5 + y][3 + x] = null;
  }));
  const before = structuredClone(game.active);
  assert.equal(game.rotate(), false);
  assert.deepEqual(game.active, before);
});

test('line clearing removes adjacent full rows and preserves partial row order', () => {
  const board = empty();
  board[17][2] = 'T';
  board[18].fill('O'); board[19].fill('I');
  const original = structuredClone(board);
  const result = clearLines(board);
  assert.equal(result.count, 2);
  assert.equal(result.board.length, 20);
  assert.equal(result.board[19][2], 'T');
  assert.ok(result.board.slice(0, 19).every(row => row.every(cell => cell === null)));
  assert.deepEqual(board, original);
  assert.equal(clearLines(empty()).count, 0);
});

for (const [count, points] of [[1, 100], [2, 300], [3, 500], [4, 800]]) {
  test(`${count}-line clear awards ${points} points and compacts the board`, () => {
    const game = running();
    for (let y = HEIGHT - count; y < HEIGHT; y++) {
      game.board[y].fill('J'); game.board[y][4] = null;
    }
    setPiece(game, 'I', 2, 16, rotateClockwise(SHAPES.I));
    assert.equal(game.hardDrop(), 0);
    assert.equal(game.score, points);
    assert.equal(game.lines, count);
    assert.equal(game.board.flat().filter(Boolean).length, 4 - count);
  });
}

test('scoring uses the current level before advancing and gravity speeds up', () => {
  const game = running();
  game.lines = 19;
  const oldGravity = game.gravityMs;
  game.board[19].fill('J'); game.board[19][4] = null;
  setPiece(game, 'I', 2, 16, rotateClockwise(SHAPES.I));
  game.hardDrop();
  assert.equal(game.score, 200);
  assert.equal(game.lines, 20);
  assert.equal(game.level, 3);
  assert.ok(game.gravityMs < oldGravity);
});

test('hard drop lands above obstacles, scores distance, locks and spawns the preview', () => {
  const game = running();
  setPiece(game, 'O', 3, 0);
  game.board[15][3] = 'T';
  const next = game.next;
  assert.equal(game.dropDistance(), 13);
  assert.equal(game.active.y, 0);
  assert.equal(game.hardDrop(), 13);
  assert.equal(game.score, 26);
  assert.equal(game.board[13][3], 'O');
  assert.equal(game.board[14][4], 'O');
  assert.equal(game.board[15][3], 'T');
  assert.equal(game.active.type, next);
  assert.equal(game.active.y, 0);
});

test('gravity accumulates time, soft drop scores per cell, and contact locks', () => {
  const game = running();
  setPiece(game, 'O', 3, 0);
  game.advance(799); assert.equal(game.active.y, 0);
  game.advance(1); assert.equal(game.active.y, 1);
  game.advance(1600); assert.equal(game.active.y, 3);
  assert.equal(game.score, 0);
  assert.equal(game.stepDown(true), true);
  assert.equal(game.score, 1);
  game.active.y = 18;
  assert.equal(game.stepDown(true), false);
  assert.equal(game.board[19][3], 'O');
  assert.equal(game.score, 1);
  assert.equal(game.elapsed, 0);
});

test('seven-piece bags contain all tetrominoes and equal seeds yield equal sequences', () => {
  const a = new Game(123), b = new Game(123);
  const sequence = [a.next, ...Array.from({ length: 20 }, () => a.takePiece())];
  assert.deepEqual(sequence, [b.next, ...Array.from({ length: 20 }, () => b.takePiece())]);
  for (let i = 0; i < 21; i += 7) assert.deepEqual([...sequence.slice(i, i + 7)].sort(), Object.keys(SHAPES).sort());
});

test('all seven shapes spawn within bounds; blocked spawn ends the game and freezes actions', () => {
  for (const type of Object.keys(SHAPES)) {
    const game = running(); game.next = type; game.spawn();
    assert.equal(game.active.type, type);
    assert.equal(collides(game.board, game.active.matrix, game.active.x, game.active.y), false);
  }
  const game = running();
  game.next = 'O'; game.board[0][4] = 'J'; game.spawn();
  assert.equal(game.status, 'over');
  const snapshot = JSON.stringify(game);
  game.move(1); game.rotate(); game.hardDrop(); game.stepDown(); game.advance(9000); game.togglePause(); game.start();
  assert.equal(JSON.stringify(game), snapshot);
});

test('locking above the board tops out without partial writes', () => {
  const game = running();
  setPiece(game, 'O', 4, -1);
  const before = structuredClone(game.board);
  game.lock();
  assert.equal(game.status, 'over');
  assert.deepEqual(game.board, before);
});

test('ready and paused games ignore gameplay and time; resume preserves gravity remainder', () => {
  const game = new Game();
  const ready = JSON.stringify(game);
  game.move(1); game.rotate(); game.stepDown(); game.hardDrop(); game.advance(9000); game.togglePause();
  assert.equal(JSON.stringify(game), ready);
  game.start(); game.advance(400); game.togglePause();
  const paused = JSON.stringify(game);
  game.move(1); game.rotate(); game.stepDown(true); game.hardDrop(); game.advance(99999); game.start();
  assert.equal(JSON.stringify(game), paused);
  game.togglePause(); game.advance(400);
  assert.equal(game.active.y, 1);
});

test('restart resets board, score, level, timer, bag and status from every state', () => {
  for (const status of ['ready', 'running', 'paused', 'over']) {
    const game = running(42);
    game.hardDrop(); game.score = 900; game.lines = 22; game.elapsed = 123; game.status = status;
    game.restart();
    assert.deepEqual(game, running(42));
  }
});

test('identical seeds and timed actions produce identical states', () => {
  const a = running(52), b = running(52);
  for (const game of [a, b]) {
    for (let i = 0; i < 15; i++) {
      game.advance(300); game.move(i % 2 ? 1 : -1); game.rotate(); game.hardDrop();
    }
  }
  assert.deepEqual(a, b);
});
