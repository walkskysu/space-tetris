import { Game, SHAPES, WIDTH, HEIGHT } from './game.js';

const $ = id => document.getElementById(id);
const game = new Game(Date.now());
const board = $('board');
const ctx = board.getContext('2d');
const preview = $('next').getContext('2d');
const colors = { I: '#62deef', J: '#6d99ff', L: '#ffa768', O: '#f3d978', S: '#74e1b5', T: '#ba94fa', Z: '#fb809b' };
let lastAnnouncement = '';
let lastHud = '';

function block(context, x, y, size, type, ghost = false) {
  const color = colors[type];
  context.fillStyle = ghost ? `${color}15` : color;
  context.fillRect(x + 2, y + 2, size - 4, size - 4);
  context.strokeStyle = ghost ? `${color}99` : '#ffffff55';
  context.lineWidth = 1;
  context.strokeRect(x + 2.5, y + 2.5, size - 5, size - 5);
  if (!ghost) {
    context.fillStyle = '#ffffff35';
    context.fillRect(x + 4, y + 4, size - 8, 3);
    context.fillStyle = '#07132425';
    context.fillRect(x + 4, y + size - 7, size - 8, 3);
  }
}

function piece(p, offsetY = 0, ghost = false) {
  p.matrix.forEach((row, y) => row.forEach((cell, x) => {
    if (cell) block(ctx, (p.x + x) * 30, (p.y + y + offsetY) * 30, 30, p.type, ghost);
  }));
}

function render() {
  ctx.fillStyle = '#0a1122';
  ctx.fillRect(0, 0, 300, 600);
  ctx.strokeStyle = '#8aafce12';
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x++) {
    ctx.beginPath(); ctx.moveTo(x * 30, 0); ctx.lineTo(x * 30, 600); ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * 30); ctx.lineTo(300, y * 30); ctx.stroke();
  }
  game.board.forEach((row, y) => row.forEach((type, x) => {
    if (type) block(ctx, x * 30, y * 30, 30, type);
  }));
  if (game.active && game.status !== 'over') {
    piece(game.active, game.dropDistance(), true);
    piece(game.active);
  }
  const hud = [game.status, game.score, game.lines, game.next].join(':');
  if (hud === lastHud) return;
  lastHud = hud;
  preview.clearRect(0, 0, 160, 100);
  const cells = [];
  SHAPES[game.next].forEach((row, y) => row.forEach((cell, x) => { if (cell) cells.push([x, y]); }));
  const minX = Math.min(...cells.map(([x]) => x)), maxX = Math.max(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y)), maxY = Math.max(...cells.map(([, y]) => y));
  cells.forEach(([x, y]) => block(preview, (160 - (maxX - minX + 1) * 26) / 2 + (x - minX) * 26, (100 - (maxY - minY + 1) * 26) / 2 + (y - minY) * 26, 26, game.next));
  $('next').setAttribute('aria-label', `Next piece: ${game.next} tetromino`);
  $('score').textContent = String(game.score).padStart(6, '0');
  $('lines').textContent = game.lines;
  $('level').textContent = String(game.level).padStart(2, '0');
  const paused = game.status === 'paused';
  $('pause').disabled = !['running', 'paused'].includes(game.status);
  $('pause').innerHTML = `${paused ? 'Resume' : 'Pause'} <kbd>P</kbd>`;
  $('pause').setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
  const states = { ready: 'STANDBY', running: 'IN ORBIT', paused: 'HOLDING', over: 'MISSION ENDED' };
  $('flight-state').textContent = states[game.status];
  $('board-note').textContent = game.status === 'running' ? 'TRAJECTORY NOMINAL' : states[game.status];
  $('overlay').hidden = game.status === 'running';
  if (game.status !== 'running') {
    $('overlay-title').textContent = paused ? 'Holding orbit' : game.status === 'over' ? 'Mission complete' : 'Ready for launch?';
    $('overlay-copy').textContent = paused ? 'Take a breath. The stars can wait.' : game.status === 'over' ? `Game over · ${game.score.toLocaleString()} points. Ready for another flight?` : 'Build a little order in the cosmic chaos.';
    $('launch').textContent = paused ? 'Resume mission ↗' : game.status === 'over' ? 'Play again ↗' : 'Start mission ↗';
  }
  const announcement = `${states[game.status]}. ${game.lines} lines cleared. Level ${game.level}.`;
  if (announcement !== lastAnnouncement) {
    $('announcement').textContent = game.status === 'over' ? `Game over. Final score ${game.score}. Press R to restart.` : announcement;
    lastAnnouncement = announcement;
  }
}

function act(action) {
  if (action === 'left') game.move(-1);
  if (action === 'right') game.move(1);
  if (action === 'down') game.stepDown(true);
  if (action === 'rotate') game.rotate();
  if (action === 'drop') game.hardDrop();
  if (action === 'pause') game.togglePause();
  if (action === 'restart') game.restart();
  render();
}

$('launch').addEventListener('click', () => {
  if (game.status === 'paused') game.togglePause();
  else if (game.status === 'over') game.restart();
  else game.start();
  render();
  board.focus({ preventScroll: true });
});
$('pause').addEventListener('click', () => act('pause'));
$('restart').addEventListener('click', () => { act('restart'); board.focus({ preventScroll: true }); });
document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('click', () => act(button.dataset.action));
});
const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate', ' ': 'drop', p: 'pause', r: 'restart' };
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const action = keys[event.key] || keys[event.key.toLowerCase()];
  if (!action) return;
  // Space still activates a focused button through its native keyboard behavior.
  if (event.key === ' ' && event.target.closest('button')) return;
  event.preventDefault();
  if (event.repeat && ['rotate', 'drop', 'pause', 'restart'].includes(action)) return;
  act(action);
});
function pauseWhenAway() {
  if (game.status === 'running') { game.togglePause(); render(); }
}
window.addEventListener('blur', pauseWhenAway);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseWhenAway(); });
let previous;
function frame(time) {
  const delta = previous === undefined ? 0 : Math.min(time - previous, 100);
  previous = time;
  if (game.status === 'running') { game.advance(delta); render(); }
  requestAnimationFrame(frame);
}
render();
requestAnimationFrame(frame);
