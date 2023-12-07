import express from 'express';
import bodyParser from 'body-parser';
import { auth } from './auth0.mjs';
import { HTTP_CODE } from './constants.mjs';
import { authMiddleware } from './auth.middleware.mjs';

const app = express();

app.get('/login', (_, res) => {
  const scopes = encodeURIComponent(
    ['offline_access', 'profile', 'openid'].join(' ')
  );

  const state = 'xyzABC123';

  res.redirect(
    `https://${process.env.DOMAIN}/authorize?response_type=code&client_id=${process.env.CLIENT_ID}&redirect_uri=http://localhost:3000&scope=${scopes}&state=${state}&audience=${process.env.AUDIENCE}`
  );
});

app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/logout', (_, res) => {
  res.redirect('/');
});

app.post('/api/loginByCode', async (req, res) => {
  try {
    const { data: tokens } = await auth.oauth.authorizationCodeGrant({
      code: req.body.code,
      redirect_uri: 'http://localhost:3000',
    });

    return res.json({
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
  } catch (err) {
    console.log({ err });
    return res.status(HTTP_CODE.Unauthorized).send();
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
