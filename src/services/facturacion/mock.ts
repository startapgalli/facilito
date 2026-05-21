import type { ComprobantePayload, ComprobanteResultado } from "./tipos.js";
import type { FacturadorAPI } from "./facturador.js";

/**
 * Mock del facturador para desarrollo.
 * 
 * Simula la respuesta de la API del proveedor de facturación.
 * En producción, reemplazar por la implementación real que
 * se conecta a Bill.uy / Verde / Memory / etc.
 */
export const mockFacturador: FacturadorAPI = {
  async emitirComprobante(
    payload: ComprobantePayload,
    _token: string
  ): Promise<ComprobanteResultado> {
    // Simular latencia de red (500-1500ms)
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));

    // Número de comprobante simulado
    const numero = `A${payload.tipo_cfe}${String(
      Math.floor(1000000 + Math.random() * 9000000)
    )}`;

    return {
      success: true,
      cfe_numero: numero,
      pdf_url: `https://facturacion-ejemplo.dgi.uy/pdf/${numero}`,
    };
  },
};
