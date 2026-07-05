import { Router } from 'express';
import {
  signup,
  login,
  refreshTokens,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from '../../controllers/auth.controller';
import { validate } from '../../middlewares/validate';
import { authLimiter } from '../../middlewares/rateLimiter';
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../../schemas/auth.schema';

const router = Router();

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh-tokens', refreshTokens);
router.post('/logout', logout);
router.get('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

export default router;
