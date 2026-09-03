/* =========================================================
 *  Timer pool — every setTimeout a game schedules is tracked so
 *  stop() can cancel all of them. Untracked timers were firing after
 *  exit: playing sounds on the landing page, appending DOM into hidden
 *  game containers, and starting immortal rAF loops.
 *
 *  Usage:
 *    const timers = createTimerPool();
 *    timers.later(() => ..., 300);   // like setTimeout
 *    timers.clearAll();              // in stop()/cleanup()
 * ========================================================= */

export function createTimerPool() {
  const ids = new Set();
  return {
    later(fn, ms) {
      const id = setTimeout(() => { ids.delete(id); fn(); }, ms);
      ids.add(id);
      return id;
    },
    cancel(id) {
      if (id == null) return;
      clearTimeout(id);
      ids.delete(id);
    },
    clearAll() {
      ids.forEach(id => clearTimeout(id));
      ids.clear();
    },
    get size() { return ids.size; }
  };
}
