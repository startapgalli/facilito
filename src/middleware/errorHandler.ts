import { Request, Response, NextFunction } from "express";

/**
 * Middleware de manejo centralizado de errores.
 * Nunca filtra stack traces ni información sensible al cliente.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[ERROR] ${err.name}: ${err.message}`);

  // Errores conocidos
  if (err.name === "ZodError") {
    res.status(400).json({
      error: "Datos inválidos en la solicitud",
    });
    return;
  }

  if (err.name === "RateLimitError" || (err as any).status === 429) {
    res.status(429).json({
      error: "Demasiadas solicitudes",
    });
    return;
  }

  // OpenAI API errors
  if ((err as any).status === 401) {
    res.status(502).json({
      error: "Error de autenticación con el proveedor de IA",
    });
    return;
  }

  // Error genérico — nunca exponer detalles internos
  res.status(500).json({
    error: "Error interno del servidor",
  });
}
