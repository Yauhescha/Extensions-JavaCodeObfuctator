const ids = [
  'uiLanguage',
  'renameClasses',
  'renameMethods',
  'renameFields',
  'renameLocals',
  'renameParameters',
  'renameTypeReferences',
  'preserveAnnotations',
  'preserveConstants',
  'preservePublicApi',
  'placeholderPrefix'
];

const $ = (id) => document.getElementById(id);
const status = $('status');
let language = 'en';

function t(key, params = {}) {
  return JCPHI18n.t(language, key, params);
}

function setStatus(text) {
  status.textContent = text;
  setTimeout(() => { if (status.textContent === text) status.textContent = ''; }, 3500);
}

function applyLanguage(lang) {
  language = JCPHI18n.normalizeLanguage(lang || 'en');
  JCPHI18n.applyToDocument(language);
}

async function load() {
  const settings = await JCPHStorage.getSettings();
  applyLanguage(settings.uiLanguage);
  for (const id of ids) {
    const el = $(id);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = Boolean(settings[id]);
    else el.value = settings[id] ?? '';
  }
}

async function save() {
  const payload = {};
  for (const id of ids) {
    const el = $(id);
    if (!el) continue;
    if (el.type === 'checkbox') payload[id] = el.checked;
    else payload[id] = el.value.trim();
  }
  await JCPHStorage.saveSettings(payload);
  applyLanguage(payload.uiLanguage);
  setStatus(t('saved'));
}

async function clearMappings() {
  await JCPHStorage.clearSessions();
  setStatus(t('mappingsCleared'));
}

async function resetAll() {
  if (!confirm(t('resetConfirm'))) return;
  await JCPHStorage.clearAll();
  await load();
  setStatus(t('resetDone'));
}

$('saveBtn').addEventListener('click', save);
$('clearMappingsBtn').addEventListener('click', clearMappings);
$('resetBtn').addEventListener('click', resetAll);
$('uiLanguage').addEventListener('change', (event) => applyLanguage(event.target.value));
load();
