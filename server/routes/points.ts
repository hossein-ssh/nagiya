import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware, requirePermission, canAccessGroup } from '../middleware.ts';
import { PointTransaction, PointSpendingRequest, GroupId } from '../types.ts';

export const pointsRouter = Router();

// GET /api/points/ledger
pointsRouter.get('/ledger', authMiddleware, (req: Request, res: Response) => {
  const currentUser = req.user!;
  const rawData = db.getRawData();
  const { groupId, userId, category } = req.query;

  let list = [...rawData.pointTransactions];

  if (currentUser.role === 'regular_member') {
    list = list.filter(p => p.userId === currentUser.id);
  } else if (!canAccessGroup(currentUser, (groupId as GroupId) || null)) {
    if (!currentUser.groupId) {
      list = [];
    } else {
      list = list.filter(p => p.groupId === currentUser.groupId);
    }
  } else if (groupId && groupId !== 'all') {
    list = list.filter(p => p.groupId === groupId);
  }

  if (userId) {
    list = list.filter(p => p.userId === userId);
  }

  if (category && category !== 'all') {
    list = list.filter(p => p.category === category);
  }

  // Enrich with user name and author name
  const enriched = list.map(item => {
    const user = rawData.users.find(u => u.id === item.userId);
    const creator = rawData.users.find(u => u.id === item.createdByUserId);
    return {
      ...item,
      userFullName: user ? user.fullName : 'کاربر نامشخص',
      userRank: user ? user.rank : null,
      creatorName: creator ? creator.fullName : 'سیستم',
    };
  });

  res.json({ transactions: enriched });
});

// POST /api/points/adjust (Manual point adjustment / award / penalty)
pointsRouter.post('/adjust', authMiddleware, requirePermission('manage_points'), async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const { userId, amount, reason, category } = req.body;

  if (!userId || amount === undefined || !reason) {
    res.status(400).json({ error: 'شناسه کاربر، مقدار امتیاز و علت تغییر الزامی هستند.' });
    return;
  }

  const rawData = db.getRawData();
  const targetUser = rawData.users.find(u => u.id === userId);
  if (!targetUser) {
    res.status(404).json({ error: 'کاربر مورد نظر یافت نشد.' });
    return;
  }

  // Group isolation
  if (!canAccessGroup(currentUser, targetUser.groupId)) {
    res.status(403).json({ error: 'شما مجاز به تغییر امتیاز اعضای گروه دیگر نیستید.' });
    return;
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount === 0) {
    res.status(400).json({ error: 'میزان امتیاز باید یک عدد غیر صفر باشد.' });
    return;
  }

  // Prevent negative balance if deducting
  if (targetUser.pointsBalance + numAmount < 0) {
    res.status(400).json({
      error: `موجودی امتیاز کاربر (${targetUser.pointsBalance}) برای این مقدار کسر (${Math.abs(numAmount)}) کافی نیست.`,
    });
    return;
  }

  const now = new Date().toISOString();
  targetUser.pointsBalance += numAmount;

  const transaction: PointTransaction = {
    id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: targetUser.id,
    groupId: targetUser.groupId || 'group_a',
    amount: numAmount,
    balanceAfter: targetUser.pointsBalance,
    reason: reason.trim(),
    category: category || 'manual_adjustment',
    createdByUserId: currentUser.id,
    createdAt: now,
  };

  rawData.pointTransactions.unshift(transaction);
  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: numAmount > 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED',
    category: 'points',
    targetGroupId: targetUser.groupId,
    targetUserId: targetUser.id,
    details: `${numAmount > 0 ? 'اعطای' : 'کسر'} ${Math.abs(numAmount)} امتیاز به کاربر "${targetUser.fullName}". موجودی جدید: ${targetUser.pointsBalance}. علت: ${reason}`,
  });

  res.json({
    message: 'امتیاز با موفقیت در دفتر کل امتیازات ثبت گردید.',
    newBalance: targetUser.pointsBalance,
    transaction,
  });
});

// GET /api/points/rules
pointsRouter.get('/rules', authMiddleware, (req: Request, res: Response) => {
  const rawData = db.getRawData();
  res.json({ rules: rawData.scoringRules });
});

// PUT /api/points/rules
pointsRouter.put('/rules', authMiddleware, requirePermission('manage_roles'), async (req: Request, res: Response) => {
  const { rules } = req.body;
  if (!rules || !Array.isArray(rules)) {
    res.status(400).json({ error: 'فرمت قوانین ارسالی نامعتبر است.' });
    return;
  }

  const rawData = db.getRawData();
  rawData.scoringRules = rules;
  await db.persist();

  await db.logAudit({
    actorUserId: req.user!.id,
    actorPhone: req.user!.phone,
    actorRole: req.user!.role,
    action: 'SCORING_RULES_UPDATED',
    category: 'points',
    details: 'قوانین و فرمول‌های محاسباتی امتیازدهی به‌روزرسانی شد.',
  });

  res.json({ message: 'قوانین امتیازدهی با موفقیت ذخیره گردید.', rules });
});

