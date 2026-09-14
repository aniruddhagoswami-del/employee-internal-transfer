import {
  CreateTransferDTO,
  DownstreamWorkerStatus,
  EligibilityResult,
  HRApprovalDTO,
  ManagerApprovalDTO,
  RejectionDTO,
  TransferRequest,
  TransferStatus,
  UserRole,
  UserSession
} from '../types/transfer.types';
import { auditService } from './audit.service';
import { eligibilityService } from './eligibility.service';
import { stateMachineService } from './state-machine.service';
import { orchestrationService } from './orchestrator.service';

export class TransferService {
  private transfers: Map<string, TransferRequest> = new Map();
  private transferCounter: number = 1000;

  // Master Reference Data
  public readonly users: Record<string, UserSession> = {
    'EMP-1042': {
      userId: 'EMP-1042',
      name: 'Jane Doe',
      email: 'jane.doe@enterprise.com',
      role: UserRole.EMPLOYEE,
      departmentId: 'DEP-CLOUD-ENG',
      departmentName: 'Cloud Infrastructure',
      locationId: 'LOC-LDN-01',
      locationName: 'London HQ',
      managerId: 'MGR-2019',
      tenureMonths: 18,
      performanceRating: 4.2,
      hasActiveDisciplinaryRecord: false
    },
    'EMP-5002': {
      userId: 'EMP-5002',
      name: 'Robert Evans',
      email: 'robert.evans@enterprise.com',
      role: UserRole.EMPLOYEE,
      departmentId: 'DEP-CLOUD-ENG',
      departmentName: 'Cloud Infrastructure',
      locationId: 'LOC-LDN-01',
      locationName: 'London HQ',
      managerId: 'MGR-2019',
      tenureMonths: 6,
      performanceRating: 2.4,
      hasActiveDisciplinaryRecord: true
    },
    'MGR-2019': {
      userId: 'MGR-2019',
      name: 'Alex Wong',
      email: 'alex.wong@enterprise.com',
      role: UserRole.CURRENT_MANAGER,
      departmentId: 'DEP-CLOUD-ENG',
      departmentName: 'Cloud Infrastructure',
      locationId: 'LOC-LDN-01',
      locationName: 'London HQ',
      tenureMonths: 48,
      performanceRating: 4.8,
      hasActiveDisciplinaryRecord: false
    },
    'MGR-3088': {
      userId: 'MGR-3088',
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@enterprise.com',
      role: UserRole.RECEIVING_MANAGER,
      departmentId: 'DEP-PROD-NY',
      departmentName: 'Product Operations',
      locationId: 'LOC-NYC-01',
      locationName: 'New York Tower A',
      tenureMonths: 36,
      performanceRating: 4.7,
      hasActiveDisciplinaryRecord: false
    },
    'HR-4011': {
      userId: 'HR-4011',
      name: 'Michael Scott',
      email: 'michael.scott@enterprise.com',
      role: UserRole.HR_PARTNER,
      departmentId: 'DEP-HR-OPS',
      departmentName: 'Global Talent & Mobility',
      locationId: 'LOC-NYC-01',
      locationName: 'New York Tower A',
      tenureMonths: 60,
      performanceRating: 4.5,
      hasActiveDisciplinaryRecord: false
    },
    'EMP-9999': {
      userId: 'EMP-9999',
      name: 'Charlie Brown',
      email: 'charlie.brown@enterprise.com',
      role: UserRole.EMPLOYEE,
      departmentId: 'DEP-AI-RES',
      departmentName: 'AI & Applied Research',
      locationId: 'LOC-ZUR-01',
      locationName: 'Zurich Tech Center',
      managerId: 'MGR-8888',
      tenureMonths: 14,
      performanceRating: 3.8,
      hasActiveDisciplinaryRecord: false
    }
  };

  public readonly departments = [
    { id: 'DEP-CLOUD-ENG', name: 'Cloud Infrastructure', locations: ['LOC-LDN-01', 'LOC-NYC-01', 'LOC-TKO-01'] },
    { id: 'DEP-PROD-NY', name: 'Product Operations', locations: ['LOC-NYC-01', 'LOC-SFO-01', 'LOC-LDN-01'] },
    { id: 'DEP-AI-RES', name: 'AI & Applied Research', locations: ['LOC-ZUR-01', 'LOC-NYC-01', 'LOC-SGP-01'] },
    { id: 'DEP-CYBER-SEC', name: 'Cybersecurity Operations', locations: ['LOC-LDN-01', 'LOC-NYC-01'] }
  ];

