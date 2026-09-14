import { DownstreamWorkerStatus, SagaTask, TransferRequest, TransferStatus, UserRole } from '../types/transfer.types';
import { stateMachineService } from './state-machine.service';
import { auditService } from './audit.service';

export class OrchestrationService {
  private executedTasks: Map<string, SagaTask> = new Map();
  public simulateFailureStep?: 'HRIS' | 'PAYROLL' | 'IT' | 'FACILITIES';
  public simulateFailureCount: number = 0;
  private failureCounter: number = 0;

  /**
   * Executes the downstream provisioning SAGA for a transfer request.
   */
  public async executeSaga(transfer: TransferRequest): Promise<{
    success: boolean;
    transfer: TransferRequest;
    tasks: SagaTask[];
  }> {
    const steps: Array<'HRIS' | 'PAYROLL' | 'IT' | 'FACILITIES'> = ['HRIS', 'PAYROLL', 'IT', 'FACILITIES'];
    const tasks: SagaTask[] = [];

    // Parallel execution across all 4 downstream workers
    const stepPromises = steps.map(async (step) => {
      const idempotencyKey = `SAGA-${transfer.id}-${step}-v${transfer.version}`;
      const task = await this.executeWorker(transfer, step, idempotencyKey);
      tasks.push(task);
      return task;
    });

    const results = await Promise.all(stepPromises);
    const allSuccessful = results.every((r) => r.status === DownstreamWorkerStatus.SUCCESS);

    if (allSuccessful) {
      transfer.downstreamStatus = {
        hris: DownstreamWorkerStatus.SUCCESS,
        payroll: DownstreamWorkerStatus.SUCCESS,
        it: DownstreamWorkerStatus.SUCCESS,
        facilities: DownstreamWorkerStatus.SUCCESS,
        details: {
          hrisJobCode: `JOB-${transfer.targetDepartmentId}-01`,
          payrollCostCenter: `CC-${transfer.targetLocationId}-${transfer.targetDepartmentId}`,
          itTicketId: `IT-REQ-${Math.floor(10000 + Math.random() * 90000)}`,
          facilitiesDeskId: `DESK-${transfer.targetLocationId}-F04-${Math.floor(10 + Math.random() * 90)}`
        }
      };

      // Transition to COMPLETED if not already in COMPLETED state
      if (transfer.status !== TransferStatus.COMPLETED) {
        stateMachineService.transition(transfer, TransferStatus.COMPLETED, {
          userId: 'SYSTEM',
          userName: 'SAGA Distributed Orchestrator',
          role: UserRole.SYSTEM
        }, {
          actionName: 'DOWNSTREAM_SAGA_COMPLETED',
          remarks: 'All 4 enterprise adapters (HRIS, Payroll, IT, Facilities) synchronized successfully.'
        });
      }

      return { success: true, transfer, tasks };
    } else {
      // Transition to MANUAL_INTERVENTION_REQUIRED if not already in that state
      if (transfer.status !== TransferStatus.MANUAL_INTERVENTION_REQUIRED) {
        stateMachineService.transition(transfer, TransferStatus.MANUAL_INTERVENTION_REQUIRED, {
          userId: 'SYSTEM',
          userName: 'SAGA Distributed Orchestrator',
          role: UserRole.SYSTEM
        }, {
          actionName: 'DOWNSTREAM_SAGA_FAILED',
          remarks: 'One or more downstream provisioning adapters failed after retry attempts.'
        });
      }

      return { success: false, transfer, tasks };
    }
  }

  /**
   * Individual worker execution with idempotency and retry handling.
   */
  private async executeWorker(
    transfer: TransferRequest,
    step: 'HRIS' | 'PAYROLL' | 'IT' | 'FACILITIES',
    idempotencyKey: string
  ): Promise<SagaTask> {
    // Check Idempotency Cache
    const existing = this.executedTasks.get(idempotencyKey);
    if (existing && existing.status === DownstreamWorkerStatus.SUCCESS) {
      return existing;
    }

    const task: SagaTask = {
      id: `TASK-${idempotencyKey}`,
      transferId: transfer.id,
      stepName: step,
      idempotencyKey,
      status: DownstreamWorkerStatus.IN_PROGRESS,
      retryCount: 0,
      maxRetries: 5,
      payload: {
        employeeId: transfer.employeeId,
        targetDepartment: transfer.targetDepartmentId,
        targetLocation: transfer.targetLocationId,
        effectiveDate: transfer.targetEffectiveDate
      },
      lastAttemptAt: new Date().toISOString()
    };

    // Retry loop with exponential backoff simulation
    while (task.retryCount < task.maxRetries) {
      try {
        task.retryCount += 1;
        task.lastAttemptAt = new Date().toISOString();

        // Check for simulated failure injection
        if (this.simulateFailureStep === step && this.failureCounter < this.simulateFailureCount) {
          this.failureCounter += 1;
          throw new Error(`Simulated transient HTTP 503 error from ${step} adapter service (Attempt ${task.retryCount}).`);
        }

        // Execute specific adapter integration logic
        await this.performAdapterCall(step, transfer);
        task.status = DownstreamWorkerStatus.SUCCESS;
        this.executedTasks.set(idempotencyKey, task);

        auditService.logEvent({
          transferId: transfer.id,
          actorId: 'SAGA_WORKER',
          actorName: `${step} Provisioning Worker`,
          actorRole: UserRole.SYSTEM,
          action: `PROVISION_${step}_SUCCESS`,
          newState: transfer.status,
          remarks: `Successfully executed downstream step ${step} with key ${idempotencyKey}`
        });

        return task;
      } catch (err: unknown) {
        task.errorMessage = err instanceof Error ? err.message : 'Unknown downstream error';
        if (task.retryCount >= task.maxRetries) {
          task.status = DownstreamWorkerStatus.FAILED;
          this.executedTasks.set(idempotencyKey, task);
          return task;
        }
        // Small async delay to simulate backoff
        await new Promise((res) => setTimeout(res, 50));
      }
    }

    task.status = DownstreamWorkerStatus.FAILED;
    this.executedTasks.set(idempotencyKey, task);
    return task;
  }

  private async performAdapterCall(step: string, transfer: TransferRequest): Promise<void> {
    // Simulated adapter processing delay
    await new Promise((res) => setTimeout(res, 40));
  }

  public resetSimulation(): void {
    this.simulateFailureStep = undefined;
    this.simulateFailureCount = 0;
    this.failureCounter = 0;
    this.executedTasks.clear();
  }
}

export const orchestrationService = new OrchestrationService();
