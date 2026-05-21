import { getDB, saveDB } from "../../config/database.js";
import { rowsToObjects } from "../../utils/dbHelpers.js";

export interface MensajeHistorial {
  id: number;
  usuario_id: number;
  rol: "usuario" | "agente" | "sistema";
  contenido: string;
  created_at: string;
}

function parseMensaje(row: Record<string, unknown>): MensajeHistorial {
  return {
    id: row.id as number,
    usuario_id: row.usuario_id as number,
    rol: row.rol as "usuario" | "agente" | "sistema",
    contenido: row.contenido as string,
    created_at: row.created_at as string,
  };
}

/**
 * Guarda un mensaje en el historial de la conversación.
 */
export async function guardarMensaje(data: {
  usuario_id: number;
  rol: "usuario" | "agente" | "sistema";
  contenido: string;
}): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();

  db.run(
    "INSERT INTO historial_mensajes (usuario_id, rol, contenido, created_at) VALUES (?, ?, ?, ?)",
    [data.usuario_id, data.rol, data.contenido, now]
  );

  saveDB();
}

/**
 * Obtiene los últimos N mensajes del historial de un usuario.
 */
export async function ultimosMensajes(
  usuarioId: number,
  limite: number = 10
): Promise<MensajeHistorial[]> {
  const db = await getDB();
  const result = db.exec(
    "SELECT * FROM historial_mensajes WHERE usuario_id = ? ORDER BY created_at DESC LIMIT ?",
    [usuarioId, limite]
  );

  if (result.length === 0) return [];
  return rowsToObjects(result[0]!.columns, result[0]!.values).map(parseMensaje);
}
