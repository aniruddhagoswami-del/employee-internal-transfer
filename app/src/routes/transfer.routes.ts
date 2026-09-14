import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, authorizeTransferAccess, AuthenticatedRequest } from '../middleware/auth.middleware';
import { transferService } from '../services/transfer.service';
import { auditService } from '../services/audit.service';
import { UserRole } from '../types/transfer.types';
import { ConcurrencyError, InvalidStateTransitionError } from '../services/state-machine.service';

export const transferRouter = Router();

// 1. Meta Options (Departments, Locations, Roles)
transferRouter.get('/meta/options', (req, res) => {
  res.json({
    success: true,
    data: transferService.getOptions()
  });
});

// 2. Current User Profile Info
transferRouter.get('/meta/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: req.user
  });
});

// 3. Pre-flight Eligibility Check
transferRouter.get('/preflight/eligibility', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const targetEffectiveDate = req.query.effectiveDate as string | undefined;
  const result = transferService.evaluatePreflight(req.user!, targetEffectiveDate);
  res.json({
    success: true,
    data: result
  });
});

// 4. Initiate Transfer Request
const createTransferSchema = z.object({
  targetDepartmentId: z.string().min(1, 'Target department is required'),
  targetLocationId: z.string().min(1, 'Target location is required'),
  targetRoleId: z.string().min(1, 'Target role is required'),
  targetEffectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid YYYY-MM-DD date required'),
  reason: z.string().optional(),
  isDraft: z.boolean().optional()
});

transferRouter.post('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = createTransferSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(422).json({
        success: false,
        error: {
          code: 'ERR_VALIDATION_FAILED',
          message: 'Invalid request payload format.',
          details: parseResult.error.errors
        }
      });
      return;
    }

    const transfer = transferService.createTransfer(req.user!, parseResult.data);
    res.status(201).json({
      success: true,
      data: transfer
    });
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
});

// 5. List Transfers (Filtered by User Role)
transferRouter.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const transfers = transferService.listTransfers(req.user!);
  res.json({
    success: true,
    data: transfers
  });
});

// 6. Get Transfer Details (Protected by OLAC)
transferRouter.get('/:id', authenticate, authorizeTransferAccess, (req: AuthenticatedRequest, res: Response) => {
  const transfer = transferService.getTransfer(req.params.id);
  res.json({
    success: true,
    data: transfer
  });
});

// 7. Current Manager Approval Action
const managerApprovalSchema = z.object({
  expectedVersion: z.number().int().optional().default(1),
  handoverRemarks: z.string().optional(),
  requisitionCode: z.string().optional()
});

transferRouter.post(
  '/:id/actions/approve-current-manager',
  authenticate,
  requireRole([UserRole.CURRENT_MANAGER, UserRole.HR_PARTNER]),
  authorizeTransferAccess,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = managerApprovalSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(422).json({ success: false, error: { code: 'ERR_VALIDATION_FAILED', message: 'Invalid payload' } });
        return;
      }
      const updated = transferService.approveCurrentManager(req.params.id, req.user!, parseResult.data);
      res.json({ success: true, data: updated });
    } catch (err: unknown) {
      handleServiceError(err, res);
    }
  }
);

// 8. Receiving Manager Approval Action
transferRouter.post(
  '/:id/actions/approve-receiving-manager',
  authenticate,
  requireRole([UserRole.RECEIVING_MANAGER, UserRole.HR_PARTNER]),
  authorizeTransferAccess,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = managerApprovalSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(422).json({ success: false, error: { code: 'ERR_VALIDATION_FAILED', message: 'Invalid payload' } });
        return;
      }
      const updated = transferService.approveReceivingManager(req.params.id, req.user!, parseResult.data);
      res.json({ success: true, data: updated });
    } catch (err: unknown) {
      handleServiceError(err, res);
    }
  }
);

// 9. HR Final Approval Action & SAGA Trigger
const hrApprovalSchema = z.object({
  expectedVersion: z.number().int().optional().default(3),
  confirmedSalaryGrade: z.string().min(1, 'Salary grade confirmation required'),
  visaCleared: z.boolean().optional(),
  hrNotes: z.string().optional()
});

