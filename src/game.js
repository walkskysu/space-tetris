export const WIDTH = 10;
export const HEIGHT = 20;
export const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
};

export function rotateClockwise(matrix) {
  return matrix[0].map((_, x) => matrix.map(row => row[x]).reverse());
}

export function collides(board, matrix, x, y) {
  return matrix.some((row, dy) => row.some((cell, dx) => cell && (
    x + dx < 0 || x + dx >= WIDTH || y + dy >= HEIGHT ||
    (y + dy >= 0 && board[y + dy][x + dx] !== null)
  )));
}

export function clearLines(board) {
  const remaining = board.filter(row => row.some(cell => cell === null));
  const count = HEIGHT - remaining.length;
  return {
    board: [...Array.from({ length: count }, () => Array(WIDTH).fill(null)), ...remaining],
    count,
  };
}

// All randomness and time are explicit: equal seeds and actions give equal games.
export class Game {
  constructor(seed = 1) {
    this.seed = seed >>> 0;
    this.reset('ready');
  }

  reset(status = 'running') {
    this.randomState = this.seed;
    this.bag = [];
    this.board = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(null));
    this.score = 0;
    this.lines = 0;
    this.elapsed = 0;
    this.status = status;
    this.active = null;
    this.next = this.takePiece();
    if (status === 'running') this.spawn();
  }

  random() {
    this.randomState = (Math.imul(1664525, this.randomState) + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  takePiece() {
    if (!this.bag.length) {
      this.bag = Object.keys(SHAPES);
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }

  get level() { return 1 + Math.floor(this.lines / 10); }
  get gravityMs() { return Math.max(100, 800 - (this.level - 1) * 65); }

  start() {
    if (this.status === 'ready') this.reset();
  }

  restart() { this.reset(); }

  togglePause() {
    if (this.status === 'running') this.status = 'paused';
    else if (this.status === 'paused') this.status = 'running';
  }

  spawn() {
    const type = this.next;
    const matrix = SHAPES[type].map(row => [...row]);
    this.active = { type, matrix, x: Math.floor((WIDTH - matrix.length) / 2), y: 0 };
    this.next = this.takePiece();
    if (collides(this.board, matrix, this.active.x, 0)) this.status = 'over';
  }

  move(dx) {
    if (this.status !== 'running') return false;
    const p = this.active;
    if (collides(this.board, p.matrix, p.x + dx, p.y)) return false;
    p.x += dx;
    return true;
  }

  rotate() {
    if (this.status !== 'running') return false;
    const p = this.active;
    const matrix = rotateClockwise(p.matrix);
    // Small horizontal wall kicks, then upward floor kicks. Not full SRS.
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [0, -2]]) {
      if (!collides(this.board, matrix, p.x + dx, p.y + dy)) {
        Object.assign(p, { matrix, x: p.x + dx, y: p.y + dy });
        return true;
      }
    }
    return false;
  }

  stepDown(soft = false) {
    if (this.status !== 'running') return false;
    const p = this.active;
    if (collides(this.board, p.matrix, p.x, p.y + 1)) {
      this.lock();
      return false;
    }
    p.y++;
    if (soft) this.score++;
    return true;
  }

  dropDistance() {
    if (!this.active) return 0;
    const p = this.active;
    let distance = 0;
    while (!collides(this.board, p.matrix, p.x, p.y + distance + 1)) distance++;
    return distance;
  }

  hardDrop() {
    if (this.status !== 'running') return 0;
    const distance = this.dropDistance();
    this.active.y += distance;
    this.score += distance * 2;
    this.lock();
    return distance;
  }

  lock() {
    const p = this.active;
    // Top-out is checked before writing anything, avoiding partial locks.
    if (p.matrix.some((row, dy) => row.some(cell => cell && p.y + dy < 0))) {
      this.status = 'over';
      return;
    }
    p.matrix.forEach((row, dy) => row.forEach((cell, dx) => {
      if (cell) this.board[p.y + dy][p.x + dx] = p.type;
    }));
    const result = clearLines(this.board);
    this.score += [0, 100, 300, 500, 800][result.count] * this.level;
    this.lines += result.count;
    this.board = result.board;
    this.elapsed = 0;
    this.spawn();
  }

  advance(milliseconds) {
    if (this.status !== 'running' || !Number.isFinite(milliseconds) || milliseconds <= 0) return;
    this.elapsed += milliseconds;
    while (this.status === 'running' && this.elapsed >= this.gravityMs) {
      this.elapsed -= this.gravityMs;
      this.stepDown();
    }
  }
}
