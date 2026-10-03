const $ = (id) => document.getElementById(id);

const sourceCode = $('sourceCode');
const outputCode = $('outputCode');
const statusEl = $('status');
const footerStats = $('footerStats');
const mappingPreview = $('mappingPreview');

let currentSettings = null;
let latestSession = null;
let language = 'en';

function t(key, params = {}) {
  return JCPHI18n.t(language, key, params);
}

function showStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`.trim();
}

function settingsToObfuscatorOptions(settings) {
  return {
    renameClasses: settings.renameClasses,
    renameMethods: settings.renameMethods,
    renameFields: settings.renameFields,
    renameLocals: settings.renameLocals,
    renameParameters: settings.renameParameters,
    renameTypeReferences: settings.renameTypeReferences,
    preserveAnnotations: settings.preserveAnnotations,
    preserveConstants: settings.preserveConstants,
    preservePublicApi: settings.preservePublicApi,
    placeholderPrefix: settings.placeholderPrefix || 'JCPH'
  };
}

async function refreshState() {
  currentSettings = await JCPHStorage.getSettings();
  language = JCPHI18n.normalizeLanguage(currentSettings.uiLanguage || 'en');
  JCPHI18n.applyToDocument(language);

  latestSession = await JCPHStorage.getLatestSession();
  footerStats.textContent = t('footer');

  if (latestSession) {
    mappingPreview.textContent = JSON.stringify(latestSession.mapping, null, 2);
  } else {
    mappingPreview.textContent = t('noMapping');
  }

  if (!statusEl.textContent) {
    showStatus(t('ready'), 'ok');
  }
}

async function obfuscate() {
  const code = sourceCode.value.trim();
  if (!code) {
    showStatus(t('pasteJava'), 'warn');
    return;
  }

  try {
    const result = JavaCodePrivacyHelper.obfuscate(code, settingsToObfuscatorOptions(currentSettings));
    const session = await JCPHStorage.addSession({
      mapping: result.mapping,
      reverseMapping: result.reverseMapping,
      mappingKinds: result.mappingKinds,
      stats: result.stats,
      createdAt: result.createdAt,
      version: result.version
    });
    latestSession = session;
    outputCode.value = result.obfuscatedCode;
    mappingPreview.textContent = JSON.stringify(result.mapping, null, 2);
    showStatus(t('obfuscationDone', { total: result.stats.total, type: result.stats.type || 0 }), 'ok');
    await refreshState();
  } catch (err) {
    showStatus(t('obfuscationError', { message: err.message }), 'warn');
  }
}

async function deobfuscate() {
  const text = sourceCode.value.trim();
  if (!text) {
    showStatus(t('pasteResponse'), 'warn');
    return;
  }
  latestSession = await JCPHStorage.getLatestSession();
  if (!latestSession || !latestSession.reverseMapping) {
    showStatus(t('missingMapping'), 'warn');
    return;
  }

  outputCode.value = JavaCodePrivacyHelper.deobfuscate(text, latestSession);
  showStatus(t('deobfuscationDone'), 'ok');
}

async function copyOutput() {
  if (!outputCode.value) {
    showStatus(t('nothingToCopy'), 'warn');
    return;
  }

  try {
    await navigator.clipboard.writeText(outputCode.value);
    showStatus(t('copied'), 'ok');
  } catch (_) {
    showStatus(t('copyFailed'), 'warn');
  }
}

function openOptions() {
  if (chrome?.runtime?.openOptionsPage) chrome.runtime.openOptionsPage();
}

$('obfuscateBtn').addEventListener('click', obfuscate);
$('deobfuscateBtn').addEventListener('click', deobfuscate);
$('copyOutputBtn').addEventListener('click', copyOutput);
$('openOptions').addEventListener('click', openOptions);

refreshState();
