import { StateMachineService, InvalidStateTransitionError, ConcurrencyError } from '../../src/services/state-machine.service';
import { TransferRequest, TransferStatus, UserRole } from '../../src/types/transfer.types';
import { auditService } from '../../src/services/audit.service';

describe('StateMachineService (FSM Guard & Transitions)', () => {
  let fsm: StateMachineService;
  let mockTransfer: TransferRequest;

  beforeEach(() => {
    fsm = new StateMachineService();
    auditService.clear();
    mockTransfer = {
      id: 'TRF-TEST-1',
      version: 1,
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
      status: TransferStatus.PENDING_CURRENT_MGR_APPROVAL,
      downstreamStatus: {
        hris: 'PENDING' as any,
        payroll: 'PENDING' as any,
        it: 'PENDING' as any,
        facilities: 'PENDING' as any
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  describe('Happy Path Transitions', () => {
    it('should transition from PENDING_CURRENT_MGR_APPROVAL to PENDING_RECEIVING_MGR_APPROVAL', () => {
      const updated = fsm.transition(
        mockTransfer,
        TransferStatus.PENDING_RECEIVING_MGR_APPROVAL,
        { userId: 'MGR-2019', userName: 'Alex Wong', role: UserRole.CURRENT_MANAGER },
        { expectedVersion: 1, actionName: 'CURRENT_MGR_APPROVED', remarks: 'Handover complete.' }
      );

      expect(updated.status).toBe(TransferStatus.PENDING_RECEIVING_MGR_APPROVAL);
      expect(updated.version).toBe(2);
    });

    it('should transition from PENDING_RECEIVING_MGR_APPROVAL to PENDING_HR_VALIDATION', () => {
      mockTransfer.status = TransferStatus.PENDING_RECEIVING_MGR_APPROVAL;
      const updated = fsm.transition(
        mockTransfer,
        TransferStatus.PENDING_HR_VALIDATION,
        { userId: 'MGR-3088', userName: 'Sarah Jenkins', role: UserRole.RECEIVING_MANAGER },
        { expectedVersion: 1, actionName: 'RECEIVING_MGR_APPROVED' }
      );

      expect(updated.status).toBe(TransferStatus.PENDING_HR_VALIDATION);
      expect(updated.version).toBe(2);
    });

    it('should transition from PENDING_HR_VALIDATION to ORCHESTRATING_DOWNSTREAM', () => {
      mockTransfer.status = TransferStatus.PENDING_HR_VALIDATION;
      const updated = fsm.transition(
        mockTransfer,
        TransferStatus.ORCHESTRATING_DOWNSTREAM,
        { userId: 'HR-4011', userName: 'Michael Scott', role: UserRole.HR_PARTNER },
        { expectedVersion: 1, actionName: 'HR_APPROVED' }
      );

      expect(updated.status).toBe(TransferStatus.ORCHESTRATING_DOWNSTREAM);
      expect(updated.version).toBe(2);
    });

    it('should transition from ORCHESTRATING_DOWNSTREAM to COMPLETED and set completedAt timestamp', () => {
      mockTransfer.status = TransferStatus.ORCHESTRATING_DOWNSTREAM;
      const updated = fsm.transition(
        mockTransfer,
        TransferStatus.COMPLETED,
        { userId: 'SYSTEM', userName: 'SAGA Orchestrator', role: UserRole.SYSTEM },
        { expectedVersion: 1, actionName: 'SAGA_COMPLETED' }
      );

      expect(updated.status).toBe(TransferStatus.COMPLETED);
      expect(updated.completedAt).toBeDefined();
    });
  });

  describe('Guard Rails & Negative Transitions', () => {
    it('should block illegal transition jumping from PENDING_CURRENT_MGR_APPROVAL directly to COMPLETED', () => {
      expect(() => {
        fsm.transition(
          mockTransfer,
          TransferStatus.COMPLETED,
          { userId: 'MGR-2019', userName: 'Alex Wong', role: UserRole.CURRENT_MANAGER },
          { expectedVersion: 1, actionName: 'ILLEGAL_JUMP' }
        );
      }).toThrow(InvalidStateTransitionError);
    });

    it('should throw ConcurrencyError when expected version does not match entity version', () => {
      expect(() => {
        fsm.transition(
          mockTransfer,
          TransferStatus.PENDING_RECEIVING_MGR_APPROVAL,
          { userId: 'MGR-2019', userName: 'Alex Wong', role: UserRole.CURRENT_MANAGER },
          { expectedVersion: 99, actionName: 'OUTDATED_MUTATION' }
        );
      }).toThrow(ConcurrencyError);
    });

    it('should block mutation on terminal state COMPLETED', () => {
      mockTransfer.status = TransferStatus.COMPLETED;
      expect(() => {
        fsm.transition(
          mockTransfer,
          TransferStatus.REJECTED,
          { userId: 'HR-4011', userName: 'Michael Scott', role: UserRole.HR_PARTNER },
          { expectedVersion: 1, actionName: 'POST_COMPLETE_REJECT' }
        );
      }).toThrow(InvalidStateTransitionError);
    });

    it('should block mutation on terminal state REJECTED', () => {
      mockTransfer.status = TransferStatus.REJECTED;
      expect(() => {
        fsm.transition(
          mockTransfer,
          TransferStatus.PENDING_HR_VALIDATION,
          { userId: 'MGR-3088', userName: 'Sarah Jenkins', role: UserRole.RECEIVING_MANAGER },
          { expectedVersion: 1, actionName: 'REOPEN_REJECTED' }
        );
      }).toThrow(InvalidStateTransitionError);
    });
  });
});
