# Build validation — version 1.0.0

Completed:
- JavaScript syntax checks for background.js and popup.js.
- Five automated Node tests against the actual background.js with a mocked Chrome
  storage/messaging adapter: rapid writes and worker restart; Trash/restore/permanent
  delete; atomic import and fresh IDs; write failure/retry; size limits.
- Manifest JSON parsing and all referenced runtime/icon file paths checked.
- Popup element references checked against HTML IDs.
- ZIP integrity checked and runtime files packaged with documentation and tests.

Limitations:
- A live Chrome/Chromium browser was not available in the build environment. The browser
  installation attempt failed, so no live extension installation, visual rendering,
  download/import file-picker, popup-close, or browser-restart test is claimed.
- The automated tests mock Chrome APIs; they do not substitute for browser testing.
- Not submitted to or approved by the Chrome Web Store.

First-run acceptance check on your computer:
1. Load unpacked, create a note, and enter a title and multiline text.
2. Wait for All changes saved, close/reopen the popup, and verify the text.
3. Type a final word and immediately close/reopen; verify the last word is present.
4. Restart Chrome and verify the saved note.
5. Create another note; search for a word in its body.
6. Move a note to Trash, then restore it.
7. Export a backup. Import it and verify new copies appear without overwriting originals.
8. Only delete any test copies permanently after verifying your originals remain.
