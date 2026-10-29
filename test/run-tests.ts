import { runSecurityAndIsolationTests } from './test-runner.ts';

async function main() {
  console.log('====================================================');
  console.log('   آزمون‌های خودکار امنیتی، انزوای گروه‌ها و سطوح دسترسی');
  console.log('====================================================\n');

  const report = await runSecurityAndIsolationTests();

  for (const test of report.tests) {
    const symbol = test.passed ? '✓ [تأیید شد]' : '✗ [رد شد]';
    console.log(`${symbol} ${test.name} (${test.durationMs}ms)`);
    console.log(`    دسته‌بندی: ${test.category}`);
    console.log(`    توضیح: ${test.message}\n`);
  }

  console.log('----------------------------------------------------');
  console.log(`مجموع آزمون‌ها: ${report.total} | موفق: ${report.passed} | ناموفق: ${report.failed}`);
  console.log(`نتیجه نهایی: ${report.allPassed ? 'تمام آزمون‌ها با موفقیت سپری شدند.' : 'برخی آزمون‌ها ناموفق بودند.'}`);
  console.log('====================================================');

  if (!report.allPassed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
