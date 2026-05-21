import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import { runMigrations, closeDB } from "./config/database.js";
import { globalLimiter } from "./middleware/rateLimiter.js";
import { webhookAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import webhookRouter from "./routes/webhook.js";

const app = express();

// ── Middleware Global ──

// Seguridad: headers HTTP
app.use(helmet());

// CORS: en desarrollo permitimos todo, en producción restringir
app.use(
  cors({
    origin: env.NODE_ENV === "production" ? false : "*",
  })
);

// Rate limiting global
app.use(globalLimiter);

// Parseo de JSON con límite de tamaño
app.use(express.json({ limit: "16kb" }));

// ── Rutas ──

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "facilito", version: "0.1.0" });
});

// Webhook de WhatsApp (protegido con autenticación + rate limiting específico)
app.use(webhookAuth);
app.use(webhookRouter);

// ── Error Handler (debe ir al final) ──
app.use(errorHandler);

// ── Inicio del Servidor ──
async function start(): Promise<void> {
  // Inicializar base de datos
  await runMigrations();

  app.listen(env.PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════╗
  ║         FACILITO v0.1.0               ║
  ║  Facturación Conversacional Uruguay   ║
  ╚═══════════════════════════════════════╝
  🌐 Puerto:       ${env.PORT}
  📦 Ambiente:     ${env.NODE_ENV}
  📬 Webhook:      POST /webhook/whatsapp
  🩺 Health:       GET /health
  `);
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⏹ Cerrando servidor...");
  await closeDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n⏹ Cerrando servidor...");
  await closeDB();
  process.exit(0);
});

start().catch((err) => {
  console.error("⛔ Error al iniciar el servidor:", err);
  process.exit(1);
});
