/* =========================
   OFFLINE DATABASE
========================= */

const DB_NAME = "serengeti_offline_db";
const DB_VERSION = 1;

let db;

/* =========================
   OPEN DATABASE
========================= */

function openDatabase(){

return new Promise((resolve,reject)=>{

const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = function(e){

db = e.target.result;

/* OFFLINE INCIDENTS */

if(!db.objectStoreNames.contains("offline_crimes")){

db.createObjectStore("offline_crimes",{
keyPath:"offline_id",
autoIncrement:true
});

}

/* SYNC QUEUE */

if(!db.objectStoreNames.contains("sync_queue")){

db.createObjectStore("sync_queue",{
keyPath:"queue_id",
autoIncrement:true
});

}

};

/* SUCCESS */

request.onsuccess = function(e){

db = e.target.result;

console.log("Offline DB Ready");

resolve(db);

};

/* ERROR */

request.onerror = function(e){

console.log("IndexedDB Error", e);

reject(e);

};

});

}

/* =========================
   SAVE OFFLINE CRIME
========================= */

async function saveOfflineCrime(data){

await openDatabase();

return new Promise((resolve,reject)=>{

const tx = db.transaction(
["offline_crimes","sync_queue"],
"readwrite"
);

const crimeStore =
tx.objectStore("offline_crimes");

const queueStore =
tx.objectStore("sync_queue");

/* SAVE CRIME */

crimeStore.add(data);

/* ADD TO SYNC QUEUE */

queueStore.add({
type:"crime",
data:data,
synced:false,
created_at:new Date()
});

tx.oncomplete = ()=>{

console.log("Saved Offline");

resolve(true);

};

tx.onerror = (e)=>{

console.log("Offline Save Error",e);

reject(e);

};

});

}

/* =========================
   GET OFFLINE CRIMES
========================= */

async function getOfflineCrimes(){

await openDatabase();

return new Promise((resolve,reject)=>{

const tx =
db.transaction(["offline_crimes"],"readonly");

const store =
tx.objectStore("offline_crimes");

const request =
store.getAll();

request.onsuccess = ()=>{

resolve(request.result);

};

request.onerror = (e)=>{

reject(e);

};

});

}

/* =========================
   GET SYNC QUEUE
========================= */

async function getSyncQueue(){

await openDatabase();

return new Promise((resolve,reject)=>{

const tx =
db.transaction(["sync_queue"],"readonly");

const store =
tx.objectStore("sync_queue");

const request =
store.getAll();

request.onsuccess = ()=>{

resolve(request.result);

};

request.onerror = (e)=>{

reject(e);

};

});

}

/* =========================
   CLEAR SYNC ITEM
========================= */

async function clearSyncItem(id){

await openDatabase();

return new Promise((resolve,reject)=>{

const tx =
db.transaction(["sync_queue"],"readwrite");

const store =
tx.objectStore("sync_queue");

store.delete(id);

tx.oncomplete = ()=>resolve(true);

tx.onerror = e=>reject(e);

});

}

/* =========================
   SYNCHRONIZE
========================= */

async function synchronizeData(){

if(!navigator.onLine){

alert("No internet connection");

return;

}

const queue = await getSyncQueue();

if(queue.length===0){

alert("Nothing to synchronize");

return;

}

for(const item of queue){

try{

if(item.type==="crime"){

const r = await fetch('/criminals',{

method:'POST',

headers:{
'Content-Type':'application/json'
},

body:JSON.stringify(item.data)

});

const result = await r.json();

if(result.success){

await clearSyncItem(item.queue_id);

console.log("Synced", item.queue_id);

}

}

}catch(err){

console.log("SYNC ERROR",err);

}

}

alert("Synchronization completed");

}

/* =========================
   CONNECTION STATUS
========================= */

window.addEventListener('online',()=>{

console.log("ONLINE");

});

window.addEventListener('offline',()=>{

console.log("OFFLINE");

});