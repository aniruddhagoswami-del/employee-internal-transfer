# Deliverable 3: Spec-Derived Test Cases
## Document Information
- **Project**: One-Point Employee Portal — Internal Transfer Digital Journey
- **Methodology**: INT Specification-Driven Development/Delivery (SDD)
- **Document Version**: 1.0.0
- **Traceability Baseline**: Derived directly from `SPEC-EIT-001` (Deliverable 2)
- **Status**: Approved for Test-First TDD Execution (Gate 1 Output)

---

## 1. Test Strategy & Traceability Framework

In alignment with INT SDD principles, test cases are **derived strictly from the feature specification and acceptance criteria before implementation**. Every acceptance criterion ($AC_i$) maps to at least one primary positive test case and multiple boundary/negative/security test cases.

```mermaid
graph LR
    AC["Acceptance Criteria\n(AC-001 to AC-025)"] --> TM["Spec-Derived Test Matrix"]
    TM --> UT["Unit Tests (TDD Red-Green)\nState Machine & Eligibility"]
    TM --> IT["Integration Tests\nREST API & RBAC Security"]
    TM --> ST["SAGA Resilience Tests\nIdempotency & Downstream Retries"]
    TM --> E2E["End-to-End Persona Verification\nFull Digital Journey Flow"]
```

### Test Case Hierarchy
- **Positive Functional Tests (`TC-POS-xxx`)**: Verify expected business journey progression under valid conditions.
- **Negative & Validation Tests (`TC-NEG-xxx`)**: Verify boundary enforcement, data constraints, and error taxonomy.
- **State Machine Guard Tests (`TC-STM-xxx`)**: Verify illegal transition rejection, idempotency, and concurrency controls.
- **Security & Authorization Tests (`TC-SEC-xxx`)**: Verify BOLA / IDOR defense, RBAC role enforcement, and cryptographic audit hash chaining.
- **Integration & SAGA Resilience Tests (`TC-INT-xxx`)**: Verify downstream worker orchestration, retry backoff, and failure recovery.

---

## 2. Comprehensive Spec-Derived Test Matrix

