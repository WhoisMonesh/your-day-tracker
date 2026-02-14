async function getRoot(): Promise<FileSystemDirectoryHandle | null> {
  const ns = navigator.storage as unknown as { getDirectory?: () => Promise<FileSystemDirectoryHandle> };
  if (!ns || typeof ns.getDirectory !== "function") return null;
  try {
    const root = await ns.getDirectory!();
    return root;
  } catch {
    return null;
  }
}

export async function readOpfsSnapshot(): Promise<ArrayBuffer | null> {
  const root = await getRoot();
  if (!root) return null;
  try {
    const fileHandle = await root.getFileHandle("your-day-tracker.sqlite");
    const file = await fileHandle.getFile();
    const buf = await file.arrayBuffer();
    return buf;
  } catch {
    return null;
  }
}

export async function writeOpfsSnapshot(data: Uint8Array): Promise<void> {
  const root = await getRoot();
  if (!root) return;
  try {
    const fileHandle = await root.getFileHandle("your-day-tracker.sqlite", { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  } catch {
    return;
  }
}
