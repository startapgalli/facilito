import { getDB, saveDB } from "../../config/database.js";
import { encrypt, decrypt } from "../../utils/crypto.js";
import { rowToObject } from "../../utils/dbHelpers.js";

export interface Usuario {
  id: number;
  telefono_whatsapp: string;
  rut_emisor: string;
  nombre: string | null;
  token_api_facturador: string | null;
  created_at: string;
  updated_at: string;
}

function parseUsuario(row: Record<string, unknown>): Usuario {
  return {
    id: row.id as number,
    telefono_whatsapp: row.telefono_whatsapp as string,
    rut_emisor: row.rut_emisor as string,
    nombre: (row.nombre as string) ?? null,
    token_api_facturador: (row.token_api_facturador as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/**
 * Busca un usuario por su número de WhatsApp.
 */
export async function buscarPorTelefono(
  telefono: string
): Promise<Usuario | undefined> {
  const db = await getDB();
  const result = db.exec("SELECT * FROM usuarios WHERE telefono_whatsapp = ?", [
    telefono,
  ]);

  if (result.length === 0 || result[0]!.values.length === 0) {
    return undefined;
  }

  return parseUsuario(rowToObject(result[0]!.columns, result[0]!.values[0]!));
}

/**
 * Obtiene el token de facturación descifrado.
 */
export async function obtenerTokenFacturador(
  usuarioId: number
): Promise<string | null> {
  const db = await getDB();
  const result = db.exec(
    "SELECT token_api_facturador FROM usuarios WHERE id = ?",
    [usuarioId]
  );

  if (result.length === 0 || result[0]!.values.length === 0) {
    return null;
  }

  const encrypted = result[0]!.values[0]![0] as string | null;
  if (!encrypted) return null;

  return decrypt(encrypted);
}

/**
 * Crea un nuevo usuario.
 */
export async function crearUsuario(data: {
  telefono_whatsapp: string;
  rut_emisor: string;
  nombre?: string;
  token_api_facturador?: string;
}): Promise<Usuario> {
  const db = await getDB();
  const tokenCifrado = data.token_api_facturador
    ? encrypt(data.token_api_facturador)
    : null;

  const now = new Date().toISOString();

  db.run(
    `INSERT INTO usuarios (telefono_whatsapp, rut_emisor, nombre, token_api_facturador, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.telefono_whatsapp,
      data.rut_emisor,
      data.nombre ?? null,
      tokenCifrado,
      now,
      now,
    ]
  );

  saveDB();
  return (await buscarPorTelefono(data.telefono_whatsapp))!;
}
