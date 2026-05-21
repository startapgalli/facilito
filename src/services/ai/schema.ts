import { z } from "zod";

// ── Esquema de Structured Output para el LLM ──
// El agente DEVUELVE estrictamente este JSON. No puede inventar campos.

/** Intenciones que el agente puede detectar */
export const IntencionSchema = z.enum([
  "emitir_factura",
  "solicitar_informacion",
  "saludo",
]);

export type Intencion = z.infer<typeof IntencionSchema>;

/** Datos de factura extraídos por el agente */
export const DatosFacturaSchema = z.object({
  razon_social_cliente: z.string().nullable(),
  rut_cliente: z.string().nullable(),
  monto_neto: z.number().positive().nullable(),
  incluye_iva: z.boolean(),
  concepto: z.string().nullable(),
});

export type DatosFactura = z.infer<typeof DatosFacturaSchema>;

/** Respuesta completa del agente */
export const AgenteResponseSchema = z.object({
  intencion: IntencionSchema,
  datos_factura: DatosFacturaSchema,
  respuesta_conversacional: z
    .string()
    .describe("Mensaje amigable en español rioplatense para el usuario"),
});

export type AgenteResponse = z.infer<typeof AgenteResponseSchema>;
