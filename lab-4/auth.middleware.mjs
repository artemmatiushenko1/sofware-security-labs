import { management } from './auth0.mjs';
import { HTTP_CODE, SESSION_KEY } from './constants.mjs';
import { verifyToken } from './verify-token.helper.mjs';

const authMiddleware = async (req, res, next) => {
  const authToken = req.get(SESSION_KEY)?.split(' ').pop();

  if (!authToken) {
    return next();
  }

  try {
    const { sub: userId } = (await verifyToken(authToken)) ?? {};
    const { data: user } = await management.users.get({ id: userId });

    if (!user) {
      return res.status(HTTP_CODE.Unauthorized).send();
    }

    req.user = user;
  } catch (err) {
    return res.status(HTTP_CODE.Unauthorized).send();
  }

  return next();
};

export { authMiddleware };
