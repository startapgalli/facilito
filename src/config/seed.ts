import { runMigrations, getDB, saveDB, closeDB } from "./database.js";
import { encrypt } from "../utils/crypto.js";

/**
 * Puebla la base de datos con datos de prueba.
 * Ejecutar con: npx tsx src/config/seed.ts
 */
async function seed(): Promise<void> {
  await runMigrations();
  const db = await getDB();

  console.log("🌱 Sembrando datos de prueba...");

  const tokenCifrado = encrypt("mock-token-facturador-123");

  // Usuario de prueba
  db.run(
    `INSERT OR IGNORE INTO usuarios (telefono_whatsapp, rut_emisor, nombre, token_api_facturador, created_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      "59899123456",
      "2198765400012",
      "Juan Pérez",
      tokenCifrado,
    ]
  );

  // Clientes frecuentes de prueba
  const clientes = [
    { razon_social: "TechSolutions S.A.", rut: "2198765400012" },
    { razon_social: "Distribuidora del Sur Ltda.", rut: "2155566600019" },
    { razon_social: "Estudio Jurídico Martínez", rut: "2144477700015" },
  ];

  for (const c of clientes) {
    db.run(
      `INSERT OR IGNORE INTO clientes_frecuentes (usuario_id, razon_social, rut, created_at)
       VALUES (1, ?, ?, datetime('now'))`,
      [c.razon_social, c.rut]
    );
  }

  saveDB();
  console.log("✅ Datos de prueba insertados correctamente");
  await closeDB();
}

seed().catch((err) => {
  console.error("⛔ Error en seed:", err);
  process.exit(1);
});
