import net from 'net';
import crypto from 'crypto';
import { Action } from './action.js';
import { encryptDataForTransmission, generateRandomString } from './helpers.js';
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
  const { privateKey, clientRandomHello } = sessions.get(socket);

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

      const sessionKey = premasterSecret + clientRandomHello;

      Object.assign(sessions.get(socket), { premasterSecret, sessionKey });

      resolve(sessionKey);
    } catch {
      reject();
    }
  });
};

const handleServerReady = (socket) => {
  const { sessionKey } = sessions.get(socket);

  socket.write(
    JSON.stringify({
      action: Action.READY,
      data: encryptDataForTransmission('READY', sessionKey),
    })
  );
};

// TODO: wrap in promise and resolve on ready
const server = net.createServer((socket) => {
  socket.on('data', (buffer) => {
    const stringifiedData = buffer.toString('utf-8');
    const jsonData = JSON.parse(stringifiedData);

    const handler = {
      [Action.HELLO]: () => {
        const clientRandomHello = jsonData.data;
        handleClientHello(socket, clientRandomHello);
      },
      [Action.PREMASTER_SECRET_EXCHANGE]: () => {
        const premasterSecret = jsonData.data;
        handlePremasterSecretExchange(socket, premasterSecret).then(() =>
          handleServerReady(socket)
        );
      },
      [Action.READY]: () => {
        const { sessionKey } = sessions.get(socket);

        console.log({ sessionKey });

        socket.write(
          JSON.stringify({
            action: Action.DATA_TRANSFER,
            data: encryptDataForTransmission('SOME DATA HERE', sessionKey),
          })
        );
      },
    }[jsonData.action];

    handler?.();
  });

  socket.on('end', () => {
    console.log('Server closed connection');
  });
});

server.listen(SERVER_PORT, () => {
  console.log('Server listening on port 8000');
});
