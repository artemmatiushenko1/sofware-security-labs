import express from 'express';
import bodyParser from 'body-parser';
import { auth } from './auth0.mjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { HTTP_CODE } from './constants.mjs';
import { authMiddleware } from './auth.middleware.mjs';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.get('/login', (_, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.get('/register', (_, res) => {
  res.sendFile(__dirname + '/public/register.html');
});

app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/logout', (_, res) => {
  res.redirect('/');
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: tokens } = await auth.oauth.passwordGrant({
      password,
      username: email,
      audience: process.env.AUDIENCE,
      scope: 'offline_access',
    });

    return res.json({
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
  } catch {
    return res.status(HTTP_CODE.Unauthorized).send();
  }
});

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    await auth.database.signUp({
      password,
      email,
      connection: 'Username-Password-Authentication',
    });

    const { data: tokens } = await auth.oauth.passwordGrant({
      password,
      username: email,
      audience: process.env.AUDIENCE,
      scope: 'offline_access',
    });

    return res.json({
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
  } catch (err) {
    return res.status(HTTP_CODE.BadRequest).send({ message: err.message });
  }
});

app.get('/api/current-user', authMiddleware, async (req, res) => {
  return res.json({
    username: req.user.name,
    logout: `http://localhost:${process.env.APP_PORT}/logout`,
  });
});

app.post('/api/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const { data: tokens } = await auth.oauth.refreshTokenGrant({
      refresh_token: refreshToken,
    });

    return res.json({
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
  } catch (err) {
    return res.status(HTTP_CODE.Unauthorized).send();
  }
});

app.listen(process.env.APP_PORT, () => {
  console.log(`Example app listening on port ${process.env.APP_PORT}`);
});
