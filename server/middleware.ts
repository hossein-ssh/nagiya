import { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';
import { User, RolePermissions, GroupId } from './types.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || (req.headers['x-session-token'] as string);
  if (!authHeader) {
    res.status(401).json({ error: 'لطفاً ابتدا وارد حساب کاربری خود شوید.' });
    return;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  const rawData = db.getRawData();
  const session = rawData.sessions.find(s => s.token === token);

  if (!session) {
    res.status(401).json({ error: 'نشست کاربری نامعتبر یا منقضی شده است.' });
    return;
  }

  if (Date.now() > session.expiresAt) {
    // Remove expired session
    rawData.sessions = rawData.sessions.filter(s => s.token !== token);
    db.persist().catch(console.error);
    res.status(401).json({ error: 'زمان نشست شما به پایان رسیده است. لطفاً مجدداً وارد شوید.' });
    return;
  }

  const user = rawData.users.find(u => u.id === session.userId);
  if (!user) {
    res.status(401).json({ error: 'کاربر مربوط به این نشست یافت نشد.' });
    return;
  }

  // Security check: Disabled accounts must be immediately barred
  if (user.status === 'disabled') {
    res.status(403).json({ error: 'حساب کاربری شما توسط مدیر سیستم غیرفعال شده است.' });
    return;
  }

  req.user = user;
  req.sessionToken = token;

  // Enforce password change before any other action
  if (user.mustChangePassword) {
    const isAllowedPath =
      req.path === '/api/auth/change-initial-password' ||
      req.path === '/api/auth/me' ||
      req.path === '/api/auth/logout';
    if (!isAllowedPath) {
      res.status(403).json({
        error: 'تغییر رمز عبور در اولین ورود به سامانه الزامی است.',
        code: 'MUST_CHANGE_PASSWORD',
      });
      return;
    }
  }

  next();
}

export function requirePermission(permission: keyof RolePermissions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'عدم احراز هویت.' });
      return;
    }

    // Super Admin has full bypass if role is super_admin
    if (req.user.role === 'super_admin') {
      next();
      return;
    }

    const rawData = db.getRawData();
    const roleConfig = rawData.rolePermissions[req.user.role];

    if (!roleConfig || !roleConfig[permission]) {
      res.status(403).json({
        error: `شما مجوز لازم (${permission}) برای انجام این عملیات را ندارید.`,
        code: 'PERMISSION_DENIED',
      });
      return;
    }

    next();
  };
}

export function canAccessGroup(user: User, targetGroupId: GroupId | 'all' | null): boolean {
  if (user.role === 'super_admin') return true;
  const rawData = db.getRawData();
  const roleConfig = rawData.rolePermissions[user.role];

  // If user has view_both_groups permission
  if (roleConfig && roleConfig.view_both_groups) {
    return true;
  }

  if (targetGroupId === 'all') {
    return false;
  }

  if (!user.groupId) {
    return false;
  }

  return user.groupId === targetGroupId;
}

export function sanitizeUser(user: User): Omit<User, 'passwordHash' | 'passwordSalt'> {
  const { passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser;
}
