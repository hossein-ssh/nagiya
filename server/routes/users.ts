import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware, requirePermission, canAccessGroup, sanitizeUser } from '../middleware.ts';
import { hashPassword } from '../auth.ts';
import { User, UserRole, GroupId, MemberRank } from '../types.ts';

export const usersRouter = Router();

// GET /api/users
usersRouter.get('/', authMiddleware, (req: Request, res: Response) => {
  const currentUser = req.user!;
  const rawData = db.getRawData();
  const { groupId, role, rank, status, search } = req.query;

  let filtered = [...rawData.users];

  // Group isolation enforcement
  if (currentUser.role === 'regular_member') {
    filtered = filtered.filter(u => u.id === currentUser.id);
  } else if (!canAccessGroup(currentUser, (groupId as GroupId) || null)) {
    // If user cannot access both groups, restrict strictly to their own group
    if (!currentUser.groupId) {
      filtered = [];
    } else {
      filtered = filtered.filter(u => u.groupId === currentUser.groupId);
    }
  } else if (groupId && groupId !== 'all') {
    filtered = filtered.filter(u => u.groupId === groupId);
  }

  // Filter by role
  if (role && role !== 'all') {
    filtered = filtered.filter(u => u.role === role);
  }

  // Filter by rank
  if (rank && rank !== 'all') {
    const rankNum = Number(rank);
    filtered = filtered.filter(u => u.rank === rankNum);
  }

  // Filter by status
  if (status && status !== 'all') {
    filtered = filtered.filter(u => u.status === status);
  }

  // Search filter
  if (search && typeof search === 'string') {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      u => u.fullName.toLowerCase().includes(q) || u.phone.includes(q)
    );
  }

  res.json({
    users: filtered.map(sanitizeUser),
    total: filtered.length,
  });
});

// GET /api/users/:id
usersRouter.get('/:id', authMiddleware, (req: Request, res: Response) => {
  const currentUser = req.user!;
  const targetId = req.params.id;
  const rawData = db.getRawData();
  const target = rawData.users.find(u => u.id === targetId);

  if (!target) {
    res.status(404).json({ error: 'کاربر مورد نظر یافت نشد.' });
    return;
  }

  // Regular members can only view their own user details
  if (currentUser.role === 'regular_member' && currentUser.id !== target.id) {
    res.status(403).json({ error: 'عدم دسترسی به اطلاعات سایر اعضا.' });
    return;
  }

  // Group isolation: commanders and secretaries can only view members in their own group
  if (!canAccessGroup(currentUser, target.groupId)) {
    res.status(403).json({ error: 'دسترسی غیرمجاز به اطلاعات کاربر متعلق به گروه دیگر.' });
    return;
  }

  res.json({ user: sanitizeUser(target) });
});

