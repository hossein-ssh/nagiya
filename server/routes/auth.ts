import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import {
  verifyPassword,
  hashPassword,
  generateSessionToken,
  checkLoginRateLimit,
  recordFailedLogin,
  resetFailedLogin,
} from '../auth.ts';
import { authMiddleware, sanitizeUser } from '../middleware.ts';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const { phone, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rateLimitKey = `${ip}_${phone || ''}`;

  if (!phone || !password) {
    res.status(400).json({ error: 'شماره تلفن همراه و کلمه عبور الزامی است.' });
    return;
  }

  // Brute force rate limit check
  const rateCheck = checkLoginRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    res.status(429).json({
      error: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً ${rateCheck.remainingLockoutSeconds} ثانیه دیگر مجدداً تلاش کنید.`,
      code: 'RATE_LIMITED',
      retryAfterSeconds: rateCheck.remainingLockoutSeconds,
    });
    return;
  }

  const rawData = db.getRawData();
  const user = rawData.users.find(u => u.phone === phone.trim());

  if (!user) {
    recordFailedLogin(rateLimitKey);
    await db.logAudit({
      actorUserId: 'anonymous',
      actorPhone: phone,
      actorRole: 'regular_member',
      action: 'LOGIN_FAILED',
      category: 'auth',
      details: 'ورود ناموفق: کاربر با این شماره تلفن یافت نشد.',
      ipAddress: ip,
    });
    res.status(401).json({ error: 'شماره تلفن یا کلمه عبور وارد شده اشتباه است.' });
    return;
  }

  // Check if account is disabled
  if (user.status === 'disabled') {
    res.status(403).json({ error: 'حساب کاربری شما توسط مدیر سیستم غیرفعال شده است.' });
    return;
  }

  const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    const failedStatus = recordFailedLogin(rateLimitKey);
    await db.logAudit({
      actorUserId: user.id,
      actorPhone: user.phone,
      actorRole: user.role,
      action: 'LOGIN_FAILED',
      category: 'auth',
      targetUserId: user.id,
      details: 'ورود ناموفق: کلمه عبور اشتباه است.',
      ipAddress: ip,
    });

    if (failedStatus.locked) {
      res.status(429).json({
        error: `حساب شما به دلیل تلاش‌های مکرر ناموفق موقتاً به مدت ۱۵ دقیقه مسدود شد.`,
        code: 'ACCOUNT_TEMPORARILY_LOCKED',
      });
      return;
    }

    res.status(401).json({ error: 'شماره تلفن یا کلمه عبور وارد شده اشتباه است.' });
    return;
  }

  // Successful login: reset rate limit attempts
  resetFailedLogin(rateLimitKey);

  const token = generateSessionToken();
  const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
  rawData.sessions.push({
    token,
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + sessionDuration,
  });

  await db.persist();

  await db.logAudit({
    actorUserId: user.id,
    actorPhone: user.phone,
    actorRole: user.role,
    action: 'LOGIN_SUCCESS',
    category: 'auth',
    targetUserId: user.id,
    targetGroupId: user.groupId,
    details: 'ورود موفق به سامانه مدیریت اعضا.',
    ipAddress: ip,
  });

  const permissions = rawData.rolePermissions[user.role];

  res.json({
    token,
    user: sanitizeUser(user),
    permissions,
    groups: rawData.groups,
  });
});

// GET /api/auth/me
authRouter.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = req.user!;
  const rawData = db.getRawData();
  const permissions = rawData.rolePermissions[user.role];

  res.json({
    user: sanitizeUser(user),
    permissions,
    groups: rawData.groups,
  });
});

// POST /api/auth/logout
authRouter.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  const token = req.sessionToken!;
  const rawData = db.getRawData();
  rawData.sessions = rawData.sessions.filter(s => s.token !== token);
  await db.persist();

  await db.logAudit({
    actorUserId: req.user!.id,
    actorPhone: req.user!.phone,
    actorRole: req.user!.role,
    action: 'LOGOUT',
    category: 'auth',
    details: 'خروج از سامانه.',
  });

  res.json({ message: 'با موفقیت خارج شدید.' });
});

// POST /api/auth/change-initial-password
authRouter.post('/change-initial-password', authMiddleware, async (req: Request, res: Response) => {
  const { newPassword, confirmPassword } = req.body;
  const user = req.user!;

  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد.' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'تکرار کلمه عبور با کلمه عبور وارد شده همخوانی ندارد.' });
    return;
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.passwordSalt = salt;
  user.mustChangePassword = false;
  user.updatedAt = new Date().toISOString();

  await db.persist();

  await db.logAudit({
    actorUserId: user.id,
    actorPhone: user.phone,
    actorRole: user.role,
    action: 'INITIAL_PASSWORD_CHANGED',
    category: 'auth',
    targetUserId: user.id,
    details: 'رمز عبور اولیه در نخستین ورود با موفقیت تغییر یافت.',
  });

  res.json({
    message: 'رمز عبور اولیه با موفقیت به‌روزرسانی شد.',
    user: sanitizeUser(user),
  });
});

// POST /api/auth/change-password
authRouter.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = req.user!;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'رمز عبور فعلی و رمز عبور جدید الزامی هستند.' });
    return;
  }

  if (!verifyPassword(currentPassword, user.passwordHash, user.passwordSalt)) {
    res.status(400).json({ error: 'رمز عبور فعلی نادرست است.' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد.' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'تکرار رمز عبور جدید همخوانی ندارد.' });
    return;
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.passwordSalt = salt;
  user.updatedAt = new Date().toISOString();

  await db.persist();

  await db.logAudit({
    actorUserId: user.id,
    actorPhone: user.phone,
    actorRole: user.role,
    action: 'PASSWORD_UPDATED',
    category: 'auth',
    targetUserId: user.id,
    details: 'رمز عبور کاربر تغییر یافت.',
  });

  res.json({ message: 'رمز عبور با موفقیت تغییر کرد.' });
});
