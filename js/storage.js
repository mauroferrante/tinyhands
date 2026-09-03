/* =========================================================
 *  Safe storage wrappers
 *  localStorage/sessionStorage throw SecurityError in Safari with
 *  "Block All Cookies" and in some private/partitioned contexts.
 *  A throw at module-evaluation time takes down the whole module
 *  graph, so every access in the app goes through these.
 * ========================================================= */

function safeStore(store) {
  return {
    get(key, fallback = null) {
      try { const v = store.getItem(key); return v === null ? fallback : v; }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { store.setItem(key, String(value)); return true; }
      catch (e) { return false; }
    },
    remove(key) {
      try { store.removeItem(key); } catch (e) {}
    },
    getInt(key, fallback = 0) {
      const n = parseInt(this.get(key, ''), 10);
      return Number.isFinite(n) ? n : fallback;
    }
  };
}

let _local, _session;
try { _local = window.localStorage; } catch (e) { _local = null; }
try { _session = window.sessionStorage; } catch (e) { _session = null; }

const NOOP_STORE = { getItem() { return null; }, setItem() { throw new Error('storage unavailable'); }, removeItem() {} };

export const local   = safeStore(_local   || NOOP_STORE);
export const session = safeStore(_session || NOOP_STORE);
