import rateLimit from "express-rate-limit";
import { Request } from "express";

/**
 * Rate limiter global: máximo 100 requests por minuto por IP.
 */
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Intentá de nuevo en un minuto." },
});

/**
 * Rate limiter específico para el webhook: máximo 20 requests por minuto por teléfono.
 * Usa el sender_phone del body como key si está disponible.
 */
export const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Si el body tiene sender_phone, rate limit por teléfono
    const phone = req.body?.sender_phone;
    if (typeof phone === "string" && phone.length > 0) {
      return `phone:${phone}`;
    }
    // Fallback a IP
    return req.ip ?? "unknown";
  },
  message: { error: "Demasiados mensajes. Esperá un momento antes de enviar otro." },
});
