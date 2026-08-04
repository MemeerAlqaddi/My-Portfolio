import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const js = await readFile(path.join(root, 'monetization.js'), 'utf8');
const css = await readFile(path.join(root, 'monetization.css'), 'utf8');
const createSession = await readFile(
  path.join(root, 'api/create-checkout-session.js'),
  'utf8'
);
const sessionStatus = await readFile(
  path.join(root, 'api/session-status.js'),
  'utf8'
);

assert.match(
  js,
  /const FREE_MODES = new Set\(\['say', 'trivia', 'identity', 'reflection'\]\)/
);
assert.match(js, /stopImmediatePropagation/);
assert.match(js, /initEmbeddedCheckout/);
assert.match(js, /verifySession\(sessionId/);
assert.match(js, /document\.querySelectorAll\('\.modeGroup'\)/);
assert.match(js, /setupMode\[data-mode\]/);
assert.doesNotMatch(js, /majlisModeIcon/);
assert.doesNotMatch(js, /al-majlis-entitlements/);
assert.doesNotMatch(js, /premium\s*=\s*true/i);

assert.doesNotMatch(css, /body\s*\{/);
assert.doesNotMatch(css, /\.setupScreen\s*\{/);
assert.doesNotMatch(css, /\.welcomeScreen\s*\{/);
assert.doesNotMatch(css, /\.countdownScreen\s*\{/);
assert.doesNotMatch(css, /#gameShell/);
assert.doesNotMatch(css, /background-image\s*:/);
assert.doesNotMatch(css, /--marble/);
assert.doesNotMatch(css, /data-theme/);

assert.match(createSession, /p\.set\('ui_mode','embedded'\)/);
assert.match(createSession, /p\.set\('redirect_on_completion','if_required'\)/);
assert.match(createSession, /STRIPE_SECRET_KEY/);
assert.match(sessionStatus, /session\.status === 'complete'/);
assert.match(sessionStatus, /session\.payment_status === 'paid'/);

for (const file of [
  'monetization.js',
  'api/create-checkout-session.js',
  'api/session-status.js',
  'scripts/build.mjs'
]) {
  const check = spawnSync(process.execPath, [
    '--check',
    path.join(root, file)
  ], {encoding: 'utf8'});

  assert.equal(
    check.status,
    0,
    `${file} syntax failed:\n${check.stderr}`
  );
}

const sandbox = await mkdtemp(
  path.join(tmpdir(), 'al-majlis-current-integration-')
);

try {
  const originalIndex = `<!doctype html>
    <html data-theme="light">
      <head>
        <link rel="stylesheet" href="./styles.css?v=47">
      </head>
      <body>
        <section id="welcomeScreen"></section>
        <section class="screen setupScreen" id="setupScreen" hidden>
          <div id="setupModes"></div>
        </section>
        <div id="softToast"></div>
        <script src="./cards-data.js?v=47"></script>
        <script src="./app.js?v=47"></script>
        <script src="./upgrade-v44.js?v=47"></script>
      </body>
    </html>`;

  const originalApp =
    'window.originalGameplaySoundsCountdownNavigationRemain = true;';
  const originalCss =
    ':root{--marble:existing-original-marble}' +
    'body{background:var(--marble)}' +
    '[data-theme="dark"] body{background:var(--marble)}';

  await writeFile(path.join(sandbox, 'index.html'), originalIndex);
  await writeFile(path.join(sandbox, 'app.js'), originalApp);
  await writeFile(path.join(sandbox, 'styles.css'), originalCss);
  await writeFile(path.join(sandbox, 'cards-data.js'), 'window.cards=[];');
  await writeFile(path.join(sandbox, 'upgrade-v44.js'), 'window.upgradeLoaded=true;');
  await writeFile(path.join(sandbox, 'monetization.js'), js);
  await writeFile(path.join(sandbox, 'monetization.css'), css);

  await mkdir(path.join(sandbox, 'scripts'));
  await cp(
    path.join(root, 'scripts/build.mjs'),
    path.join(sandbox, 'scripts/build.mjs')
  );

  const build = spawnSync(
    process.execPath,
    ['scripts/build.mjs'],
    {cwd: sandbox, encoding: 'utf8'}
  );

  assert.equal(build.status, 0, build.stderr);

  const builtIndex = await readFile(
    path.join(sandbox, 'dist/index.html'),
    'utf8'
  );

  assert.match(builtIndex, /styles\.css\?v=47/);
  assert.match(builtIndex, /cards-data\.js\?v=47/);
  assert.match(builtIndex, /app\.js\?v=47/);
  assert.match(builtIndex, /upgrade-v44\.js\?v=47/);
  assert.match(builtIndex, /monetization\.css/);
  assert.match(builtIndex, /monetization\.js/);

  assert.ok(
    builtIndex.indexOf('upgrade-v44.js') <
      builtIndex.indexOf('monetization.js'),
    'Monetization must load after the existing Islam vs Culture upgrade.'
  );

  assert.equal(
    await readFile(path.join(sandbox, 'app.js'), 'utf8'),
    originalApp
  );
  assert.equal(
    await readFile(path.join(sandbox, 'styles.css'), 'utf8'),
    originalCss
  );
  assert.equal(
    await readFile(path.join(sandbox, 'dist/app.js'), 'utf8'),
    originalApp
  );
  assert.equal(
    await readFile(path.join(sandbox, 'dist/styles.css'), 'utf8'),
    originalCss
  );
} finally {
  await rm(sandbox, {recursive: true, force: true});
}

console.log(
  'Verified against the current Al Majlis selectors and script order.'
);