// POST /api/users (Create user)
usersRouter.post('/', authMiddleware, requirePermission('manage_users'), async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const { phone, fullName, role, groupId, rank, initialPassword } = req.body;

  if (!phone || !fullName || !role || !initialPassword) {
    res.status(400).json({ error: 'شماره تلفن، نام و نام خانوادگی، نقش و رمز عبور اولیه الزامی هستند.' });
    return;
  }

  const cleanPhone = phone.trim();
  if (!/^09\d{9}$/.test(cleanPhone)) {
    res.status(400).json({ error: 'فرمت شماره تلفن صحیح نیست (باید با ۰۹ شروع شده و ۱۱ رقم باشد).' });
    return;
  }

  if (initialPassword.length < 8) {
    res.status(400).json({ error: 'رمز عبور اولیه باید حداقل ۸ کاراکتر باشد.' });
    return;
  }

  const rankNum = Number(rank || 5) as MemberRank;
  if (![1, 2, 3, 4, 5].includes(rankNum)) {
    res.status(400).json({ error: 'رتبه عضویت باید مقداری بین ۱ (ارشدترین) تا ۵ (پایه) باشد.' });
    return;
  }

  // Role validation
  const validRoles: UserRole[] = [
    'super_admin',
    'leader',
    'commander_in_chief',
    'group_commander',
    'group_secretary',
    'regular_member',
  ];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: 'نقش کاربری انتخاب شده نامعتبر است.' });
    return;
  }

  // If role is group-specific, groupId is required
  const groupRoles: UserRole[] = ['group_commander', 'group_secretary', 'regular_member'];
  if (groupRoles.includes(role) && !groupId) {
    res.status(400).json({ error: 'برای این نقش، انتخاب گروه سازمانی الزامی است.' });
    return;
  }

  // If user is not super_admin / leader and tries to create user for another group
  if (!canAccessGroup(currentUser, groupId)) {
    res.status(403).json({ error: 'شما فقط مجاز به ایجاد کاربر در گروه سازمانی خود هستید.' });
    return;
  }

  const rawData = db.getRawData();
  const existing = rawData.users.find(u => u.phone === cleanPhone);
  if (existing) {
    res.status(409).json({ error: 'کاربری با این شماره تلفن قبلاً در سامانه ثبت شده است.' });
    return;
  }

  const { hash, salt } = hashPassword(initialPassword);
  const now = new Date().toISOString();
  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    phone: cleanPhone,
    fullName: fullName.trim(),
    role,
    groupId: groupRoles.includes(role) ? groupId : null,
    rank: rankNum,
    status: 'active',
    passwordHash: hash,
    passwordSalt: salt,
    mustChangePassword: true, // User must change initial password on first login
    pointsBalance: 0,
    createdAt: now,
    updatedAt: now,
  };

  rawData.users.push(newUser);
  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: 'USER_CREATED',
    category: 'users',
    targetUserId: newUser.id,
    targetGroupId: newUser.groupId,
    details: `کاربر جدید با نام "${newUser.fullName}" و رتبه ${newUser.rank} و نقش "${newUser.role}" ایجاد شد.`,
  });

  res.status(201).json({
    message: 'کاربر جدید با موفقیت ایجاد گردید.',
    user: sanitizeUser(newUser),
  });
});

// PATCH /api/users/:id (Edit user details & status)
usersRouter.patch('/:id', authMiddleware, requirePermission('manage_users'), async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const targetId = req.params.id;
  const { fullName, status, role, groupId } = req.body;
  const rawData = db.getRawData();

  const user = rawData.users.find(u => u.id === targetId);
  if (!user) {
    res.status(404).json({ error: 'کاربر مورد نظر یافت نشد.' });
    return;
  }

  // Prevent disabling self
  if (currentUser.id === user.id && status === 'disabled') {
    res.status(400).json({ error: 'شما نمی‌توانید حساب کاربری خود را غیرفعال کنید.' });
    return;
  }

  // Group isolation
  if (!canAccessGroup(currentUser, user.groupId)) {
    res.status(403).json({ error: 'عدم دسترسی به ویرایش کاربر گروه دیگر.' });
    return;
  }

  if (fullName) user.fullName = fullName.trim();
  if (status && ['active', 'disabled'].includes(status)) {
    user.status = status;
  }

  // Role modification allowed only for super_admin
  if (role && role !== user.role) {
    if (currentUser.role !== 'super_admin') {
      res.status(403).json({ error: 'تغییر نقش کاربری فقط توسط مدیر ارشد امکان‌پذیر است.' });
      return;
    }
    user.role = role;
  }

  if (groupId !== undefined) {
    user.groupId = groupId;
  }

  user.updatedAt = new Date().toISOString();
  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: 'USER_UPDATED',
    category: 'users',
    targetUserId: user.id,
    targetGroupId: user.groupId,
    details: `اطلاعات کاربر "${user.fullName}" به‌روزرسانی شد. وضعیت: ${user.status}`,
  });

  res.json({
    message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد.',
    user: sanitizeUser(user),
  });
});

