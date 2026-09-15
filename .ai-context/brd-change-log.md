# BRD Change Log

This file tracks all modifications, version changes, and amendments made to `.ai-context/BRD.md`. It follows a strict **append-only** protocol.

---

## Version 1.0.0

- **Status:** Pending Gate 0 Review
- **Change Date:** 2026-09-14
- **Author / Lead SDD Engineer:** Aniruddha Goswami (`aniruddha.goswami@intglobal.com`)
- **Source Document:** `docs/01_requirement_discovery_analysis.md`

### Change Summary
Initial formal BRD ingestion baselining the Employee Internal Transfer Digital Journey into `.ai-context/BRD.md`.

### Added Requirements
- **Functional Requirements:** `BRD-FR-001` through `BRD-FR-012`
  - `BRD-FR-001`: Profile & Role Auto-Population
  - `BRD-FR-002`: Pre-Flight Eligibility Engine
  - `BRD-FR-003`: Drafting & Private Initiation
  - `BRD-FR-004`: Single Active Request Guard
  - `BRD-FR-005`: Current Manager Endorsement
  - `BRD-FR-006`: Receiving Manager Acceptance
  - `BRD-FR-007`: HR Policy & Compliance Validation
  - `BRD-FR-008`: Voluntary Withdrawal
  - `BRD-FR-009`: Mandatory Rejection Rationale
  - `BRD-FR-010`: Live Journey Stepper
  - `BRD-FR-011`: Distributed SAGA Orchestration
  - `BRD-FR-012`: Cryptographic Audit Trail
- **Business Rules:** `BR-001` through `BR-015`
- **Non-Functional Requirements:** `BRD-NFR-001` through `BRD-NFR-006`

### Modified Requirements
- None (Initial Ingestion Baseline)

### Removed Requirements
- None (Initial Ingestion Baseline)

### Unchanged Requirements
- None (Initial Ingestion Baseline)

### Impact Analysis
- **Affected Business Domains:** Internal Talent Mobility, Line Management Governance, Human Resources & Compensation, Enterprise IAM, Workplace & Real Estate.
- **Affected Modules:** `TransferFSMService`, `EligibilityService`, `AuditService`, `OrchestrationService`, `AuthMiddleware`, `TransferRoutes`, `TransferPortalUI`.
- **API Impact:** Baseline REST API surface under `/api/v1/transfers` (meta, preflight, initiation, approvals, withdrawal, audit).
- **Database Impact:** In-memory transactional store with versioning (`expectedVersion`), outbox queue, and append-only hash chain.
- **Frontend Impact:** Single Page Application with multi-persona test harness, pre-flight wizard, and live 6-stage visual timeline stepper.
- **Backend Impact:** Clean Architecture Node.js / Express services with Zod schema validation and RBAC/OLAC middleware.
- **Test Impact:** Jest unit, integration, FSM guard, resilience, and security test suites (30 tests across 5 suites).
- **Existing Implementation Impact:** Aligns directly with existing implementation in `app/`.
- **Architecture Impact:** Modular Monolith + Microservice Ready architecture with event-driven SAGA outbox orchestration.

### Governance & Review Status
- **Gate 0 Status:** Approved
- **Assigned Reviewers:** Supratim Jetty (`supratim.jetty@intglobal.com`)

- **Approval Date:** 2026-09-15 12:58:00
- **Approved By:** Supratim Jetty (`supratim.jetty@intglobal.com`)
- **Approval Notes:** Gate 0 BRD PR review approved. Requirement baseline officially signed off.


