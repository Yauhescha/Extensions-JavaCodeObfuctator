# Java Code Privacy Helper

A browser extension for reversible renaming of Java identifiers before sharing code snippets in an AI chat. It saves the mapping locally so names can be restored in the returned response.

[Chrome Web Store](https://chromewebstore.google.com/detail/java-code-privacy-helper/kgngddllpkmkobnpalloalcjjbgdncmk)

## Workflow

1. Paste a Java snippet into the popup.
2. Select **Obfuscate** and copy the result to your chat.
3. Paste the response back into the extension.
4. Select **De-obfuscate** to restore identifiers using the latest saved mapping.

## Features

- Rename classes, methods, fields, local variables, parameters and type references.
- Configure preservation of annotation names, constants and public API.
- Choose a placeholder prefix.
- Copy the output to the clipboard.
- English and Russian interfaces.
- Local settings and mapping history; up to 50 saved sessions in the storage layer.

## Install from source

Requires Chrome 114+ or a compatible Chromium browser supporting the manifest APIs.

1. Clone or download this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Select **Load unpacked** and choose the repository root.
4. Open the popup. Settings are available from the extension's options page.

No bundler or dependency installation is required. The manifest version is 3; the current extension version is 1.3.0.

## Scope

The transformation runs locally. The extension does not send the snippet to an AI service; that step is performed by the user.

Identifier renaming does not remove secrets, string literals, comments or identifying business logic. The implementation uses token and context analysis rather than a complete Java compiler. Review the result, especially for reflection, serialization, framework conventions and references outside the snippet. Restoring a response relies on the corresponding saved mapping.

## Source layout

| Path | Purpose |
| --- | --- |
| `src/javaObfuscator.js` | Identifier analysis and reversible transformation |
| `src/storage.js` | Settings and mapping sessions |
| `src/i18n.js` | English/Russian interface text |
| `popup.*` | Paste, transform and copy workflow |
| `options.*` | Transformation preferences |
