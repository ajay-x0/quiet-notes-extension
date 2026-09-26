const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto');
const code = fs.readFileSync(require('node:path').join(__dirname,'../background.js'),'utf8');
function worker(db={}) {
  let listener, fail=false;
  const clone=v=>structuredClone(v);
  const context={crypto,TextEncoder,chrome:{runtime:{id:'test',onMessage:{addListener:f=>listener=f}},storage:{local:{
    get:async key=>{await new Promise(r=>setTimeout(r,1)); return {[key]:clone(db[key])};},
    set:async value=>{if(fail){fail=false;throw new Error('Disk write failed');}await new Promise(r=>setTimeout(r,1));Object.assign(db,clone(value));}
  }}}};
  vm.runInNewContext(code,context);
  return {db,fail:()=>fail=true,send:msg=>new Promise(resolve=>listener(msg,{id:'test'},resolve))};
}
test('rapid saves remain ordered; restart retains newest text',async()=>{
 const w=worker();const created=await w.send({type:'create'}); const id=created.data.id;
 const writes=Array.from({length:40},(_,i)=>w.send({type:'save',id,title:'Draft',body:'Revision '+i}));
 const responses=await Promise.all(writes);assert(responses.every(r=>r.ok));
 const restarted=worker(w.db);const state=await restarted.send({type:'list'});
 assert.equal(state.data.notes[0].body,'Revision 39');
});
test('trash, restore and permanent deletion preserve expected data',async()=>{
 const w=worker();const {data:n}=await w.send({type:'create'});
 assert.equal((await w.send({type:'purge',id:n.id})).ok,false);
 await w.send({type:'trash',id:n.id});assert.equal((await w.send({type:'save',id:n.id,title:'x',body:'x'})).ok,false);
 await w.send({type:'restore',id:n.id});assert.equal((await w.send({type:'list'})).data.notes[0].deleted,false);
 await w.send({type:'trash',id:n.id});await w.send({type:'purge',id:n.id});
 assert.equal((await w.send({type:'list'})).data.notes.length,0);
});
test('invalid import is atomic and valid import preserves originals with fresh IDs',async()=>{
 const w=worker();const {data:n}=await w.send({type:'create'});
 const invalid={app:'quiet-notes',version:1,notes:[n,{title:123,body:'x'}]};
 assert.equal((await w.send({type:'import',backup:invalid})).ok,false);
 assert.equal((await w.send({type:'list'})).data.notes.length,1);
 assert.equal((await w.send({type:'import',backup:{app:'quiet-notes',version:1,notes:[n]}})).ok,true);
 const list=(await w.send({type:'list'})).data.notes;assert.equal(list.length,2);assert.notEqual(list[0].id,list[1].id);
});
test('failed storage write is reported and retry can succeed',async()=>{
 const w=worker();const {data:n}=await w.send({type:'create'});w.fail();
 const msg={type:'save',id:n.id,title:'retry',body:'keep this'};
 assert.equal((await w.send(msg)).ok,false);
 assert.equal((await w.send({type:'list'})).data.notes[0].body,'');
 assert.equal((await w.send(msg)).ok,true);
 assert.equal((await w.send({type:'list'})).data.notes[0].body,'keep this');
});
test('oversized note and storage budget fail without partial changes',async()=>{
 const w=worker(); const {data:n}=await w.send({type:'create'});
 assert.equal((await w.send({type:'save',id:n.id,title:'x',body:'x'.repeat(100001)})).ok,false);
 const backup={app:'quiet-notes',version:1,notes:Array.from({length:41},()=>({title:'large',body:'x'.repeat(100000)}))};
 assert.equal((await w.send({type:'import',backup})).ok,false);
 assert.equal((await w.send({type:'list'})).data.notes.length,1);
});
