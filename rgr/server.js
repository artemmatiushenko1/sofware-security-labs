import net from 'net';
import crypto from 'crypto';
import { Action } from './action.js';
import {
  decryptRecievedData,
  encryptDataForTransmission,
  generateRandomString,
  log,
} from './helpers.js';
import { SERVER_PORT } from './constants.js';

const sessions = new Map();

const handleClientHello = (socket, clientRandomHello) => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });

  log('Private / Public keys generated: ');
  console.log(privateKey);
  console.log(publicKey);

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

  log('Public key and random string sent: ');
  console.log(publicKey);
  console.log(serverRandomHello);
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

      log('Successfully decrypted client premaster secret: ');
      console.log(premasterSecret);

      const encryptionKey = premasterSecret + clientRandomHello;
      const decryptionKey = premasterSecret + serverRandomHello;
      const sessionKeys = [encryptionKey, decryptionKey];

      Object.assign(sessions.get(socket), { premasterSecret, sessionKeys });

      log('Session keys generated [encryptionKey, decryptionKey]: ');
      console.log(sessionKeys);

      resolve(sessionKeys);
    } catch {
      reject();
    }
  });
};

const handleServerReady = (socket) => {
  const { sessionKeys } = sessions.get(socket);
  const [encryptionKey] = sessionKeys;

  const encryptedReadyMessage = encryptDataForTransmission(
    'READY',
    encryptionKey
  );

  socket.write(
    JSON.stringify({
      action: Action.READY,
      data: encryptedReadyMessage,
    })
  );

  log('Encrypted server READY message sent: ');
  console.log(encryptedReadyMessage);
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
            log('Client HELLO recieved (random string attached): ');
            console.log(clientRandomHello);

            handleClientHello(socket, clientRandomHello);
          },
          [Action.PREMASTER_SECRET_EXCHANGE]: () => {
            const premasterSecret = jsonData.data;
            log('Client encrypted premaster secret recieved: ');
            console.log(premasterSecret);

            handlePremasterSecretExchange(socket, premasterSecret)
              .then(() => handleServerReady(socket))
              .catch(() => resolve(false));
          },
          [Action.READY]: () => {
            const encryptedClientReadyMessage = jsonData.data;
            log('Encrypted client READY message recieved: ');
            console.log(encryptedClientReadyMessage);

            const { sessionKeys } = sessions.get(socket);
            const [_, decryptionKey] = sessionKeys;

            const decryptedClientReadyMessage = decryptRecievedData(
              encryptedClientReadyMessage,
              decryptionKey
            );

            log('Succefully decrypted client READY message: ');
            console.log(decryptedClientReadyMessage);

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
    log('Secure connection is successfully established! ✅');

    socket.on('data', (buffer) => {
      const { sessionKeys } = sessions.get(socket);
      const [encryptionKey, decryptionKey] = sessionKeys;

      log(
        `Recived client data through secure channel: ${decryptRecievedData(
          buffer.toString(),
          decryptionKey
        )}`
      );

      const ecryptedData = encryptDataForTransmission(
        'SOME TEST MESSAGE FOR TRANSMISSION FROM SERVER 👋',
        encryptionKey
      );

      log('Sending data to client through secure channel: ');
      console.log(ecryptedData);

      socket.write(ecryptedData);
    });
  } else {
    log('Failed to establish secure connection! ⛔');
  }

  socket.on('end', () => {
    console.log('Server closed connection');
  });
});

server.listen(SERVER_PORT, () => {
  console.log(`Server listening on port ${SERVER_PORT}`);
});
