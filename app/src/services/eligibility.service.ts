import { EligibilityCheckItem, EligibilityResult, UserSession } from '../types/transfer.types';

export class EligibilityService {
  private readonly MIN_TENURE_MONTHS = 12;
  private readonly MIN_PERFORMANCE_RATING = 3.0;
  private readonly MIN_NOTICE_PERIOD_DAYS = 30;

  /**
   * Evaluates employee eligibility against enterprise mobility business rules (BR-001, BR-002, BR-003, BR-004).
   */
  public evaluateEligibility(user: UserSession, targetEffectiveDate?: string): EligibilityResult {
    const checks: EligibilityCheckItem[] = [];

    // Check 1: Minimum Tenure (BR-001)
    const tenurePass = user.tenureMonths >= this.MIN_TENURE_MONTHS;
    checks.push({
      id: 'CHK_TENURE',
      name: 'Service Tenure Check',
      criteria: `>= ${this.MIN_TENURE_MONTHS} continuous months in current role`,
      evaluatedValue: `${user.tenureMonths} months`,
      passed: tenurePass,
      notes: tenurePass 
        ? 'Satisfies tenure threshold.' 
        : `Tenure shortfall: Employee has ${user.tenureMonths}m, requires ${this.MIN_TENURE_MONTHS}m.`
    });

    // Check 2: Performance Appraisal Rating (BR-002)
    const ratingPass = user.performanceRating >= this.MIN_PERFORMANCE_RATING;
    checks.push({
      id: 'CHK_PERFORMANCE',
      name: 'Appraisal Performance Floor',
      criteria: `>= ${this.MIN_PERFORMANCE_RATING.toFixed(1)} / 5.0 (Meets Expectations)`,
      evaluatedValue: user.performanceRating.toFixed(1),
      passed: ratingPass,
      notes: ratingPass 
        ? 'Performance rating meets organizational transfer requirements.' 
        : `Rating shortfall: ${user.performanceRating.toFixed(1)} is below required ${this.MIN_PERFORMANCE_RATING.toFixed(1)}.`
    });

    // Check 3: Disciplinary / PIP Records (BR-003)
    const disciplinaryPass = !user.hasActiveDisciplinaryRecord;
    checks.push({
      id: 'CHK_DISCIPLINARY',
      name: 'Conduct & Disciplinary Record',
      criteria: 'No active PIP or formal disciplinary sanction on file in last 6 months',
      evaluatedValue: user.hasActiveDisciplinaryRecord ? 'Active PIP/Sanction' : 'Clear',
      passed: disciplinaryPass,
      notes: disciplinaryPass 
        ? 'No active disciplinary sanctions.' 
        : 'Active Disciplinary / Performance Improvement Plan detected.'
    });

    // Check 4: Notice Period Check (BR-004) if date provided
    if (targetEffectiveDate) {
      const daysNotice = this.calculateDaysAhead(targetEffectiveDate);
      const noticePass = daysNotice >= this.MIN_NOTICE_PERIOD_DAYS;
      checks.push({
        id: 'CHK_NOTICE_PERIOD',
        name: 'Minimum Notice Period',
        criteria: `>= ${this.MIN_NOTICE_PERIOD_DAYS} calendar days notice`,
        evaluatedValue: `${daysNotice} days`,
        passed: noticePass,
        notes: noticePass 
          ? 'Effective date satisfies standard notice period.' 
          : `Insufficient notice: ${daysNotice} days provided, minimum is ${this.MIN_NOTICE_PERIOD_DAYS} days.`
      });
    }

    const allPassed = checks.every(c => c.passed);
    const failedCount = checks.filter(c => !c.passed).length;

    return {
      passed: allPassed,
      evaluatedAt: new Date().toISOString(),
      checks,
      summary: allPassed 
        ? 'All eligibility and compliance prerequisites satisfied.'
        : `Eligibility check failed: ${failedCount} violation(s) detected.`
    };
  }

  public calculateDaysAhead(dateStr: string): number {
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export const eligibilityService = new EligibilityService();
