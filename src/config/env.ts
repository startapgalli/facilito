import { config } from "dotenv";
import { z } from "zod";

config();

// ── Schema de validación de entorno ──
// Todo process.env pasa por acá. Si falta una variable crítica, el server no arranca.
const envSchema = z.object({
  PORT: z.coerce.number().positive().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Capso
  CAPSO_WEBHOOK_SECRET: z.string().min(1, "CAPSO_WEBHOOK_SECRET es requerido"),

  // Groq
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY es requerida"),

  // DB
  DATABASE_URL: z.string().min(1, "DATABASE_URL es requerida"),

  // Cifrado — solo obligatorio en producción
  ENCRYPTION_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("⛔ Variables de entorno inválidas:");
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
