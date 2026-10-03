(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JCPHStorage = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const KEYS = {
    settings: 'jcph_settings',
    sessions: 'jcph_sessions'
  };

  const DEFAULT_SETTINGS = {
    renameClasses: true,
    renameMethods: true,
    renameFields: true,
    renameLocals: true,
    renameParameters: true,
    renameTypeReferences: true,
    preserveAnnotations: true,
    preserveConstants: true,
    preservePublicApi: false,
    placeholderPrefix: 'JCPH',
    uiLanguage: 'en'
  };

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  }

  function randomId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `jcph-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function getObject(key, fallback) {
    if (hasChromeStorage()) {
      const data = await chrome.storage.local.get([key]);
      return data[key] === undefined ? fallback : data[key];
    }
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  async function setObject(key, value) {
    if (hasChromeStorage()) {
      await chrome.storage.local.set({ [key]: value });
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  async function getSettings() {
    const settings = await getObject(KEYS.settings, {});
    return Object.assign({}, DEFAULT_SETTINGS, settings || {});
  }

  async function saveSettings(settings) {
    const merged = Object.assign({}, await getSettings(), settings || {});
    await setObject(KEYS.settings, merged);
    return merged;
  }

  async function getSessions() {
    return await getObject(KEYS.sessions, []);
  }

  async function addSession(session) {
    const sessions = await getSessions();
    const safe = Object.assign({}, session, { id: session.id || randomId() });
    sessions.unshift(safe);
    await setObject(KEYS.sessions, sessions.slice(0, 50));
    return safe;
  }

  async function getLatestSession() {
    const sessions = await getSessions();
    return sessions[0] || null;
  }

  async function clearSessions() {
    await setObject(KEYS.sessions, []);
  }

  async function clearAll() {
    if (hasChromeStorage()) {
      await chrome.storage.local.remove(Object.values(KEYS));
      return;
    }
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  return {
    KEYS,
    DEFAULT_SETTINGS,
    getSettings,
    saveSettings,
    getSessions,
    addSession,
    getLatestSession,
    clearSessions,
    clearAll
  };
});
