import jwt from 'jsonwebtoken';
import jwks from 'jwks-rsa';

const verifyToken = async (bearerToken) => {
  const jwksClient = jwks({
    jwksUri: `https://${process.env.DOMAIN}/.well-known/jwks.json`,
  });

  const getJwksClientKey = (header, callback) => {
    jwksClient.getSigningKey(header.kid, (_, key) => {
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    });
  };

  return new Promise((resolve, reject) => {
    jwt.verify(
      bearerToken,
      getJwksClientKey,
      {
        audience: process.env.AUDIENCE,
        issuer: `https://${process.env.DOMAIN}/`,
        algorithms: ['RS256'],
      },
      (err, decoded) => (err ? reject(err) : resolve(decoded))
    );
  });
};

export { verifyToken };
