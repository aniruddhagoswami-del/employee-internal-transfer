import { OrchestrationService } from '../../src/services/orchestrator.service';
import { TransferRequest, TransferStatus, DownstreamWorkerStatus } from '../../src/types/transfer.types';
import { auditService } from '../../src/services/audit.service';

describe('SAGA Orchestrator Resilience & Fault Tolerance (AC-018, AC-019)', () => {
  let sagaService: OrchestrationService;
  let mockTransfer: TransferRequest;

  beforeEach(() => {
    sagaService = new OrchestrationService();
    auditService.clear();
    mockTransfer = {
      id: 'TRF-SAGA-99',
      version: 3,
      employeeId: 'EMP-1042',
      employeeName: 'Jane Doe',
      currentDepartmentId: 'DEP-CLOUD-ENG',
      currentDepartmentName: 'Cloud Infrastructure',
      currentLocationId: 'LOC-LDN-01',
      currentLocationName: 'London HQ',
      currentManagerId: 'MGR-2019',
      currentManagerName: 'Alex Wong',
      targetDepartmentId: 'DEP-PROD-NY',
      targetDepartmentName: 'Product Operations',
      targetLocationId: 'LOC-NYC-01',
      targetLocationName: 'New York Tower A',
      targetRoleId: 'ROL-SR-PM',
      targetRoleName: 'Senior Product Manager',
      targetEffectiveDate: '2026-11-01',
      status: TransferStatus.ORCHESTRATING_DOWNSTREAM,
      downstreamStatus: {
        hris: DownstreamWorkerStatus.PENDING,
        payroll: DownstreamWorkerStatus.PENDING,
        it: DownstreamWorkerStatus.PENDING,
        facilities: DownstreamWorkerStatus.PENDING
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  it('should recover from transient HTTP 503 errors on IT adapter via exponential backoff (AC-018)', async () => {
    // Inject 2 transient failures on IT worker
    sagaService.simulateFailureStep = 'IT';
    sagaService.simulateFailureCount = 2;

    const result = await sagaService.executeSaga(mockTransfer);

    expect(result.success).toBe(true);
    expect(result.transfer.status).toBe(TransferStatus.COMPLETED);
    
    const itTask = result.tasks.find((t) => t.stepName === 'IT');
    expect(itTask?.status).toBe(DownstreamWorkerStatus.SUCCESS);
    expect(itTask?.retryCount).toBe(3); // Succeeded on attempt 3
  });

  it('should transition to MANUAL_INTERVENTION_REQUIRED when an adapter exhausts all 5 retries (AC-019)', async () => {
    // Inject permanent 5 failures on Facilities worker
    sagaService.simulateFailureStep = 'FACILITIES';
    sagaService.simulateFailureCount = 5;

    const result = await sagaService.executeSaga(mockTransfer);

    expect(result.success).toBe(false);
    expect(result.transfer.status).toBe(TransferStatus.MANUAL_INTERVENTION_REQUIRED);
    
    const facTask = result.tasks.find((t) => t.stepName === 'FACILITIES');
    expect(facTask?.status).toBe(DownstreamWorkerStatus.FAILED);
    expect(facTask?.retryCount).toBe(5);
  });

  it('should deduplicate worker execution using idempotency keys without duplicate side-effects', async () => {
    const result1 = await sagaService.executeSaga(mockTransfer);
    expect(result1.success).toBe(true);

    // Re-execute SAGA with same entity version & idempotency key
    const result2 = await sagaService.executeSaga(mockTransfer);
    expect(result2.success).toBe(true);
    expect(result2.tasks.every((t) => t.status === DownstreamWorkerStatus.SUCCESS)).toBe(true);
  });
});
