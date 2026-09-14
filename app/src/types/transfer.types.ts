/**
 * Domain Types and Contracts for Internal Transfer Digital Journey
 * Derived from SPEC-EIT-001 and PLAN-EIT-001
 */

export enum TransferStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PENDING_CURRENT_MGR_APPROVAL = 'PENDING_CURRENT_MGR_APPROVAL',
  PENDING_RECEIVING_MGR_APPROVAL = 'PENDING_RECEIVING_MGR_APPROVAL',
  PENDING_HR_VALIDATION = 'PENDING_HR_VALIDATION',
  ORCHESTRATING_DOWNSTREAM = 'ORCHESTRATING_DOWNSTREAM',
  MANUAL_INTERVENTION_REQUIRED = 'MANUAL_INTERVENTION_REQUIRED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  CANCELLED = 'CANCELLED'
}

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  CURRENT_MANAGER = 'CURRENT_MANAGER',
  RECEIVING_MANAGER = 'RECEIVING_MANAGER',
  HR_PARTNER = 'HR_PARTNER',
  HR_OPS_ADMIN = 'HR_OPS_ADMIN',
  SYSTEM = 'SYSTEM'
}

export enum DownstreamWorkerStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string;
  departmentName: string;
  locationId: string;
  locationName: string;
  managerId?: string;
  tenureMonths: number;
  performanceRating: number;
  hasActiveDisciplinaryRecord: boolean;
}

export interface DownstreamSyncStatus {
  hris: DownstreamWorkerStatus;
  payroll: DownstreamWorkerStatus;
  it: DownstreamWorkerStatus;
  facilities: DownstreamWorkerStatus;
  details?: {
    hrisJobCode?: string;
    payrollCostCenter?: string;
    itTicketId?: string;
    facilitiesDeskId?: string;
  };
}

export interface EligibilityCheckItem {
  id: string;
  name: string;
  criteria: string;
  evaluatedValue: string | number | boolean;
  passed: boolean;
  notes?: string;
}

export interface EligibilityResult {
  passed: boolean;
  evaluatedAt: string;
  checks: EligibilityCheckItem[];
  summary: string;
}

export interface AuditLogEntry {
  id: string;
  transferId: string;
  sequenceNum: number;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole | string;
  action: string;
  previousState?: TransferStatus;
  newState: TransferStatus;
  remarks?: string;
  metadata?: Record<string, unknown>;
  prevHash: string;
  currentHash: string;
}

export interface SagaTask {
  id: string;
  transferId: string;
  stepName: 'HRIS' | 'PAYROLL' | 'IT' | 'FACILITIES';
  idempotencyKey: string;
  status: DownstreamWorkerStatus;
  retryCount: number;
  maxRetries: number;
  payload: Record<string, unknown>;
  errorMessage?: string;
  lastAttemptAt?: string;
}

export interface TransferRequest {
  id: string;
  version: number;
  employeeId: string;
  employeeName: string;
  currentDepartmentId: string;
  currentDepartmentName: string;
  currentLocationId: string;
  currentLocationName: string;
  currentManagerId: string;
  currentManagerName: string;
  
  targetDepartmentId: string;
  targetDepartmentName: string;
  targetLocationId: string;
  targetLocationName: string;
  targetRoleId: string;
  targetRoleName: string;
  targetEffectiveDate: string; // YYYY-MM-DD
  reason?: string;
  
  status: TransferStatus;
  pendingActorRole?: UserRole;
  pendingActorId?: string;
  pendingActorName?: string;
  
  handoverRemarks?: string;
  receivingManagerRemarks?: string;
  requisitionCode?: string;
  confirmedSalaryGrade?: string;
  hrNotes?: string;
  rejectionReason?: string;
  
  eligibilityResult?: EligibilityResult;
  downstreamStatus: DownstreamSyncStatus;
  
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateTransferDTO {
  targetDepartmentId: string;
  targetLocationId: string;
  targetRoleId: string;
  targetEffectiveDate: string;
  reason?: string;
  isDraft?: boolean;
}

export interface ManagerApprovalDTO {
  expectedVersion: number;
  handoverRemarks?: string;
  requisitionCode?: string;
}

export interface HRApprovalDTO {
  expectedVersion: number;
  confirmedSalaryGrade: string;
  visaCleared?: boolean;
  hrNotes?: string;
}

export interface RejectionDTO {
  expectedVersion: number;
  reason: string;
}

export interface StakeholderSummary {
  step: string;
  role: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'REJECTED';
  assignedTo: string;
  completedAt?: string;
  notes?: string;
}
