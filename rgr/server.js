import net from 'net';
import crypto from 'crypto';
import { Action } from './action.js';
import {
  decryptRecievedData,
  encryptDataForTransmission,
  generateRandomString,
} from './helpers.js';
import { SERVER_PORT } from './constants.js';

const sessions = new Map();

const handleClientHello = (socket, clientRandomHello) => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });

  const serverRandomHello = generateRandomString();

  sessions.set(socket, {
    privateKey,
    publicKey,
    clientRandomHello,
    serverRandomHello,
  });

  socket.write(
    JSON.stringify({
      action: Action.HELLO,
      data: [serverRandomHello, publicKey],
    })
  );
};

const handlePremasterSecretExchange = (socket, encryptedPremasterSecret) => {
  const { privateKey, clientRandomHello, serverRandomHello } =
    sessions.get(socket);

  return new Promise((resolve, reject) => {
    try {
      const premasterSecret = crypto
        .privateDecrypt(
          {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
          },
          Buffer.from(encryptedPremasterSecret, 'base64')
        )
        .toString();

      const encryptionKey = premasterSecret + clientRandomHello;
      const decryptionKey = premasterSecret + serverRandomHello;
      const sessionKeys = [encryptionKey, decryptionKey];

      Object.assign(sessions.get(socket), { premasterSecret, sessionKeys });

      resolve(sessionKeys);
    } catch {
      reject();
    }
  });
};

const handleServerReady = (socket) => {
  const { sessionKeys } = sessions.get(socket);
  const [encryptionKey] = sessionKeys;

  socket.write(
    JSON.stringify({
      action: Action.READY,
      data: encryptDataForTransmission('READY', encryptionKey),
    })
  );
};

const server = net.createServer(async (socket) => {
  const establishSecureConnection = () => {
    return new Promise((resolve) => {
      const dataHandler = (buffer) => {
        const stringifiedData = buffer.toString('utf-8');
        const jsonData = JSON.parse(stringifiedData);

        const handler = {
          [Action.HELLO]: () => {
            const clientRandomHello = jsonData.data;
            handleClientHello(socket, clientRandomHello);
          },
          [Action.PREMASTER_SECRET_EXCHANGE]: () => {
            const premasterSecret = jsonData.data;
            handlePremasterSecretExchange(socket, premasterSecret)
              .then(() => handleServerReady(socket))
              .catch(() => resolve(false));
          },
          [Action.READY]: () => {
            resolve(true);
            socket.removeListener('data', dataHandler);
          },
        }[jsonData.action];

        handler?.();
      };

      socket.on('data', dataHandler);
    });
  };

  const hasConnected = await establishSecureConnection();

  if (hasConnected) {
    socket.on('data', (buffer) => {
      const { sessionKeys } = sessions.get(socket);
      const [_, decryptionKey] = sessionKeys;

      console.log(decryptRecievedData(buffer.toString(), decryptionKey));
    });
  }

  socket.on('end', () => {
    console.log('Server closed connection');
  });
});

server.listen(SERVER_PORT, () => {
  console.log(`Server listening on port ${SERVER_PORT}`);
});