### Full Requirement Traceability Chain
| BRD Requirement ID | Business Domain | Bounded Module | Feature Spec Section / AC | Task ID | Test Suite & Test Case | Implementation Target File |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BRD-FR-001` (Profile Auto-Pop) | IAM & Employee Profile | `TransferRoutes`, `TransferPortalUI` | `SPEC-EIT-001 §3.A` (`AC-001`) | `TASK-011`, `TASK-014` | `TC-POS-001` (`transfer-api.test.ts`) | `app/src/routes/transfer.routes.ts` |
| `BRD-FR-002`, `BR-001`–`BR-004` (Pre-Flight Engine) | HR Policy & Eligibility | `EligibilityService` | `SPEC-EIT-001 §3.A` (`AC-001`, `AC-002`, `AC-004`) | `TASK-004`, `TASK-011` | `TC-POS-001`–`002`, `TC-NEG-001`–`004` (`eligibility.test.ts`) | `app/src/services/eligibility.service.ts` |
| `BRD-FR-003` (Drafting & Initiation) | Talent Mobility | `TransferFSMService`, `TransferService` | `SPEC-EIT-001 §2`, `§3.A` (`AC-001`, `AC-005`) | `TASK-002`, `TASK-011` | `TC-STM-001`, `TC-POS-003` (`state-machine.test.ts`) | `app/src/services/transfer.service.ts` |
| `BRD-FR-004`, `BR-006` (Single Active Guard) | Talent Mobility | `TransferService` | `SPEC-EIT-001 §3.A` (`AC-003`) | `TASK-011` | `TC-NEG-002` (`transfer-api.test.ts`) | `app/src/services/transfer.service.ts` |
| `BRD-FR-005` (Current Mgr Endorsement) | Line Management | `TransferFSMService`, `TransferService` | `SPEC-EIT-001 §3.B` (`AC-007`, `AC-008`) | `TASK-002`, `TASK-012` | `TC-POS-005`, `TC-NEG-005` (`state-machine.test.ts`) | `app/src/services/state-machine.service.ts` |
| `BRD-FR-006` (Receiving Mgr Acceptance) | Line Management | `TransferFSMService`, `TransferService` | `SPEC-EIT-001 §3.C` (`AC-009`, `AC-010`) | `TASK-002`, `TASK-012` | `TC-POS-007`, `TC-POS-008` (`state-machine.test.ts`) | `app/src/services/state-machine.service.ts` |
| `BRD-FR-007` (HR Policy Validation) | HR Operations | `TransferFSMService`, `TransferService` | `SPEC-EIT-001 §3.D` (`AC-011`, `AC-012`) | `TASK-002`, `TASK-012` | `TC-POS-009`, `TC-POS-010` (`state-machine.test.ts`) | `app/src/services/state-machine.service.ts` |
| `BRD-FR-008`, `BR-008` (Voluntary Withdrawal) | Employee Self-Service | `TransferFSMService`, `TransferService` | `SPEC-EIT-001 §3.F` (`AC-021`, `AC-022`) | `TASK-002`, `TASK-012` | `TC-POS-017`, `TC-NEG-006` (`transfer-api.test.ts`) | `app/src/services/transfer.service.ts` |
| `BRD-FR-009`, `BR-009` (Rejection Rationale) | Line Management | `TransferRoutes`, `TransferService` | `SPEC-EIT-001 §3.B` (`AC-008`) | `TASK-012` | `TC-NEG-005`, `TC-POS-006` (`transfer-api.test.ts`) | `app/src/services/transfer.service.ts` |
| `BRD-FR-010` (Live Journey Stepper) | Client Experience | `TransferPortalUI` | `SPEC-EIT-001 §3.F` (`AC-020`) | `TASK-014`, `TASK-017` | `TC-POS-016` (`index.html`) | `app/public/index.html` |
| `BRD-FR-011`, `BR-011`–`BR-014` (SAGA Orchestration) | Enterprise Integrations | `OrchestrationService` | `SPEC-EIT-001 §3.E` (`AC-013`–`AC-019`) | `TASK-005`–`TASK-009` | `TC-POS-011`–`015`, `TC-INT-001`–`002` (`saga-resilience.test.ts`) | `app/src/services/orchestrator.service.ts` |
| `BRD-FR-012`, `BR-015` (Cryptographic Audit) | Security & Audit | `AuditService` | `SPEC-EIT-001 §3.G` (`AC-024`) | `TASK-003` | `TC-SEC-003`, `TC-SEC-004` (`audit.test.ts`) | `app/src/services/audit.service.ts` |
| `BRD-NFR-004` (BOLA / RBAC Defense) | Security | `AuthMiddleware` | `SPEC-EIT-001 §3.G` (`AC-023`) | `TASK-010` | `TC-SEC-001`, `TC-SEC-002` (`transfer-api.test.ts`) | `app/src/middleware/auth.middleware.ts` |
| `BRD-NFR-005` (Optimistic Concurrency) | Data Consistency | `TransferFSMService` | `SPEC-EIT-001 §3.G` (`AC-025`) | `TASK-002` | `TC-STM-001` (`state-machine.test.ts`) | `app/src/services/state-machine.service.ts` |

