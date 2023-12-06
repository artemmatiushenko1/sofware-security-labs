import { auth0JwtValidator, management } from './auth0.mjs';
import { HTTP_CODE } from './constants.mjs';
import express from 'express';

const router = express.Router();

const userMiddleware = async (req, res, next) => {
  try {
    console.log(req.auth);

    const { sub: userId } = req.auth?.payload ?? {};
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

router.use(auth0JwtValidator);
router.use(userMiddleware);

export { router as authMiddleware };
