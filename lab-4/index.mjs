import express from 'express';
import bodyParser from 'body-parser';
import { authMiddleware } from './auth.middleware.mjs';
import { auth } from './auth0.mjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/public/register.html');
});

app.get('/', (req, res) => {
  return res.sendFile(__dirname + '/public/index.html');
});

app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/current-user', authMiddleware, (req, res) => {
  if (req.user) {
    return res.json({
      username: req.user.name,
      logout: `http://localhost:${process.env.APP_PORT}/logout`,
    });
  }

  return res.status(401).send();
});

app.get('/logout', (req, res) => {
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
    return res.status(401).send();
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
    return res.status(403).send({ message: err.message });
  }
});

app.listen(process.env.APP_PORT, () => {
  console.log(`Example app listening on port ${process.env.APP_PORT}`);
});