| Test ID | Mapped AC ID | Test Scenario Description | Test Type | Input Condition | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-POS-001** | `AC-001` | Pre-population of initiator profile fields | Unit / UI | Authenticated employee `EMP-1042` | Returns department, location, manager, tenure in read-only form |
| **TC-NEG-001** | `AC-002` | Target effective date $< 30$ days notice | Unit / Validation | Effective date set to `Today + 14 days` | Rejection with HTTP 422 `ERR_NOTICE_PERIOD_VIOLATION` |
| **TC-POS-002** | `AC-002` | Target effective date $\ge 30$ days notice | Unit / Validation | Effective date set to `Today + 35 days` | Validation passes successfully |
| **TC-NEG-002** | `AC-003` | Duplicate active transfer submission | Integration | User submits while another request is in `PENDING_CURRENT_MGR_APPROVAL` | Rejection with HTTP 409 `ERR_DUPLICATE_ACTIVE_TRANSFER` |
| **TC-NEG-003** | `AC-004` | Pre-flight hard block on active disciplinary warning | Unit / Rule Engine | Employee with active PIP in last 90 days | Immediate state `REJECTED`, reason logged |
| **TC-NEG-004** | `AC-004` | Pre-flight hard block on tenure $< 12$ months | Unit / Rule Engine | Employee with 6 months tenure | Immediate rejection on initiation |
| **TC-POS-003** | `AC-005` | Save and resume draft transfer request | Integration / CRUD | Partial payload saved with `status: DRAFT` | Persisted with `DRAFT` status; zero manager notifications |
| **TC-POS-004** | `AC-006` | Notification dispatch upon submission | Integration | Request submitted | Notification record created for manager `MGR-2019` |
| **TC-POS-005** | `AC-007` | Current Manager endorses transfer with notes | Unit / FSM | Manager submits handover comments and approves | State advances to `PENDING_RECEIVING_MGR_APPROVAL` |
| **TC-NEG-005** | `AC-008` | Current Manager rejects without remarks | Unit / Validation | Manager attempts rejection with empty remarks | Blocked with HTTP 422 `ERR_MANDATORY_REJECTION_REASON` |
| **TC-POS-006** | `AC-008` | Current Manager rejects with valid remarks ($\ge 20$ chars) | Unit / FSM | Rejection rationale provided | State transitions to terminal `REJECTED` |
| **TC-POS-007** | `AC-009` | Receiving Manager confirms headcount & accepts | Unit / FSM | Receiving manager confirms requisition code | State advances to `PENDING_HR_VALIDATION` |
| **TC-POS-008** | `AC-010` | Receiving Manager rejects transfer | Unit / FSM | Headcount frozen justification provided | State transitions to terminal `REJECTED` |
| **TC-POS-009** | `AC-011` | Automated HR eligibility checklist scoring | Unit / Engine | Eligible candidate profile | Checklist returns 5/5 PASS items |
| **TC-POS-010** | `AC-012` | HR final sign-off triggers downstream SAGA | Integration | HR signs off with salary band confirmation | State transitions to `ORCHESTRATING_DOWNSTREAM` |
| **TC-POS-011** | `AC-013` | SAGA worker updates Core HRIS record | Integration / SAGA | Outbox event dispatched to HRIS worker | Core HRIS record updated with new department & manager |
| **TC-POS-012** | `AC-014` | SAGA worker updates Payroll cost-center | Integration / SAGA | Outbox event dispatched to Payroll worker | Cost center and tax code updated |
| **TC-POS-013** | `AC-015` | SAGA worker schedules IT IAM role changes | Integration / SAGA | Outbox event dispatched to IT worker | Legacy role scheduled for revoke; new role provisioned |
| **TC-POS-014** | `AC-016` | SAGA worker allocates Facilities workstation | Integration / SAGA | Outbox event dispatched to Facilities worker | NYC workstation reserved and badge profile generated |
| **TC-POS-015** | `AC-017` | SAGA orchestrator completes full journey | Integration / SAGA | All 4 workers report `SUCCESS` | Request transitions to terminal `COMPLETED` |
| **TC-INT-001** | `AC-018` | SAGA worker transient failure & exponential backoff | Integration / SAGA | Simulated HTTP 503 on IT worker attempt 1 & 2 | Retries and succeeds on attempt 3; overall SAGA succeeds |
| **TC-INT-002** | `AC-019` | SAGA worker permanent failure escalation | Integration / SAGA | Simulated 5 consecutive failures on Facilities worker | Request transitions to `MANUAL_INTERVENTION_REQUIRED` |
| **TC-POS-016** | `AC-020` | Visual progress tracker rendering | UI / End-to-End | Query request status for in-flight transfer | Returns progress step items with correct timestamps |
| **TC-POS-017** | `AC-021` | Employee self-service withdrawal before HR approval | Unit / FSM | Initiator clicks withdraw during manager review | State transitions to `WITHDRAWN`, queue items cleared |
| **TC-NEG-006** | `AC-022` | Withdrawal blocked after HR approval | Unit / Guard | Initiator attempts withdrawal during `ORCHESTRATING_DOWNSTREAM` | Blocked with HTTP 403 `ERR_WITHDRAWAL_WINDOW_CLOSED` |
| **TC-SEC-001** | `AC-023` | BOLA / IDOR protection across unauthorized peers | Security | Employee `EMP-9999` attempts GET on `TRF-1001` | Returns HTTP 403 Forbidden |
| **TC-SEC-002** | `AC-023` | RBAC role enforcement on HR sign-off endpoint | Security | Employee `EMP-1042` attempts POST to HR approve endpoint | Returns HTTP 403 Forbidden |
| **TC-SEC-003** | `AC-024` | Cryptographic audit trail SHA-256 hash generation | Security / Audit | Successive state transitions recorded | Every record contains valid `prevHash` and `hash` |
| **TC-SEC-004** | `AC-024` | Cryptographic audit trail tamper detection | Security / Audit | Modify a historical entry's payload in memory | Audit verification function detects hash mismatch |
| **TC-STM-001** | `AC-025` | Optimistic concurrency control (version collision) | Concurrency | Two concurrent mutations submit with same version | One succeeds; second fails with HTTP 409 Conflict |
| **TC-STM-002** | FSM | Illegal state jump prevention | Unit / FSM | Attempt jump from `SUBMITTED` directly to `COMPLETED` | Throws `InvalidStateTransitionError` |
| **TC-STM-003** | FSM | Mutation attempt on terminal states | Unit / FSM | Attempt approval on `REJECTED` or `COMPLETED` request | Throws `TerminalStateImmutableError` |
| **TC-INT-003** | Idempotency | Duplicate SAGA execution with same idempotency key | Integration | Same worker executed twice with identical idempotency token | Second execution returns cached result without re-executing |

