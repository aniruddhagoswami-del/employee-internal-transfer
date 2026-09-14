import { TransferRequest, TransferStatus, UserRole } from '../types/transfer.types';
import { auditService } from './audit.service';

export class InvalidStateTransitionError extends Error {
  constructor(public currentStatus: TransferStatus, public attemptedStatus: TransferStatus, public reason?: string) {
    super(`Illegal state transition from [${currentStatus}] to [${attemptedStatus}]. ${reason || ''}`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class ConcurrencyError extends Error {
  constructor(public currentVersion: number, public expectedVersion: number) {
    super(`Optimistic concurrency conflict: entity version is ${currentVersion}, but mutation expected ${expectedVersion}.`);
    this.name = 'ConcurrencyError';
  }
}

export class ForbiddenActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenActionError';
  }
}

export class StateMachineService {
  /**
   * Permitted state transitions matrix
   */
  private readonly ALLOWED_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
    [TransferStatus.DRAFT]: [
      TransferStatus.SUBMITTED,
      TransferStatus.CANCELLED
    ],
    [TransferStatus.SUBMITTED]: [
      TransferStatus.PENDING_CURRENT_MGR_APPROVAL,
      TransferStatus.REJECTED
    ],
    [TransferStatus.PENDING_CURRENT_MGR_APPROVAL]: [
      TransferStatus.PENDING_RECEIVING_MGR_APPROVAL,
      TransferStatus.REJECTED,
      TransferStatus.WITHDRAWN
    ],
    [TransferStatus.PENDING_RECEIVING_MGR_APPROVAL]: [
      TransferStatus.PENDING_HR_VALIDATION,
      TransferStatus.REJECTED,
      TransferStatus.WITHDRAWN
    ],
    [TransferStatus.PENDING_HR_VALIDATION]: [
      TransferStatus.ORCHESTRATING_DOWNSTREAM,
      TransferStatus.REJECTED,
      TransferStatus.WITHDRAWN
    ],
    [TransferStatus.ORCHESTRATING_DOWNSTREAM]: [
      TransferStatus.COMPLETED,
      TransferStatus.MANUAL_INTERVENTION_REQUIRED
    ],
    [TransferStatus.MANUAL_INTERVENTION_REQUIRED]: [
      TransferStatus.ORCHESTRATING_DOWNSTREAM,
      TransferStatus.COMPLETED
    ],
    [TransferStatus.COMPLETED]: [],
    [TransferStatus.REJECTED]: [],
    [TransferStatus.WITHDRAWN]: [],
    [TransferStatus.CANCELLED]: []
  };

  /**
   * Validates if a transition from current state to target state is legally allowed.
   */
  public canTransition(from: TransferStatus, to: TransferStatus): boolean {
    const allowed = this.ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Executes a guarded transition on a TransferRequest entity.
   */
  public transition(
    transfer: TransferRequest,
    targetState: TransferStatus,
    actor: {
      userId: string;
      userName: string;
      role: UserRole | string;
    },
    options: {
      expectedVersion?: number;
      remarks?: string;
      actionName: string;
      metadata?: Record<string, unknown>;
    }
  ): TransferRequest {
    // 1. Optimistic Concurrency Control Check
    if (options.expectedVersion !== undefined && options.expectedVersion !== transfer.version) {
      throw new ConcurrencyError(transfer.version, options.expectedVersion);
    }

    // 2. Terminal State Check
    if (this.isTerminal(transfer.status)) {
      throw new InvalidStateTransitionError(transfer.status, targetState, 'Terminal states cannot be mutated.');
    }

    // 3. Permitted Transition Check
    if (!this.canTransition(transfer.status, targetState)) {
      throw new InvalidStateTransitionError(transfer.status, targetState, 'Transition path not permitted in workflow FSM.');
    }

    const previousState = transfer.status;
    transfer.status = targetState;
    transfer.version += 1;
    transfer.updatedAt = new Date().toISOString();

    if (targetState === TransferStatus.COMPLETED) {
      transfer.completedAt = new Date().toISOString();
      transfer.pendingActorRole = undefined;
      transfer.pendingActorId = undefined;
      transfer.pendingActorName = undefined;
    }

    // 4. Record Cryptographic Audit Ledger Entry
    auditService.logEvent({
      transferId: transfer.id,
      actorId: actor.userId,
      actorName: actor.userName,
      actorRole: actor.role,
      action: options.actionName,
      previousState,
      newState: targetState,
      remarks: options.remarks,
      metadata: options.metadata
    });

    return transfer;
  }

  public isTerminal(status: TransferStatus): boolean {
    return [
      TransferStatus.COMPLETED,
      TransferStatus.REJECTED,
      TransferStatus.WITHDRAWN,
      TransferStatus.CANCELLED
    ].includes(status);
  }
}

export const stateMachineService = new StateMachineService();
