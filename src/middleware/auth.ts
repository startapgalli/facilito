import { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

/**
 * Middleware que valida el webhook de Capso.
 * 
 * Soporta dos modos:
 * 1. Bearer Token: Header `Authorization: Bearer <secret>`
 * 2. HMAC Signature: Header `X-Webhook-Signature` con HMAC-SHA256 del body
 * 
 * Se configura según lo que soporte el proveedor.
 */

// Elegir modo según el formato del secret
const USE_HMAC = env.CAPSO_WEBHOOK_SECRET.startsWith("hmac:");

function verifyBearer(token: string): boolean {
  try {
    const expected = Buffer.from(env.CAPSO_WEBHOOK_SECRET);
    const received = Buffer.from(token);
    
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

function verifyHmac(body: string, signature: string): boolean {
  const secret = env.CAPSO_WEBHOOK_SECRET.replace("hmac:", "");
  const computed = createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  
  try {
    const a = Buffer.from(computed);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function webhookAuth(req: Request, res: Response, next: NextFunction): void {
  if (USE_HMAC) {
    const signature = req.headers["x-webhook-signature"] as string | undefined;
    
    if (!signature) {
      res.status(401).json({ error: "Firma del webhook requerida" });
      return;
    }

    // Reconstruir el body crudo para verificar HMAC
    const rawBody = JSON.stringify(req.body);
    if (!verifyHmac(rawBody, signature)) {
      res.status(401).json({ error: "Firma del webhook inválida" });
      return;
    }
  } else {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Token de autenticación requerido" });
      return;
    }

    const token = authHeader.slice(7);
    if (!verifyBearer(token)) {
      res.status(401).json({ error: "Token de autenticación inválido" });
      return;
    }
  }

  next();
}
