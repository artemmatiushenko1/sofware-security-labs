import { AuthenticationClient, ManagementClient } from 'auth0';
import { auth as jwtValidator } from 'express-oauth2-jwt-bearer';

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

const auth0JwtValidator = jwtValidator({
  issuerBaseURL: `https://${process.env.DOMAIN}`,
  audience: process.env.AUDIENCE,
});

export { auth, management, auth0JwtValidator };
