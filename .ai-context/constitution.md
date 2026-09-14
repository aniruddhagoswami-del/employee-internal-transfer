# Project Constitution: One-Point Employee Portal — Internal Transfer Digital Journey

## Testing Discipline
- **Mandatory Test-First (TDD) Discipline**: All feature code must follow strict Test-Driven Development (TDD RED $\rightarrow$ GREEN). Spec-derived unit and integration tests must be committed before implementing feature code.
- **100% Acceptance Criteria Test Coverage**: Every Acceptance Criterion (`AC-001` through `AC-025`) defined in `.spec.md` must map to an executable automated test case.
- **FSM State Machine Guard Testing**: All valid and invalid transitions, edge cases, terminal state immutability, and optimistic concurrency version collisions must have dedicated automated test coverage.
- **Mocking & Resilience Testing**: Downstream integration adapters (HRIS, Payroll, IT IAM, Facilities) must be tested with simulated transient errors (HTTP 503), retry backoff, and idempotency deduplication.
- **Automated Verification Harness**: All test suites must execute and pass via `npm test` before Gate 2 review clearance.

## Security Posture
- **OWASP API Security Top 10 Compliance**: Strict defense against Broken Object-Level Authorization (BOLA/IDOR), Broken Authentication, Excessive Data Exposure, and Mass Assignment.
- **Object-Level Access Control (OLAC)**: Enforced via `auth.middleware.ts`. Authenticated session identity must match the transfer initiator, current manager, receiving manager, or HR partner claim on every entity query or action. Cross-tenant or peer access is strictly blocked.
- **Cryptographic Audit Ledger**: Every lifecycle state transition, administrative intervention, and approval decision must append an immutable SHA-256 hash-chained entry to the audit log (`audit.service.ts`). Intermediate mutation tampering must be immediately detectable.
- **Zero Hardcoded Secrets**: All configuration, signing keys, and service tokens must reside in environment variables (`process.env`).

## Architectural Constraints
- **Modular Clean Architecture**: Clean separation between presentation layer (BFF), domain logic (`TransferFSMService`, `EligibilityService`, `AuditService`), orchestration (`OrchestrationService`), and persistence/adapters.
- **Microservice-Ready Domain Boundaries**: Business modules must maintain isolated data access and explicit interfaces so individual domain services can be decoupled into microservices without systemic rewrites.
- **Distributed SAGA Orchestration**: Downstream provisioning across external HRIS, Payroll, IT IAM, and Facilities must utilize the Transactional Outbox pattern with idempotency keys and asynchronous event distribution.
- **Optimistic Concurrency Control**: Entity mutations must enforce row version checking (`expectedVersion`). Stale concurrent updates must be rejected with HTTP 409 Conflict.

## Non-Functional Baselines
- **Operational SLA**: Reduce internal mobility processing time from 35 calendar days to $\le 5$ business days.
- **API Performance**: Sub-200ms $p95$ response time on REST endpoints under standard concurrent load.
- **Resilience & Fault Tolerance**: External adapter integration retries with exponential backoff up to 5 attempts (1s, 2s, 4s, 8s, 16s) before raising `MANUAL_INTERVENTION_REQUIRED` alarms.
- **Audit & Compliance**: 100% tamper-evident event log available for real-time audit inspection.

## Versioning Rules
- **Semantic Versioning**: All code and spec releases follow SemVer `vX.Y.Z`.
- **Entity State Immutability**: Transfers reaching terminal states (`COMPLETED`, `REJECTED`, `WITHDRAWN`) are immutable and strictly reject further lifecycle mutations.
- **Spec Immutability Post-Gate 1**: Approved specs may only be altered via formal Gate-reviewed Change Requests (`CR-<YYYYMMDD>-<slug>.md`).
