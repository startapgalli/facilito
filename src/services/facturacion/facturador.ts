import type { ComprobantePayload, ComprobanteResultado } from "./tipos.js";

/**
 * Interfaz abstracta del facturador.
 * 
 * La implementación concreta se conecta a la API del proveedor local
 * (Bill.uy, Verde, Memory, FacturaFácil, etc.).
 * 
 * Cada usuario tiene su propio token API guardado en la DB.
 * Este servicio recibe el token como parámetro y lo usa para autenticar.
 */
export interface FacturadorAPI {
  /**
   * Emite un comprobante fiscal electrónico (e-Factura o e-Ticket).
   * 
   * @param payload - Datos del comprobante según normativa DGI
   * @param token - Token API del usuario (ya descifrado)
   * @returns Resultado de la emisión
   */
  emitirComprobante(
    payload: ComprobantePayload,
    token: string
  ): Promise<ComprobanteResultado>;
}
