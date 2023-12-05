import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { authMiddleware } from './auth.middleware.mjs';
import { auth } from './auth0.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', authMiddleware, (req, res) => {
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
