import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware, requirePermission, canAccessGroup } from '../middleware.ts';
import { Notice, NoticeType, GroupId } from '../types.ts';

export const noticesRouter = Router();

// GET /api/notices
noticesRouter.get('/', authMiddleware, (req: Request, res: Response) => {
  const currentUser = req.user!;
  const rawData = db.getRawData();
  const { type, priority } = req.query;

  let list = [...rawData.notices];

  // Filtering based on user's authorized scope
  if (currentUser.role === 'super_admin' || currentUser.role === 'leader' || currentUser.role === 'commander_in_chief') {
    // Can view all notices
  } else {
    // Restricted to notices targeting 'all' or their own group or specific to them
    list = list.filter(n => {
      if (n.targetGroupId === 'all') return true;
      if (currentUser.groupId && n.targetGroupId === currentUser.groupId) return true;
      if (n.targetUserId === currentUser.id) return true;
      return false;
    });
  }

  if (type && type !== 'all') {
    list = list.filter(n => n.type === type);
  }

  if (priority && priority !== 'all') {
    list = list.filter(n => n.priority === priority);
  }

  // Enrich with read status & author info
  const enriched = list.map(item => {
    const author = rawData.users.find(u => u.id === item.createdByUserId);
    const isRead = item.readByUserIds.includes(currentUser.id);
    return {
      ...item,
      authorName: author ? author.fullName : 'مدیریت',
      authorRole: author ? author.role : null,
      isRead,
    };
  });

  res.json({ notices: enriched });
});

// POST /api/notices (Create notice/mission/warning/announcement)
noticesRouter.post('/', authMiddleware, requirePermission('manage_notices'), async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const { title, content, type, priority, targetGroupId, targetUserId } = req.body;

  if (!title || !content || !type || !priority) {
    res.status(400).json({ error: 'عنوان، متن پیام، نوع و اولویت الزامی هستند.' });
    return;
  }

  // Validate group target
  const targetGroup = targetGroupId || (currentUser.groupId || 'all');
  if (targetGroup !== 'all' && !canAccessGroup(currentUser, targetGroup)) {
    res.status(403).json({ error: 'شما مجاز به ارسال اطلاعیه به گروه دیگر نیستید.' });
    return;
  }

  const rawData = db.getRawData();
  const now = new Date().toISOString();
  const newNotice: Notice = {
    id: `not_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    targetGroupId: targetGroup,
    targetUserId: targetUserId || undefined,
    type: type as NoticeType,
    title: title.trim(),
    content: content.trim(),
    priority: priority || 'medium',
    createdByUserId: currentUser.id,
    createdAt: now,
    readByUserIds: [currentUser.id],
  };

  rawData.notices.unshift(newNotice);
  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: 'NOTICE_CREATED',
    category: 'notices',
    targetGroupId: targetGroup === 'all' ? null : targetGroup,
    details: `اطلاعیه/ابلاغیه با عنوان "${newNotice.title}" با نوع ${type} و اولویت ${priority} ثبت شد.`,
  });

  res.status(201).json({
    message: 'اطلاعیه/ابلاغیه با موفقیت منتشر گردید.',
    notice: newNotice,
  });
});

// POST /api/notices/:id/read (Mark as read)
noticesRouter.post('/:id/read', authMiddleware, async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const targetId = req.params.id;
  const rawData = db.getRawData();

  const notice = rawData.notices.find(n => n.id === targetId);
  if (!notice) {
    res.status(404).json({ error: 'اطلاعیه یافت نشد.' });
    return;
  }

  if (!notice.readByUserIds.includes(currentUser.id)) {
    notice.readByUserIds.push(currentUser.id);
    await db.persist();
  }

  res.json({ message: 'وضعیت پیام به خوانده شده تغییر یافت.' });
});

// DELETE /api/notices/:id
noticesRouter.delete('/:id', authMiddleware, requirePermission('manage_notices'), async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const targetId = req.params.id;
  const rawData = db.getRawData();

  const idx = rawData.notices.findIndex(n => n.id === targetId);
  if (idx < 0) {
    res.status(404).json({ error: 'اطلاعیه یافت نشد.' });
    return;
  }

  const notice = rawData.notices[idx];
  if (notice.createdByUserId !== currentUser.id && currentUser.role !== 'super_admin') {
    res.status(403).json({ error: 'شما فقط مجاز به حذف اطلاعیه‌های ایجاد شده توسط خود هستید.' });
    return;
  }

  rawData.notices.splice(idx, 1);
  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: 'NOTICE_DELETED',
    category: 'notices',
    details: `اطلاعیه "${notice.title}" حذف شد.`,
  });

  res.json({ message: 'اطلاعیه با موفقیت حذف گردید.' });
});
