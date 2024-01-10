import crypto from 'crypto';
import { SYMMETRIC_ALGORITHM } from './constants.js';

const generateRandomString = (length = 8) => {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
};

const encryptDataForTransmission = (data, encryptionKey) => {
  const cipher = crypto.createCipheriv(
    SYMMETRIC_ALGORITHM,
    Buffer.from(encryptionKey),
    null
  );
  let encryptedData = cipher.update(data, 'utf8', 'hex');
  encryptedData += cipher.final('hex');

  return encryptedData;
};

const decryptRecievedData = (data, decryptionKey) => {
  const decipher = crypto.createDecipheriv(
    SYMMETRIC_ALGORITHM,
    decryptionKey,
    null
  );
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

export const log = (message) => {
  console.log(`${new Date().toISOString()} LOG: ${message}`);
};

export {
  generateRandomString,
  encryptDataForTransmission,
  decryptRecievedData,
};