// GET /api/points/spending-requests
pointsRouter.get('/spending-requests', authMiddleware, (req: Request, res: Response) => {
  const currentUser = req.user!;
  const rawData = db.getRawData();
  const { groupId, status } = req.query;

  let list = [...rawData.spendingRequests];

  if (currentUser.role === 'regular_member') {
    list = list.filter(r => r.userId === currentUser.id);
  } else if (!canAccessGroup(currentUser, (groupId as GroupId) || null)) {
    if (!currentUser.groupId) {
      list = [];
    } else {
      list = list.filter(r => r.groupId === currentUser.groupId);
    }
  } else if (groupId && groupId !== 'all') {
    list = list.filter(r => r.groupId === groupId);
  }

  if (status && status !== 'all') {
    list = list.filter(r => r.status === status);
  }

  const enriched = list.map(item => {
    const user = rawData.users.find(u => u.id === item.userId);
    const reviewer = item.reviewedByUserId ? rawData.users.find(u => u.id === item.reviewedByUserId) : null;
    return {
      ...item,
      userFullName: user ? user.fullName : 'عضو نامشخص',
      userPhone: user ? user.phone : '',
      currentBalance: user ? user.pointsBalance : 0,
      reviewerName: reviewer ? reviewer.fullName : null,
    };
  });

  res.json({ requests: enriched });
});

// POST /api/points/spending-requests (Submit spending request e.g. for leave)
pointsRouter.post('/spending-requests', authMiddleware, async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const { pointsCost, purpose } = req.body;

  const cost = Number(pointsCost);
  if (!cost || cost <= 0 || !purpose) {
    res.status(400).json({ error: 'میزان امتیاز مصرفی و هدف درخواست (مانند درخواست مرخصی تشویقی) الزامی هستند.' });
    return;
  }

  if (currentUser.pointsBalance < cost) {
    res.status(400).json({
      error: `موجودی امتیاز شما (${currentUser.pointsBalance}) برای این درخواست (${cost} امتیاز) کافی نمی‌باشد.`,
    });
    return;
  }

  const rawData = db.getRawData();
  const now = new Date().toISOString();
  const newReq: PointSpendingRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: currentUser.id,
    groupId: currentUser.groupId || 'group_a',
    pointsCost: cost,
    purpose: purpose.trim(),
    status: 'pending',
    requestedAt: now,
  };

  rawData.spendingRequests.unshift(newReq);
  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: 'SPENDING_REQUEST_SUBMITTED',
    category: 'points',
    targetGroupId: currentUser.groupId,
    targetUserId: currentUser.id,
    details: `درخواست مصرف ${cost} امتیاز بابت "${purpose}" ثبت شد.`,
  });

  res.status(201).json({
    message: 'درخواست مصرف امتیاز با موفقیت ثبت شد و در انتظار تأیید فرماندهی است.',
    request: newReq,
  });
});

// POST /api/points/spending-requests/:id/review (Review spending request)
pointsRouter.post('/spending-requests/:id/review', authMiddleware, requirePermission('manage_points'), async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const targetId = req.params.id;
  const { decision, comment } = req.body;
  const rawData = db.getRawData();

  const reqItem = rawData.spendingRequests.find(r => r.id === targetId);
  if (!reqItem) {
    res.status(404).json({ error: 'درخواست یافت نشد.' });
    return;
  }

  // Prevent self review
  if (reqItem.userId === currentUser.id && currentUser.role !== 'super_admin') {
    res.status(403).json({ error: 'شما مجاز به تأیید درخواست مصرف امتیاز خود نیستید.' });
    return;
  }

  if (!canAccessGroup(currentUser, reqItem.groupId)) {
    res.status(403).json({ error: 'شما مجاز به بررسی درخواست‌های گروه دیگر نیستید.' });
    return;
  }

  if (!['approved', 'rejected'].includes(decision)) {
    res.status(400).json({ error: 'تصمیم انتخابی نامعتبر است.' });
    return;
  }

  const targetUser = rawData.users.find(u => u.id === reqItem.userId);
  if (!targetUser) {
    res.status(404).json({ error: 'کاربر مربوط به این درخواست یافت نشد.' });
    return;
  }

  const now = new Date().toISOString();
  reqItem.status = decision;
  reqItem.reviewedByUserId = currentUser.id;
  reqItem.reviewComment = comment ? comment.trim() : undefined;
  reqItem.reviewedAt = now;

  // If approved, deduct points atomically and record transaction in ledger
  if (decision === 'approved') {
    if (targetUser.pointsBalance < reqItem.pointsCost) {
      res.status(400).json({
        error: `موجودی امتیاز کاربر در حال حاضر (${targetUser.pointsBalance}) کمتر از هزینه درخواست (${reqItem.pointsCost}) است.`,
      });
      return;
    }

    targetUser.pointsBalance -= reqItem.pointsCost;

    const pt: PointTransaction = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: targetUser.id,
      groupId: reqItem.groupId,
      amount: -reqItem.pointsCost,
      balanceAfter: targetUser.pointsBalance,
      reason: `کسر امتیاز بابت تأیید درخواست: ${reqItem.purpose}`,
      category: 'spending_leave',
      referenceId: reqItem.id,
      createdByUserId: currentUser.id,
      createdAt: now,
    };
    rawData.pointTransactions.unshift(pt);
  }

  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: `SPENDING_REQUEST_${decision.toUpperCase()}`,
    category: 'points',
    targetGroupId: reqItem.groupId,
    targetUserId: targetUser.id,
    details: `بررسی درخواست مصرف ${reqItem.pointsCost} امتیاز: ${decision === 'approved' ? 'تأیید شد و امتیاز کسر گردید' : 'رد شد'}.`,
  });

  res.json({
    message: decision === 'approved' ? 'درخواست تأیید گردید و امتیاز از حساب عضو کسر شد.' : 'درخواست رد شد.',
    request: reqItem,
  });
});
