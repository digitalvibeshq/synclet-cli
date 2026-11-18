#!/usr/bin/env node
const fs = require("fs");
const { spawn } = require("child_process");

const {
  maybePrintCachedNotice,
  spawnUpdateCheckRunner,
} = require("./update_check");

const exe = process.platform === "win32" ? "synclet.exe" : "synclet";
const platformPackage = `@digitalvibeshq/synclet-${process.platform}-${process.arch}`;

const PKG = (() => {
  try {
    return require("./package.json");
  } catch {
    return null;
  }
})();

let binPath;
try {
  binPath = require.resolve(`${platformPackage}/bin/${exe}`);
} catch {
  console.error(
    `synclet: ${platformPackage} is not installed. ` +
      "Either this platform is unsupported or optional dependencies were " +
      "omitted (--omit=optional / --no-optional).",
  );
  process.exit(1);
}

if (process.platform !== "win32") {
  try {
    fs.chmodSync(binPath, 0o755);
  } catch {}
}

const child = spawn(binPath, process.argv.slice(2), {
  stdio: "inherit",
  windowsHide: true,
});

// A caller that signals only the wrapper would otherwise orphan the binary.
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => child.kill(sig));
}

// Best-effort update notice.
try {
  maybePrintCachedNotice({ installedVersion: PKG && PKG.version });
  spawnUpdateCheckRunner();
} catch {}

child.on("exit", (code) => {
  process.exitCode = code == null ? 1 : code;
});
child.on("error", (err) => {
  console.error(err.message);
  process.exitCode = 1;
});
