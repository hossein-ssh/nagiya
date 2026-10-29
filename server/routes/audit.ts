import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware, requirePermission, canAccessGroup } from '../middleware.ts';

export const auditRouter = Router();

// GET /api/audit
auditRouter.get('/', authMiddleware, requirePermission('view_audit_logs'), (req: Request, res: Response) => {
  const currentUser = req.user!;
  const rawData = db.getRawData();
  const { category, search, groupId, startDate, endDate, page = '1', limit = '50' } = req.query;

  let list = [...rawData.auditLogs];

  if (!canAccessGroup(currentUser, null)) {
    if (currentUser.groupId) {
      list = list.filter(l => !l.targetGroupId || l.targetGroupId === currentUser.groupId);
    }
  }

  if (category && category !== 'all') {
    list = list.filter(l => l.category === category);
  }

  if (groupId && groupId !== 'all') {
    list = list.filter(l => l.targetGroupId === groupId);
  }

  if (startDate) {
    list = list.filter(l => l.timestamp >= String(startDate));
  }

  if (endDate) {
    list = list.filter(l => l.timestamp <= String(endDate) + 'T23:59:59.999Z');
  }

  if (search && typeof search === 'string') {
    const q = search.trim().toLowerCase();
    list = list.filter(
      l =>
        l.details.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.actorPhone.includes(q)
    );
  }

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(10, parseInt(String(limit), 10) || 50));
  const total = list.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = list.slice(startIndex, startIndex + limitNum);

  res.json({
    logs: paginated,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});
