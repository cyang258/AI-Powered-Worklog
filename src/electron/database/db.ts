import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { isDev } from "../util.js";

let dbInstance: Database.Database | null = null;

export const initDB = (fileName = "demo_table.db") => {
  if (dbInstance) return dbInstance;

  const dbPath = isDev()
    ? `./${fileName}`
    : path.join(process.resourcesPath, fileName);

  const firstRun = !fs.existsSync(dbPath);

  dbInstance = new Database(dbPath);
  dbInstance.pragma("journal_mode = WAL");

  if (firstRun) {
    dbInstance.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      );

      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS schema_version (version INTEGER);
      INSERT INTO schema_version (version) VALUES (1);
    `);
    console.log("Database created with schema v1 ✅");
  }

  // Example migration
  const row = dbInstance.prepare("SELECT version FROM schema_version").get() as { version: number } | undefined;
  let version = row ? row.version : 0;
  if (version < 2) {
    dbInstance.exec(`
      ALTER TABLE users ADD COLUMN age INTEGER DEFAULT 0;
      UPDATE schema_version SET version = 2;
    `);
    console.log("Migrated database to schema v2 ✅");
  }

  return dbInstance;
}

export const getDB = () => {
  if (!dbInstance) throw new Error("Database not initialized. Call initDB() first.");
  return dbInstance;
}

export default { initDB, getDB };