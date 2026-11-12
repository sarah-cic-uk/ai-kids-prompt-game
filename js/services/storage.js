/*
 * Safe wrapper around localStorage. Private browsing, blocked storage or a
 * full quota fall back to in-memory storage so the game keeps working (scores
 * just won't survive a refresh).
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});
  const PREFIX = 'winterlight:';
  const memory = {};

  let available = false;
  try {
    const probe = PREFIX + 'probe';
    root.localStorage.setItem(probe, '1');
    root.localStorage.removeItem(probe);
    available = true;
  } catch (e) {
    available = false;
  }

  WL.Storage = {
    available,
    prefix: PREFIX,
    get(key, fallback) {
      try {
        const raw = available ? root.localStorage.getItem(PREFIX + key) : memory[key];
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      memory[key] = raw;
      if (!available) return false;
      try {
        root.localStorage.setItem(PREFIX + key, raw);
        return true;
      } catch (e) {
        return false;
      }
    },
    remove(key) {
      delete memory[key];
      if (!available) return;
      try {
        root.localStorage.removeItem(PREFIX + key);
      } catch (e) {
        /* ignore */
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
