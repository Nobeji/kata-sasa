export type CachedToken = {
  qrCode: string;
  status: "PAID" | "CHECKED_IN";
  holderName: string;
  ticketType: string;
  checkedInAt?: string | null;
};

export type QueuedCheckin = {
  id: string;
  eventId: string;
  qrCode: string;
  deviceInfo?: string;
  createdAt: string;
};

const DB_NAME = "kata-sasa-checkin";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("tokens")) {
        const store = db.createObjectStore("tokens", { keyPath: ["eventId", "qrCode"] });
        store.createIndex("eventId", "eventId", { unique: false });
      }
      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function cacheEventTokens(eventId: string, tokens: CachedToken[]) {
  const db = await openDb();
  const tx = db.transaction("tokens", "readwrite");
  const store = tx.objectStore("tokens");
  // Clear existing tokens for event
  const idx = store.index("eventId");
  const existingReq = idx.getAllKeys(eventId);
  const existingKeys: IDBValidKey[] = await new Promise((resolve, reject) => {
    existingReq.onsuccess = () => resolve(existingReq.result as IDBValidKey[]);
    existingReq.onerror = () => reject(existingReq.error);
  });
  for (const key of existingKeys) store.delete(key);
  for (const t of tokens) store.put({ ...t, eventId });
  await txDone(tx);
  db.close();
}

export async function getCachedToken(eventId: string, qrCode: string): Promise<(CachedToken & { eventId: string }) | undefined> {
  const db = await openDb();
  const tx = db.transaction("tokens", "readonly");
  const store = tx.objectStore("tokens");
  const req = store.get([eventId, qrCode]);
  const result = await new Promise<(CachedToken & { eventId: string }) | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as (CachedToken & { eventId: string }) | undefined);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return result;
}

export async function markTokenCheckedInLocally(eventId: string, qrCode: string) {
  const db = await openDb();
  const tx = db.transaction("tokens", "readwrite");
  const store = tx.objectStore("tokens");
  const req = store.get([eventId, qrCode]);
  const row = await new Promise<(CachedToken & { eventId: string }) | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as (CachedToken & { eventId: string }) | undefined);
    req.onerror = () => reject(req.error);
  });
  if (row) {
    row.status = "CHECKED_IN";
    row.checkedInAt = row.checkedInAt || new Date().toISOString();
    store.put(row);
  }
  await txDone(tx);
  db.close();
}

export async function queueCheckin(item: QueuedCheckin) {
  const db = await openDb();
  const tx = db.transaction("queue", "readwrite");
  tx.objectStore("queue").put(item);
  await txDone(tx);
  db.close();
}

export async function getQueuedCheckins(): Promise<QueuedCheckin[]> {
  const db = await openDb();
  const tx = db.transaction("queue", "readonly");
  const req = tx.objectStore("queue").getAll();
  const rows = await new Promise<QueuedCheckin[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result || []) as QueuedCheckin[]);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return rows;
}

export async function removeQueuedCheckin(id: string) {
  const db = await openDb();
  const tx = db.transaction("queue", "readwrite");
  tx.objectStore("queue").delete(id);
  await txDone(tx);
  db.close();
}
