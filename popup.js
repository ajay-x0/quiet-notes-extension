const $ = id => document.getElementById(id);
let notes = [], selected = null, trash = false, serial = 0;
const dirty = new Map();
let pending = new Set();
async function call(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || 'Extension unavailable. Reopen it and try again.');
  return response.data;
}
function notice(message = '') { $('notice').textContent = message; $('notice').hidden = !message; }
function status(message) { $('status').textContent = message; }
function current() { return notes.find(note => note.id === selected); }
function date(value) { return new Date(value).toLocaleDateString(undefined, {month:'short',day:'numeric'}); }
function renderList() {
  $('noteCount').textContent = notes.filter(n => !n.deleted).length;
  $('trashCount').textContent = notes.filter(n => n.deleted).length;
  const query = $('search').value.toLocaleLowerCase();
  const visible = notes.filter(n => n.deleted === trash && (n.title + '\n' + n.body).toLocaleLowerCase().includes(query));
  visible.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  $('list').replaceChildren();
  for (const note of visible) {
    const card = document.createElement('button');
    card.className = 'note-card' + (selected === note.id ? ' selected' : '');
    card.setAttribute('aria-pressed', String(selected === note.id));
    const title = document.createElement('strong'); title.textContent = note.title.trim() || 'Untitled note';
    const preview = document.createElement('p'); preview.textContent = note.body.trim() || 'A fresh page, just for you.';
    const stamp = document.createElement('small'); stamp.textContent = date(note.updatedAt);
    card.append(title, preview, stamp);
    card.addEventListener('click', () => { selected = note.id; renderList(); showEditor(); });
    $('list').append(card);
  }
  if (!visible.length) { const text = document.createElement('p'); text.className='no-results'; text.textContent=query ? 'No matching notes.' : trash ? 'Trash is empty. Deleted notes stay here until you remove them permanently.' : 'Your next idea starts with a new note.'; $('list').append(text); }
}
function counts() { const text = $('body').value.trim(); $('words').textContent = (text ? text.split(/\s+/u).length : 0) + ' words · ' + $('body').value.length.toLocaleString() + ' characters'; }
function showEditor() {
  const note = current();
  $('editor').hidden = !note; $('empty').hidden = !!note;
  if (!note) return;
  $('title').value=note.title; $('body').value=note.body;
  $('title').readOnly=note.deleted; $('body').readOnly=note.deleted;
  $('restore').hidden=!note.deleted;
  $('delete').textContent=note.deleted ? 'Delete forever' : 'Move to Trash';
  $('date').textContent=(note.deleted ? 'In Trash · ' : 'Updated ') + date(note.updatedAt);
  counts();
}
function updateStatus() {
  $('retry').hidden = !dirty.size || !!pending.size;
  status(pending.size ? 'Saving…' : dirty.size ? 'Not saved — retry before closing' : 'All changes saved on this device');
}
function persist(note) {
  const token = ++serial;
  const snapshot = {type:'save',id:note.id,title:note.title,body:note.body};
  dirty.set(note.id, {token, snapshot});
  // Dispatch immediately; no popup timer can discard the last keystrokes.
  const request = call(snapshot).then(() => {
    if (dirty.get(note.id)?.token === token) dirty.delete(note.id);
  }).catch(error => { notice(error.message); }).finally(() => { pending.delete(request); updateStatus(); });
  pending.add(request); updateStatus();
}
function edit() {
  const note = current(); if (!note || note.deleted) return;
  note.title=$('title').value; note.body=$('body').value; note.updatedAt=new Date().toISOString();
  notice(); persist(note); counts(); renderList();
}
async function flush() {
  await Promise.all([...pending]);
  if (dirty.size) throw new Error('Some edits are not saved. Click Retry saving before continuing.');
}
async function refresh() { notes=(await call({type:'list'})).notes; if (!notes.some(n=>n.id===selected && n.deleted===trash)) selected=notes.find(n=>n.deleted===trash)?.id || null; renderList(); showEditor(); }
function switchFolder(isTrash) {
  trash=isTrash; selected=notes.find(n=>n.deleted===trash)?.id || null;
  $('notesTab').classList.toggle('active',!trash); $('trashTab').classList.toggle('active',trash);
  $('notesTab').setAttribute('aria-pressed',String(!trash)); $('trashTab').setAttribute('aria-pressed',String(trash));
  renderList(); showEditor();
}
async function guarded(fn) { try { await fn(); } catch(error) { notice(error.message); } }
$('title').addEventListener('input',edit); $('body').addEventListener('input',edit);
$('search').addEventListener('input',renderList);
$('notesTab').addEventListener('click',()=>switchFolder(false)); $('trashTab').addEventListener('click',()=>switchFolder(true));
$('newNote').addEventListener('click',()=>guarded(async()=> {
  await flush(); const note=await call({type:'create'}); notes.unshift(note); $('search').value=''; switchFolder(false); selected=note.id; renderList(); showEditor(); status('New note ready · Auto-save is on'); $('title').focus();
}));
$('delete').addEventListener('click',()=>guarded(async()=> {
  const note=current(); if (!note) return;
  if (note.deleted && !confirm('Permanently delete this note? This cannot be undone. Export a backup first if needed.')) return;
  await flush(); await call({type:note.deleted?'purge':'trash',id:note.id}); await refresh(); status(note.deleted?'Note permanently deleted':'Moved to Trash · You can restore it');
}));
$('restore').addEventListener('click',()=>guarded(async()=> { const note=current(); if(!note)return; await flush(); await call({type:'restore',id:note.id}); await refresh(); status('Note restored to Notes'); }));
$('retry').addEventListener('click',()=> { notice(); for(const [id] of dirty) { const note=notes.find(n=>n.id===id); if(note)persist(note); } });
$('export').addEventListener('click',()=>guarded(async()=> {
  await flush(); const state=await call({type:'list'});
  const backup={app:'quiet-notes',version:1,exportedAt:new Date().toISOString(),notes:state.notes};
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const link=document.createElement('a');
  link.href=url; link.download='quiet-notes-backup-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),10000);
  status('Backup download requested · Check Downloads');
}));
$('import').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',()=>guarded(async()=> {
  const file=$('file').files[0]; $('file').value=''; if(!file)return;
  if(file.size>8000000)throw new Error('Backup file is too large (maximum 8 MB).');
  let backup; try {backup=JSON.parse(await file.text());} catch {throw new Error('This file is not valid JSON. Choose an exported backup.');}
  if(!backup || backup.app!=='quiet-notes' || backup.version!==1 || !Array.isArray(backup.notes))throw new Error('Choose a Quiet Notes JSON backup (version 1).');
  if(!confirm('Add '+backup.notes.length+' notes from this backup? Existing notes are preserved. Importing twice creates copies.'))return;
  await flush(); const result=await call({type:'import',backup}); await refresh(); status('Imported '+result.count+' notes'); notice();
}));
guarded(async()=> { await refresh(); for(const id of ['newNote','export','import'])$(id).disabled=false; status('Ready · Notes save automatically'); });
