import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Cifra un texto con AES-256-GCM.
 * Retorna: iv:authTag:ciphertext (todo en hex)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Descifra un texto cifrado con AES-256-GCM.
 * Espera formato: iv:authTag:ciphertext (hex)
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    throw new Error("Formato de texto cifrado inválido");
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex!, "hex");
  const authTag = Buffer.from(authTagHex!, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted!, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

function getKey(): Buffer {
  const keyHex = env.ENCRYPTION_KEY;
  if (!keyHex) {
    // En desarrollo generamos una clave volátil (se pierde al reiniciar)
    // WARN: en producción ENCRYPTION_KEY es obligatoria
    if (env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_KEY es obligatoria en producción. " +
        "Generala con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
      );
    }
    return Buffer.from(
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "hex"
    );
  }
  return Buffer.from(keyHex, "hex");
}
