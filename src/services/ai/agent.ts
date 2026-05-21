import OpenAI from "openai";
import { env } from "../../config/env.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { AgenteResponse, AgenteResponseSchema } from "./schema.js";

// Singleton del cliente OpenAI
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _client;
}

export interface AgenteContexto {
  /** Nombre del usuario emisor */
  nombre_usuario?: string;
  /** Clientes frecuentes del usuario para que el agente los reconozca */
  clientes_frecuentes?: Array<{ razon_social: string; rut: string }>;
  /** Últimos mensajes del historial (para mantener coherencia) */
  historial_reciente?: Array<{ rol: "usuario" | "agente"; texto: string }>;
}

/**
 * Procesa un mensaje del usuario a través del LLM.
 * Devuelve una respuesta estructurada con la intención detectada.
 */
export async function procesarMensaje(
  mensaje: string,
  contexto?: AgenteContexto
): Promise<AgenteResponse> {
  const client = getClient();

  // Construir mensajes del sistema con contexto adicional
  const mensajes: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Inyectar clientes frecuentes como contexto
  if (contexto?.clientes_frecuentes && contexto.clientes_frecuentes.length > 0) {
    mensajes.push({
      role: "system",
      content: `Tus clientes frecuentes:\n${contexto.clientes_frecuentes
        .map((c) => `- ${c.razon_social} (RUT: ${c.rut})`)
        .join("\n")}`,
    });
  }

  // Inyectar historial reciente (últimos 5 intercambios)
  if (contexto?.historial_reciente) {
    for (const h of contexto.historial_reciente.slice(-5)) {
      mensajes.push({
        role: h.rol === "usuario" ? "user" : "assistant",
        content: h.texto,
      });
    }
  }

  // Mensaje actual del usuario
  mensajes.push({ role: "user", content: mensaje });

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: mensajes,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("El modelo no devolvió contenido");
  }

  // Validar contra zod (doble validación: API + runtime)
  const parsed = AgenteResponseSchema.parse(JSON.parse(content));
  return parsed;
}
