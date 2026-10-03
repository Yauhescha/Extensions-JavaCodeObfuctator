(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JCPHI18n = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_LANGUAGE = 'en';

  const STRINGS = {
    en: {
      htmlLang: 'en',
      popupSubtitle: 'Reversible Java identifier obfuscation for AI chats',
      optionsTitle: 'Settings',
      inputLabel: 'Java code or chat response',
      inputPlaceholder: 'Paste Java code to obfuscate, or paste a ChatGPT response to de-obfuscate...',
      obfuscate: 'Obfuscate',
      deobfuscate: 'De-obfuscate',
      copyOutput: 'Copy result',
      outputLabel: 'Result',
      latestMapping: 'Latest mapping',
      noMapping: 'No mapping yet.',
      footer: 'Free version · no payments · runs locally',
      ready: 'Ready. Paste Java code, obfuscate it, send it to an AI chat, then paste the response back to de-obfuscate it.',
      pasteJava: 'Paste Java code into the upper field.',
      obfuscationDone: 'Done: replaced {total} identifier(s), including {type} type reference(s). Mapping was saved locally.',
      obfuscationError: 'Obfuscation error: {message}',
      pasteResponse: 'Paste a ChatGPT response or obfuscated code into the upper field.',
      missingMapping: 'No saved mapping. Obfuscate code first.',
      deobfuscationDone: 'Done: names were restored using the latest mapping.',
      nothingToCopy: 'Nothing to copy.',
      copied: 'Result copied.',
      copyFailed: 'Copy failed. Select the result manually and copy it.',
      settingsHeader: 'Java Code Privacy Helper settings',
      languageSection: 'Language',
      interfaceLanguage: 'Interface language',
      languageHint: 'English is recommended for Chrome Web Store screenshots and review. Russian is available for personal use.',
      obfuscationSection: 'Obfuscation',
      renameClasses: 'Rename classes',
      renameMethods: 'Rename methods',
      renameFields: 'Rename fields',
      renameLocals: 'Rename local variables',
      renameParameters: 'Rename parameters',
      renameTypeReferences: 'Rename type references in fields, parameters, and local variables',
      preserveAnnotations: 'Keep annotation names unchanged',
      preserveConstants: 'Keep UPPER_SNAKE_CASE constants unchanged',
      preservePublicApi: 'Do not rename public API',
      placeholderPrefix: 'Placeholder prefix',
      localHint: 'The extension runs locally: Java code, mappings, and settings stay in browser storage.',
      serviceSection: 'Service',
      saveSettings: 'Save settings',
      clearMappings: 'Clear mappings',
      resetAll: 'Reset all',
      saved: 'Settings saved.',
      mappingsCleared: 'Mappings cleared.',
      resetConfirm: 'Reset settings and mappings?',
      resetDone: 'Everything was reset.'
    },
    ru: {
      htmlLang: 'ru',
      popupSubtitle: 'Обратимая обфускация Java-идентификаторов для AI-чатов',
      optionsTitle: 'Настройки',
      inputLabel: 'Java-код или ответ от чата',
      inputPlaceholder: 'Вставь Java-код для обфускации или ответ ChatGPT для де-обфускации...',
      obfuscate: 'Обфусцировать',
      deobfuscate: 'Де-обфусцировать',
      copyOutput: 'Скопировать результат',
      outputLabel: 'Результат',
      latestMapping: 'Последний mapping',
      noMapping: 'Пока нет mapping.',
      footer: 'Бесплатная версия · без оплаты · всё выполняется локально',
      ready: 'Готово. Вставь Java-код, обфусцируй, отправь в чат, затем вставь ответ обратно для де-обфускации.',
      pasteJava: 'Вставь Java-код в верхнее поле.',
      obfuscationDone: 'Готово: заменено {total} identifier(s), включая {type} type reference(s). Mapping сохранён локально.',
      obfuscationError: 'Ошибка обфускации: {message}',
      pasteResponse: 'Вставь ответ ChatGPT или обфусцированный код в верхнее поле.',
      missingMapping: 'Нет сохранённого mapping. Сначала обфусцируй код.',
      deobfuscationDone: 'Готово: имена восстановлены по последнему mapping.',
      nothingToCopy: 'Нечего копировать.',
      copied: 'Результат скопирован.',
      copyFailed: 'Не удалось скопировать. Выдели результат вручную и скопируй.',
      settingsHeader: 'Настройки Java Code Privacy Helper',
      languageSection: 'Язык',
      interfaceLanguage: 'Язык интерфейса',
      languageHint: 'Для скриншотов и проверки Chrome Web Store лучше оставить English. Русский доступен для личного использования.',
      obfuscationSection: 'Обфускация',
      renameClasses: 'Переименовывать классы',
      renameMethods: 'Переименовывать методы',
      renameFields: 'Переименовывать поля',
      renameLocals: 'Переименовывать локальные переменные',
      renameParameters: 'Переименовывать параметры',
      renameTypeReferences: 'Переименовывать типы в объявлениях полей/параметров/локальных переменных',
      preserveAnnotations: 'Не трогать имена аннотаций',
      preserveConstants: 'Не трогать UPPER_SNAKE_CASE константы',
      preservePublicApi: 'Не переименовывать public API',
      placeholderPrefix: 'Prefix плейсхолдеров',
      localHint: 'Расширение работает локально: Java-код, mapping и настройки остаются в хранилище браузера.',
      serviceSection: 'Сервис',
      saveSettings: 'Сохранить настройки',
      clearMappings: 'Очистить mappings',
      resetAll: 'Сбросить всё',
      saved: 'Настройки сохранены.',
      mappingsCleared: 'Mappings очищены.',
      resetConfirm: 'Сбросить настройки и mappings?',
      resetDone: 'Всё сброшено.'
    }
  };

  function normalizeLanguage(language) {
    return STRINGS[language] ? language : DEFAULT_LANGUAGE;
  }

  function translate(language, key, params = {}) {
    const lang = normalizeLanguage(language);
    const template = STRINGS[lang][key] || STRINGS[DEFAULT_LANGUAGE][key] || key;
    return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
  }

  function applyToDocument(language) {
    const lang = normalizeLanguage(language);
    if (document?.documentElement) document.documentElement.lang = STRINGS[lang].htmlLang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = translate(lang, el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = translate(lang, el.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = translate(lang, el.dataset.i18nPlaceholder);
    });
  }

  return {
    DEFAULT_LANGUAGE,
    STRINGS,
    normalizeLanguage,
    t: translate,
    applyToDocument
  };
});
