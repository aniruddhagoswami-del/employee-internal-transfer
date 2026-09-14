import request from 'supertest';
import { app } from '../../src/server';
import { transferService } from '../../src/services/transfer.service';
import { auditService } from '../../src/services/audit.service';
import { orchestrationService } from '../../src/services/orchestrator.service';

describe('Transfer REST API Integration Suite (SPEC-EIT-001 & AC Coverage)', () => {
  beforeEach(() => {
    transferService.clear();
    auditService.clear();
    orchestrationService.resetSimulation();
  });

  const getFutureDate = (daysAhead: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  };

  describe('1. Meta & Pre-flight APIs', () => {
    it('GET /api/v1/transfers/meta/options should return departments, locations, and roles', async () => {
      const res = await request(app).get('/api/v1/transfers/meta/options');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.departments.length).toBeGreaterThan(0);
      expect(res.body.data.locations.length).toBeGreaterThan(0);
      expect(res.body.data.roles.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/transfers/preflight/eligibility should return PASS for eligible employee (AC-001, AC-011)', async () => {
      const res = await request(app)
        .get(`/api/v1/transfers/preflight/eligibility?effectiveDate=${getFutureDate(40)}`)
        .set('Authorization', 'Bearer token_emp_1042');

      expect(res.status).toBe(200);
      expect(res.body.data.passed).toBe(true);
      expect(res.body.data.checks).toHaveLength(4);
    });
  });

  describe('2. End-to-End Digital Journey Lifecycle (Happy Path)', () => {
    it('should complete full journey: Initiate -> Mgr1 -> Mgr2 -> HR -> SAGA COMPLETED (AC-001 to AC-017)', async () => {
      // Step 1: Employee Initiates Transfer
      const initRes = await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', 'Bearer token_emp_1042')
        .send({
          targetDepartmentId: 'DEP-PROD-NY',
          targetLocationId: 'LOC-NYC-01',
          targetRoleId: 'ROL-SR-PM',
          targetEffectiveDate: getFutureDate(45),
          reason: 'Seeking career growth in East Coast Product Operations squad.'
        });

      expect(initRes.status).toBe(201);
      expect(initRes.body.success).toBe(true);
      const transferId = initRes.body.data.id;
      expect(initRes.body.data.status).toBe('PENDING_CURRENT_MGR_APPROVAL');
      expect(initRes.body.data.version).toBe(1);

      // Step 2: Current Manager Endorses Release (AC-007)
      const mgr1Res = await request(app)
        .post(`/api/v1/transfers/${transferId}/actions/approve-current-manager`)
        .set('Authorization', 'Bearer token_mgr_2019')
        .send({
          expectedVersion: 1,
          handoverRemarks: 'Solid handover plan agreed with team. Release approved.'
        });

      expect(mgr1Res.status).toBe(200);
      expect(mgr1Res.body.data.status).toBe('PENDING_RECEIVING_MGR_APPROVAL');
      expect(mgr1Res.body.data.version).toBe(2);

      // Step 3: Receiving Manager Accepts Candidate (AC-009)
      const mgr2Res = await request(app)
        .post(`/api/v1/transfers/${transferId}/actions/approve-receiving-manager`)
        .set('Authorization', 'Bearer token_mgr_3088')
        .send({
          expectedVersion: 2,
          requisitionCode: 'REQ-NY-77',
          handoverRemarks: 'Headcount requisition verified and reserved.'
        });

      expect(mgr2Res.status).toBe(200);
      expect(mgr2Res.body.data.status).toBe('PENDING_HR_VALIDATION');
      expect(mgr2Res.body.data.version).toBe(3);

      // Step 4: HR Final Sign-off & SAGA Execution (AC-012, AC-017)
      const hrRes = await request(app)
        .post(`/api/v1/transfers/${transferId}/actions/approve-hr`)
        .set('Authorization', 'Bearer token_hr_4011')
        .send({
          expectedVersion: 3,
          confirmedSalaryGrade: 'GR-08',
          visaCleared: true,
          hrNotes: 'All compliance checks satisfied. SAGA provisioning authorized.'
        });

      expect(hrRes.status).toBe(200);
      expect(hrRes.body.data.status).toBe('COMPLETED');
      expect(hrRes.body.data.downstreamStatus.hris).toBe('SUCCESS');
      expect(hrRes.body.data.downstreamStatus.payroll).toBe('SUCCESS');
      expect(hrRes.body.data.downstreamStatus.it).toBe('SUCCESS');
      expect(hrRes.body.data.downstreamStatus.facilities).toBe('SUCCESS');

      // Step 5: Verify Cryptographic Audit Trail (AC-024)
      const auditRes = await request(app)
        .get(`/api/v1/transfers/${transferId}/audit-trail`)
        .set('Authorization', 'Bearer token_emp_1042');

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.isIntegrityVerified).toBe(true);
      expect(auditRes.body.data.entryCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe('3. Validation Rules & Negative Boundary Paths', () => {
    it('should reject initiation when target date notice is < 30 days (AC-002)', async () => {
      const res = await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', 'Bearer token_emp_1042')
        .send({
          targetDepartmentId: 'DEP-PROD-NY',
          targetLocationId: 'LOC-NYC-01',
          targetRoleId: 'ROL-SR-PM',
          targetEffectiveDate: getFutureDate(10), // only 10 days notice
          reason: 'Urgent transfer'
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('ERR_NOTICE_PERIOD_VIOLATION');
    });

    it('should reject manager rejection when remarks are less than 20 characters (AC-008)', async () => {
      // Create transfer
      const initRes = await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', 'Bearer token_emp_1042')
        .send({
          targetDepartmentId: 'DEP-PROD-NY',
          targetLocationId: 'LOC-NYC-01',
          targetRoleId: 'ROL-SR-PM',
          targetEffectiveDate: getFutureDate(35)
        });

      const transferId = initRes.body.data.id;

      const rejectRes = await request(app)
        .post(`/api/v1/transfers/${transferId}/actions/reject`)
        .set('Authorization', 'Bearer token_mgr_2019')
        .send({
          expectedVersion: 1,
          reason: 'Too short' // < 20 chars
        });

      expect(rejectRes.status).toBe(422);
      expect(rejectRes.body.error.code).toBe('ERR_MANDATORY_REJECTION_REASON');
    });

    it('should prevent duplicate active transfers for the same employee (AC-003)', async () => {
      // Create first active transfer
      await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', 'Bearer token_emp_1042')
        .send({
          targetDepartmentId: 'DEP-PROD-NY',
          targetLocationId: 'LOC-NYC-01',
          targetRoleId: 'ROL-SR-PM',
          targetEffectiveDate: getFutureDate(35)
        });

      // Attempt second transfer while first is active
      const secondRes = await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', 'Bearer token_emp_1042')
        .send({
          targetDepartmentId: 'DEP-AI-RES',
          targetLocationId: 'LOC-ZUR-01',
          targetRoleId: 'ROL-AI-RES',
          targetEffectiveDate: getFutureDate(40)
        });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error.code).toBe('ERR_DUPLICATE_ACTIVE_TRANSFER');
    });
  });

  describe('4. Security, RBAC & Object-Level Access Control (BOLA/IDOR)', () => {
    it('should block unrelated employee from viewing peer transfer details (AC-023)', async () => {
      // Jane Doe creates transfer
      const initRes = await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', 'Bearer token_emp_1042')
        .send({
          targetDepartmentId: 'DEP-PROD-NY',
          targetLocationId: 'LOC-NYC-01',
          targetRoleId: 'ROL-SR-PM',
          targetEffectiveDate: getFutureDate(35)
        });

      const transferId = initRes.body.data.id;

      // Charlie Brown (EMP-9999) attempts unauthorized GET
      const unauthorizedRes = await request(app)
        .get(`/api/v1/transfers/${transferId}`)
        .set('Authorization', 'Bearer token_unrelated_emp_9999');

      expect(unauthorizedRes.status).toBe(403);
      expect(unauthorizedRes.body.error.code).toBe('ERR_FORBIDDEN_OBJECT_ACCESS');
    });

    it('should block employee from executing HR sign-off action (AC-023)', async () => {
      const initRes = await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', 'Bearer token_emp_1042')
        .send({
          targetDepartmentId: 'DEP-PROD-NY',
          targetLocationId: 'LOC-NYC-01',
          targetRoleId: 'ROL-SR-PM',
          targetEffectiveDate: getFutureDate(35)
        });

      const transferId = initRes.body.data.id;

      const elevateRes = await request(app)
        .post(`/api/v1/transfers/${transferId}/actions/approve-hr`)
        .set('Authorization', 'Bearer token_emp_1042')
        .send({ confirmedSalaryGrade: 'GR-08' });

      expect(elevateRes.status).toBe(403);
      expect(elevateRes.body.error.code).toBe('ERR_FORBIDDEN_ROLE');
    });
  });

  describe('5. Voluntary Withdrawal & Withdrawal Guard', () => {
    it('should allow employee to withdraw request before HR approval (AC-021)', async () => {
      const initRes = await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', 'Bearer token_emp_1042')
        .send({
          targetDepartmentId: 'DEP-PROD-NY',
          targetLocationId: 'LOC-NYC-01',
          targetRoleId: 'ROL-SR-PM',
          targetEffectiveDate: getFutureDate(35)
        });

      const transferId = initRes.body.data.id;

      const withdrawRes = await request(app)
        .post(`/api/v1/transfers/${transferId}/actions/withdraw`)
        .set('Authorization', 'Bearer token_emp_1042');

      expect(withdrawRes.status).toBe(200);
      expect(withdrawRes.body.data.status).toBe('WITHDRAWN');
    });

    it('should block employee from withdrawing after HR approval & SAGA completion (AC-022)', async () => {
      // 1. Create and complete transfer
      const initRes = await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', 'Bearer token_emp_1042')
        .send({
          targetDepartmentId: 'DEP-PROD-NY',
          targetLocationId: 'LOC-NYC-01',
          targetRoleId: 'ROL-SR-PM',
          targetEffectiveDate: getFutureDate(35)
        });
      const transferId = initRes.body.data.id;

      await request(app)
        .post(`/api/v1/transfers/${transferId}/actions/approve-current-manager`)
        .set('Authorization', 'Bearer token_mgr_2019')
        .send({ expectedVersion: 1 });

      await request(app)
        .post(`/api/v1/transfers/${transferId}/actions/approve-receiving-manager`)
        .set('Authorization', 'Bearer token_mgr_3088')
        .send({ expectedVersion: 2 });

      await request(app)
        .post(`/api/v1/transfers/${transferId}/actions/approve-hr`)
        .set('Authorization', 'Bearer token_hr_4011')
        .send({ expectedVersion: 3, confirmedSalaryGrade: 'GR-08' });

      // 2. Attempt post-completion withdrawal
      const lateWithdrawRes = await request(app)
        .post(`/api/v1/transfers/${transferId}/actions/withdraw`)
        .set('Authorization', 'Bearer token_emp_1042');

      expect(lateWithdrawRes.status).toBe(403);
      expect(lateWithdrawRes.body.error.code).toBe('ERR_WITHDRAWAL_WINDOW_CLOSED');
    });
  });
});
