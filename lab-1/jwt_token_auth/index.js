const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const path = require('path');

const PORT = 3000;
const JWT_SECRET_KEY = 'JWT_SECRET_KEY';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';

app.use((req, res, next) => {
  const authToken = req.get(SESSION_KEY);

  if (!authToken) {
    return next();
  }

  try {
    const { login } = jwt.verify(authToken, JWT_SECRET_KEY);

    if (!login) {
      return res.status(401).send();
    }

    const user = users.find((user) => user.login === login);

    if (!user) {
      return res.status(401).send();
    }

    req.user = user;
    const [_, tokenPayloadBase64] = authToken.split('.');
    const tokenPayloadDecoded = JSON.parse(atob(tokenPayloadBase64));
    req.tokenIsValidUntil = new Date(tokenPayloadDecoded.exp * 1000).toString();
    req.tokenExpirationTime = tokenPayloadDecoded.exp - tokenPayloadDecoded.iat;
  } catch {
    return res.status(401).send();
  }

  return next();
});

app.get('/', (req, res) => {
  if (req.user) {
    return res.json({
      username: req.user.username,
      tokenIsValidUntil: req.tokenIsValidUntil,
      tokenExpirationTime: req.tokenExpirationTime,
      logout: 'http://localhost:3000/logout',
    });
  }

  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/logout', (req, res) => {
  res.redirect('/');
});

const users = [
  {
    login: 'Login',
    password: 'Password',
    username: 'Username',
  },
  {
    login: 'Login1',
    password: 'Password1',
    username: 'Username1',
  },
  {
    login: 'artom.matyushenko@gmail.com',
    password: '12345678aA@',
    username: 'Artem',
  },
];

app.post('/api/login', (req, res) => {
  const { login, password } = req.body;

  const user = users.find((user) => {
    if (user.login === login && user.password === password) {
      return true;
    }
    return false;
  });

  if (user) {
    const token = jwt.sign(
      { username: user.username, login: user.login },
      JWT_SECRET_KEY,
      { expiresIn: '6h' }
    );

    return res.json({ token });
  }

  return res.status(401).send();
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
