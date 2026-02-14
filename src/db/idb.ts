const DB_NAME = "tasktracker_sqlite";
const STORE_NAME = "db";
const KEY = "main";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

export async function readSnapshot(): Promise<ArrayBuffer | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(KEY);
    getReq.onerror = () => reject(getReq.error);
    getReq.onsuccess = () => {
      const val = getReq.result;
      if (!val) {
        resolve(null);
        return;
      }
      if (val instanceof ArrayBuffer) {
        resolve(val);
      } else if (val instanceof Blob) {
        val.arrayBuffer().then(resolve).catch(reject);
      } else {
        resolve(null);
      }
    };
  });
}

export async function writeSnapshot(data: Uint8Array): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const putReq = store.put(data.buffer, KEY);
    putReq.onerror = () => reject(putReq.error);
    putReq.onsuccess = () => resolve();
  });
}

