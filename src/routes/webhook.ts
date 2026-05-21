import { Router, Request, Response } from "express";
import { WebhookPayloadSchema } from "../types/whatsapp.js";
import { webhookLimiter } from "../middleware/rateLimiter.js";
import {
  buscarPorTelefono,
  obtenerTokenFacturador,
} from "../services/database/usuarios.js";
import { listarPorUsuario, upsertCliente } from "../services/database/clientes.js";
import { guardarMensaje, ultimosMensajes } from "../services/database/historial.js";
import { procesarMensaje } from "../services/ai/agent.js";
import type { AgenteContexto } from "../services/ai/agent.js";
import { mockFacturador } from "../services/facturacion/mock.js";
import { determinarTipoCFE } from "../utils/rutValidator.js";
import { IndicadorFacturacion, TipoCFE, TipoDocumento } from "../types/cfe.js";
import type { ComprobantePayload } from "../types/cfe.js";

const router = Router();

// Rate limiting específico para el webhook
router.use(webhookLimiter);

router.post("/webhook/whatsapp", async (req: Request, res: Response) => {
  try {
    // 1. Validar payload del webhook
    const payload = WebhookPayloadSchema.parse(req.body);
    const { sender_phone, message_body } = payload;

    console.log(`📩 Mensaje de ${sender_phone}: "${message_body.slice(0, 100)}..."`);

    // 2. Identificar al usuario por su número de WhatsApp
    const usuario = await buscarPorTelefono(sender_phone);

    if (!usuario) {
      // Primera vez que escribe este número
      console.log(`👤 Nuevo usuario: ${sender_phone}`);
      res.json({
        status: "ok",
        reply:
          "¡Bienvenido a Facilito! 🎉\n\n" +
          "Soy tu asistente de facturación electrónica por WhatsApp.\n\n" +
          "Para empezar a facturar, primero necesito que un administrador " +
          "configure tu cuenta con tus datos de facturación.\n" +
          "Mientras tanto, decime tu nombre y RUT para registrarte.",
      });
      return;
    }

    // 3. Recuperar contexto para el agente
    const clientesFrecuentes = await listarPorUsuario(usuario.id);
    const historial = await ultimosMensajes(usuario.id, 5);

    // 4. Guardar mensaje del usuario en el historial
    await guardarMensaje({
      usuario_id: usuario.id,
      rol: "usuario",
      contenido: message_body,
    });

    // 5. Construir contexto para el LLM
    const contexto: AgenteContexto = {
      nombre_usuario: usuario.nombre ?? undefined,
      clientes_frecuentes: clientesFrecuentes.map((c) => ({
        razon_social: c.razon_social,
        rut: c.rut,
      })),
      historial_reciente: historial.reverse().map((h) => ({
        rol: h.rol === "usuario" ? "usuario" : "agente",
        texto: h.contenido,
      })),
    };

    // 6. Procesar con el agente IA
    const respuesta = await procesarMensaje(message_body, contexto);

    // 7. Guardar respuesta del agente en el historial
    await guardarMensaje({
      usuario_id: usuario.id,
      rol: "agente",
      contenido: respuesta.respuesta_conversacional,
    });

    // 8. Si es intención de facturar y tenemos datos completos, emitir
    if (
      respuesta.intencion === "emitir_factura" &&
      respuesta.datos_factura.razon_social_cliente &&
      respuesta.datos_factura.monto_neto !== null &&
      respuesta.datos_factura.concepto
    ) {
      // 8a. Determinar tipo de CFE según el RUT/CI
      const rutCliente = respuesta.datos_factura.rut_cliente ?? "";
      const { tipo_cfe, doc_tipo } = determinarTipoCFE(rutCliente);

      // 8b. Calcular monto con IVA si corresponde
      const montoNeto = respuesta.datos_factura.monto_neto;
      const montoConIVA = respuesta.datos_factura.incluye_iva
        ? montoNeto // ya incluye IVA
        : Math.round(montoNeto * 1.22 * 100) / 100; // agregar 22%

      // 8c. Obtener token del facturador (descifrado)
      const token = await obtenerTokenFacturador(usuario.id);

      if (!token) {
        res.json({
          status: "ok",
          reply:
            "Tenés que configurar tu token de facturación primero. " +
            "Contactá al administrador para que lo cargue en el sistema.",
        });
        return;
      }

      // 8d. Construir payload para el facturador
      const comprobante: ComprobantePayload = {
        tipo_cfe: tipo_cfe === 111 ? TipoCFE.Factura : TipoCFE.Ticket,
        receptor: {
          doc_tipo: doc_tipo,
          doc_num: rutCliente.replace(/\D/g, ""),
          razon_social: respuesta.datos_factura.razon_social_cliente,
        },
        lineas: [
          {
            concepto: respuesta.datos_factura.concepto,
            monto_neto: Math.round(montoNeto * 100) / 100,
            indicador_facturacion: IndicadorFacturacion.TasaBasica,
          },
        ],
        moneda: "UYU",
      };

      // 8e. Emitir comprobante
      const resultado = await mockFacturador.emitirComprobante(
        comprobante,
        token
      );

      if (resultado.success) {
        // 8f. Guardar/actualizar cliente frecuente
        await upsertCliente({
          usuario_id: usuario.id,
          razon_social: respuesta.datos_factura.razon_social_cliente,
          rut: rutCliente.replace(/\D/g, ""),
        });

        const montoTotal = respuesta.datos_factura.incluye_iva
          ? montoNeto
          : montoConIVA;

        const reply =
          `✅ Factura emitida con éxito.\n\n` +
          `📄 N° ${resultado.cfe_numero}\n` +
          `💰 Total: $${montoTotal.toLocaleString("es-UY")} UYU\n` +
          `📎 ${resultado.pdf_url}\n\n` +
          `¿Necesitás algo más?`;

        res.json({
          status: "ok",
          reply,
        });
      } else {
        res.json({
          status: "ok",
          reply:
            `Hubo un error al emitir la factura: ${resultado.error}. ` +
            `¿Querés que lo intentemos de nuevo?`,
        });
      }
    } else {
      // 9. No hay datos completos o no es intención de facturar
      res.json({
        status: "ok",
        reply: respuesta.respuesta_conversacional,
      });
    }
  } catch (error) {
    console.error("[WEBHOOK]", error);
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[WEBHOOK ERROR]", msg, error);
    res.status(400).json({
      status: "ignored",
      error: msg,
    });
  }
});

export default router;
