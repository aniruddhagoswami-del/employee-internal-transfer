---
name: int-session-continuation
description: Resume context and continue engineering tasks across session restarts by reading repository persistent memory (.ai-context/status.md, specs, plans, tasks, git status).
---

# INT Session Continuation & Context Recovery

## Purpose
This skill defines the mandatory protocol for resuming work in a project repository after a session restart, context clearance, or agent handoff.

The repository, NOT the chat window, is the persistent memory of the project.

---

# Core Rule — Repository Memory Authority

- Do NOT rely on chat history, memory, or user recall as the permanent source of truth.
- Do NOT guess project state, active features, or next tasks.
- Read only the specific repository artifacts required to determine the active state.
- All file paths and references written to `.ai-context/` artifacts MUST be **repository-relative** (e.g. `.ai-context/specs/<slug>.spec.md`, `src/...`) to ensure full Git portability across developer workstations and CI/CD. Never write local OS absolute paths (`C:\Users\...`).

---

# Skill & Governance Resolution Hierarchy

When executing any engineering task or reading project governance:
1. **Priority 1 — Check Repository Local Files FIRST**: Inspect project repository root for `AGENTS.md` and `.agents/skills/<skill_name>/SKILL.md`. If present, load and follow local project skills.
2. **Priority 2 — Fallback to Global Skills SECOND**: If and ONLY if a requested skill or rule file is not present in `.agents/skills/`, fall back to reading global skills (`~/.gemini/config/skills/`).

---

# Session Recovery Protocol

Before continuing work after a new session, workstation restart, or Git pull, execute these steps sequentially:

```text
Step 0: Skill Resolution Check (Load .agents/skills/ & AGENTS.md from local repo first, global fallback second)
       ↓
Step 1: Read .ai-context/status.md & .ai-context/dashboard.html
       ↓
Step 2: Dynamic Control Plane Sync (Verify and copy any new rules/workflows from skills/int-project-setup/resources/INT-Control-Plane/.agent/ to project .agent/rules/ and .agent/workflows/)
       ↓
Step 3: Inspect Git Credentials (git config user.name, git config user.email or configured User ID)
       ↓
Step 4: Check assigned pending PR reviews for this user identity
       ↓
Step 5: [IF ASSIGNED REVIEWER] Display Non-Blocking Notification:
        "📌 Pending PR Reviews: You have N pending reviews assigned to you.
         Type /pr-gate-workflow to launch the reviewer workspace."
        (Or if user runs /pr-gate-workflow, launch Decision Prompt: Review Pending Specs vs Work on Approved Specs)
       ↓
Step 6: [IF DEVELOPER WORK] Select from Gate 1 Approved Specs ("Which approved spec would you like to start development on?")
       ↓
Step 7: Read active Spec (.ai-context/specs/<feature-slug>.spec.md), Plan (.plan.md), Tasks (.tasks.md), Test Cases (.test_cases.md)
       ↓
Step 8: Inspect Git status and current working tree diff
       ↓
Step 9: Continue execution strictly from the NEXT INCOMPLETE task (TDD RED -> GREEN)
```

---

# Task Execution Resume Checklist

1. **Verify Current State**: Confirm which task in `.ai-context/tasks/<feature-slug>.tasks.md` is currently marked `In Progress` or is the first `- [ ]` (`Not Started`) task.
2. **Verify Test Discipline**:
   - Check if tests for the task already exist under `tests/frontend/` or `tests/backend/`.
   - Run tests to verify if state is RED (failing test) or GREEN.
3. **Execute Next Step**:
   - If test does not exist or is missing: Write failing test (RED).
   - If test is RED: Write implementation code to achieve GREEN.
   - If test is GREEN: Perform Gate 2 review check and move task to `Merged` / complete.
4. **Update Status**: Update `.ai-context/status.md` daily log to reflect progress.

---

# Handling Existing & Ongoing Projects (Retrofit & Auto-Sync)

When working with an existing, legacy, or ongoing project:

1. **Automatic Control Plane Upgrade (Dynamic Sync)**:
   - During Step 2 of session continuation, the agent inspects the project's local `.agent/rules/` and `.agent/workflows/`.
   - If any workflow files (e.g. `hotfix-management.md`, `release-management.md`, `config-project-from-brd.md`, `production-incident.md`, `INT-BRD-Ingestion.md`) or rule files are missing compared to `skills/int-project-setup/resources/INT-Control-Plane/.agent/`, the agent **automatically copies the missing files** into `.agent/` without overwriting custom project code or user settings.

2. **Immediate Global Governance Application**:
   - Global rules (`GEMINI.md`) apply universally across all projects regardless of when the project was created.
   - For any old project, the agent will automatically enforce the **Client Observation & Change Management Protocol** (auto-detect Spec ID, draft Spec updates, request Gate 1 approval, run TDD RED -> GREEN) for any client feedback or design prompt.

3. **Legacy Projects Lacking `.ai-context/`**:
   - If an existing project lacks `.ai-context/`, the agent runs `int-project-setup` in **Non-Destructive Baseline Mode** to generate `.ai-context/` artifacts and templates without touching existing source code (`src/`, `tests/`).
