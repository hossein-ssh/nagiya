import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware, requirePermission } from '../middleware.ts';
import { runSecurityAndIsolationTests } from '../../test/test-runner.ts';

export const systemRouter = Router();

// GET /api/system/backups
systemRouter.get('/backups', authMiddleware, requirePermission('manage_backups'), (req: Request, res: Response) => {
  const backups = db.listBackups();
  res.json({ backups });
});

// POST /api/system/backup
systemRouter.post('/backup', authMiddleware, requirePermission('manage_backups'), async (req: Request, res: Response) => {
  const fileName = await db.createBackup('manual');

  await db.logAudit({
    actorUserId: req.user!.id,
    actorPhone: req.user!.phone,
    actorRole: req.user!.role,
    action: 'BACKUP_CREATED',
    category: 'system',
    details: `نسخه پشتیبان دستی جدید با نام فایل "${fileName}" ایجاد شد.`,
  });

  res.json({ message: 'نسخه پشتیبان با موفقیت ایجاد گردید.', fileName });
});

// POST /api/system/restore
systemRouter.post('/restore', authMiddleware, requirePermission('manage_backups'), async (req: Request, res: Response) => {
  const { backupFileName } = req.body;
  if (!backupFileName) {
    res.status(400).json({ error: 'نام فایل پشتیبان الزامی است.' });
    return;
  }

  const success = await db.restoreFromBackup(backupFileName);
  if (!success) {
    res.status(400).json({ error: 'فایل پشتیبان مشخص شده یافت نشد یا معتبر نیست.' });
    return;
  }

  await db.logAudit({
    actorUserId: req.user!.id,
    actorPhone: req.user!.phone,
    actorRole: req.user!.role,
    action: 'DATABASE_RESTORED',
    category: 'system',
    details: `پایگاه داده از فایل پشتیبان "${backupFileName}" بازیابی شد.`,
  });

  res.json({ message: 'پایگاه داده با موفقیت از فایل پشتیبان بازیابی شد.' });
});

// POST /api/system/reset-seed
systemRouter.post('/reset-seed', authMiddleware, requirePermission('manage_backups'), async (req: Request, res: Response) => {
  await db.resetToSeed();

  await db.logAudit({
    actorUserId: req.user!.id,
    actorPhone: req.user!.phone,
    actorRole: req.user!.role,
    action: 'SEED_RESET',
    category: 'system',
    details: 'پایگاه داده به حالت آزمایشی اولیه بازنشانی شد.',
  });

  res.json({ message: 'پایگاه داده به داده‌های اولیه آزمایشی بازنشانی گردید.' });
});

// POST /api/system/run-automated-tests
systemRouter.post('/run-automated-tests', authMiddleware, requirePermission('view_audit_logs'), async (req: Request, res: Response) => {
  const testResults = await runSecurityAndIsolationTests();
  res.json({ results: testResults });
});

// GET /api/system/export-json
systemRouter.get('/export-json', authMiddleware, requirePermission('manage_backups'), (req: Request, res: Response) => {
  const raw = db.getRawData();
  // Strip password hashes & salts from export for security
  const safeData = {
    ...raw,
    users: raw.users.map(({ passwordHash, passwordSalt, ...u }) => u),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="database-export.json"');
  res.send(JSON.stringify(safeData, null, 2));
});
