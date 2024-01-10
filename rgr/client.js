import net from 'net';
import crypto from 'crypto';
import { Action } from './action.js';
import {
  decryptRecievedData,
  encryptDataForTransmission,
  generateRandomString,
} from './helpers.js';
import { SERVER_PORT, SYMMETRIC_ALGORITHM } from './constants.js';

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

const client = net.createConnection({ port: SERVER_PORT }, () => {
  const clientRandomHello = generateRandomString();

  client.write(
    JSON.stringify({
      action: Action.HELLO,
      data: clientRandomHello,
    })
  );

  Object.assign(sessionData, { clientRandomHello });
});

client.on('data', (buffer) => {
  const stringifiedData = buffer.toString('utf-8');
  const jsonData = JSON.parse(stringifiedData);

  const handler = {
    [Action.HELLO]: () => {
      const [serverRandomHello, publicKey] = jsonData.data;
      handleServerHello(serverRandomHello, publicKey);
    },
    [Action.READY]: () => {
      handleClientReady(client);
    },
    [Action.DATA_TRANSFER]: () => {
      const { premasterSecret, clientRandomHello } = sessionData;
      console.log({ premasterSecret, clientRandomHello });

      console.log(
        decryptRecievedData(jsonData.data, premasterSecret + clientRandomHello)
      );
    },
  }[jsonData.action];

  handler?.();
});

client.on('end', () => {
  console.log('Client closed connection');
});