  public readonly locations = [
    { id: 'LOC-LDN-01', name: 'London HQ (UK)' },
    { id: 'LOC-NYC-01', name: 'New York Tower A (USA)' },
    { id: 'LOC-SFO-01', name: 'San Francisco Hub (USA)' },
    { id: 'LOC-ZUR-01', name: 'Zurich Tech Center (Switzerland)' },
    { id: 'LOC-SGP-01', name: 'Singapore Marina (Singapore)' },
    { id: 'LOC-TKO-01', name: 'Tokyo Innovation Hub (Japan)' }
  ];

  public readonly roles = [
    { id: 'ROL-SR-PM', name: 'Senior Product Manager', departmentId: 'DEP-PROD-NY', band: 'GR-08' },
    { id: 'ROL-DEV-LEAD', name: 'Lead Software Engineer', departmentId: 'DEP-CLOUD-ENG', band: 'GR-08' },
    { id: 'ROL-AI-RES', name: 'Staff AI Research Scientist', departmentId: 'DEP-AI-RES', band: 'GR-09' },
    { id: 'ROL-SEC-ARCH', name: 'Principal Security Architect', departmentId: 'DEP-CYBER-SEC', band: 'GR-09' }
  ];

  public getOptions() {
    return {
      departments: this.departments,
      locations: this.locations,
      roles: this.roles
    };
  }

  public getUserByToken(authHeader?: string): UserSession | null {
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '').trim();
    
    // Quick token mapping for testing harness
    const tokenMap: Record<string, string> = {
      'token_emp_1042': 'EMP-1042',
      'token_emp_5002': 'EMP-5002',
      'token_mgr_2019': 'MGR-2019',
      'token_mgr_3088': 'MGR-3088',
      'token_hr_4011': 'HR-4011',
      'token_unrelated_emp_9999': 'EMP-9999'
    };

