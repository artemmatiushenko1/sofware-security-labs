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

const sessionData = {};

const handleServerHello = async (serverRandomHello, publicKey) => {
  const premasterSecret = generateRandomString();

  const premasterSecretEncrypted = crypto
    .publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(premasterSecret, 'utf-8')
    )
    .toString('base64');

  const sesstionKey = premasterSecret + serverRandomHello;

  Object.assign(sessionData, {
    serverRandomHello,
    publicKey,
    premasterSecret,
    sesstionKey,
  });

  client.write(
    JSON.stringify({
      action: Action.PREMASTER_SECRET_EXCHANGE,
      data: premasterSecretEncrypted,
    })
  );
};

const handleClientReady = (client) => {
  const { premasterSecret, serverRandomHello } = sessionData;
  const sessionKey = premasterSecret + serverRandomHello;

  Object.assign(sessionData, { sessionKey });

  client.write(
    JSON.stringify({
      action: Action.READY,
      data: encryptDataForTransmission('READY', sessionKey),
    })
  );
};

const client = net.createConnection({ port: SERVER_PORT }, async () => {
  const clientRandomHello = generateRandomString();

  client.write(
    JSON.stringify({
      action: Action.HELLO,
      data: clientRandomHello,
    })
  );

  Object.assign(sessionData, { clientRandomHello });

  const establishSecureConnection = () => {
    return new Promise((resolve) => {
      const dataListener = (buffer) => {
        const stringifiedData = buffer.toString('utf-8');
        const jsonData = JSON.parse(stringifiedData);

        const handler = {
          [Action.HELLO]: () => {
            const [serverRandomHello, publicKey] = jsonData.data;
            handleServerHello(serverRandomHello, publicKey).catch(() =>
              resolve(false)
            );
          },
          [Action.READY]: () => {
            handleClientReady(client);
            client.removeListener('data', dataListener);
            resolve(true);
          },
        }[jsonData.action];

        handler?.();
      };

      client.on('data', dataListener);
    });
  };

  const hasConnected = await establishSecureConnection();

  if (hasConnected) {
    log('Secure connection is successfully established!');

    const { premasterSecret, serverRandomHello } = sessionData;

    client.write(
      encryptDataForTransmission(
        'SOME DATA FOR TRANSMISSION',
        premasterSecret + serverRandomHello
      )
    );
  } else {
    log('Failed to establish secure connection!');
  }
});

client.on('end', () => {
  console.log('Client closed connection');
});
