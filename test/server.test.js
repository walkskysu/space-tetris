import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('static server serves modules on loopback and rejects non-assets and writes', { timeout: 10000 }, async t => {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (server.exitCode === null) { server.kill(); await once(server, 'exit'); }
  });
  const url = await new Promise((resolve, reject) => {
    let output = '';
    server.on('error', reject);
    server.on('exit', code => reject(new Error(`Server exited early: ${code}`)));
    server.stdout.on('data', data => {
      output += data;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) resolve(match[0]);
    });
  });
  for (const [asset, mime] of [['/', 'text/html'], ['/styles.css', 'text/css'], ['/src/main.js', 'text/javascript'], ['/src/game.js', 'text/javascript']]) {
    const response = await fetch(url + asset);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').startsWith(mime));
    assert.ok((await response.text()).length > 0);
  }
  const head = await fetch(url, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  for (const asset of ['/.git/config', '/package.json', '/missing', '/%2e%2e/README.md']) {
    assert.equal((await fetch(url + asset)).status, 404);
  }
  const post = await fetch(url, { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
});
