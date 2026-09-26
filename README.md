# Quiet Notes — Auto-save Notes

Version 1.0.0 • Chrome Manifest V3 • No build step or account required

A local notes extension with immediate auto-save, title/content search, multiple notes,
Trash and restoration, and JSON backup export/import. Built with plain HTML, CSS and
JavaScript. Only the `storage` permission is requested. No network requests, analytics,
website access, external fonts, CDN scripts, backend, or API keys.

## Install on Windows

1. Download `Quiet_Notes_Chrome_Extension.zip` and choose **Extract All**.
2. Move the extracted `quick-notes-extension` folder to a stable location such as
   `D:\Projects\quiet-notes-extension`. Keep this folder: Chrome loads the files here.
3. In Chrome's address bar enter `chrome://extensions`.
4. Turn **Developer mode** on (top right).
5. Click **Load unpacked** and select the folder containing `manifest.json`.
6. Open the puzzle-piece Extensions menu and pin **Quiet Notes — Auto-save Notes**.
7. Click the icon, select **+ New note**, and type a title and text.
8. Wait for **All changes saved on this device**, close the popup, then reopen it.

Do not open popup.html by double-clicking it: Chrome extension APIs require the loaded
extension context. No terminal, npm, Python, Java, or VS Code is needed to use it.

## Everyday use

- The title and body save automatically after input. There is no Save button.
- Search matches title and body in the selected folder.
- **Move to Trash** is reversible: open Trash, select the note, and click Restore.
- **Delete forever** in Trash requires confirmation and is irreversible.
- **Export backup** downloads a JSON file containing all notes, including Trash.
- **Import** accepts that JSON format and adds copies without replacing existing notes.
  Importing the same backup twice makes duplicate copies.
- A write error displays **Not saved** and a Retry saving button. Keep the popup open,
  copy important unsaved text elsewhere if necessary, and retry. Do not assume an error
  message means the changes were saved.

## Data and limits

Notes belong to this Chrome profile on this device. There is no cloud synchronization.
Uninstalling the extension or deleting the browser profile removes its local notes.
Export a backup before uninstalling, moving the extension folder, or replacing a local
installation. Export regularly for recovery; ordinary local storage is not encrypted
secret storage and this extension is not a password manager.

Limits: 500 notes including Trash; 160 characters per title; 100,000 UTF-16 code units
per note body; approximately 4 MB total serialized UTF-8 note data. A backup import
file may be up to 8 MB, but the resulting stored data still must fit the 4 MB budget.
Multi-window simultaneous editing of the same note uses last-write-wins; use one editor
at a time. Auto-save is not a guarantee against OS crashes, disk failures, or closing
Chrome before a write finishes. The saved indicator confirms the storage API completed.

## Troubleshooting

**Manifest missing:** extract the ZIP and select the folder directly containing
manifest.json, not its parent or the ZIP file.

**Extension not visible:** pin it from Chrome's puzzle-piece menu.

**Save failed:** retry while the popup remains open. If storage is full, export your
saved notes, copy any unsaved text elsewhere, and make space by removing unneeded notes.
You may need to reopen the extension after preserving unsaved text to manage full storage.

**Developer mode blocked:** managed work/school browsers may prohibit unpacked
extensions. Use a permitted personal browser profile/device.

**Developer debugging:** right-click the popup and select Inspect. Worker errors can
be inspected from the extension card on chrome://extensions. After code edits, reload
the extension on that page and reopen the popup.

## Code map

- manifest.json — MV3 metadata, storage permission, popup, background worker, icons.
- background.js — serialized reads/writes, validation, trash, and atomic backup import.
- popup.html / popup.css — UI and styling.
- popup.js — immediate save dispatch, acknowledgements, search, import/export.
- icons/ — packaged PNG icons at 16, 32, 48, and 128 pixels.
- PRIVACY.md — accurate data-handling description for this version.
- tests/ — Node built-in test suite; optional for developers.
- VALIDATION.md — checks performed during this build.

The worker processes messages in order and each edit is sent immediately, without a
popup debounce timer. Reads/exports go through the same queue so they see earlier saves.
Failed writes do not poison the queue. Import validates every note before writing,
uses fresh IDs, and does not overwrite existing notes. Note content is displayed as text,
never interpreted as HTML. No remote executable code is used.

## Share or publish later

For a trusted developer/tester, share the ZIP and these unpacked-install instructions.
For general users, register in the Chrome Web Store developer dashboard, complete
account requirements, prepare listing screenshots and a promotional image, publish an
accessible privacy-policy page, and submit the extension for review. This package is
built for local installation; it has not been submitted or approved by the Chrome Web Store.

For store upload, ZIP the **contents** of this folder so manifest.json is at the archive
root. Runtime files are manifest.json, background.js, popup.html, popup.css, popup.js,
and icons/. Documentation/tests are not required in the store package. Supply a 440×280
promotional image and at least one 1280×800 or 640×400 screenshot. Use a publisher name
and support contact you control. Increase manifest version for each code update.

## Developer tests

With Node.js installed, run `node --test tests/background.test.cjs` from this folder.
There are no application dependencies to install.
