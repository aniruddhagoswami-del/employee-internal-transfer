# Project Context: One-Point Employee Portal — Internal Transfer Digital Journey

## Project Identification
- **Project Name:** One-Point Employee Portal — Internal Transfer Digital Journey
- **Feature Slug:** `employee-internal-transfer`
- **Project Type:** Full Stack
- **Methodology:** INT AI-First Specification-Driven Development (SDD)
- **Version:** v1.0.0
- **Status:** Initialized & Baselined

---

## Confirmed Technology & Architecture Baseline

| Category | Specification | Notes / Details |
| :--- | :--- | :--- |
| **Architecture Style** | **Modular Monolith + Microservice Ready** | BFF Gateway + Domain Core + SAGA Orchestrator + Isolated Adapters |
| **Frontend Stack** | **Vanilla HTML5 / Modern CSS3 (Glassmorphism Dark Mode) + JavaScript SPA** | Live 6-stage visual timeline stepper, role switcher, audit viewer |
| **Backend Stack** | **Node.js (TypeScript) + Express** | Clean Architecture with Zod schema validation & typed services |
| **Data Persistence** | **In-Memory Transactional Store + Outbox Queue + SHA-256 Ledger** | Zero external DB setup required for local dev and automated tests |
| **Authentication & Security** | **JWT Claims Middleware + RBAC + Object-Level Access Control (OLAC / BOLA defense) + SHA-256 Chain** | Strict IDOR protection and immutable audit trail |
| **Deployment Target** | **Docker Container / Node.js Runtime** | Portable containerized execution |

---

## PR Gate Reviewer Assignments & Rosters

Under INT PR Gate Governance rules, reviewer authorization is enforced strictly by **Git email matching** (`git config user.email`).

### Gate 1 Reviewers (Spec Peer Review)
- **Sarah Sterling** (`sarah.sterling@intglobal.com`) — Lead Product Manager
- **David Vance** (`david.vance@intglobal.com`) — Principal Enterprise Architect
- **Elena Rostova** (`elena.rostova@intglobal.com`) — QA / Test Automation Lead
- **Marcus Thorne** (`marcus.thorne@intglobal.com`) — Application Security Lead
- **Supratim Jetty** (`supratim.jetty@intglobal.com`) — Assigned Reviewer / Architect

### Gate 2 Reviewers (Code Review & Release Clearance)
- **Supratim Jetty** (`supratim.jetty@intglobal.com`) — Assigned Reviewer / Architect
- **Marcus Thorne** (`marcus.thorne@intglobal.com`) — Application Security Lead
- **Elena Rostova** (`elena.rostova@intglobal.com`) — Lead SDET

---

## Workspace Directory Mapping & Code Locations
- **INT Control Plane:** `.agent/` (Rules and Workflows)
- **Vendor-Agnostic Governance:** `AGENTS.md` and `.agents/skills/`
- **Project AI Context & Artifacts:** `.ai-context/`
- **Assessment Deliverables:** `docs/` (`01_requirement_discovery_analysis.md` through `10_gate_2_evidence_and_traceability.md`)
- **Interactive Application & Automated Tests:** `app/` (TypeScript / Express / Jest test harness)
- **Root Execution Layer Baseline:** `src/` and `tests/`
