# INT AI-First Engineering Governance & Policy (`AGENTS.md`)

This repository is governed by the **INT AI-First Specification-Driven Development/Delivery (SDD)** framework. This document establishes the authoritative engineering policies, operational hierarchy, governance rules, and runtime instructions binding upon all developers, AI agents, and automated tools working within this workspace.

---

## 1. INT Authority Hierarchy

When resolving requirements, design decisions, or implementation choices, all participants MUST strictly adhere to the following descending hierarchy of authority:

1. **Project Constitution** ([`.ai-context/constitution.md`](.ai-context/constitution.md)): Absolute project law. Defines immutable engineering constraints, non-negotiable security postures (OWASP Top 10, STRIDE, OLAC), testing standards, and compliance baselines.
2. **Architecture Decision Records (ADRs)** ([`.ai-context/decisions/`](.ai-context/decisions/)): Binding architectural and infrastructural design choices approved by Tech Leads/Architects.
3. **Approved Feature Specifications** ([`.ai-context/specs/*.spec.md`](.ai-context/specs/)): Single source of functional truth once approved at Gate 1. Acceptance Criteria (ACs) are binding contracts.
4. **Approved Technical Plans** ([`.ai-context/plans/*.plan.md`](.ai-context/plans/)): Component design, data schemas, and sequencing derived from approved specs.
5. **Approved Task Breakdowns** ([`.ai-context/tasks/*.tasks.md`](.ai-context/tasks/)): Granular Work Breakdown Structure (WBS) with Definition of Done (DoD).
6. **Spec-Derived Test Suites** ([`tests/`](tests/)): Executable verification harness written test-first (TDD RED).
7. **Implementation Source Code** ([`src/`](src/) / [`app/src/`](app/src/)): Fulfills approved specifications and makes tests pass (TDD GREEN).

---

## 2. Specification-Driven Development (SDD) Lifecycle

No production code may be committed without traversing the strict, gate-guarded INT SDD lifecycle:

$$\text{Business Requirement (BRD)} \longrightarrow \text{Gate 0} \longrightarrow \text{Feature Spec (.spec.md)} \longrightarrow \text{Gate 1} \longrightarrow \text{Plan \& Tasks} \longrightarrow \text{Test-First (RED)} \longrightarrow \text{Code (GREEN)} \longrightarrow \text{Gate 2} \longrightarrow \text{Release}$$

### Lifecycle Stages & Gate Definitions:
- **Gate 0 (BRD Approval)**: Formal review of requirements in `.ai-context/BRD.md`. Feature spec drafting is **STRICTLY PROHIBITED** until Gate 0 is granted `Approved` status.
- **Spec Drafting**: Formal `.spec.md` creation with testable Gherkin Acceptance Criteria, FSM state diagrams, and API contracts.
- **Gate 1 (Spec Peer Review)**: Dedicated review by assigned Project Manager(s) / Tech Lead(s). Evaluates completeness, functional scope, edge cases, and testability. Implementation and planning are strictly blocked until Gate 1 is `Approved`.
- **Technical Plan & Tasks**: Architectural design, schema definitions, ADRs, and granular task decomposition mapped to ACs.
- **Test-First Implementation (TDD)**: Automated test suites written first (`tests/`) proving initial failure (RED), followed by modular implementation (`src/`) making tests pass (GREEN).
- **Gate 2 (Code Review & Release Clearance)**: Formal verification of implementation against approved spec, 100% test pass rate, code quality, security posture, and zero regression.
- **Release Management**: Version tagging, release notes generation, and deployment sync.

---

## 3. Skill & Governance Resolution Hierarchy

To ensure vendor-agnostic portability across all AI assistants (Gemini, Claude, Cursor, Windsurf, Copilot):

1. **Priority 1 (Local Repository First)**: Always inspect the local workspace root for `AGENTS.md` and `.agents/skills/<skill_name>/SKILL.md`. If present, load and execute local project skills first.
2. **Priority 2 (Global Fallback Second)**: If and only if a requested skill or rule file is not present locally in the project repository root, fall back to global configurations (`~/.gemini/config/skills/`).

---

## 4. PR Gate Review Governance & Security Rules

- **Git Email Identity Matching**: Review and approval operations at PR Gates are restricted strictly to authorized reviewers configured in `.ai-context/project_context.md`. The authenticated Git email (`git config user.email`) MUST match the reviewer roster.
- **Separation of Roles**: Developers cannot approve their own Gate reviews. Pulling or cloning code does not grant approval authority.
- **Immutability of Audit Trails**: All PR reviews, status changes, and prompt executions must be permanently recorded across the 5 synchronized artifacts:
  1. Review record file (`.ai-context/pr_reviews/`)
  2. Review Dashboard HTML (`.ai-context/templates/gate-review-dashboard-design.html`)
  3. Feature Spec (`.ai-context/specs/*.spec.md`)
  4. Status Board (`.ai-context/status.md`)
  5. Chronological Prompt History (`.ai-context/prompt_history.md`)

---

## 5. Architectural & Repository Invariants

- **Flat File Structure Rule**: All artifacts inside `.ai-context/` subdirectories (`specs/`, `plans/`, `tasks/`, `test_cases/`, `decisions/`, `incidents/`, `hotfixes/`, `releases/`) MUST sit directly as flat files at the root of their folder (e.g., `.ai-context/specs/<feature-slug>.spec.md`). Never create feature subdirectories.
- **Portable Repository-Relative Paths**: Absolute paths (e.g. `C:\Users\...` or `/home/...`) are strictly prohibited in documentation and code cross-links. All file paths must be relative to the repository root.
- **Strict Append-Only Mutation**: `.ai-context/prompt_history.md` and `.ai-context/brd-change-log.md` must never be overwritten or truncated. New entries must be appended to the bottom.
- **No AI Attribution Artifacts**: Never write default AI-generated commit messages or inject comments stating code was produced by an AI.
