/**
 * Convierte las columnas y valores de sql.js a un objeto plano.
 */
export function rowToObject(
  columns: string[],
  values: unknown[]
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    row[columns[i]!] = values[i];
  }
  return row;
}

/**
 * Convierte un array de filas de sql.js en un array de objetos.
 */
export function rowsToObjects(
  columns: string[],
  rows: unknown[][]
): Record<string, unknown>[] {
  return rows.map((vals) => rowToObject(columns, vals));
}
