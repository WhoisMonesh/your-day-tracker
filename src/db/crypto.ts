function enc(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

async function deriveKey(pass: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", enc(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptSnapshot(data: Uint8Array, passphrase: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const header = enc("YDT1");
  const out = new Uint8Array(header.length + salt.length + iv.length + ct.byteLength);
  out.set(header, 0);
  out.set(salt, header.length);
  out.set(iv, header.length + salt.length);
  out.set(new Uint8Array(ct), header.length + salt.length + iv.length);
  return new Blob([out], { type: "application/octet-stream" });
}

export async function decryptSnapshot(file: File, passphrase: string): Promise<ArrayBuffer> {
  const buf = await file.arrayBuffer();
  const all = new Uint8Array(buf);
  const header = new TextDecoder().decode(all.slice(0, 4));
  if (header !== "YDT1") throw new Error("Invalid snapshot header");
  const salt = all.slice(4, 20);
  const iv = all.slice(20, 32);
  const ct = all.slice(32);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return pt;
}
