import { TipoDocumento } from "../types/cfe.js";

const RUT_LENGTH = 12;
const CI_LENGTH_MIN = 7;
const CI_LENGTH_MAX = 8;

/**
 * Determina el tipo de documento según la cantidad de dígitos.
 * 
 * - 12 dígitos -> RUT (e-Factura B2B)
 * - 7-8 dígitos -> CI (e-Ticket consumidor final)
 * - Otro -> CI también (se asume consumidor final)
 */
export function determinarTipoDocumento(
  documento: string
): { doc_tipo: TipoDocumento; doc_num: string } {
  // Limpiar el número (solo dígitos)
  const limpio = documento.replace(/\D/g, "");

  if (limpio.length === RUT_LENGTH) {
    return { doc_tipo: TipoDocumento.RUT, doc_num: limpio };
  }

  // Para CI o documentos cortos
  return { doc_tipo: TipoDocumento.CI, doc_num: limpio };
}

/**
 * Verifica si un RUT tiene 12 dígitos (formato válido de RUT uruguayo).
 */
export function esRUTValido(documento: string): boolean {
  const limpio = documento.replace(/\D/g, "");
  return limpio.length === RUT_LENGTH;
}

/**
 * Determina el tipo de CFE según el documento del receptor.
 */
export function determinarTipoCFE(
  documento: string
): { tipo_cfe: 111 | 101; doc_tipo: TipoDocumento } {
  const { doc_tipo, doc_num } = determinarTipoDocumento(documento);

  if (doc_tipo === TipoDocumento.RUT) {
    return { tipo_cfe: 111, doc_tipo }; // e-Factura
  }

  return { tipo_cfe: 101, doc_tipo }; // e-Ticket
}
