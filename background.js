// All reads and writes pass through one queue, so rapid edits cannot overtake each other.
const KEY = 'quietNotesV1';
let queue = Promise.resolve();
const MAX_NOTES = 500;
function validateNote(note) {
  if (!note || typeof note.title !== 'string' || typeof note.body !== 'string' ||
      note.title.length > 160 || note.body.length > 100000) {
    throw new Error('Each note needs a title under 161 characters and text under 100,001 characters.');
  }
}
async function readState() {
  const stored = (await chrome.storage.local.get(KEY))[KEY];
  return stored || {version: 1, notes: []};
}
async function writeState(state) {
  // Leave space below Chrome's quota, including on older supported versions.
  if (new TextEncoder().encode(JSON.stringify(state)).length > 4000000) {
    throw new Error('Notes storage is full. Export a backup, then permanently delete unneeded notes.');
  }
  await chrome.storage.local.set({[KEY]: state});
}
async function handle(message) {
  const state = await readState();
  if (message.type === 'list') return state;
  if (message.type === 'create') {
    if (state.notes.length >= MAX_NOTES) throw new Error('Limit of 500 notes reached, including Trash.');
    const now = new Date().toISOString();
    const note = {id: crypto.randomUUID(), title: '', body: '', createdAt: now, updatedAt: now, deleted: false};
    state.notes.unshift(note);
    await writeState(state);
    return note;
  }
  if (message.type === 'import') {
    const backup = message.backup;
    if (!backup || backup.app !== 'quiet-notes' || backup.version !== 1 || !Array.isArray(backup.notes)) {
      throw new Error('Choose a Quiet Notes JSON backup (version 1).');
    }
    if (state.notes.length + backup.notes.length > MAX_NOTES) throw new Error('Import would exceed the 500-note limit.');
    const incoming = backup.notes.map(note => {
      validateNote(note);
      const now = new Date().toISOString();
      return {id: crypto.randomUUID(), title: note.title, body: note.body,
        createdAt: typeof note.createdAt === 'string' && Number.isFinite(Date.parse(note.createdAt)) ? note.createdAt : now,
        updatedAt: now, deleted: note.deleted === true};
    });
    state.notes.push(...incoming); // New IDs preserve existing notes; imports never overwrite them.
    await writeState(state);
    return {count: incoming.length};
  }
  const index = state.notes.findIndex(note => note.id === message.id);
  if (index < 0) throw new Error('This note is no longer available. Reopen the extension.');
  const note = state.notes[index];
  if (message.type === 'save') {
    validateNote(message);
    if (note.deleted) throw new Error('Restore this note before editing it.');
    note.title = message.title;
    note.body = message.body;
    note.updatedAt = new Date().toISOString();
  } else if (message.type === 'trash' || message.type === 'restore') {
    note.deleted = message.type === 'trash';
    note.updatedAt = new Date().toISOString();
  } else if (message.type === 'purge') {
    if (!note.deleted) throw new Error('Move the note to Trash first.');
    state.notes.splice(index, 1);
  } else {
    throw new Error('Unknown action.');
  }
  await writeState(state);
  return note;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false;
  const task = queue.then(() => handle(message));
  queue = task.catch(() => {}); // A failed write must not block later requests.
  task.then(data => respond({ok: true, data}), error => respond({ok: false, error: error.message}));
  return true;
});
