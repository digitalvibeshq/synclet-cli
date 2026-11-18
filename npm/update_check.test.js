const test = require('node:test');
const assert = require('node:assert');
const { detectUpdateCommand } = require('./update_check');

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