    const userId = tokenMap[token] || token;
    return this.users[userId] || null;
  }

  /**
   * Pre-flight eligibility evaluation endpoint helper.
   */
  public evaluatePreflight(user: UserSession, targetEffectiveDate?: string): EligibilityResult {
    return eligibilityService.evaluateEligibility(user, targetEffectiveDate);
  }

  /**
   * Initiates a new transfer request or saves as draft.
   */
  public createTransfer(user: UserSession, dto: CreateTransferDTO): TransferRequest {
    // 1. Check for Active Transfer Singleton Constraint (BR-006)
    if (!dto.isDraft) {
      const activeTransfer = Array.from(this.transfers.values()).find(
        (t) => t.employeeId === user.userId && !stateMachineService.isTerminal(t.status)
      );
      if (activeTransfer) {
        throw new Error(`ERR_DUPLICATE_ACTIVE_TRANSFER: You already have an active transfer request (${activeTransfer.id}).`);
      }
    }

    // 2. Resolve metadata labels
    const targetDept = this.departments.find((d) => d.id === dto.targetDepartmentId) || { name: dto.targetDepartmentId };
    const targetLoc = this.locations.find((l) => l.id === dto.targetLocationId) || { name: dto.targetLocationId };
    const targetRole = this.roles.find((r) => r.id === dto.targetRoleId) || { name: dto.targetRoleId };
    const currentMgr = this.users[user.managerId || 'MGR-2019'] || { name: 'Alex Wong', userId: 'MGR-2019' };
    const receivingMgr = this.users['MGR-3088'] || { name: 'Sarah Jenkins', userId: 'MGR-3088' };

    this.transferCounter += 1;
    const transferId = `TRF-${this.transferCounter}`;

    // 3. Evaluate eligibility
    const eligibilityResult = eligibilityService.evaluateEligibility(user, dto.targetEffectiveDate);

    // Notice period check (BR-004)
    if (!dto.isDraft && !eligibilityResult.checks.find(c => c.id === 'CHK_NOTICE_PERIOD')?.passed) {
      throw new Error('ERR_NOTICE_PERIOD_VIOLATION: Target effective date must be at least 30 calendar days from submission.');
    }

    // Hard block check (BR-003, BR-001)
    let initialStatus = dto.isDraft ? TransferStatus.DRAFT : TransferStatus.PENDING_CURRENT_MGR_APPROVAL;
    if (!dto.isDraft && !eligibilityResult.passed) {
      initialStatus = TransferStatus.REJECTED;
    }

    const transfer: TransferRequest = {
      id: transferId,
      version: 1,
      employeeId: user.userId,
      employeeName: user.name,
      currentDepartmentId: user.departmentId,
      currentDepartmentName: user.departmentName,
      currentLocationId: user.locationId,
      currentLocationName: user.locationName,
      currentManagerId: currentMgr.userId,
      currentManagerName: currentMgr.name,
      
      targetDepartmentId: dto.targetDepartmentId,
      targetDepartmentName: targetDept.name,
      targetLocationId: dto.targetLocationId,
      targetLocationName: targetLoc.name,
      targetRoleId: dto.targetRoleId,
      targetRoleName: targetRole.name,
      targetEffectiveDate: dto.targetEffectiveDate,
      reason: dto.reason,
      
      status: initialStatus,
      pendingActorRole: initialStatus === TransferStatus.PENDING_CURRENT_MGR_APPROVAL ? UserRole.CURRENT_MANAGER : undefined,
      pendingActorId: initialStatus === TransferStatus.PENDING_CURRENT_MGR_APPROVAL ? currentMgr.userId : undefined,
      pendingActorName: initialStatus === TransferStatus.PENDING_CURRENT_MGR_APPROVAL ? currentMgr.name : undefined,
      
      eligibilityResult,
      downstreamStatus: {
        hris: DownstreamWorkerStatus.PENDING,
        payroll: DownstreamWorkerStatus.PENDING,
        it: DownstreamWorkerStatus.PENDING,
        facilities: DownstreamWorkerStatus.PENDING
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (initialStatus === TransferStatus.REJECTED) {
      transfer.rejectionReason = `Eligibility Pre-flight Failed: ${eligibilityResult.summary}`;
    }

    this.transfers.set(transferId, transfer);

    // Record audit event
    auditService.logEvent({
      transferId,
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: dto.isDraft ? 'DRAFT_SAVED' : (initialStatus === TransferStatus.REJECTED ? 'PREFLIGHT_REJECTED' : 'TRANSFER_SUBMITTED'),
      newState: initialStatus,
      remarks: dto.reason,
      metadata: { targetDepartment: dto.targetDepartmentId, targetLocation: dto.targetLocationId }
    });

    return transfer;
  }

  public getTransfer(id: string): TransferRequest | undefined {
    return this.transfers.get(id);
  }

  public listTransfers(user: UserSession): TransferRequest[] {
    const all = Array.from(this.transfers.values());
    if (user.role === UserRole.HR_PARTNER || user.role === UserRole.HR_OPS_ADMIN) {
      return all;
    }
    if (user.role === UserRole.CURRENT_MANAGER) {
      return all.filter((t) => t.currentManagerId === user.userId || t.employeeId === user.userId);
    }
    if (user.role === UserRole.RECEIVING_MANAGER) {
      return all.filter((t) => t.pendingActorId === user.userId || t.employeeId === user.userId || t.status === TransferStatus.PENDING_RECEIVING_MGR_APPROVAL);
    }
    // Default standard employee
    return all.filter((t) => t.employeeId === user.userId);
  }

  /**
   * Current Manager Endorsement
   */
  public approveCurrentManager(transferId: string, user: UserSession, dto: ManagerApprovalDTO): TransferRequest {
    const transfer = this.getRequiredTransfer(transferId);
    
    transfer.handoverRemarks = dto.handoverRemarks;
    transfer.pendingActorRole = UserRole.RECEIVING_MANAGER;
    transfer.pendingActorId = 'MGR-3088';
    transfer.pendingActorName = 'Sarah Jenkins';

    stateMachineService.transition(transfer, TransferStatus.PENDING_RECEIVING_MGR_APPROVAL, {
      userId: user.userId,
      userName: user.name,
      role: user.role
    }, {
      expectedVersion: dto.expectedVersion,
      actionName: 'CURRENT_MANAGER_APPROVED',
      remarks: dto.handoverRemarks
    });

    return transfer;
  }

  /**
   * Receiving Manager Acceptance
   */
  public approveReceivingManager(transferId: string, user: UserSession, dto: ManagerApprovalDTO): TransferRequest {
    const transfer = this.getRequiredTransfer(transferId);

    transfer.receivingManagerRemarks = dto.handoverRemarks;
    transfer.requisitionCode = dto.requisitionCode || 'REQ-NY-77';
    transfer.pendingActorRole = UserRole.HR_PARTNER;
    transfer.pendingActorId = 'HR-4011';
    transfer.pendingActorName = 'Michael Scott';

    stateMachineService.transition(transfer, TransferStatus.PENDING_HR_VALIDATION, {
      userId: user.userId,
      userName: user.name,
      role: user.role
    }, {
      expectedVersion: dto.expectedVersion,
      actionName: 'RECEIVING_MANAGER_APPROVED',
      remarks: dto.handoverRemarks,
      metadata: { requisitionCode: transfer.requisitionCode }
    });

    return transfer;
  }

  /**
   * HR Final Sign-off & SAGA trigger
   */
  public async approveHR(transferId: string, user: UserSession, dto: HRApprovalDTO): Promise<TransferRequest> {
    const transfer = this.getRequiredTransfer(transferId);

    transfer.confirmedSalaryGrade = dto.confirmedSalaryGrade;
    transfer.hrNotes = dto.hrNotes;

    // Transition to ORCHESTRATING_DOWNSTREAM
    stateMachineService.transition(transfer, TransferStatus.ORCHESTRATING_DOWNSTREAM, {
      userId: user.userId,
      userName: user.name,
      role: user.role
    }, {
      expectedVersion: dto.expectedVersion,
      actionName: 'HR_FINAL_APPROVAL_GRANTED',
      remarks: dto.hrNotes,
      metadata: { confirmedSalaryGrade: dto.confirmedSalaryGrade, visaCleared: dto.visaCleared }
    });

    // Execute SAGA Orchestration
    const sagaResult = await orchestrationService.executeSaga(transfer);
    return sagaResult.transfer;
  }

  /**
   * Stakeholder Rejection
   */
  public rejectTransfer(transferId: string, user: UserSession, dto: RejectionDTO): TransferRequest {
    if (!dto.reason || dto.reason.trim().length < 20) {
      throw new Error('ERR_MANDATORY_REJECTION_REASON: A detailed rejection reason of at least 20 characters is required.');
    }

    const transfer = this.getRequiredTransfer(transferId);
    transfer.rejectionReason = dto.reason;
    transfer.pendingActorRole = undefined;
    transfer.pendingActorId = undefined;
    transfer.pendingActorName = undefined;

    stateMachineService.transition(transfer, TransferStatus.REJECTED, {
      userId: user.userId,
      userName: user.name,
      role: user.role
    }, {
      expectedVersion: dto.expectedVersion,
      actionName: `${user.role}_REJECTED`,
      remarks: dto.reason
    });

    return transfer;
  }

  /**
   * Employee Voluntary Withdrawal
   */
  public withdrawTransfer(transferId: string, user: UserSession): TransferRequest {
    const transfer = this.getRequiredTransfer(transferId);

    if (transfer.employeeId !== user.userId) {
      throw new Error('ERR_FORBIDDEN_OBJECT_ACCESS: You can only withdraw your own transfer requests.');
    }

    if ([TransferStatus.ORCHESTRATING_DOWNSTREAM, TransferStatus.COMPLETED].includes(transfer.status)) {
      throw new Error('ERR_WITHDRAWAL_WINDOW_CLOSED: Self-service withdrawal is not permitted after HR approval. Contact HR Operations.');
    }

    transfer.pendingActorRole = undefined;
    transfer.pendingActorId = undefined;
    transfer.pendingActorName = undefined;

    stateMachineService.transition(transfer, TransferStatus.WITHDRAWN, {
      userId: user.userId,
      userName: user.name,
      role: user.role
    }, {
      actionName: 'EMPLOYEE_WITHDRAWN',
      remarks: 'Voluntarily withdrawn by employee.'
    });

    return transfer;
  }

  private getRequiredTransfer(id: string): TransferRequest {
    const transfer = this.transfers.get(id);
    if (!transfer) {
      throw new Error(`ERR_NOT_FOUND: Transfer request [${id}] does not exist.`);
    }
    return transfer;
  }

  public clear(): void {
    this.transfers.clear();
    this.transferCounter = 1000;
  }
}

export const transferService = new TransferService();
