const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { detectUpdateCommand, maybePrintCachedNotice } = require('./update_check');

function withMiseDataDir(value, fn) {
  const saved = process.env.MISE_DATA_DIR;
  if (value === undefined) delete process.env.MISE_DATA_DIR;
  else process.env.MISE_DATA_DIR = value;
  try {
    fn();
  } finally {
    if (saved === undefined) delete process.env.MISE_DATA_DIR;
    else process.env.MISE_DATA_DIR = saved;
  }
}

test('suggests mise upgrade for a default mise install', () => {
  withMiseDataDir(undefined, () => {
    assert.strictEqual(
      detectUpdateCommand('synclet', '/home/u/.local/share/mise/installs/npm-synclet/2.0.3/lib/node_modules/synclet'),
      'mise upgrade npm:synclet'
    );
    assert.strictEqual(
      detectUpdateCommand('synclet', 'C:\\Users\\u\\AppData\\Local\\mise\\installs\\npm-synclet\\2.0.3\\node_modules\\synclet'),
      'mise upgrade npm:synclet'
    );
  });
});

test('suggests mise upgrade under a custom MISE_DATA_DIR', () => {
  withMiseDataDir('/opt/tools', () => {
    assert.strictEqual(
      detectUpdateCommand('synclet', '/opt/tools/installs/npm-synclet/2.0.3/lib/node_modules/synclet'),
      'mise upgrade npm:synclet'
    );
  });
});

test('suggests npm install -g otherwise', () => {
  withMiseDataDir('/opt/tools', () => {
    assert.strictEqual(
      detectUpdateCommand('synclet', '/usr/lib/node_modules/synclet'),
      'npm install -g synclet'
    );
    assert.strictEqual(
      detectUpdateCommand('synclet', '/opt/tools/installs/node/22/lib/node_modules/synclet'),
      'npm install -g synclet'
    );
    assert.strictEqual(
      detectUpdateCommand('synclet', '/opt/tools-other/installs/npm-synclet/lib/node_modules/synclet'),
      'npm install -g synclet'
    );
  });
});

function withNoticeEnv(tmpDir, fn) {
  const keys = [
    'HOME',
    'XDG_CACHE_HOME',
    'LOCALAPPDATA',
    'CI',
    'NO_UPDATE_NOTIFIER',
    'SYNCLET_NO_UPDATE_NOTICE',
    'CONFIGMESH_NO_UPDATE_NOTICE',
  ];
  const savedEnv = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const savedIsTTY = process.stderr.isTTY;
  const savedError = console.error;
  const lines = [];

  process.env.HOME = tmpDir;
  process.env.XDG_CACHE_HOME = tmpDir;
  process.env.LOCALAPPDATA = tmpDir;
  for (const k of ['CI', 'NO_UPDATE_NOTIFIER', 'SYNCLET_NO_UPDATE_NOTICE', 'CONFIGMESH_NO_UPDATE_NOTICE']) {
    delete process.env[k];
  }
  process.stderr.isTTY = true;
  console.error = (...args) => lines.push(args.join(' '));

  try {
    fn(lines);
  } finally {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    process.stderr.isTTY = savedIsTTY;
    console.error = savedError;
  }
}

test('notifies beta users when latest is a matching or newer stable release', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'synclet-update-test-'));
  const cacheFile =
    process.platform === 'darwin'
      ? path.join(tmpDir, 'Library', 'Caches', 'synclet', 'update.json')
      : path.join(tmpDir, 'synclet', 'update.json');

  try {
    for (const tc of [
      { latest: '2.3.0', wantNotice: true },
      { latest: '2.4.0', wantNotice: true },
      { latest: '2.2.0', wantNotice: false },
    ]) {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify({ lastChecked: Date.now(), latest: tc.latest }));

      withNoticeEnv(tmpDir, (lines) => {
        const printed = maybePrintCachedNotice({ installedVersion: '2.3.0-beta1' });
        assert.strictEqual(printed, tc.wantNotice, `latest=${tc.latest}`);
        assert.strictEqual(lines.length, tc.wantNotice ? 1 : 0, `latest=${tc.latest}`);
        if (tc.wantNotice) {
          assert.match(lines[0], new RegExp(`installed 2\\.3\\.0-beta1, latest ${tc.latest.replace(/\./g, '\\.')}`));
        }
      });
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