---

## 3. Detailed Executable Test Case Specifications

### Scenario 1: End-to-End Happy Path (`TC-POS-001` through `TC-POS-015`)
```typescript
describe('E2E Transfer Digital Journey Happy Path', () => {
  it('should progress transfer from Initiation to COMPLETED with full SAGA orchestration', async () => {
    // 1. Employee creates transfer request
    const initRes = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', 'Bearer token_emp_1042')
      .send({
        targetDepartmentId: 'DEP-PROD-NY',
        targetLocationId: 'LOC-NYC-01',
        targetRoleId: 'ROL-SR-PM',
        targetEffectiveDate: getFutureDate(35),
        reason: 'Relocating closer to East Coast operations and pursuing Senior PM role'
      });
    expect(initRes.status).toBe(201);
    const transferId = initRes.body.data.id;
    expect(initRes.body.data.status).toBe('PENDING_CURRENT_MGR_APPROVAL');

    // 2. Current Manager approves
    const mgr1Res = await request(app)
      .post(`/api/v1/transfers/${transferId}/actions/approve-current-manager`)
      .set('Authorization', 'Bearer token_mgr_2019')
      .send({ remarks: 'Candidate has completed strong handover plan. Approved release.' });
    expect(mgr1Res.status).toBe(200);
    expect(mgr1Res.body.data.status).toBe('PENDING_RECEIVING_MGR_APPROVAL');

    // 3. Receiving Manager accepts
    const mgr2Res = await request(app)
      .post(`/api/v1/transfers/${transferId}/actions/approve-receiving-manager`)
      .set('Authorization', 'Bearer token_mgr_3088')
      .send({ requisitionCode: 'REQ-NY-77', remarks: 'Team welcomes candidate for Q4 roadmap.' });
    expect(mgr2Res.status).toBe(200);
    expect(mgr2Res.body.data.status).toBe('PENDING_HR_VALIDATION');

    // 4. HR signs off
    const hrRes = await request(app)
      .post(`/api/v1/transfers/${transferId}/actions/approve-hr`)
      .set('Authorization', 'Bearer token_hr_4011')
      .send({ confirmedSalaryGrade: 'GR-08', visaCleared: true });
    expect(hrRes.status).toBe(200);
    expect(hrRes.body.data.status).toBe('COMPLETED'); // Synchronous / Resolved SAGA
    
    // 5. Verify Downstream Statuses
    const detailRes = await request(app)
      .get(`/api/v1/transfers/${transferId}`)
      .set('Authorization', 'Bearer token_emp_1042');
    expect(detailRes.body.data.downstreamStatus.hris).toBe('SUCCESS');
    expect(detailRes.body.data.downstreamStatus.payroll).toBe('SUCCESS');
    expect(detailRes.body.data.downstreamStatus.it).toBe('SUCCESS');
    expect(detailRes.body.data.downstreamStatus.facilities).toBe('SUCCESS');
  });
});
```

### Scenario 2: Security & IDOR Authorization Verification (`TC-SEC-001`)
```typescript
describe('Security & Object-Level Access Control (OLAC / BOLA)', () => {
  it('should block unauthorized employee from viewing peer transfer request', async () => {
    const res = await request(app)
      .get('/api/v1/transfers/TRF-1001')
      .set('Authorization', 'Bearer token_unrelated_emp_9999');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ERR_FORBIDDEN_OBJECT_ACCESS');
  });
});
```

### Scenario 3: Tamper-Evident Cryptographic Audit Hash Verification (`TC-SEC-004`)
```typescript
describe('Cryptographic Audit Trail Integrity', () => {
  it('should detect unauthorized tampering with historical audit ledger entries', () => {
    const auditService = new AuditService();
    const e1 = auditService.logEvent({ transferId: 'TRF-1', actorId: 'EMP-1', action: 'INITIATED' });
    const e2 = auditService.logEvent({ transferId: 'TRF-1', actorId: 'MGR-1', action: 'MGR_APPROVED' });
    const e3 = auditService.logEvent({ transferId: 'TRF-1', actorId: 'HR-1', action: 'HR_APPROVED' });

    expect(auditService.verifyIntegrity('TRF-1')).toBe(true);

    // Tamper with intermediate event e2
    e2.action = 'UNAUTHORIZED_TAMPER';
    expect(auditService.verifyIntegrity('TRF-1')).toBe(false);
  });
});
```
