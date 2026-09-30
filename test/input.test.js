import test from 'node:test';
import assert from 'node:assert/strict';

// A minimal DOM adapter exercises the real UI module and engine without a browser
// dependency. It verifies event wiring and text state, not pixel layout.
test('UI wires start, gameplay keys, pause, repeat suppression, restart and touch controls', async t => {
  const draw = new Proxy({}, { get: (_, key) => key === 'then' ? undefined : () => {}, set: () => true });
  const elements = new Map();
  function element(id, button = false) {
    return {
      id, textContent: '', innerHTML: '', hidden: false, disabled: false,
      handlers: {}, attributes: {}, dataset: {},
      addEventListener(type, callback) { this.handlers[type] = callback; },
      setAttribute(name, value) { this.attributes[name] = value; },
      getContext() { return draw; },
      focus() { document.activeElement = this; },
      closest(selector) { return button && selector === 'button' ? this : null; },
    };
  }
  for (const id of ['board', 'next', 'score', 'lines', 'level', 'pause', 'restart', 'flight-state', 'board-note', 'overlay', 'overlay-title', 'overlay-copy', 'launch', 'announcement']) {
    elements.set(id, element(id, ['pause', 'restart', 'launch'].includes(id)));
  }
  const touch = ['left', 'right', 'rotate', 'down', 'drop'].map(action => {
    const button = element(action, true); button.dataset.action = action; return button;
  });
  const docEvents = {}, windowEvents = {};
  const original = Object.fromEntries(['document', 'window', 'requestAnimationFrame'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => {
    for (const [key, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  globalThis.document = {
    getElementById: id => elements.get(id), querySelectorAll: () => touch,
    addEventListener: (type, callback) => { docEvents[type] = callback; },
    hidden: false,
  };
  globalThis.window = { addEventListener: (type, callback) => { windowEvents[type] = callback; } };
  let frame;
  globalThis.requestAnimationFrame = callback => { frame = callback; };
  await import('../src/main.js');
  const get = id => elements.get(id);
  const key = (value, extra = {}) => {
    let prevented = false;
    docEvents.keydown({ key: value, target: get('board'), preventDefault() { prevented = true; }, ...extra });
    return prevented;
  };
  assert.equal(get('flight-state').textContent, 'STANDBY');
  assert.equal(get('pause').disabled, true);
  get('launch').handlers.click();
  assert.equal(get('overlay').hidden, true);
  assert.equal(document.activeElement, get('board'));
  for (const value of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ']) assert.equal(key(value), true);
  assert.ok(Number(get('score').textContent) > 0);
  assert.equal(key('P'), true);
  assert.equal(get('flight-state').textContent, 'HOLDING');
  const pausedScore = get('score').textContent;
  key(' ', { repeat: true }); key('p', { repeat: true }); frame(0); frame(5000);
  assert.equal(get('score').textContent, pausedScore);
  assert.equal(get('flight-state').textContent, 'HOLDING');
  key('p');
  assert.equal(get('flight-state').textContent, 'IN ORBIT');
  const beforeRepeat = get('score').textContent;
  key(' ', { repeat: true });
  assert.equal(get('score').textContent, beforeRepeat);
  assert.equal(key(' ', { target: get('restart') }), false);
  assert.equal(key('r', { ctrlKey: true }), false);
  key('r');
  assert.equal(get('score').textContent, '000000');
  touch.find(button => button.dataset.action === 'drop').handlers.click();
  assert.ok(Number(get('score').textContent) > 0);
  windowEvents.blur();
  assert.equal(get('flight-state').textContent, 'HOLDING');
  get('pause').handlers.click();
  assert.equal(get('flight-state').textContent, 'IN ORBIT');
  document.hidden = true; docEvents.visibilitychange();
  assert.equal(get('flight-state').textContent, 'HOLDING');
  get('restart').handlers.click();
  assert.equal(get('flight-state').textContent, 'IN ORBIT');
  assert.equal(get('score').textContent, '000000');
});
