'use strict';

const fs = require('fs');
const path = require('path');
const { build } = require('./builder');

function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Watch the source directories and rebuild on change. Returns a handle
 * { buildId, stop } — buildId increments after every successful rebuild
 * so the dev server can trigger live reloads.
 */
function watch(config, { onRebuild } = {}) {
  const state = { buildId: 0 };
  const stopped = { value: false };

  const rebuild = () => {
    if (stopped.value) return;
    try {
      const stats = build(config);
      state.buildId += 1;
      console.log(`rebuilt (${stats.built} built, ${stats.skipped} unchanged, ${stats.assets} assets)`);
      if (onRebuild) onRebuild(stats);
    } catch (err) {
      console.error(`rebuild failed: ${err.message}`);
    }
  };
  const debounced = debounce(rebuild, 150);

  const watchers = [];
  for (const key of ['content', 'layouts', 'assets']) {
    const dir = config.paths[key];
    if (!fs.existsSync(dir)) continue;
    try {
      const watcher = fs.watch(dir, { recursive: true }, (event, filename) => {
        if (filename && path.basename(filename).startsWith('.')) return;
        debounced();
      });
      watchers.push(watcher);
    } catch {
      // recursive watch unsupported on this platform — skip silently
    }
  }

  // Initial build so the first state is fresh.
  rebuild();

  return {
    get buildId() {
      return state.buildId;
    },
    stop() {
      stopped.value = true;
      for (const w of watchers) w.close();
    },
  };
}

module.exports = { watch };
