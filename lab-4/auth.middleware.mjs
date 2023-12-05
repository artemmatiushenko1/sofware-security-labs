import { management } from './auth0.mjs';
import { verifyToken } from './verify-token.helper.mjs';

const SESSION_KEY = 'Authorization';

const authMiddleware = async (req, res, next) => {
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
};

export { authMiddleware };
