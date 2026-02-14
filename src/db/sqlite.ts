import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { DEFAULT_CATEGORIES, Task, Category, Subtask } from "@/types/task";
import { readSnapshot, writeSnapshot } from "@/db/idb";
import { readOpfsSnapshot, writeOpfsSnapshot } from "@/db/opfs";

let sqlReady: Promise<SqlJsStatic> | null = null;
let db: Database | null = null;

async function ensureDB() {
  if (!sqlReady) {
    sqlReady = initSqlJs({ locateFile: (file) => `/node_modules/sql.js/dist/${file}` });
  }
  const SQL = await sqlReady;
  if (!db) {
    const snapOpfs = await readOpfsSnapshot();
    const snap = snapOpfs || (await readSnapshot());
    if (snap) {
      db = new SQL.Database(new Uint8Array(snap));
    } else {
      db = new SQL.Database();
      db.run(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT,
          description TEXT,
          dueDate TEXT,
          dueTime TEXT,
          priority TEXT,
          status TEXT,
          categoryId TEXT,
          reminderType TEXT,
          reminderCustomMinutes INTEGER,
          reminderNotified INTEGER,
          createdAt TEXT,
          updatedAt TEXT,
          completedAt TEXT,
          repeatType TEXT,
          repeatInterval INTEGER,
          seriesId TEXT
        );
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT,
          color TEXT,
          icon TEXT
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
        CREATE TABLE IF NOT EXISTS subtasks (
          id TEXT PRIMARY KEY,
          taskId TEXT,
          title TEXT,
          completed INTEGER,
          createdAt TEXT,
          updatedAt TEXT,
          position INTEGER
        );
      `);
      const stmt = db.prepare("INSERT INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)");
      DEFAULT_CATEGORIES.forEach((c) => {
        stmt.run([c.id, c.name, c.color, c.icon]);
      });
      stmt.free();
      const sIns = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
      sIns.run(["opfsEnabled", "true"]);
      sIns.run(["defaultPriority", "medium"]);
      sIns.run(["defaultCategoryId", "personal"]);
      sIns.run(["use24h", "false"]);
      sIns.run(["defaultReminderType", "none"]);
      sIns.run(["reminderSound", "beep"]);
      sIns.free();
      saveDB();
    }
    try {
      const cols = db.exec("PRAGMA table_info(tasks)");
      const names = cols.length ? cols[0].values.map(v => String(v[1])) : [];
      if (!names.includes("repeatType")) db.run("ALTER TABLE tasks ADD COLUMN repeatType TEXT");
      if (!names.includes("repeatInterval")) db.run("ALTER TABLE tasks ADD COLUMN repeatInterval INTEGER");
      if (!names.includes("seriesId")) db.run("ALTER TABLE tasks ADD COLUMN seriesId TEXT");
      db.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)");
      const sIns2 = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
      sIns2.run(["opfsEnabled", "true"]);
      sIns2.run(["defaultPriority", "medium"]);
      sIns2.run(["defaultCategoryId", "personal"]);
      sIns2.run(["use24h", "false"]);
      sIns2.run(["defaultReminderType", "none"]);
      sIns2.run(["reminderSound", "beep"]);
      sIns2.free();
      db.run(`
        CREATE TABLE IF NOT EXISTS subtasks (
          id TEXT PRIMARY KEY,
          taskId TEXT,
          title TEXT,
          completed INTEGER,
          createdAt TEXT,
          updatedAt TEXT,
          position INTEGER
        );
      `);
      const subCols = db.exec("PRAGMA table_info(subtasks)");
      const subNames = subCols.length ? subCols[0].values.map(v => String(v[1])) : [];
      if (!subNames.includes("position")) {
        db.run("ALTER TABLE subtasks ADD COLUMN position INTEGER DEFAULT 0");
      }
    } catch {
      // ignore
    }
  }
}

function saveDB() {
  if (!db) return;
  const data = db.export();
  void writeSnapshot(data);
  try {
    const res = db.exec("SELECT value FROM settings WHERE key='opfsEnabled'");
    const val = res.length && res[0].values.length ? String(res[0].values[0][0]) : "true";
    if (val === "true") {
      void writeOpfsSnapshot(data);
    }
  } catch {
    void writeOpfsSnapshot(data);
  }
  try {
    window.dispatchEvent(new CustomEvent("tasktracker:db-saved"));
  } catch {
    // ignore
  }
}

export async function loadTasks(): Promise<Task[]> {
  await ensureDB();
  if (!db) return [];
  const res = db.exec("SELECT * FROM tasks ORDER BY updatedAt DESC");
  if (!res.length) return [];
  const rows = res[0].values;
  return rows.map((r: unknown[]) => ({
    id: String(r[0]),
    title: String(r[1] || ""),
    description: String(r[2] || ""),
    dueDate: String(r[3] || ""),
    dueTime: String(r[4] || ""),
    priority: String(r[5] || "low") as Task["priority"],
    status: String(r[6] || "todo") as Task["status"],
    categoryId: String(r[7] || "personal"),
    reminder: {
      type: String(r[8] || "none") as Task["reminder"]["type"],
      customMinutes: (r[9] as number | null) == null ? undefined : Number(r[9]),
      notified: !!Number(r[10] as number | undefined || 0),
    },
    createdAt: String(r[11] || new Date().toISOString()),
    updatedAt: String(r[12] || new Date().toISOString()),
    completedAt: (r[13] as string | null) == null ? null : String(r[13]),
    repeatType: (r[14] as string | undefined) ? String(r[14]) as Task["repeatType"] : "none",
    repeatInterval: (r[15] as number | null) == null ? undefined : Number(r[15]),
    seriesId: (r[16] as string | undefined) ? String(r[16]) : undefined,
  }));
}

export async function loadCategories(): Promise<Category[]> {
  await ensureDB();
  if (!db) return [];
  const res = db.exec("SELECT * FROM categories");
  if (!res.length) return [];
  const rows = res[0].values;
  return rows.map((r: unknown[]) => ({
    id: String(r[0]),
    name: String(r[1]),
    color: String(r[2]),
    icon: String(r[3]),
  }));
}

export async function insertTask(task: Task) {
  await ensureDB();
  if (!db) return;
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO tasks (id, title, description, dueDate, dueTime, priority, status, categoryId, reminderType, reminderCustomMinutes, reminderNotified, createdAt, updatedAt, completedAt, repeatType, repeatInterval, seriesId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  stmt.run([
    task.id,
    task.title,
    task.description,
    task.dueDate,
    task.dueTime,
    task.priority,
    task.status,
    task.categoryId,
    task.reminder.type,
    task.reminder.customMinutes ?? null,
    task.reminder.notified ? 1 : 0,
    task.createdAt,
    task.updatedAt,
    task.completedAt,
    task.repeatType ?? "none",
    task.repeatInterval ?? null,
    task.seriesId ?? null,
  ]);
  stmt.free();
  saveDB();
}

export async function updateTaskRow(task: Task) {
  await insertTask(task);
}

export async function deleteTaskRow(id: string) {
  await ensureDB();
  if (!db) return;
  const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
  stmt.run([id]);
  stmt.free();
  saveDB();
}

export async function insertCategory(cat: Category) {
  await ensureDB();
  if (!db) return;
  const stmt = db.prepare("INSERT OR REPLACE INTO categories VALUES (?, ?, ?, ?)");
  stmt.run([cat.id, cat.name, cat.color, cat.icon]);
  stmt.free();
  saveDB();
}

export async function deleteCategoryRow(id: string) {
  await ensureDB();
  if (!db) return;
  const stmt = db.prepare("DELETE FROM categories WHERE id = ?");
  stmt.run([id]);
  stmt.free();
  const moveStmt = db.prepare("UPDATE tasks SET categoryId = 'personal' WHERE categoryId = ?");
  moveStmt.run([id]);
  moveStmt.free();
  saveDB();
}

export async function exportSnapshotBlob(): Promise<Blob> {
  await ensureDB();
  if (!db) return new Blob();
  const data = db.export();
  return new Blob([data], { type: "application/octet-stream" });
}

export async function importSnapshot(buffer: ArrayBuffer): Promise<void> {
  if (!sqlReady) {
    sqlReady = initSqlJs({ locateFile: (file) => `/node_modules/sql.js/dist/${file}` });
  }
  const SQL = await sqlReady;
  db = new SQL.Database(new Uint8Array(buffer));
  saveDB();
}

export type SettingsMap = {
  opfsEnabled: boolean;
  defaultPriority: Task["priority"];
  defaultCategoryId: string;
  use24h: boolean;
  defaultReminderType: Task["reminder"]["type"];
  reminderSound: "beep" | "chime" | "none";
};

export async function loadSettings(): Promise<SettingsMap> {
  await ensureDB();
  if (!db) return { opfsEnabled: true, defaultPriority: "medium", defaultCategoryId: "personal", use24h: false, defaultReminderType: "none", reminderSound: "beep" };
  const res = db.exec("SELECT key, value FROM settings");
  const out: Record<string, string> = {};
  if (res.length) {
    res[0].values.forEach(v => { out[String(v[0])] = String(v[1] ?? ""); });
  }
  return {
    opfsEnabled: out["opfsEnabled"] !== "false",
    defaultPriority: (out["defaultPriority"] as SettingsMap["defaultPriority"]) || "medium",
    defaultCategoryId: out["defaultCategoryId"] || "personal",
    use24h: out["use24h"] === "true",
    defaultReminderType: (out["defaultReminderType"] as SettingsMap["defaultReminderType"]) || "none",
    reminderSound: (out["reminderSound"] as SettingsMap["reminderSound"]) || "beep",
  };
}

export async function setSetting(key: keyof SettingsMap, value: string) {
  await ensureDB();
  if (!db) return;
  const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  stmt.run([String(key), value]);
  stmt.free();
  saveDB();
}

export async function loadAllSubtasks(): Promise<Subtask[]> {
  await ensureDB();
  if (!db) return [];
  const res = db.exec("SELECT * FROM subtasks ORDER BY position ASC, createdAt ASC");
  if (!res.length) return [];
  return res[0].values.map((r: unknown[]) => ({
    id: String(r[0]),
    taskId: String(r[1]),
    title: String(r[2]),
    completed: !!Number(r[3] as number | undefined || 0),
    createdAt: String(r[4]),
    updatedAt: String(r[5]),
    position: Number(r[6] as number | undefined || 0),
  }));
}

export async function loadSubtasks(taskId: string): Promise<Subtask[]> {
  await ensureDB();
  if (!db) return [];
  const stmt = db.prepare("SELECT * FROM subtasks WHERE taskId = ? ORDER BY position ASC, createdAt ASC");
  stmt.bind([taskId]);
  const rows: Subtask[] = [];
  while (stmt.step()) {
    const v = stmt.getAsObject();
    rows.push({
      id: String(v.id),
      taskId: String(v.taskId),
      title: String(v.title),
      completed: !!Number(v.completed as number | undefined || 0),
      createdAt: String(v.createdAt),
      updatedAt: String(v.updatedAt),
      position: Number(v.position as number | undefined || 0),
    });
  }
  stmt.free();
  return rows;
}

export async function insertSubtask(st: Subtask) {
  await ensureDB();
  if (!db) return;
  const stmt = db.prepare("INSERT OR REPLACE INTO subtasks (id, taskId, title, completed, createdAt, updatedAt, position) VALUES (?, ?, ?, ?, ?, ?, ?)");
  stmt.run([st.id, st.taskId, st.title, st.completed ? 1 : 0, st.createdAt, st.updatedAt, st.position ?? 0]);
  stmt.free();
  saveDB();
}

export async function deleteSubtaskRow(id: string) {
  await ensureDB();
  if (!db) return;
  const stmt = db.prepare("DELETE FROM subtasks WHERE id = ?");
  stmt.run([id]);
  stmt.free();
  saveDB();
}
