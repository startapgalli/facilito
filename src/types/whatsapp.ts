import { z } from "zod";

// ── Payload que envía Capso (o cualquier proveedor WhatsApp) en el webhook ──
// Adaptar según la especificación real del proveedor.

export const WebhookPayloadSchema = z.object({
  /** Número de WhatsApp del emisor en formato internacional (ej: 59899123456) */
  sender_phone: z.string().min(8).max(20),

  /** Contenido del mensaje de texto */
  message_body: z.string().min(1).max(4096),

  /** ID único del mensaje (para deduplicación) */
  message_id: z.string().optional(),

  /** Timestamp ISO del mensaje */
  timestamp: z.string().datetime().optional(),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// ── Respuesta que le enviamos de vuelta al proveedor ──
export interface WebhookResponse {
  status: "ok" | "ignored";
  reply?: string;
}
