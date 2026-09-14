import { Request, Response, NextFunction } from 'express';
import { transferService } from '../services/transfer.service';
import { UserRole, UserSession } from '../types/transfer.types';

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

/**
 * Authentication Middleware: Resolves user session from Authorization Bearer token.
 */
export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: {
        code: 'ERR_UNAUTHENTICATED',
        message: 'Missing or invalid Authorization Bearer header.'
      }
    });
    return;
  }

  const user = transferService.getUserByToken(authHeader);
  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'ERR_UNAUTHENTICATED',
        message: 'Invalid session token or user not found.'
      }
    });
    return;
  }

  req.user = user;
  next();
};

/**
 * RBAC Middleware: Checks if authenticated user has one of the allowed roles.
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'ERR_UNAUTHENTICATED', message: 'Authentication required.' }
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ERR_FORBIDDEN_ROLE',
          message: `Role [${req.user.role}] is not authorized for this operation. Required: [${allowedRoles.join(', ')}].`
        }
      });
      return;
    }

    next();
  };
};

/**
 * OLAC Middleware: Enforces Object-Level Access Control (BOLA/IDOR protection).
 * Only the initiator, relevant manager, or HR partner can access the transfer entity.
 */
export const authorizeTransferAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const transferId = req.params.id;
  const user = req.user;

  if (!user) {
    res.status(401).json({ success: false, error: { code: 'ERR_UNAUTHENTICATED', message: 'Authentication required.' } });
    return;
  }

  const transfer = transferService.getTransfer(transferId);
  if (!transfer) {
    res.status(404).json({
      success: false,
      error: { code: 'ERR_NOT_FOUND', message: `Transfer [${transferId}] not found.` }
    });
    return;
  }

  // HR partners have global access
  if (user.role === UserRole.HR_PARTNER || user.role === UserRole.HR_OPS_ADMIN) {
    next();
    return;
  }

  // Check if user is initiator
  if (transfer.employeeId === user.userId) {
    next();
    return;
  }

  // Check if user is current manager
  if (transfer.currentManagerId === user.userId) {
    next();
    return;
  }

  // Check if user is receiving manager
  if (user.role === UserRole.RECEIVING_MANAGER && (transfer.pendingActorId === user.userId || transfer.status === 'PENDING_RECEIVING_MGR_APPROVAL')) {
    next();
    return;
  }

  // BOLA / IDOR Violation Block
  res.status(403).json({
    success: false,
    error: {
      code: 'ERR_FORBIDDEN_OBJECT_ACCESS',
      message: 'Access denied: You do not have authorization to view or act upon this employee transfer record.'
    }
  });
};
