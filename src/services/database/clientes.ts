import { getDB, saveDB } from "../../config/database.js";
import { rowsToObjects, rowToObject } from "../../utils/dbHelpers.js";

export interface ClienteFrecuente {
  id: number;
  usuario_id: number;
  razon_social: string;
  rut: string;
  ultima_factura: string | null;
  created_at: string;
}

function parseCliente(row: Record<string, unknown>): ClienteFrecuente {
  return {
    id: row.id as number,
    usuario_id: row.usuario_id as number,
    razon_social: row.razon_social as string,
    rut: row.rut as string,
    ultima_factura: (row.ultima_factura as string) ?? null,
    created_at: row.created_at as string,
  };
}

/**
 * Obtiene todos los clientes frecuentes de un usuario.
 */
export async function listarPorUsuario(
  usuarioId: number
): Promise<ClienteFrecuente[]> {
  const db = await getDB();
  const result = db.exec(
    "SELECT * FROM clientes_frecuentes WHERE usuario_id = ? ORDER BY razon_social",
    [usuarioId]
  );

  if (result.length === 0) return [];
  return rowsToObjects(result[0]!.columns, result[0]!.values).map(parseCliente);
}

/**
 * Busca clientes por razón social (búsqueda parcial).
 */
export async function buscarPorRazonSocial(
  usuarioId: number,
  termino: string
): Promise<ClienteFrecuente[]> {
  const db = await getDB();
  const result = db.exec(
    "SELECT * FROM clientes_frecuentes WHERE usuario_id = ? AND razon_social LIKE ? ORDER BY razon_social",
    [usuarioId, `%${termino}%`]
  );

  if (result.length === 0) return [];
  return rowsToObjects(result[0]!.columns, result[0]!.values).map(parseCliente);
}

/**
 * Registra o actualiza un cliente frecuente.
 */
export async function upsertCliente(data: {
  usuario_id: number;
  razon_social: string;
  rut: string;
}): Promise<ClienteFrecuente> {
  const db = await getDB();

  const existente = db.exec(
    "SELECT id FROM clientes_frecuentes WHERE usuario_id = ? AND rut = ?",
    [data.usuario_id, data.rut]
  );

  const now = new Date().toISOString();
  const yaExiste = existente.length > 0 && existente[0]!.values.length > 0;

  if (yaExiste) {
    db.run(
      "UPDATE clientes_frecuentes SET razon_social = ?, ultima_factura = ? WHERE usuario_id = ? AND rut = ?",
      [data.razon_social, now, data.usuario_id, data.rut]
    );
  } else {
    db.run(
      "INSERT INTO clientes_frecuentes (usuario_id, razon_social, rut, created_at) VALUES (?, ?, ?, ?)",
      [data.usuario_id, data.razon_social, data.rut, now]
    );
  }

  saveDB();

  const result = db.exec(
    "SELECT * FROM clientes_frecuentes WHERE usuario_id = ? AND rut = ?",
    [data.usuario_id, data.rut]
  );

  if (result.length === 0 || result[0]!.values.length === 0) {
    throw new Error("No se pudo crear/actualizar el cliente");
  }

  return parseCliente(
    rowToObject(result[0]!.columns, result[0]!.values[0]!)
  );
}
