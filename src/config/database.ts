import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Singleton de la DB ──
let _db: SqlJsDatabase | null = null;
let _dbPath: string = "";

/**
 * Retorna la instancia de la base de datos SQLite (cargada bajo demanda).
 * Usa sql.js — SQLite compilado a WASM, no requiere Python ni node-gyp.
 */
export async function getDB(): Promise<SqlJsDatabase> {
  if (!_db) {
    const SQL = await initSqlJs();

    // Determinar la ruta del archivo .db
    const url = env.DATABASE_URL;
    _dbPath = url.startsWith("file:")
      ? url.replace("file:", "")
      : join(__dirname, "../../data/facilito.db");

    // Asegurar que el directorio existe
    const dir = dirname(_dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Cargar DB existente o crear una nueva
    if (existsSync(_dbPath)) {
      const buffer = readFileSync(_dbPath);
      _db = new SQL.Database(buffer);
    } else {
      _db = new SQL.Database();
    }

    // Activar WAL mode y foreign keys
    _db.run("PRAGMA journal_mode=WAL");
    _db.run("PRAGMA foreign_keys=ON");
  }

  return _db;
}

/**
 * Persiste la DB a disco.
 * Llamar después de cada escritura.
 */
export function saveDB(): void {
  if (_db && _dbPath) {
    const data = _db.export();
    const buffer = Buffer.from(data);
    writeFileSync(_dbPath, buffer);
  }
}

/**
 * Guarda la DB y cierra la conexión.
 */
export async function closeDB(): Promise<void> {
  if (_db) {
    saveDB();
    _db.close();
    _db = null;
  }
}

/**
 * Ejecuta migraciones iniciales.
 */
export async function runMigrations(): Promise<void> {
  const db = await getDB();

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      telefono_whatsapp TEXT    NOT NULL UNIQUE,
      rut_emisor        TEXT    NOT NULL,
      nombre            TEXT,
      token_api_facturador TEXT,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clientes_frecuentes (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      razon_social      TEXT    NOT NULL,
      rut               TEXT    NOT NULL,
      ultima_factura    TEXT,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS historial_mensajes (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      rol               TEXT    NOT NULL CHECK(rol IN ('usuario', 'agente', 'sistema')),
      contenido         TEXT    NOT NULL,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_usuarios_telefono ON usuarios(telefono_whatsapp)
  `);

  saveDB();
  console.log("✅ Base de datos inicializada");
}
