# Spec: Transfer Cryptographic Audit, Security Guards & Live Portal

## Spec ID
`transfer-audit-security-portal`

## Status
Released (v1.0.0)

## Roles & Assignments
- **Developer:** Aniruddha Goswami (`aniruddha.goswami@intglobal.com`)
- **Gate 1 Reviewer(s):** Supratim Jetty (`supratim.jetty@intglobal.com`)
- **Gate 2 Reviewer(s):** Supratim Jetty (`supratim.jetty@intglobal.com`)


## Linked BRD
- Baseline: `.ai-context/BRD.md`
- Requirements: `BRD-FR-010`, `BRD-FR-012`
- Business Rules: `BR-014`
- Non-Functional Requirements: `BRD-NFR-001`, `BRD-NFR-003`, `BRD-NFR-004`, `BRD-NFR-006`

## Gate Approvals & History
| Gate | Approver Name | Approver Email/ID | Date/Time | Outcome | Approval Comment / Summary |
| :--- | :--- | :--- | :--- | :---: | :--- |
| Gate 1 (Spec Review) | Supratim Jetty | `supratim.jetty@intglobal.com` | 2026-09-14 14:45:00 | **Approved** | "OLAC / BOLA defense architecture, SHA-256 ledger integrity, and UI specifications approved." |
| Gate 2 (Code Review) | Supratim Jetty | `supratim.jetty@intglobal.com` | 2026-09-14 17:45:00 | **Approved** | "Security and audit tests passed 100%; tamper-evident hash chaining validated." |

---

## Intent
Provide cross-cutting enterprise security, cryptographic audit integrity, and interactive user experience for the internal transfer journey. Enforce Zero-Trust Object-Level Access Control (OLAC / BOLA defense) with strict IDOR protection, maintain an append-only tamper-evident SHA-256 hash-chain ledger over every lifecycle mutation, guarantee optimistic concurrency locking (`expectedVersion`), and render an accessible, real-time 6-stage visual timeline stepper UI.

---

## Context
- **Parent Spec:** `.ai-context/specs/employee-internal-transfer.spec.md`
- **Architecture Reference:** `.ai-context/architecture.md §2.1 (APILayer), §2.2 (AuditService), ADR-002, ADR-003`
- **Implementation Modules:**
  - Audit Ledger: `app/src/services/audit.service.ts`
  - Access Control: `app/src/middleware/auth.middleware.ts`
  - Presentation: `app/public/index.html`
- **Test Suite:** `app/tests/unit/audit.test.ts`, `app/tests/integration/transfer-api.test.ts` (Security Suite)

---

## Cryptographic Hash-Chain Ledger Formula

Every audit entry $E_k$ links to predecessor $E_{k-1}$:

$$\text{Hash}_k = \text{SHA-256}\Big(\text{EntryID}_k \parallel \text{Timestamp}_k \parallel \text{Actor}_k \parallel \text{Action}_k \parallel \text{TransferID}_k \parallel \text{Hash}_{k-1}\Big)$$

- **Genesis Hash ($E_0$):** `0000000000000000000000000000000000000000000000000000000000000000`
- **Tamper Detection:** Any retroactive modification to intermediate entries breaks the hash chain verification.

---

## API Contracts

### `AUD.API01` — `GET /api/v1/transfers/:id`
Retrieves transfer details subject to Object-Level Access Control (OLAC).

**Authorization Guard:**
- Allowed: Initiating Employee (` Jane Doe `), Current Manager (` Alex Wong `), Receiving Manager (` Sarah Jenkins `), or any HR Partner role.
- Rejected: Unrelated employees (`EMP-9999`) $\rightarrow$ HTTP 403 Forbidden.

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "TRF-1001",
    "employeeId": "EMP-1042",
    "state": "PENDING_RECEIVING_MGR_APPROVAL",
    "targetDepartment": "Product Operations",
    "targetLocation": "New York",
    "version": 2
  }
}
```

### `AUD.API02` — `GET /api/v1/transfers/:id/audit`
Retrieves the cryptographic audit ledger for a transfer record.

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "transferId": "TRF-1001",
    "entries": [
      {
        "id": "0191f2a0-0001-7000-8000-000000000001",
        "timestamp": "2026-09-01T10:00:00.000Z",
        "actorId": "EMP-1042",
        "action": "TRANSFER_INITIATED",
        "previousHash": "0000000000000000000000000000000000000000000000000000000000000000",
        "currentHash": "a1b2c3d4e5f6..."
      }
    ],
    "isChainValid": true
  }
}
```

---

## Acceptance Criteria

