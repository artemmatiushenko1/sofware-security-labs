const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const path = require('path');
const { AuthenticationClient, ManagementClient } = require('auth0');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';

const auth = new AuthenticationClient({
  domain: process.env.DOMAIN,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});

const management = new ManagementClient({
  domain: process.env.DOMAIN,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});

const verifyToken = async (bearerToken) => {
  const jwks = jwksClient({
    jwksUri: `https://${process.env.DOMAIN}/.well-known/jwks.json`,
  });

  const getJwksClientKey = (header, callback) => {
    jwks.getSigningKey(header.kid, (_, key) => {
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

app.use(async (req, res, next) => {
  const authToken = req.get(SESSION_KEY)?.split(' ').pop();

  if (!authToken) {
    return next();
  }

  try {
    const { sub: userId } = (await verifyToken(authToken)) ?? {};

    if (!userId) {
      return res.status(401).send();
    }

    const { data: user } = await management.users.get({ id: userId });

    if (!user) {
      return res.status(401).send();
    }

    req.user = user;
  } catch (err) {
    return res.status(401).send();
  }

  return next();
});

app.get('/', (req, res) => {
  if (req.user) {
    return res.json({
      username: req.user.name,
      logout: `http://localhost:${process.env.APP_PORT}/logout`,
    });
  }

  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/logout', (req, res) => {
  res.redirect('/');
});

app.post('/api/login', async (req, res) => {
  const { login, password } = req.body;

  try {
    const { data: tokens } = await auth.oauth.passwordGrant({
      password,
      username: login,
      audience: process.env.AUDIENCE,
      scope: 'offline_access',
    });

    return res.json({
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
  } catch {
    return res.status(401).send();
  }
});

app.listen(process.env.APP_PORT, () => {
  console.log(`Example app listening on port ${process.env.APP_PORT}`);
});
