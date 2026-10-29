import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSchema, User, Group, RolePermissions, ScoringRule, AuditLogEntry } from './types.ts';
import { hashPassword } from './auth.ts';

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure essential folders exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Initial Default Role Permissions (Default-Deny Policy)
export const DEFAULT_ROLE_PERMISSIONS: Record<string, RolePermissions> = {
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
  leader: {
    manage_users: true,
    manage_roles: false,
    view_both_groups: true,
    manage_attendance: true,
    review_activities: true,
    manage_notices: true,
    manage_points: true,
    view_audit_logs: true,
    manage_backups: false,
  },
  commander_in_chief: {
    manage_users: true,
    manage_roles: false,
    view_both_groups: true,
    manage_attendance: true,
    review_activities: true,
    manage_notices: true,
    manage_points: true,
    view_audit_logs: true,
    manage_backups: false,
  },
  group_commander: {
    manage_users: false, // Group commanders manage members within their group via attendance/reviews
    manage_roles: false,
    view_both_groups: false, // strictly restricted to own group
    manage_attendance: true,
    review_activities: true,
    manage_notices: true,
    manage_points: true,
    view_audit_logs: false,
    manage_backups: false,
  },
  group_secretary: {
    manage_users: false,
    manage_roles: false,
    view_both_groups: false, // strictly restricted to own group
    manage_attendance: true,
    review_activities: false,
    manage_notices: true,
    manage_points: false,
    view_audit_logs: false,
    manage_backups: false,
  },
  regular_member: {
    manage_users: false,
    manage_roles: false,
    view_both_groups: false,
    manage_attendance: false,
    review_activities: false,
    manage_notices: false,
    manage_points: false,
    view_audit_logs: false,
    manage_backups: false,
  },
};

export const DEFAULT_SCORING_RULES: ScoringRule[] = [
  { id: 'rule_presence', name: 'حضور به موقع در جلسه هفتگی', category: 'حضور و غیاب', defaultPoints: 10, description: 'ثبت حضور بدون تأخیر در جلسه هفتگی گروه' },
  { id: 'rule_activity_small', name: 'گزارش فعالیت استاندارد', category: 'فعالیت', defaultPoints: 20, description: 'ثبت و تأیید گزارش فعالیت روزانه یا هفتگی' },
  { id: 'rule_activity_major', name: 'انجام مأموریت ویژه', category: 'مأموریت', defaultPoints: 50, description: 'تکمیل مأموریت ابلاغی با نمره عالی' },
  { id: 'rule_reward', name: 'تشویق انضباطی یا علمی', category: 'تشویقی', defaultPoints: 30, description: 'پاداش رفتار سازمانی و پیشرفت شاخص‌ها' },
  { id: 'rule_leave_cost', name: 'هزینه درخواست مرخصی تشویقی', category: 'کسر امتیاز', defaultPoints: -40, description: 'کسر امتیاز بابت درخواست یک روز مرخصی تشویقی' },
];

