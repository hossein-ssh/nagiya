import { Router, Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { db, UPLOADS_DIR } from '../db.ts';
import { authMiddleware, requirePermission, canAccessGroup } from '../middleware.ts';
import { ActivityReport, ActivityStatus, GroupId, PointTransaction } from '../types.ts';

export const activitiesRouter = Router();

// GET /api/activities
activitiesRouter.get('/', authMiddleware, (req: Request, res: Response) => {
  const currentUser = req.user!;
  const rawData = db.getRawData();
  const { groupId, status, userId, category } = req.query;

  let list = [...rawData.activities];

  // Group isolation & role restrictions
  if (currentUser.role === 'regular_member') {
    list = list.filter(a => a.userId === currentUser.id);
  } else if (!canAccessGroup(currentUser, (groupId as GroupId) || null)) {
    if (!currentUser.groupId) {
      list = [];
    } else {
      list = list.filter(a => a.groupId === currentUser.groupId);
    }
  } else if (groupId && groupId !== 'all') {
    list = list.filter(a => a.groupId === groupId);
  }

  if (status && status !== 'all') {
    list = list.filter(a => a.status === status);
  }

  if (userId) {
    list = list.filter(a => a.userId === userId);
  }

  if (category && category !== 'all') {
    list = list.filter(a => a.category === category);
  }

  // Enrich with submitter and reviewer names
  const enriched = list.map(item => {
    const submitter = rawData.users.find(u => u.id === item.userId);
    const reviewer = item.reviewerId ? rawData.users.find(u => u.id === item.reviewerId) : null;
    return {
      ...item,
      submitterName: submitter ? submitter.fullName : 'عضو نامشخص',
      submitterRank: submitter ? submitter.rank : null,
      submitterPhone: submitter ? submitter.phone : '',
      reviewerName: reviewer ? reviewer.fullName : null,
    };
  });

  res.json({ activities: enriched });
});

// POST /api/activities (Submit report)
activitiesRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const { title, description, category, hoursSpent, imageBase64, imageMime } = req.body;

  if (!title || !description || !category) {
    res.status(400).json({ error: 'عنوان، توضیحات و دسته‌بندی فعالیت الزامی هستند.' });
    return;
  }

  if (!currentUser.groupId) {
    res.status(400).json({ error: 'کاربر به هیچ گروه سازمانی اختصاص نیافته است.' });
    return;
  }

  let savedFileName: string | undefined = undefined;

  // Handle private secure image upload if provided
  if (imageBase64) {
    try {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      const mime = imageMime || 'image/jpeg';
      if (!allowedMimes.includes(mime)) {
        res.status(400).json({ error: 'فرمت تصویر نامعتبر است. فقط JPG, PNG, WEBP مجاز هستند.' });
        return;
      }

      const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        res.status(400).json({ error: 'حجم تصویر پیوست نباید بیش از ۵ مگابایت باشد.' });
        return;
      }

      const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
      savedFileName = `act_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, savedFileName);
      await fs.promises.writeFile(filePath, buffer);
    } catch (err) {
      console.error('Error saving uploaded image:', err);
      res.status(500).json({ error: 'خطا در ذخیره‌سازی فایل پیوست تصویر.' });
      return;
    }
  }

  const rawData = db.getRawData();
  const now = new Date().toISOString();
  const newActivity: ActivityReport = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    groupId: currentUser.groupId,
    userId: currentUser.id,
    title: title.trim(),
    description: description.trim(),
    category: category.trim(),
    hoursSpent: Number(hoursSpent || 1),
    imageFileName: savedFileName,
    status: 'pending',
    submittedAt: now,
  };

  rawData.activities.unshift(newActivity);
  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: 'ACTIVITY_SUBMITTED',
    category: 'activities',
    targetGroupId: currentUser.groupId,
    targetUserId: currentUser.id,
    details: `گزارش فعالیت جدید با عنوان "${newActivity.title}" برای بررسی ارسال شد.`,
  });

  res.status(201).json({
    message: 'گزارش فعالیت با موفقیت ثبت شد و در صف بررسی قرار گرفت.',
    activity: newActivity,
  });
});

// POST /api/activities/:id/review (Approve or Reject with comments & points)
activitiesRouter.post('/:id/review', authMiddleware, requirePermission('review_activities'), async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const targetId = req.params.id;
  const { decision, comment, rejectionReason, points } = req.body;
  const rawData = db.getRawData();

  const activity = rawData.activities.find(a => a.id === targetId);
  if (!activity) {
    res.status(404).json({ error: 'گزارش فعالیت مورد نظر یافت نشد.' });
    return;
  }

  // Security Invariant: A user CANNOT review/approve their own activity!
  if (activity.userId === currentUser.id && currentUser.role !== 'super_admin') {
    res.status(403).json({ error: 'تداخل منافع: شما مجاز به بررسی و تأیید گزارش فعالیت خود نیستید.' });
    return;
  }

  // Group isolation: must have access to the group of this activity
  if (!canAccessGroup(currentUser, activity.groupId)) {
    res.status(403).json({ error: 'شما مجاز به بررسی فعالیت‌های اعضای این گروه نیستید.' });
    return;
  }

  if (!['approved', 'rejected', 'pending'].includes(decision)) {
    res.status(400).json({ error: 'تصمیم انتخابی نامعتبر است (باید تأیید، رد یا در حال بررسی باشد).' });
    return;
  }

  // If rejected, rejectionReason is mandatory
  if (decision === 'rejected' && (!rejectionReason || !rejectionReason.trim())) {
    res.status(400).json({ error: 'در صورت رد گزارش، ذکر دلیل رد الزامی است.' });
    return;
  }

  const now = new Date().toISOString();
  activity.status = decision as ActivityStatus;
  activity.reviewerId = currentUser.id;
  activity.reviewerComment = comment ? comment.trim() : undefined;
  activity.rejectionReason = decision === 'rejected' ? rejectionReason.trim() : undefined;
  activity.reviewedAt = now;

  // If approved, award points atomically
  if (decision === 'approved') {
    const pts = Number(points || 20);
    activity.awardedPoints = pts;

    const author = rawData.users.find(u => u.id === activity.userId);
    if (author && pts > 0) {
      author.pointsBalance += pts;
      const pt: PointTransaction = {
        id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: author.id,
        groupId: activity.groupId,
        amount: pts,
        balanceAfter: author.pointsBalance,
        reason: `پاداش تأیید فعالیت: "${activity.title}"`,
        category: 'activity_reward',
        referenceId: activity.id,
        createdByUserId: currentUser.id,
        createdAt: now,
      };
      rawData.pointTransactions.unshift(pt);
    }
  }

  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: `ACTIVITY_${decision.toUpperCase()}`,
    category: 'activities',
    targetGroupId: activity.groupId,
    targetUserId: activity.userId,
    details: `بررسی گزارش "${activity.title}": وضعیت به ${decision} تغییر یافت. ${decision === 'rejected' ? 'علت رد: ' + rejectionReason : 'امتیاز: ' + (activity.awardedPoints || 0)}`,
  });

  res.json({
    message: decision === 'approved' ? 'فعالیت با موفقیت تأیید شد و امتیاز لحاظ گردید.' : 'گزارش فعالیت رد شد.',
    activity,
  });
});

// GET /api/activities/files/:fileName (Secure file server for private uploads)
activitiesRouter.get('/files/:fileName', authMiddleware, (req: Request, res: Response) => {
  const currentUser = req.user!;
  const fileName = req.params.fileName;
  const rawData = db.getRawData();

  // Find the activity associated with this file
  const activity = rawData.activities.find(a => a.imageFileName === fileName);
  if (!activity) {
    res.status(404).json({ error: 'فایل مورد نظر یافت نشد.' });
    return;
  }

  // Check authorization to access this activity's attachment
  if (currentUser.role === 'regular_member' && activity.userId !== currentUser.id) {
    res.status(403).json({ error: 'دسترسی غیرمجاز به فایل پیوست کاربر دیگر.' });
    return;
  }

  if (!canAccessGroup(currentUser, activity.groupId)) {
    res.status(403).json({ error: 'دسترسی غیرمجاز به فایل‌های گروه دیگر.' });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'فایل بر روی دیسک یافت نشد.' });
    return;
  }

  // Stream private file safely
  res.sendFile(filePath);
});
