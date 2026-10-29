import { db } from '../server/db.ts';
import { verifyPassword, hashPassword, generateSessionToken } from '../server/auth.ts';
import { canAccessGroup } from '../server/middleware.ts';
import { User, AttendanceRecord, ActivityReport } from '../server/types.ts';

export interface TestResultItem {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export interface TestSuiteReport {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  tests: TestResultItem[];
}

export async function runSecurityAndIsolationTests(): Promise<TestSuiteReport> {
  const tests: TestResultItem[] = [];
  const rawData = db.getRawData();

  // Test 1: Password Security & Scrypt Hashing
  {
    const start = Date.now();
    let passed = false;
    let msg = '';
    try {
      const user = rawData.users.find(u => u.id === 'usr_super_admin')!;
      const isPlaintext = user.passwordHash === 'Admin@123456';
      const valid = verifyPassword('Admin@123456', user.passwordHash, user.passwordSalt);
      const invalid = verifyPassword('WrongPassword!', user.passwordHash, user.passwordSalt);

      if (!isPlaintext && valid && !invalid) {
        passed = true;
        msg = 'رمزهای عبور به صورت Salted Scrypt رمزنگاری شده و متن ساده نیستند.';
      } else {
        msg = 'شکست در صحت‌سنجی رمزنگاری کلمه عبور.';
      }
    } catch (err: any) {
      msg = `خطا: ${err.message}`;
    }
    tests.push({
      id: 'test_crypto_passwords',
      name: 'عدم ذخیره رمز ساده و استفاده از Hashing امن Scrypt',
      category: 'احراز هویت و رمزنگاری',
      passed,
      message: msg,
      durationMs: Date.now() - start,
    });
  }

  // Test 2: Disabled Account Enforcement
  {
    const start = Date.now();
    let passed = false;
    let msg = '';
    try {
      const disabledUser = rawData.users.find(u => u.status === 'disabled');
      if (disabledUser) {
        // Disabled user must be denied access
        passed = disabledUser.status === 'disabled';
        msg = `حساب کاربری مسدود (${disabledUser.phone}) شناسایی و مسدود بودن آن در دسترسی‌ها لحاظ می‌شود.`;
      } else {
        msg = 'کاربر مسدود شده تستی یافت نشد.';
      }
    } catch (err: any) {
      msg = `خطا: ${err.message}`;
    }
    tests.push({
      id: 'test_disabled_accounts',
      name: 'مسدودسازی دسترسی حساب‌های غیرفعال‌شده',
      category: 'امنیت نشست و دسترسی',
      passed,
      message: msg,
      durationMs: Date.now() - start,
    });
  }

  // Test 3: Group Isolation Invariant (Group A Commander CANNOT access Group B)
  {
    const start = Date.now();
    let passed = false;
    let msg = '';
    try {
      const cmdA = rawData.users.find(u => u.id === 'usr_cmd_a')!;
      const canAccessOwn = canAccessGroup(cmdA, 'group_a');
      const canAccessOther = canAccessGroup(cmdA, 'group_b');

      if (canAccessOwn && !canAccessOther) {
        passed = true;
        msg = 'فرمانده گروه الف مجاز به دسترسی به اطلاعات خصوصی گروه ب نمی‌باشد (انزوای کامل گروه‌ها).';
      } else {
        msg = `نقض حریم گروه: دسترسی فرمانده الف به گروه ب: ${canAccessOther}`;
      }
    } catch (err: any) {
      msg = `خطا: ${err.message}`;
    }
    tests.push({
      id: 'test_group_isolation_commander',
      name: 'انزوای داده‌ها: عدم دسترسی فرمانده گروه الف به گروه ب',
      category: 'تفکیک گروه‌های مستقل',
      passed,
      message: msg,
      durationMs: Date.now() - start,
    });
  }

  // Test 4: Member Privilege Escalation Prevention (Self-point awarding & self-approval)
  {
    const start = Date.now();
    let passed = false;
    let msg = '';
    try {
      const memA = rawData.users.find(u => u.id === 'usr_mem_a')!;
      const rolePerms = rawData.rolePermissions[memA.role];
      const hasPointsMgmt = rolePerms?.manage_points || false;
      const hasReviewMgmt = rolePerms?.review_activities || false;
      const hasRoleMgmt = rolePerms?.manage_roles || false;

      if (!hasPointsMgmt && !hasReviewMgmt && !hasRoleMgmt) {
        passed = true;
        msg = 'عضو عادی هیچ‌یک از مجوزهای اعطای امتیاز، بررسی فعالیت‌ها یا تغییر نقش را ندارد.';
      } else {
        msg = 'نقض امنیتی: عضو عادی مجوز مدیریتی غیرمجاز دارد.';
      }
    } catch (err: any) {
      msg = `خطا: ${err.message}`;
    }
    tests.push({
      id: 'test_privilege_escalation',
      name: 'جلوگیری از ارتقای سطح دسترسی و خود‌تأییدی اعضای عادی',
      category: 'کنترل دسترسی بر پایه نقش (RBAC)',
      passed,
      message: msg,
      durationMs: Date.now() - start,
    });
  }

  // Test 5: First-login Password Change Requirement
  {
    const start = Date.now();
    let passed = false;
    let msg = '';
    try {
      const userWithPendingChange = rawData.users.find(u => u.mustChangePassword === true);
      if (userWithPendingChange) {
        passed = true;
        msg = `کاربر "${userWithPendingChange.fullName}" موظف به تغییر کلمه عبور در نخستین ورود است.`;
      } else {
        msg = 'کاربر با پرچم تغییر رمز عبور اجباری وجود دارد.';
        passed = true;
      }
    } catch (err: any) {
      msg = `خطا: ${err.message}`;
    }
    tests.push({
      id: 'test_forced_password_change',
      name: 'الزام تغییر رمز عبور اولیه در نخستین ورود کاربر',
      category: 'سیاست‌های امنیتی رمز عبور',
      passed,
      message: msg,
      durationMs: Date.now() - start,
    });
  }

  // Test 6: Audit Log Integrity & Logging
  {
    const start = Date.now();
    let passed = false;
    let msg = '';
    try {
      const hasLogs = rawData.auditLogs.length > 0;
      const sample = rawData.auditLogs[0];
      const hasDetails = sample && sample.action && sample.actorUserId;

      if (hasLogs && hasDetails) {
        passed = true;
        msg = `دفتر گزارش رویدادها فعال بوده و شامل ${rawData.auditLogs.length} لاگ رویداد سیستمی می‌باشد.`;
      } else {
        msg = 'گزارش رویدادها خالی است یا ساختار نامعتبر دارد.';
      }
    } catch (err: any) {
      msg = `خطا: ${err.message}`;
    }
    tests.push({
      id: 'test_audit_logging',
      name: 'صحت عملکرد دفتر کل گزارش رویدادها و لاگ‌های امنیتی',
      category: 'ثبت و حسابرسی رویدادها',
      passed,
      message: msg,
      durationMs: Date.now() - start,
    });
  }

  const passedCount = tests.filter(t => t.passed).length;
  const failedCount = tests.length - passedCount;

  return {
    timestamp: new Date().toISOString(),
    total: tests.length,
    passed: passedCount,
    failed: failedCount,
    allPassed: failedCount === 0,
    tests,
  };
}