### `AC-020`: Real-time Multi-Stakeholder Progress Tracker
```gherkin
Feature: Visual Status Tracker
  Scenario: Employee views in-flight transfer request
    Given request "TRF-1001" is in "PENDING_RECEIVING_MGR_APPROVAL"
    When employee "EMP-1042" opens the One-Point Portal tracker
    Then the UI renders a visual progress stepper:
      | Step Name             | Visual State | Subtitle / Responsible Party |
      | 1. Initiation         | Completed (✓)| Submitted on 2026-09-01      |
      | 2. Current Manager    | Completed (✓)| Endorsed by Alex Wong        |
      | 3. Receiving Manager  | In-Progress ▶| Pending with Sarah Jenkins   |
      | 4. HR Validation      | Upcoming (○) | Assigned to HR Operations    |
      | 5. Downstream Sync    | Upcoming (○) | Automated (IT, Pay, Fac)     |
      | 6. Final Handover     | Upcoming (○) | Ready on Effective Date      |
```

### `AC-023`: Object-Level Access Control (BOLA / IDOR Prevention)
```gherkin
Feature: Security Access Control
  Scenario: Unauthorized employee attempts to view another peer's transfer details
    Given employee "EMP-9999" (unrelated peer) is authenticated
    When they attempt to access `GET /api/v1/transfers/TRF-1001`
    Then the API rejects the request with HTTP 403 Forbidden
    And records a security threat alert in the SOC audit log.
```

### `AC-024`: Tamper-Evident Cryptographic Audit Trail
```gherkin
Feature: Audit Ledger Hash Integrity
  Scenario: Any state transition occurs on a transfer request
    Given transfer request "TRF-1001" undergoes transition from state $S_n$ to $S_{n+1}$
    When the audit log entry $E_k$ is written
    Then $E_k$ contains:
      | Property      | Requirement                                                |
      | Entry ID      | Monotonically incrementing UUIDv7                          |
      | Timestamp     | ISO 8601 UTC timestamp                                     |
      | Actor ID      | Authenticated user ID or SYSTEM                            |
      | Action        | Transition action code (e.g. "CURRENT_MGR_APPROVED")       |
      | Previous Hash | SHA-256 hash of entry $E_{k-1}$                           |
      | Current Hash  | SHA-256(EntryID + Timestamp + Actor + Action + PrevHash)   |
    And any tampering with intermediate database records causes hash-chain verification to fail.
```

### `AC-025`: Optimistic Concurrency Race Condition Guard
```gherkin
Feature: Concurrent Action Prevention
  Scenario: Simultaneous manager approval and employee withdrawal
    Given request "TRF-1001" is at version 2 in "PENDING_CURRENT_MGR_APPROVAL"
    When Manager submits approval with expected version 2
    And Employee simultaneously submits withdrawal with expected version 2
    Then one request commits successfully advancing version to 3
    And the second request is rejected with HTTP 409 Conflict ("Record has been modified by another transaction. Please refresh.").
```

---

## Unit & Integration Test Cases

| Test ID | Maps to AC | Scenario | Expected Outcome | Location |
| :--- | :--- | :--- | :--- | :--- |
| `UT-AUD-001` | `AC-024` | Genesis hash initialization on first entry | PrevHash is 64 zeros, currentHash valid SHA-256 | `tests/unit/audit.test.ts` |
| `UT-AUD-002` | `AC-024` | Chaining successive log entries | Entry $k$ prevHash matches entry $k-1$ currentHash | `tests/unit/audit.test.ts` |
| `UT-AUD-003` | `AC-024` | Intermediate payload tampering | Chain integrity validation fails (`false`) | `tests/unit/audit.test.ts` |
| `UT-CON-001` | `AC-025` | Concurrency check when version mismatches | Throws `ConcurrencyError` | `tests/unit/state-machine.test.ts` |
| `IT-SEC-001` | `AC-023` | Unrelated peer views transfer details | HTTP 403 Forbidden | `tests/integration/transfer-api.test.ts` |
| `IT-SEC-002` | `AC-023` | Employee attempts HR sign-off action | HTTP 403 Forbidden | `tests/integration/transfer-api.test.ts` |
| `UI-STP-001` | `AC-020` | Visual stepper DOM verification | 6 timeline stages with active highlight | `app/public/index.html` |

---

## Explicitly Out of Scope
- Integration with external Hardware Security Modules (HSM).
- Hardware biometric keycard enrollment.

## Non-Functional Constraints (from constitution.md)
- SHA-256 computation latency $< 2$ms per audit event.
- Zero PII in audit payloads (identities referenced by opaque Employee IDs only).
