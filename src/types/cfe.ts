// ── Tipos de Comprobante Fiscal Electrónico (DGI Uruguay) ──

/** Tipos de CFE según normativa DGI */
export enum TipoCFE {
  /** e-Factura — venta B2B, cliente con RUT de 12 dígitos */
  Factura = 111,

  /** e-Ticket — venta a consumidor final (CI o sin identificación) */
  Ticket = 101,
}

/** Tipo de documento del receptor según DGI */
export enum TipoDocumento {
  RUT = 2,
  CI = 3,
  Otro = 0,
}

/** Indicadores de facturación (cómo se factura el ítem) */
export enum IndicadorFacturacion {
  /** Gravado a Tasa Básica (22%) — la mayoría de los servicios/productos */
  TasaBasica = 3,

  /** Gravado a Tasa Mínima (10%) — ej: algunos alimentos, transporte */
  TasaMinima = 2,

  /** Exento — ej: exportaciones, servicios educativos, salud */
  Exento = 1,
}

// ── Interfaces ──

export interface Receptor {
  doc_tipo: TipoDocumento;
  doc_num: string;
  razon_social: string;
}

export interface LineaFactura {
  concepto: string;
  monto_neto: number;
  indicador_facturacion: IndicadorFacturacion;
}

export interface ComprobantePayload {
  tipo_cfe: TipoCFE;
  receptor: Receptor;
  lineas: LineaFactura[];
  moneda: "UYU" | "USD";
}

export interface ComprobanteResultado {
  success: boolean;
  cfe_numero?: string;
  pdf_url?: string;
  error?: string;
}
