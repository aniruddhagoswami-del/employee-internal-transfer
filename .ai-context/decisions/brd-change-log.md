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
- **Gate 0 Status:** Pending Review
- **Assigned Reviewers:** Sarah Sterling (`sarah.sterling@intglobal.com`), David Vance (`david.vance@intglobal.com`), Supratim Jetty (`supratim.jetty@intglobal.com`)
- **Approval Date:** Pending
- **Approved By:** Pending
- **Approval Notes:** Pending formal Gate 0 BRD PR review.