transferRouter.post(
  '/:id/actions/approve-hr',
  authenticate,
  requireRole([UserRole.HR_PARTNER, UserRole.HR_OPS_ADMIN]),
  authorizeTransferAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = hrApprovalSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(422).json({ success: false, error: { code: 'ERR_VALIDATION_FAILED', message: 'Invalid payload' } });
        return;
      }
      const updated = await transferService.approveHR(req.params.id, req.user!, parseResult.data);
      res.json({ success: true, data: updated });
    } catch (err: unknown) {
      handleServiceError(err, res);
    }
  }
);

// 10. Rejection Action
const rejectSchema = z.object({
  expectedVersion: z.number().int().optional().default(1),
  reason: z.string().min(1, 'Rejection reason is required')
});

transferRouter.post(
  '/:id/actions/reject',
  authenticate,
  authorizeTransferAccess,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = rejectSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(422).json({ success: false, error: { code: 'ERR_VALIDATION_FAILED', message: 'Invalid payload' } });
        return;
      }
      const updated = transferService.rejectTransfer(req.params.id, req.user!, parseResult.data);
      res.json({ success: true, data: updated });
    } catch (err: unknown) {
      handleServiceError(err, res);
    }
  }
);

// 11. Employee Withdrawal Action
transferRouter.post(
  '/:id/actions/withdraw',
  authenticate,
  authorizeTransferAccess,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = transferService.withdrawTransfer(req.params.id, req.user!);
      res.json({ success: true, data: updated });
    } catch (err: unknown) {
      handleServiceError(err, res);
    }
  }
);

// 12. Cryptographic Audit Trail Query
transferRouter.get(
  '/:id/audit-trail',
  authenticate,
  authorizeTransferAccess,
  (req: AuthenticatedRequest, res: Response) => {
    const auditTrail = auditService.getAuditTrail(req.params.id);
    const isIntact = auditService.verifyIntegrity(req.params.id);
    res.json({
      success: true,
      data: {
        transferId: req.params.id,
        isIntegrityVerified: isIntact,
        entryCount: auditTrail.length,
        entries: auditTrail
      }
    });
  }
);

/**
 * Maps domain errors to standard HTTP status codes and error bodies.
 */
function handleServiceError(err: unknown, res: Response): void {
  if (err instanceof ConcurrencyError) {
    res.status(409).json({
      success: false,
      error: { code: 'ERR_CONCURRENT_MUTATION', message: err.message }
    });
    return;
  }

  if (err instanceof InvalidStateTransitionError) {
    res.status(422).json({
      success: false,
      error: { code: 'ERR_INVALID_STATE_TRANSITION', message: err.message }
    });
    return;
  }

  if (err instanceof Error) {
    if (err.message.startsWith('ERR_DUPLICATE_ACTIVE_TRANSFER')) {
      res.status(409).json({ success: false, error: { code: 'ERR_DUPLICATE_ACTIVE_TRANSFER', message: err.message } });
      return;
    }
    if (err.message.startsWith('ERR_NOTICE_PERIOD_VIOLATION')) {
      res.status(422).json({ success: false, error: { code: 'ERR_NOTICE_PERIOD_VIOLATION', message: err.message } });
      return;
    }
    if (err.message.startsWith('ERR_MANDATORY_REJECTION_REASON')) {
      res.status(422).json({ success: false, error: { code: 'ERR_MANDATORY_REJECTION_REASON', message: err.message } });
      return;
    }
    if (err.message.startsWith('ERR_WITHDRAWAL_WINDOW_CLOSED')) {
      res.status(403).json({ success: false, error: { code: 'ERR_WITHDRAWAL_WINDOW_CLOSED', message: err.message } });
      return;
    }
    if (err.message.startsWith('ERR_NOT_FOUND')) {
      res.status(404).json({ success: false, error: { code: 'ERR_NOT_FOUND', message: err.message } });
      return;
    }
  }

  res.status(500).json({
    success: false,
    error: { code: 'ERR_INTERNAL_SERVER', message: err instanceof Error ? err.message : 'Internal Server Error' }
  });
}
