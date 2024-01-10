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

  log('Premaster secret generated: ', premasterSecret);
  console.log(premasterSecret);

  Object.assign(sessionData, {
    serverRandomHello,
    publicKey,
    premasterSecret,
  });

  client.write(
    JSON.stringify({
      action: Action.PREMASTER_SECRET_EXCHANGE,
      data: premasterSecretEncrypted,
    })
  );

  log('Encrypted premaster secret sent: ');
  console.log(premasterSecretEncrypted);

  const { clientRandomHello } = sessionData;

  const encryptionKey = premasterSecret + serverRandomHello;
  const decryptionKey = premasterSecret + clientRandomHello;
  const sessionKeys = [encryptionKey, decryptionKey];

  Object.assign(sessionData, { sessionKeys });
  log('Session keys generated [encryptionKey, decryptionKey]: ');
  console.log(sessionKeys);
};

const handleClientReady = (client) => {
  const { sessionKeys } = sessionData;
  const [encryptionKey] = sessionKeys;

  const encryptedReadyMessage = encryptDataForTransmission(
    'READY',
    encryptionKey
  );

  client.write(
    JSON.stringify({
      action: Action.READY,
      data: encryptedReadyMessage,
    })
  );

  log('Encrypted client READY message sent');
  console.log(encryptedReadyMessage);
};

const client = net.createConnection({ port: SERVER_PORT }, async () => {
  const clientRandomHello = generateRandomString();

  client.write(
    JSON.stringify({
      action: Action.HELLO,
      data: clientRandomHello,
    })
  );

  log('Client HELLO sent (random string attached): ');
  console.log(clientRandomHello);

  Object.assign(sessionData, { clientRandomHello });

  const establishSecureConnection = () => {
    return new Promise((resolve) => {
      const dataListener = (buffer) => {
        const stringifiedData = buffer.toString('utf-8');
        const jsonData = JSON.parse(stringifiedData);

        const handler = {
          [Action.HELLO]: () => {
            log(
              'Server HELLO recieved (Public key and random string attached):'
            );

            const [serverRandomHello, publicKey] = jsonData.data;

            console.log(publicKey);
            console.log(serverRandomHello);

            handleServerHello(serverRandomHello, publicKey).catch(() =>
              resolve(false)
            );
          },
          [Action.READY]: () => {
            const encryptedServerReadyMessage = jsonData.data;
            log('Encrypted server READY message recieved: ');
            console.log(encryptedServerReadyMessage);

            const { sessionKeys } = sessionData;
            const [_, decryptionKey] = sessionKeys;

            const decryptedServerReadyMessage = decryptRecievedData(
              encryptedServerReadyMessage,
              decryptionKey
            );

            log('Succefully decrypted server READY message: ');
            console.log(decryptedServerReadyMessage);

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
    log('Secure connection is successfully established! ✅');
    const {
      sessionKeys: [encryptionKey, decryptionKey],
    } = sessionData;

    client.on('data', (buffer) => {
      log(
        `Recived server data through secure channel: ${decryptRecievedData(
          buffer.toString(),
          decryptionKey
        )}`
      );
    });

    const ecryptedData = encryptDataForTransmission(
      'SOME TEST MESSAGE FOR TRANSMISSION FROM CLIENT 👋',
      encryptionKey
    );

    log('Sending data to server through secure channel: ');
    console.log(ecryptedData);

    client.write(ecryptedData);
  } else {
    log('Failed to establish secure connection! ⛔');
  }
});

client.on('end', () => {
  console.log('Client closed connection');
});
