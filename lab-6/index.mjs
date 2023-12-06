import express from 'express';
import bodyParser from 'body-parser';
import openidConnect from 'express-openid-connect';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const config = {
  authRequired: false,
  auth0Logout: true,
  baseURL: `http://localhost:${process.env.APP_PORT}`,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: `https://${process.env.DOMAIN}`,
  secret: process.env.CLIENT_SECRET,
};

app.use(openidConnect.auth(config));

app.get('/', openidConnect.requiresAuth(), (_, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/current-user', openidConnect.requiresAuth(), async (req, res) => {
  console.log(req.oidc.user);
  const { user } = req.oidc;

  return res.json({
    username: user.name,
    picture: user.picture,
    email: user.email,
    logout: `http://localhost:${process.env.APP_PORT}/logout`,
  });
});

app.listen(process.env.APP_PORT, () => {
  console.log(`Example app listening on port ${process.env.APP_PORT}`);
});
