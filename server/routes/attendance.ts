import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware, requirePermission, canAccessGroup } from '../middleware.ts';
import { AttendanceRecord, AttendanceStatus, GroupId, PointTransaction } from '../types.ts';

export const attendanceRouter = Router();

// GET /api/attendance
attendanceRouter.get('/', authMiddleware, (req: Request, res: Response) => {
  const currentUser = req.user!;
  const rawData = db.getRawData();
  const { groupId, date, userId, weekNumber } = req.query;

  let records = [...rawData.attendance];

  // Group isolation
  if (currentUser.role === 'regular_member') {
    records = records.filter(r => r.userId === currentUser.id);
  } else if (!canAccessGroup(currentUser, (groupId as GroupId) || null)) {
    if (!currentUser.groupId) {
      records = [];
    } else {
      records = records.filter(r => r.groupId === currentUser.groupId);
    }
  } else if (groupId && groupId !== 'all') {
    records = records.filter(r => r.groupId === groupId);
  }

  if (date) {
    records = records.filter(r => r.date === date);
  }

  if (userId) {
    records = records.filter(r => r.userId === userId);
  }

  if (weekNumber) {
    records = records.filter(r => r.weekNumber === Number(weekNumber));
  }

  // Enrich with user info
  const enriched = records.map(rec => {
    const u = rawData.users.find(usr => usr.id === rec.userId);
    return {
      ...rec,
      userFullName: u ? u.fullName : 'کاربر نامشخص',
      userRank: u ? u.rank : null,
      userPhone: u ? u.phone : '',
    };
  });

  res.json({ records: enriched });
});

// POST /api/attendance/batch (Record/Update weekly attendance)
attendanceRouter.post('/batch', authMiddleware, requirePermission('manage_attendance'), async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const { groupId, date, weekNumber, entries } = req.body;

  if (!groupId || !date || !entries || !Array.isArray(entries)) {
    res.status(400).json({ error: 'اطلاعات ارسالی حضور و غیاب ناقص است (شناسه گروه، تاریخ و لیست اعضا الزامی هستند).' });
    return;
  }

  // Strict group isolation check
  if (!canAccessGroup(currentUser, groupId)) {
    res.status(403).json({ error: 'شما مجاز به ثبت یا تغییر حضور و غیاب گروه دیگر نیستید.' });
    return;
  }

  const rawData = db.getRawData();
  const now = new Date().toISOString();
  let updatedCount = 0;
  let createdCount = 0;

  for (const entry of entries) {
    const { userId, status, note, reason } = entry;
    if (!userId || !status) continue;

    const existingIdx = rawData.attendance.findIndex(
      r => r.groupId === groupId && r.userId === userId && r.date === date
    );

    if (existingIdx >= 0) {
      const existing = rawData.attendance[existingIdx];
      if (existing.status !== status) {
        // Log authorized correction
        if (!existing.correctionLog) existing.correctionLog = [];
        existing.correctionLog.push({
          previousStatus: existing.status,
          newStatus: status as AttendanceStatus,
          reason: reason || 'تصحیح انضباطی وضعیت حضور',
          correctedByUserId: currentUser.id,
          correctedAt: now,
        });
        existing.status = status as AttendanceStatus;
        existing.note = note || existing.note;
        existing.updatedAt = now;
        updatedCount++;
      }
    } else {
      const newRec: AttendanceRecord = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        groupId,
        userId,
        date,
        weekNumber: Number(weekNumber || 1),
        status: status as AttendanceStatus,
        note,
        recordedByUserId: currentUser.id,
        createdAt: now,
        updatedAt: now,
      };
      rawData.attendance.push(newRec);
      createdCount++;

      // Award attendance points if status is present
      if (status === 'present') {
        const u = rawData.users.find(usr => usr.id === userId);
        if (u) {
          u.pointsBalance += 10;
          const pt: PointTransaction = {
            id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: u.id,
            groupId,
            amount: 10,
            balanceAfter: u.pointsBalance,
            reason: `امتیاز حضور در جلسه هفتگی (${date})`,
            category: 'activity_reward',
            referenceId: newRec.id,
            createdByUserId: currentUser.id,
            createdAt: now,
          };
          rawData.pointTransactions.push(pt);
        }
      }
    }
  }

  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: 'ATTENDANCE_BATCH_RECORDED',
    category: 'attendance',
    targetGroupId: groupId,
    details: `حضور و غیاب گروه ${groupId} برای تاریخ ${date} ثبت شد (${createdCount} مورد جدید، ${updatedCount} مورد ویرایش).`,
  });

  res.json({
    message: 'وضعیت حضور و غیاب با موفقیت ثبت و ذخیره گردید.',
    createdCount,
    updatedCount,
  });
});

// PATCH /api/attendance/:id (Single record correction)
attendanceRouter.patch('/:id', authMiddleware, requirePermission('manage_attendance'), async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const targetId = req.params.id;
  const { status, note, correctionReason } = req.body;
  const rawData = db.getRawData();

  const record = rawData.attendance.find(r => r.id === targetId);
  if (!record) {
    res.status(404).json({ error: 'رکورد حضور و غیاب مورد نظر یافت نشد.' });
    return;
  }

  if (!canAccessGroup(currentUser, record.groupId)) {
    res.status(403).json({ error: 'شما مجاز به تغییر رکورد حضور و غیاب این گروه نیستید.' });
    return;
  }

  if (!correctionReason) {
    res.status(400).json({ error: 'درج علت تصحیح حضور و غیاب الزامی است.' });
    return;
  }

  const now = new Date().toISOString();
  if (!record.correctionLog) record.correctionLog = [];
  record.correctionLog.push({
    previousStatus: record.status,
    newStatus: status,
    reason: correctionReason,
    correctedByUserId: currentUser.id,
    correctedAt: now,
  });

  record.status = status;
  if (note !== undefined) record.note = note;
  record.updatedAt = now;

  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: 'ATTENDANCE_CORRECTED',
    category: 'attendance',
    targetGroupId: record.groupId,
    targetUserId: record.userId,
    details: `تصحیح مجاز وضعیت حضور کاربر به "${status}". علت: ${correctionReason}`,
  });

  res.json({ message: 'رکورد حضور و غیاب با موفقیت تصحیح شد.', record });
});
