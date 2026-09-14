import { AuditService } from '../../src/services/audit.service';
import { TransferStatus, UserRole } from '../../src/types/transfer.types';

describe('AuditService (Tamper-Evident Hash Chaining AC-024)', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
  });

  it('should initialize genesis hash on the first log entry', () => {
    const entry = auditService.logEvent({
      transferId: 'TRF-1001',
      actorId: 'EMP-1042',
      actorName: 'Jane Doe',
      actorRole: UserRole.EMPLOYEE,
      action: 'TRANSFER_SUBMITTED',
      newState: TransferStatus.PENDING_CURRENT_MGR_APPROVAL
    });

    expect(entry.sequenceNum).toBe(1);
    expect(entry.prevHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    expect(entry.currentHash).toHaveLength(64); // Valid SHA-256 hex string
  });

  it('should cryptographically chain successive log entries', () => {
    const e1 = auditService.logEvent({
      transferId: 'TRF-1001',
      actorId: 'EMP-1042',
      actorName: 'Jane Doe',
      actorRole: UserRole.EMPLOYEE,
      action: 'TRANSFER_SUBMITTED',
      newState: TransferStatus.PENDING_CURRENT_MGR_APPROVAL
    });

    const e2 = auditService.logEvent({
      transferId: 'TRF-1001',
      actorId: 'MGR-2019',
      actorName: 'Alex Wong',
      actorRole: UserRole.CURRENT_MANAGER,
      action: 'CURRENT_MANAGER_APPROVED',
      previousState: TransferStatus.PENDING_CURRENT_MGR_APPROVAL,
      newState: TransferStatus.PENDING_RECEIVING_MGR_APPROVAL
    });

    const e3 = auditService.logEvent({
      transferId: 'TRF-1001',
      actorId: 'HR-4011',
      actorName: 'Michael Scott',
      actorRole: UserRole.HR_PARTNER,
      action: 'HR_APPROVED',
      previousState: TransferStatus.PENDING_HR_VALIDATION,
      newState: TransferStatus.COMPLETED
    });

    expect(e2.prevHash).toBe(e1.currentHash);
    expect(e3.prevHash).toBe(e2.currentHash);
    expect(auditService.verifyIntegrity('TRF-1001')).toBe(true);
  });

  it('should detect unauthorized tampering when an intermediate record is mutated', () => {
    auditService.logEvent({
      transferId: 'TRF-1001',
      actorId: 'EMP-1042',
      actorName: 'Jane Doe',
      actorRole: UserRole.EMPLOYEE,
      action: 'TRANSFER_SUBMITTED',
      newState: TransferStatus.PENDING_CURRENT_MGR_APPROVAL
    });

    const e2 = auditService.logEvent({
      transferId: 'TRF-1001',
      actorId: 'MGR-2019',
      actorName: 'Alex Wong',
      actorRole: UserRole.CURRENT_MANAGER,
      action: 'CURRENT_MANAGER_APPROVED',
      newState: TransferStatus.PENDING_RECEIVING_MGR_APPROVAL
    });

    auditService.logEvent({
      transferId: 'TRF-1001',
      actorId: 'HR-4011',
      actorName: 'Michael Scott',
      actorRole: UserRole.HR_PARTNER,
      action: 'HR_APPROVED',
      newState: TransferStatus.COMPLETED
    });

    expect(auditService.verifyIntegrity('TRF-1001')).toBe(true);

    // Malicious DB edit: Alter the action string of entry 2
    e2.action = 'MALICIOUS_UNAUTHORIZED_OVERRIDE';

    expect(auditService.verifyIntegrity('TRF-1001')).toBe(false);
  });
});