function generateInitialSeed(): DatabaseSchema {
  const superAdminPwd = hashPassword('Admin@123456');
  const leaderPwd = hashPassword('Leader@123456');
  const chiefPwd = hashPassword('Chief@123456');
  const cmdAPwd = hashPassword('CmdA@123456');
  const secAPwd = hashPassword('SecA@123456');
  const memAPwd = hashPassword('MemberA@123456');
  const cmdBPwd = hashPassword('CmdB@123456');
  const secBPwd = hashPassword('SecB@123456');
  const memBPwd = hashPassword('MemberB@123456');
  const disabledPwd = hashPassword('Disabled@123456');

  const now = new Date().toISOString();

  const users: User[] = [
    {
      id: 'usr_super_admin',
      phone: '09120000001',
      fullName: 'علیرضا موسوی (مدیر ارشد)',
      role: 'super_admin',
      groupId: null,
      rank: 1,
      status: 'active',
      passwordHash: superAdminPwd.hash,
      passwordSalt: superAdminPwd.salt,
      mustChangePassword: false,
      pointsBalance: 500,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_leader',
      phone: '09120000002',
      fullName: 'محمد حسینی (رهبر)',
      role: 'leader',
      groupId: null,
      rank: 1,
      status: 'active',
      passwordHash: leaderPwd.hash,
      passwordSalt: leaderPwd.salt,
      mustChangePassword: false,
      pointsBalance: 400,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_chief',
      phone: '09120000003',
      fullName: 'حسین صادقی (فرمانده کل)',
      role: 'commander_in_chief',
      groupId: null,
      rank: 1,
      status: 'active',
      passwordHash: chiefPwd.hash,
      passwordSalt: chiefPwd.salt,
      mustChangePassword: false,
      pointsBalance: 350,
      createdAt: now,
      updatedAt: now,
    },
    // Group A
    {
      id: 'usr_cmd_a',
      phone: '09120000010',
      fullName: 'رضا کمالی (فرمانده گروه الف)',
      role: 'group_commander',
      groupId: 'group_a',
      rank: 2,
      status: 'active',
      passwordHash: cmdAPwd.hash,
      passwordSalt: cmdAPwd.salt,
      mustChangePassword: false,
      pointsBalance: 250,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_sec_a',
      phone: '09120000011',
      fullName: 'مهدی نجفی (منشی گروه الف)',
      role: 'group_secretary',
      groupId: 'group_a',
      rank: 3,
      status: 'active',
      passwordHash: secAPwd.hash,
      passwordSalt: secAPwd.salt,
      mustChangePassword: false,
      pointsBalance: 180,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_mem_a',
      phone: '09120000012',
      fullName: 'امیرحسین رضایی (عضو گروه الف)',
      role: 'regular_member',
      groupId: 'group_a',
      rank: 4,
      status: 'active',
      passwordHash: memAPwd.hash,
      passwordSalt: memAPwd.salt,
      mustChangePassword: true, // Test initial password change requirement!
      pointsBalance: 80,
      createdAt: now,
      updatedAt: now,
    },
    // Group B
    {
      id: 'usr_cmd_b',
      phone: '09120000020',
      fullName: 'سجاد کاظمی (فرمانده گروه ب)',
      role: 'group_commander',
      groupId: 'group_b',
      rank: 2,
      status: 'active',
      passwordHash: cmdBPwd.hash,
      passwordSalt: cmdBPwd.salt,
      mustChangePassword: false,
      pointsBalance: 240,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_sec_b',
      phone: '09120000021',
      fullName: 'محمود باقری (منشی گروه ب)',
      role: 'group_secretary',
      groupId: 'group_b',
      rank: 3,
      status: 'active',
      passwordHash: secBPwd.hash,
      passwordSalt: secBPwd.salt,
      mustChangePassword: false,
      pointsBalance: 170,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_mem_b',
      phone: '09120000022',
      fullName: 'علی اکبری (عضو گروه ب)',
      role: 'regular_member',
      groupId: 'group_b',
      rank: 5,
      status: 'active',
      passwordHash: memBPwd.hash,
      passwordSalt: memBPwd.salt,
      mustChangePassword: false,
      pointsBalance: 60,
      createdAt: now,
      updatedAt: now,
    },
    // Disabled account for security testing
    {
      id: 'usr_disabled',
      phone: '09120000099',
      fullName: 'کاربر مسدود شده (تست امنیت)',
      role: 'regular_member',
      groupId: 'group_a',
      rank: 5,
      status: 'disabled',
      passwordHash: disabledPwd.hash,
      passwordSalt: disabledPwd.salt,
      mustChangePassword: false,
      pointsBalance: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const groups: Group[] = [
    {
      id: 'group_a',
      name: 'گروه الف (ذوالفقار)',
      codeName: 'گروه رزمی و عملیاتی الف',
      description: 'واحد عملیاتی شماره یک با تمرکز بر آمادگی میدانی و انضباط تشکیلاتی',
      commanderId: 'usr_cmd_a',
      secretaryId: 'usr_sec_a',
      createdAt: now,
    },
    {
      id: 'group_b',
      name: 'گروه ب (رعد)',
      codeName: 'گروه پشتیبانی و تخصصی ب',
      description: 'واحد پشتیبانی و هماهنگی با تمرکز بر مأموریت‌های پشتیبانی و رصد اطلاعاتی',
      commanderId: 'usr_cmd_b',
      secretaryId: 'usr_sec_b',
      createdAt: now,
    },
  ];

  const initialAudit: AuditLogEntry = {
    id: 'log_init',
    timestamp: now,
    actorUserId: 'usr_super_admin',
    actorPhone: '09120000001',
    actorRole: 'super_admin',
    action: 'SYSTEM_INITIALIZATION',
    category: 'system',
    details: 'سامانه و پایگاه داده با پیکربندی اولیه و داده‌های تستی راه‌اندازی شد.',
  };

  return {
    version: 1,
    users,
    groups,
    rolePermissions: DEFAULT_ROLE_PERMISSIONS as any,
    attendance: [
      {
        id: 'att_1',
        groupId: 'group_a',
        userId: 'usr_mem_a',
        date: '2026-10-20',
        weekNumber: 42,
        status: 'present',
        note: 'حضور منظم در جلسه هفتگی',
        recordedByUserId: 'usr_sec_a',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'att_2',
        groupId: 'group_b',
        userId: 'usr_mem_b',
        date: '2026-10-20',
        weekNumber: 42,
        status: 'present',
        note: 'حضور کامل در کارگاه آموزشی',
        recordedByUserId: 'usr_sec_b',
        createdAt: now,
        updatedAt: now,
      },
    ],
    activities: [
      {
        id: 'act_1',
        groupId: 'group_a',
        userId: 'usr_mem_a',
        title: 'گزارش تمرین آمادگی جسمانی و مرور تاکتیک‌ها',
        description: 'تمرین استقامتی گروهی به مدت ۲ ساعت و بررسی چک‌لیست تجهیزات فردی انجام شد.',
        category: 'آمادگی جسمانی',
        hoursSpent: 2,
        status: 'approved',
        awardedPoints: 20,
        reviewerId: 'usr_cmd_a',
        reviewerComment: 'بسیار عالی، گزارش کامل و دقیق است.',
        submittedAt: now,
        reviewedAt: now,
      },
      {
        id: 'act_2',
        groupId: 'group_b',
        userId: 'usr_mem_b',
        title: 'بررسی تجهیزات فنی و مستندسازی قطعات',
        description: 'چک‌لیست اقلام ارتباطی گروه ب تکمیل گردید و گزارش به منشی ارائه شد.',
        category: 'پشتیبانی فنی',
        hoursSpent: 3,
        status: 'pending',
        submittedAt: now,
      },
    ],
    notices: [
      {
        id: 'not_1',
        targetGroupId: 'all',
        type: 'announcement',
        title: 'دستورالعمل جامع ارزیابی و انضباط اعضا (پاییز ۱۴۰۵)',
        content: 'کلیه اعضا و مسئولین موظف به رعایت دقیق برنامه هفتگی و ثبت به موقع گزارش‌ها در سامانه هستند.',
        priority: 'high',
        createdByUserId: 'usr_super_admin',
        createdAt: now,
        readByUserIds: ['usr_super_admin', 'usr_leader'],
      },
      {
        id: 'not_2',
        targetGroupId: 'group_a',
        type: 'task_mission',
        title: 'ابلاغ مأموریت مانور محدود گروه الف',
        content: 'جلسه توجیهی مانور روز پنج‌شنبه رأس ساعت ۸ صبح در قرارگاه برگزار خواهد شد.',
        priority: 'urgent',
        createdByUserId: 'usr_cmd_a',
        createdAt: now,
        readByUserIds: ['usr_cmd_a'],
      },
      {
        id: 'not_3',
        targetGroupId: 'group_b',
        type: 'reward',
        title: 'تشویق اعضای گروه ب بابت نظم در تحویل تجهیزات',
        content: 'از کلیه نیروهای گروه ب بابت اتمام به‌موقع انبارگردانی تقدیر به عمل می‌آید.',
        priority: 'medium',
        createdByUserId: 'usr_cmd_b',
        createdAt: now,
        readByUserIds: ['usr_cmd_b'],
      },
    ],
    pointTransactions: [
      {
        id: 'pt_1',
        userId: 'usr_mem_a',
        groupId: 'group_a',
        amount: 20,
        balanceAfter: 80,
        reason: 'تأیید گزارش تمرین آمادگی جسمانی',
        category: 'activity_reward',
        referenceId: 'act_1',
        createdByUserId: 'usr_cmd_a',
        createdAt: now,
      },
    ],
    spendingRequests: [],
    scoringRules: DEFAULT_SCORING_RULES,
    auditLogs: [initialAudit],
    sessions: [],
  };
}

class Database {
  private data: DatabaseSchema;
  private writeLock: Promise<void> = Promise.resolve();

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
      const dumpFile = path.resolve(process.cwd(), 'database-dump.json');
      if (fs.existsSync(dumpFile)) {
        const rawDump = fs.readFileSync(dumpFile, 'utf-8');
        const parsed = JSON.parse(rawDump);
        this.saveDataSync(parsed);
        return parsed;
      }
    } catch (err) {
      console.error('Error reading DB_FILE, generating fresh seed:', err);
    }
    const seed = generateInitialSeed();
    this.saveDataSync(seed);
    return seed;
  }

  private saveDataSync(data: DatabaseSchema): void {
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  }

  // Atomic write mutex
  public async persist(): Promise<void> {
    this.writeLock = this.writeLock.then(async () => {
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      await fs.promises.writeFile(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      await fs.promises.rename(tmpFile, DB_FILE);
    });
    return this.writeLock;
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  public async createBackup(reason = 'manual'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${reason}_${timestamp}.json`;
    const backupPath = path.join(BACKUPS_DIR, backupFileName);
    await fs.promises.writeFile(backupPath, JSON.stringify(this.data, null, 2), 'utf-8');
    return backupFileName;
  }

  public listBackups(): string[] {
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    return fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json')).sort().reverse();
  }

  public async restoreFromBackup(backupFileName: string): Promise<boolean> {
    const backupPath = path.join(BACKUPS_DIR, backupFileName);
    if (!fs.existsSync(backupPath)) return false;
    const content = await fs.promises.readFile(backupPath, 'utf-8');
    const parsed = JSON.parse(content);
    this.data = parsed;
    await this.persist();
    return true;
  }

  public async resetToSeed(): Promise<void> {
    await this.createBackup('pre_reset');
    this.data = generateInitialSeed();
    await this.persist();
  }

  // Auditing helper
  public async logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const log: AuditLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    // Keep max 2000 logs
    if (this.data.auditLogs.length > 2000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 2000);
    }
    await this.persist();
  }
}

export const db = new Database();