// PATCH /api/users/:id/rank (Super Admin or authorized can change member rank)
usersRouter.patch('/:id/rank', authMiddleware, requirePermission('manage_users'), async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const targetId = req.params.id;
  const { rank } = req.body;
  const rawData = db.getRawData();

  const user = rawData.users.find(u => u.id === targetId);
  if (!user) {
    res.status(404).json({ error: 'کاربر یافت نشد.' });
    return;
  }

  const rankNum = Number(rank) as MemberRank;
  if (![1, 2, 3, 4, 5].includes(rankNum)) {
    res.status(400).json({ error: 'رتبه عضویت نامعتبر است (باید بین ۱ تا ۵ باشد).' });
    return;
  }

  const oldRank = user.rank;
  user.rank = rankNum;
  user.updatedAt = new Date().toISOString();
  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: 'MEMBER_RANK_CHANGED',
    category: 'users',
    targetUserId: user.id,
    targetGroupId: user.groupId,
    details: `رتبه عضویت "${user.fullName}" از ${oldRank} به ${rankNum} تغییر یافت.`,
  });

  res.json({
    message: `رتبه کاربر با موفقیت به رتبه ${rankNum} تغییر یافت.`,
    user: sanitizeUser(user),
  });
});

// POST /api/users/:id/reset-password (Secure password reset)
usersRouter.post('/:id/reset-password', authMiddleware, requirePermission('manage_users'), async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const targetId = req.params.id;
  const { temporaryPassword } = req.body;
  const rawData = db.getRawData();

  const user = rawData.users.find(u => u.id === targetId);
  if (!user) {
    res.status(404).json({ error: 'کاربر یافت نشد.' });
    return;
  }

  if (!temporaryPassword || temporaryPassword.length < 8) {
    res.status(400).json({ error: 'رمز عبور موقت باید حداقل ۸ کاراکتر باشد.' });
    return;
  }

  const { hash, salt } = hashPassword(temporaryPassword);
  user.passwordHash = hash;
  user.passwordSalt = salt;
  user.mustChangePassword = true; // Force user to change on next login
  user.updatedAt = new Date().toISOString();

  // Invalidate any active sessions for this user so they must log in with new password
  rawData.sessions = rawData.sessions.filter(s => s.userId !== user.id);
  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: 'USER_PASSWORD_RESET',
    category: 'auth',
    targetUserId: user.id,
    targetGroupId: user.groupId,
    details: `رمز عبور کاربر "${user.fullName}" توسط مدیر ریست شد و تغییر در ورود بعدی اجباری گردید.`,
  });

  res.json({ message: 'رمز عبور کاربر با موفقیت ریست شد و نشست‌های قبلی باطل گردیدند.' });
});

// GET /api/roles/permissions
usersRouter.get('/permissions/all', authMiddleware, (req: Request, res: Response) => {
  const rawData = db.getRawData();
  res.json({ permissions: rawData.rolePermissions });
});

// PUT /api/roles/permissions
usersRouter.put('/permissions/all', authMiddleware, requirePermission('manage_roles'), async (req: Request, res: Response) => {
  const currentUser = req.user!;
  const { rolePermissions } = req.body;

  if (!rolePermissions || typeof rolePermissions !== 'object') {
    res.status(400).json({ error: 'داده‌های ارسالی مجوزها نامعتبر است.' });
    return;
  }

  const rawData = db.getRawData();
  // Super admin permissions must remain fully granted for stability
  rawData.rolePermissions = {
    ...rolePermissions,
    super_admin: {
      manage_users: true,
      manage_roles: true,
      view_both_groups: true,
      manage_attendance: true,
      review_activities: true,
      manage_notices: true,
      manage_points: true,
      view_audit_logs: true,
      manage_backups: true,
    },
  };

  await db.persist();

  await db.logAudit({
    actorUserId: currentUser.id,
    actorPhone: currentUser.phone,
    actorRole: currentUser.role,
    action: 'ROLE_PERMISSIONS_UPDATED',
    category: 'roles',
    details: 'جدول ماتریس مجوزهای نقش‌های کاربری توسط مدیر ارشد بازپیکربندی شد.',
  });

  res.json({
    message: 'ماتریس مجوزهای نقش‌ها با موفقیت ذخیره گردید.',
    permissions: rawData.rolePermissions,
  });
});
