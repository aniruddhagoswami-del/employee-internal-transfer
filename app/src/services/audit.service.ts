import * as crypto from 'crypto';
import { AuditLogEntry, TransferStatus, UserRole } from '../types/transfer.types';

export class AuditService {
  private auditLedger: Map<string, AuditLogEntry[]> = new Map();
  private readonly GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Appends an immutable, cryptographic hash-chained audit entry to the ledger.
   */
  public logEvent(params: {
    transferId: string;
    actorId: string;
    actorName: string;
    actorRole: UserRole | string;
    action: string;
    previousState?: TransferStatus;
    newState: TransferStatus;
    remarks?: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry {
    const history = this.auditLedger.get(params.transferId) || [];
    const sequenceNum = history.length + 1;
    const prevHash = history.length > 0 ? history[history.length - 1].currentHash : this.GENESIS_HASH;
    const timestamp = new Date().toISOString();
    const id = `AUD-${params.transferId}-${sequenceNum}`;

    const currentHash = this.computeHash({
      id,
      transferId: params.transferId,
      sequenceNum,
      timestamp,
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      previousState: params.previousState,
      newState: params.newState,
      remarks: params.remarks,
      prevHash
    });

    const entry: AuditLogEntry = {
      id,
      transferId: params.transferId,
      sequenceNum,
      timestamp,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: params.action,
      previousState: params.previousState,
      newState: params.newState,
      remarks: params.remarks,
      metadata: params.metadata,
      prevHash,
      currentHash
    };

    history.push(entry);
    this.auditLedger.set(params.transferId, history);
    return entry;
  }

  /**
   * Retrieves the full cryptographic audit history for a transfer request.
   */
  public getAuditTrail(transferId: string): AuditLogEntry[] {
    return this.auditLedger.get(transferId) || [];
  }

  /**
   * Verifies the cryptographic chain integrity for a transfer request.
   * Returns true if all SHA-256 links and data payloads are intact, false if tampered.
   */
  public verifyIntegrity(transferId: string): boolean {
    const history = this.auditLedger.get(transferId);
    if (!history || history.length === 0) return true;

    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const expectedPrevHash = i === 0 ? this.GENESIS_HASH : history[i - 1].currentHash;

      if (entry.prevHash !== expectedPrevHash) {
        return false;
      }

      const recomputedHash = this.computeHash({
        id: entry.id,
        transferId: entry.transferId,
        sequenceNum: entry.sequenceNum,
        timestamp: entry.timestamp,
        actorId: entry.actorId,
        actorRole: entry.actorRole,
        action: entry.action,
        previousState: entry.previousState,
        newState: entry.newState,
        remarks: entry.remarks,
        prevHash: entry.prevHash
      });

      if (entry.currentHash !== recomputedHash) {
        return false;
      }
    }

    return true;
  }

  private computeHash(payload: Record<string, unknown>): string {
    const raw = JSON.stringify(payload);
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  public clear(): void {
    this.auditLedger.clear();
  }
}

export const auditService = new AuditService();
