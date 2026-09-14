import { EligibilityService } from '../../src/services/eligibility.service';
import { UserRole, UserSession } from '../../src/types/transfer.types';

describe('EligibilityService (Business Rules BR-001 to BR-004)', () => {
  let eligibilityService: EligibilityService;

  const eligibleUser: UserSession = {
    userId: 'EMP-1042',
    name: 'Jane Doe',
    email: 'jane.doe@enterprise.com',
    role: UserRole.EMPLOYEE,
    departmentId: 'DEP-CLOUD-ENG',
    departmentName: 'Cloud Infrastructure',
    locationId: 'LOC-LDN-01',
    locationName: 'London HQ',
    tenureMonths: 18,
    performanceRating: 4.2,
    hasActiveDisciplinaryRecord: false
  };

  const ineligibleUser: UserSession = {
    userId: 'EMP-5002',
    name: 'Robert Evans',
    email: 'robert.evans@enterprise.com',
    role: UserRole.EMPLOYEE,
    departmentId: 'DEP-CLOUD-ENG',
    departmentName: 'Cloud Infrastructure',
    locationId: 'LOC-LDN-01',
    locationName: 'London HQ',
    tenureMonths: 6,
    performanceRating: 2.4,
    hasActiveDisciplinaryRecord: true
  };

  beforeEach(() => {
    eligibilityService = new EligibilityService();
  });

  it('should pass all eligibility checks for fully qualified employee with 45-day notice', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 45);
    const dateStr = futureDate.toISOString().split('T')[0];

    const result = eligibilityService.evaluateEligibility(eligibleUser, dateStr);
    expect(result.passed).toBe(true);
    expect(result.checks).toHaveLength(4);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it('should fail tenure check when tenure is under 12 months (BR-001)', () => {
    const userWithLowTenure = { ...eligibleUser, tenureMonths: 11 };
    const result = eligibilityService.evaluateEligibility(userWithLowTenure);
    expect(result.passed).toBe(false);
    const tenureCheck = result.checks.find((c) => c.id === 'CHK_TENURE');
    expect(tenureCheck?.passed).toBe(false);
  });

  it('should fail performance rating check when rating is under 3.0 (BR-002)', () => {
    const userWithLowRating = { ...eligibleUser, performanceRating: 2.9 };
    const result = eligibilityService.evaluateEligibility(userWithLowRating);
    expect(result.passed).toBe(false);
    const ratingCheck = result.checks.find((c) => c.id === 'CHK_PERFORMANCE');
    expect(ratingCheck?.passed).toBe(false);
  });

  it('should fail disciplinary check when active PIP is present (BR-003)', () => {
    const userWithPIP = { ...eligibleUser, hasActiveDisciplinaryRecord: true };
    const result = eligibilityService.evaluateEligibility(userWithPIP);
    expect(result.passed).toBe(false);
    const discCheck = result.checks.find((c) => c.id === 'CHK_DISCIPLINARY');
    expect(discCheck?.passed).toBe(false);
  });

  it('should fail notice period check when date is less than 30 days ahead (BR-004)', () => {
    const shortDate = new Date();
    shortDate.setDate(shortDate.getDate() + 15);
    const dateStr = shortDate.toISOString().split('T')[0];

    const result = eligibilityService.evaluateEligibility(eligibleUser, dateStr);
    expect(result.passed).toBe(false);
    const noticeCheck = result.checks.find((c) => c.id === 'CHK_NOTICE_PERIOD');
    expect(noticeCheck?.passed).toBe(false);
  });

  it('should fail all 4 checks for completely ineligible user with short notice', () => {
    const shortDate = new Date();
    shortDate.setDate(shortDate.getDate() + 10);
    const dateStr = shortDate.toISOString().split('T')[0];

    const result = eligibilityService.evaluateEligibility(ineligibleUser, dateStr);
    expect(result.passed).toBe(false);
    expect(result.checks.filter((c) => !c.passed)).toHaveLength(4);
  });
});
