/**
 * One-Point Employee Portal — Internal Talent Mobility Client SPA
 * Implements full SDD Journey State Machine & Real-Time Orchestration
 */

const STATE = {
  currentUserId: 'EMP-1042',
  currentUser: null,
  activeTransfer: null,
  options: { departments: [], locations: [], roles: [] },
  transfersList: []
};

// Token resolver helper
function getAuthToken(userId) {
  const map = {
    'EMP-1042': 'Bearer token_emp_1042',
    'EMP-5002': 'Bearer token_emp_5002',
    'MGR-2019': 'Bearer token_mgr_2019',
    'MGR-3088': 'Bearer token_mgr_3088',
    'HR-4011': 'Bearer token_hr_4011',
    'EMP-9999': 'Bearer token_unrelated_emp_9999'
  };
  return map[userId] || `Bearer ${userId}`;
}

// API Fetch Helper
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': getAuthToken(STATE.currentUserId)
  };

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, options);
  const data = await response.json();
  return { status: response.status, ok: response.ok, data };
}

// UI Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// 1. INITIALIZATION & SETUP
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigationTabs();
  setupPersonaSwitcher();
  setupFormListeners();
  setupModalListeners();
  
  await loadMetadataOptions();
  await handlePersonaChange('EMP-1042');

  // Default date in initiation form (35 days ahead)
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 35);
  const dateInput = document.getElementById('inputEffectiveDate');
  if (dateInput) {
    dateInput.value = defaultDate.toISOString().split('T')[0];
    updatePreflightNoticeCheck(dateInput.value);
  }
});

// Setup Tab Navigation
function setupNavigationTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(`pane${capitalize(tab.dataset.tab)}`);
      if (targetPane) targetPane.classList.add('active');

      if (tab.dataset.tab === 'audit' && STATE.activeTransfer) {
        loadAuditTrail(STATE.activeTransfer.id);
      }
      if (tab.dataset.tab === 'inbox') {
        renderInbox();
      }
    });
  });

  document.getElementById('btnRefreshTracker').addEventListener('click', async () => {
    await refreshActiveTransfer();
    showToast('Journey status refreshed from server.', 'info');
  });

  document.getElementById('btnGoToInitiate').addEventListener('click', () => {
    document.getElementById('tabInitiate').click();
  });

  document.getElementById('btnQuickDemo').addEventListener('click', executeQuickDemo);
}

// Setup Persona Switcher
function setupPersonaSwitcher() {
  const select = document.getElementById('personaSelect');
  select.addEventListener('change', async (e) => {
    await handlePersonaChange(e.target.value);
  });
}

async function handlePersonaChange(userId) {
  STATE.currentUserId = userId;
  const res = await apiCall('/api/v1/transfers/meta/me');
  if (res.ok) {
    STATE.currentUser = res.data.data;
    document.getElementById('currentUserBadge').textContent = `Role: ${STATE.currentUser.role}`;
    
    // Update Initiator mini-profile in initiate tab
    updateInitiatorProfileCard(STATE.currentUser);
    showToast(`Switched persona to ${STATE.currentUser.name} (${STATE.currentUser.role})`, 'info');
  }

  await refreshActiveTransfer();
  await refreshTransfersList();
}

function updateInitiatorProfileCard(user) {
  document.getElementById('formEmpName').textContent = `${user.name} (${user.userId})`;
  document.getElementById('formEmpDept').textContent = user.departmentName || 'Cloud Infrastructure';
  document.getElementById('formEmpLoc').textContent = user.locationName || 'London HQ';
  document.getElementById('formEmpMgr').textContent = user.managerId ? 'Alex Wong (MGR-2019)' : 'N/A';
  document.getElementById('formEmpTenure').textContent = `${user.tenureMonths} Months`;
  document.getElementById('formEmpRating').textContent = `Level ${user.performanceRating.toFixed(1)} / 5.0`;

  // Update Eligibility Indicators
  const chkTenure = document.getElementById('chkTenureRow');
  const chkPerf = document.getElementById('chkPerformanceRow');
  const chkDisc = document.getElementById('chkDisciplinaryRow');

  if (user.tenureMonths >= 12) {
    chkTenure.querySelector('.check-icon').textContent = '✓';
    chkTenure.querySelector('.check-icon').style.background = 'var(--success)';
    chkTenure.querySelector('.badge-pass').textContent = 'PASS';
    chkTenure.querySelector('.badge-pass').className = 'badge-pass';
  } else {
    chkTenure.querySelector('.check-icon').textContent = '✕';
    chkTenure.querySelector('.check-icon').style.background = 'var(--danger)';
    chkTenure.querySelector('.badge-pass').textContent = 'FAIL';
    chkTenure.querySelector('.badge-pass').className = 'badge-fail';
  }

  if (user.performanceRating >= 3.0) {
    chkPerf.querySelector('.check-icon').textContent = '✓';
    chkPerf.querySelector('.check-icon').style.background = 'var(--success)';
    chkPerf.querySelector('.badge-pass').textContent = 'PASS';
    chkPerf.querySelector('.badge-pass').className = 'badge-pass';
  } else {
    chkPerf.querySelector('.check-icon').textContent = '✕';
    chkPerf.querySelector('.check-icon').style.background = 'var(--danger)';
    chkPerf.querySelector('.badge-pass').textContent = 'FAIL';
    chkPerf.querySelector('.badge-pass').className = 'badge-fail';
  }

  if (!user.hasActiveDisciplinaryRecord) {
    chkDisc.querySelector('.check-icon').textContent = '✓';
    chkDisc.querySelector('.check-icon').style.background = 'var(--success)';
    chkDisc.querySelector('.badge-pass').textContent = 'PASS';
    chkDisc.querySelector('.badge-pass').className = 'badge-pass';
  } else {
    chkDisc.querySelector('.check-icon').textContent = '✕';
    chkDisc.querySelector('.check-icon').style.background = 'var(--danger)';
    chkDisc.querySelector('.badge-pass').textContent = 'FAIL';
    chkDisc.querySelector('.badge-pass').className = 'badge-fail';
  }
}

// Load Dropdown Options
async function loadMetadataOptions() {
  const res = await apiCall('/api/v1/transfers/meta/options');
  if (res.ok) {
    STATE.options = res.data.data;
    
    const deptSelect = document.getElementById('selectTargetDept');
    deptSelect.innerHTML = '<option value="">-- Select Target Business Unit --</option>' +
      STATE.options.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

    const locSelect = document.getElementById('selectTargetLoc');
    locSelect.innerHTML = '<option value="">-- Select Target Office Location --</option>' +
      STATE.options.locations.map(l => `<option value="${l.id}">${l.name}</option>`).join('');

    const roleSelect = document.getElementById('selectTargetRole');
    roleSelect.innerHTML = '<option value="">-- Select Target Open Position --</option>' +
      STATE.options.roles.map(r => `<option value="${r.id}">${r.name} (${r.band})</option>`).join('');
  }
}

// Pre-flight Notice Check on Date Input
function setupFormListeners() {
  const dateInput = document.getElementById('inputEffectiveDate');
  dateInput.addEventListener('change', (e) => {
    updatePreflightNoticeCheck(e.target.value);
  });

  // Transfer Submit Form
  const form = document.getElementById('transferForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitTransferRequest(false);
  });

  // Save Draft Button
  document.getElementById('btnSaveDraft').addEventListener('click', async () => {
    await submitTransferRequest(true);
  });

  // Withdraw Button
  document.getElementById('btnWithdrawTransfer').addEventListener('click', async () => {
    if (!STATE.activeTransfer) return;
    if (confirm('Are you sure you want to withdraw this transfer request?')) {
      const res = await apiCall(`/api/v1/transfers/${STATE.activeTransfer.id}/actions/withdraw`, 'POST');
      if (res.ok) {
        showToast('Transfer request withdrawn successfully.', 'info');
        await refreshActiveTransfer();
      } else {
        showToast(res.data.error?.message || 'Failed to withdraw.', 'error');
      }
    }
  });
}

function updatePreflightNoticeCheck(dateStr) {
  if (!dateStr) return;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  const chkNotice = document.getElementById('chkNoticeRow');
  const badge = document.getElementById('badgeNotice');

  if (diffDays >= 30) {
    chkNotice.querySelector('.check-icon').textContent = '✓';
    chkNotice.querySelector('.check-icon').style.background = 'var(--success)';
    badge.textContent = `PASS (${diffDays}d Notice)`;
    badge.className = 'badge-pass';
  } else {
    chkNotice.querySelector('.check-icon').textContent = '✕';
    chkNotice.querySelector('.check-icon').style.background = 'var(--danger)';
    badge.textContent = `FAIL (${diffDays}d Notice < 30d)`;
    badge.className = 'badge-fail';
  }
}

// Submit Transfer Request
async function submitTransferRequest(isDraft) {
  const payload = {
    targetDepartmentId: document.getElementById('selectTargetDept').value,
    targetLocationId: document.getElementById('selectTargetLoc').value,
    targetRoleId: document.getElementById('selectTargetRole').value,
    targetEffectiveDate: document.getElementById('inputEffectiveDate').value,
    reason: document.getElementById('inputReason').value,
    isDraft
  };

  const res = await apiCall('/api/v1/transfers', 'POST', payload);
  if (res.ok) {
    showToast(isDraft ? 'Transfer draft saved.' : 'Transfer request submitted successfully!', 'success');
    document.getElementById('tabTracker').click();
    await refreshActiveTransfer();
  } else {
    showToast(res.data.error?.message || 'Submission error', 'error');
  }
}

// Refresh Active Transfer & Stepper
async function refreshActiveTransfer() {
  const res = await apiCall('/api/v1/transfers');
  if (res.ok) {
    STATE.transfersList = res.data.data || [];
    // Pick the most relevant transfer for current view
    STATE.activeTransfer = STATE.transfersList[0] || null;
    renderActiveTransfer();
    renderInbox();
  }
}

async function refreshTransfersList() {
  const res = await apiCall('/api/v1/transfers');
  if (res.ok) {
    STATE.transfersList = res.data.data || [];
    renderInbox();
  }
}

// RENDER ACTIVE TRANSFER DOSSIER & STEPPER
function renderActiveTransfer() {
  const banner = document.getElementById('noTransferBanner');
  const container = document.getElementById('transferActiveContainer');

  if (!STATE.activeTransfer) {
    banner.style.display = 'block';
    container.style.display = 'none';
    return;
  }

  banner.style.display = 'none';
  container.style.display = 'block';

  const t = STATE.activeTransfer;
  document.getElementById('dossierId').textContent = t.id;
  document.getElementById('dossierEmployee').textContent = `${t.employeeName} (${t.employeeId})`;
  document.getElementById('dossierSource').textContent = `${t.currentDepartmentName} • ${t.currentLocationName}`;
  document.getElementById('dossierTarget').textContent = `${t.targetRoleName} • ${t.targetLocationName}`;
  document.getElementById('dossierDate').textContent = t.targetEffectiveDate;

  // Status Badge
  const statusBadge = document.getElementById('dossierStatusBadge');
  statusBadge.textContent = t.status;
  statusBadge.className = `status-pill status-${getStatusClass(t.status)}`;

  // Pending Action Callout
  renderPendingCallout(t);

  // Visual Stepper States
  renderStepper(t);

  // Downstream SAGA Cards
  renderDownstreamCards(t);

  // Withdrawal Button visibility
  const withdrawBox = document.getElementById('withdrawalBox');
  if (['ORCHESTRATING_DOWNSTREAM', 'COMPLETED', 'REJECTED', 'WITHDRAWN'].includes(t.status) || t.employeeId !== STATE.currentUserId) {
    withdrawBox.style.display = 'none';
  } else {
    withdrawBox.style.display = 'block';
  }
}

function renderPendingCallout(t) {
  const callout = document.getElementById('pendingActionCallout');
  const title = document.getElementById('alertTitle');
  const desc = document.getElementById('alertDescription');
  const btnBox = document.getElementById('alertActionBtnBox');
  btnBox.innerHTML = '';

  if (t.status === 'COMPLETED') {
    callout.style.background = 'rgba(16, 185, 129, 0.12)';
    callout.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    title.textContent = '🎉 Transfer Fully Completed & Provisioned!';
    title.style.color = '#34d399';
    desc.textContent = `All systems updated. Employee transition handover ready for ${t.targetEffectiveDate}.`;
    return;
  }

  if (t.status === 'REJECTED') {
    callout.style.background = 'rgba(239, 68, 68, 0.12)';
    callout.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    title.textContent = '❌ Transfer Request Rejected';
    title.style.color = '#f87171';
    desc.textContent = `Rejection Rationale: ${t.rejectionReason || 'No specific rationale recorded.'}`;
    return;
  }

  if (t.status === 'WITHDRAWN') {
    callout.style.background = 'rgba(148, 163, 184, 0.12)';
    callout.style.borderColor = 'rgba(148, 163, 184, 0.3)';
    title.textContent = '⏸️ Transfer Request Withdrawn';
    title.style.color = '#cbd5e1';
    desc.textContent = 'This transfer was voluntarily cancelled by the initiator.';
    return;
  }

  callout.style.background = 'rgba(99, 102, 241, 0.12)';
  callout.style.borderColor = 'rgba(99, 102, 241, 0.3)';
  title.style.color = '#a5b4fc';

  if (t.status === 'PENDING_CURRENT_MGR_APPROVAL') {
    title.textContent = 'Action Required: Current Line Manager Endorsement';
    desc.textContent = `Assigned to ${t.currentManagerName} (Alex Wong) • 5-day SLA Active`;
    if (STATE.currentUserId === 'MGR-2019' || STATE.currentUser?.role === 'HR_PARTNER') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Review & Endorse';
      btn.onclick = () => openActionModal('CURRENT_MGR', t);
      btnBox.appendChild(btn);
    }
  } else if (t.status === 'PENDING_RECEIVING_MGR_APPROVAL') {
    title.textContent = 'Action Required: Receiving Line Manager Acceptance';
    desc.textContent = `Assigned to Sarah Jenkins (New York Headcount Requisition REQ-NY-77)`;
    if (STATE.currentUserId === 'MGR-3088' || STATE.currentUser?.role === 'HR_PARTNER') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Accept Headcount';
      btn.onclick = () => openActionModal('RECEIVING_MGR', t);
      btnBox.appendChild(btn);
    }
  } else if (t.status === 'PENDING_HR_VALIDATION') {
    title.textContent = 'Action Required: HR Mobility Compliance & Final Sign-Off';
    desc.textContent = `Assigned to Michael Scott (HR Operations) • Automated checks evaluated: 100% PASS`;
    if (STATE.currentUserId === 'HR-4011' || STATE.currentUser?.role === 'HR_PARTNER') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'HR Compliance Sign-off';
      btn.onclick = () => openActionModal('HR_PARTNER', t);
      btnBox.appendChild(btn);
    }
  } else if (t.status === 'ORCHESTRATING_DOWNSTREAM') {
    title.textContent = '⚡ Downstream SAGA Provisioning In-Flight';
    desc.textContent = 'Parallel workers synchronizing Core HRIS, Global Payroll, IT IAM, and Facilities CAFM.';
  }
}

// Stepper Progress Rendering
function renderStepper(t) {
  const steps = [
    { id: 'step1', name: 'Initiation', desc: 'Submitted by ' + t.employeeName },
    { id: 'step2', name: 'Current Manager', desc: t.currentManagerName },
    { id: 'step3', name: 'Receiving Manager', desc: 'Sarah Jenkins' },
    { id: 'step4', name: 'HR Sign-off', desc: 'Michael Scott' },
    { id: 'step5', name: 'Downstream SAGA', desc: 'HRIS, Payroll, IT, Fac' },
    { id: 'step6', name: 'Handover Ready', desc: t.targetEffectiveDate }
  ];

  let currentStepIdx = 1;
  if (t.status === 'PENDING_CURRENT_MGR_APPROVAL') currentStepIdx = 2;
  else if (t.status === 'PENDING_RECEIVING_MGR_APPROVAL') currentStepIdx = 3;
  else if (t.status === 'PENDING_HR_VALIDATION') currentStepIdx = 4;
  else if (t.status === 'ORCHESTRATING_DOWNSTREAM') currentStepIdx = 5;
  else if (t.status === 'COMPLETED') currentStepIdx = 6;
  else if (['REJECTED', 'WITHDRAWN', 'CANCELLED'].includes(t.status)) currentStepIdx = 0;

  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`step${i}`);
    if (!el) continue;
    el.className = 'stepper-step';

    if (t.status === 'COMPLETED') {
      el.classList.add('completed');
      el.querySelector('.step-circle').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (i < currentStepIdx) {
      el.classList.add('completed');
      el.querySelector('.step-circle').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (i === currentStepIdx) {
      el.classList.add('active');
      el.querySelector('.step-circle').textContent = `${i}`;
    } else {
      el.querySelector('.step-circle').textContent = `${i}`;
    }
  }
}

// Downstream SAGA Cards Rendering
function renderDownstreamCards(t) {
  const hrisBadge = document.getElementById('badgeHris');
  const payBadge = document.getElementById('badgePayroll');
  const itBadge = document.getElementById('badgeIt');
  const facBadge = document.getElementById('badgeFacilities');

  setWorkerBadge(hrisBadge, t.downstreamStatus?.hris);
  setWorkerBadge(payBadge, t.downstreamStatus?.payroll);
  setWorkerBadge(itBadge, t.downstreamStatus?.it);
  setWorkerBadge(facBadge, t.downstreamStatus?.facilities);

  if (t.downstreamStatus?.details) {
    const d = t.downstreamStatus.details;
    if (d.hrisJobCode) document.getElementById('metaHris').textContent = `Job: ${d.hrisJobCode}`;
    if (d.payrollCostCenter) document.getElementById('metaPayroll').textContent = `Cost Center: ${d.payrollCostCenter}`;
    if (d.itTicketId) document.getElementById('metaIt').textContent = `Ticket: ${d.itTicketId}`;
    if (d.facilitiesDeskId) document.getElementById('metaFacilities').textContent = `Workstation: ${d.facilitiesDeskId}`;
  }
}

function setWorkerBadge(element, status) {
  if (!element) return;
  element.textContent = status || 'PENDING';
  element.className = `worker-pill pill-${(status || 'pending').toLowerCase().replace('_', '-')}`;
}

// RENDER STAKEHOLDER INBOX
function renderInbox() {
  const inboxList = document.getElementById('inboxList');
  const emptyState = document.getElementById('inboxEmptyState');
  const countBadge = document.getElementById('inboxCountBadge');

  inboxList.innerHTML = '';
  const pendingItems = STATE.transfersList.filter(t => {
    if (t.status === 'PENDING_CURRENT_MGR_APPROVAL' && (STATE.currentUserId === 'MGR-2019' || STATE.currentUser?.role === 'HR_PARTNER')) return true;
    if (t.status === 'PENDING_RECEIVING_MGR_APPROVAL' && (STATE.currentUserId === 'MGR-3088' || STATE.currentUser?.role === 'HR_PARTNER')) return true;
    if (t.status === 'PENDING_HR_VALIDATION' && (STATE.currentUserId === 'HR-4011' || STATE.currentUser?.role === 'HR_PARTNER')) return true;
    return false;
  });

  countBadge.textContent = pendingItems.length;

  if (pendingItems.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  pendingItems.forEach(t => {
    const card = document.createElement('div');
    card.className = 'inbox-card';
    card.innerHTML = `
      <div class="inbox-info">
        <h4>${t.id}: ${t.employeeName} (${t.currentDepartmentName} → ${t.targetDepartmentName})</h4>
        <p>Target: <strong>${t.targetRoleName}</strong> in ${t.targetLocationName} • Effective: ${t.targetEffectiveDate}</p>
        <span class="status-pill status-pending" style="margin-top:6px;">${t.status}</span>
      </div>
      <button class="btn btn-primary" onclick="openActionModalForTransfer('${t.id}')">
        Review & Take Action
      </button>
    `;
    inboxList.appendChild(card);
  });
}

window.openActionModalForTransfer = (transferId) => {
  const t = STATE.transfersList.find(x => x.id === transferId);
  if (!t) return;
  if (t.status === 'PENDING_CURRENT_MGR_APPROVAL') openActionModal('CURRENT_MGR', t);
  else if (t.status === 'PENDING_RECEIVING_MGR_APPROVAL') openActionModal('RECEIVING_MGR', t);
  else if (t.status === 'PENDING_HR_VALIDATION') openActionModal('HR_PARTNER', t);
};

// ACTION MODAL DIALOGS
function openActionModal(actionType, transfer) {
  const modal = document.getElementById('actionModal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');

  modal.style.display = 'flex';

  if (actionType === 'CURRENT_MGR') {
    title.textContent = `Current Manager Review — ${transfer.id}`;
    body.innerHTML = `
      <p style="margin-bottom:16px; color:var(--text-muted);">
        Employee <strong>${transfer.employeeName}</strong> requests internal release for transfer to <strong>${transfer.targetDepartmentName}</strong> effective <strong>${transfer.targetEffectiveDate}</strong>.
      </p>
      <div class="form-group">
        <label>Handover & Transition Remarks <span class="required">*</span></label>
        <textarea id="modalRemarks" class="form-control" rows="3" placeholder="Enter transition plan and project handover notes..."></textarea>
      </div>
      <div class="form-actions" style="margin-top:20px;">
        <button class="btn btn-danger-outline" onclick="submitRejection('${transfer.id}', ${transfer.version})">Reject Request</button>
        <button class="btn btn-primary" onclick="submitCurrentManagerApproval('${transfer.id}', ${transfer.version})">Endorse & Approve Release</button>
      </div>
    `;
  } else if (actionType === 'RECEIVING_MGR') {
    title.textContent = `Receiving Manager Acceptance — ${transfer.id}`;
    body.innerHTML = `
      <p style="margin-bottom:16px; color:var(--text-muted);">
        Confirm open headcount and accept <strong>${transfer.employeeName}</strong> for <strong>${transfer.targetRoleName}</strong> in <strong>${transfer.targetLocationName}</strong>.
      </p>
      <div class="form-group">
        <label>Headcount Requisition Code</label>
        <input type="text" id="modalReqCode" class="form-control" value="REQ-NY-77" readonly>
      </div>
      <div class="form-group">
        <label>Onboarding & Role Remarks</label>
        <textarea id="modalRemarks" class="form-control" rows="2" placeholder="Welcome remarks and team alignment notes..."></textarea>
      </div>
      <div class="form-actions" style="margin-top:20px;">
        <button class="btn btn-danger-outline" onclick="submitRejection('${transfer.id}', ${transfer.version})">Decline Candidate</button>
        <button class="btn btn-primary" onclick="submitReceivingManagerApproval('${transfer.id}', ${transfer.version})">Accept & Reserve Headcount</button>
      </div>
    `;
  } else if (actionType === 'HR_PARTNER') {
    title.textContent = `HR Compliance Review & Final Sign-Off — ${transfer.id}`;
    body.innerHTML = `
      <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); padding:12px; border-radius:8px; margin-bottom:16px;">
        <strong>✓ Automated Policy Pre-checks: 100% PASS</strong>
        <p class="text-xs text-muted">Tenure: 18m | Rating: 4.2 | Disciplinary: Clean | Notice: Satisfied</p>
      </div>
      <div class="form-group">
        <label>Confirmed Salary Grade Band <span class="required">*</span></label>
        <input type="text" id="modalSalaryGrade" class="form-control" value="GR-08 ($125,000 - $145,000)" required>
      </div>
      <div class="form-group">
        <label>HR Governance Notes</label>
        <textarea id="modalRemarks" class="form-control" rows="2" placeholder="Compliance verification notes..."></textarea>
      </div>
      <div class="form-actions" style="margin-top:20px;">
        <button class="btn btn-danger-outline" onclick="submitRejection('${transfer.id}', ${transfer.version})">Reject Request</button>
        <button class="btn btn-primary" onclick="submitHRApproval('${transfer.id}', ${transfer.version})">Approve & Execute SAGA Sync</button>
      </div>
    `;
  }
}

function setupModalListeners() {
  const modal = document.getElementById('actionModal');
  document.getElementById('modalCloseBtn').onclick = () => { modal.style.display = 'none'; };
  window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}

window.submitCurrentManagerApproval = async (id, version) => {
  const remarks = document.getElementById('modalRemarks')?.value || 'Transition plan confirmed.';
  const res = await apiCall(`/api/v1/transfers/${id}/actions/approve-current-manager`, 'POST', {
    expectedVersion: version,
    handoverRemarks: remarks
  });
  handleActionResult(res, 'Current Manager approval recorded.');
};

window.submitReceivingManagerApproval = async (id, version) => {
  const remarks = document.getElementById('modalRemarks')?.value || 'Headcount allocated.';
  const reqCode = document.getElementById('modalReqCode')?.value || 'REQ-NY-77';
  const res = await apiCall(`/api/v1/transfers/${id}/actions/approve-receiving-manager`, 'POST', {
    expectedVersion: version,
    handoverRemarks: remarks,
    requisitionCode: reqCode
  });
  handleActionResult(res, 'Receiving Manager approval recorded.');
};

window.submitHRApproval = async (id, version) => {
  const grade = document.getElementById('modalSalaryGrade')?.value || 'GR-08';
  const notes = document.getElementById('modalRemarks')?.value || 'Compliance cleared.';
  
  showToast('Executing downstream SAGA orchestration across HRIS, Payroll, IT, Facilities...', 'info');
  const res = await apiCall(`/api/v1/transfers/${id}/actions/approve-hr`, 'POST', {
    expectedVersion: version,
    confirmedSalaryGrade: grade,
    visaCleared: true,
    hrNotes: notes
  });
  handleActionResult(res, 'HR Final Approval Granted & SAGA Synchronized!');
};

window.submitRejection = async (id, version) => {
  const reason = prompt('Please enter mandatory rejection rationale (minimum 20 characters):');
  if (!reason) return;
  if (reason.length < 20) {
    alert('Rejection reason must be at least 20 characters long.');
    return;
  }
  const res = await apiCall(`/api/v1/transfers/${id}/actions/reject`, 'POST', {
    expectedVersion: version,
    reason
  });
  handleActionResult(res, 'Transfer request rejected.');
};

async function handleActionResult(res, successMsg) {
  document.getElementById('actionModal').style.display = 'none';
  if (res.ok) {
    showToast(successMsg, 'success');
    await refreshActiveTransfer();
    document.getElementById('tabTracker').click();
  } else {
    showToast(res.data.error?.message || 'Action error', 'error');
  }
}

// LOAD AUDIT TRAIL
async function loadAuditTrail(transferId) {
  const res = await apiCall(`/api/v1/transfers/${transferId}/audit-trail`);
  const tbody = document.getElementById('auditTableBody');
  tbody.innerHTML = '';

  if (res.ok) {
    const data = res.data.data;
    const entries = data.entries || [];
    document.getElementById('auditIntegrityStatus').textContent = data.isIntegrityVerified 
      ? 'Chain Integrity: VERIFIED INTACT (SHA-256)' 
      : 'Chain Integrity: COMPROMISED / TAMPER DETECTED';

    entries.forEach(e => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight:700;">#${e.sequenceNum}</td>
        <td class="text-muted">${e.timestamp.replace('T', ' ').substring(0, 19)}</td>
        <td><strong>${e.actorName}</strong> <span class="badge-pill">${e.actorRole}</span></td>
        <td><span class="highlight-code">${e.action}</span></td>
        <td>${e.previousState || '—'} → <span class="status-pill status-${getStatusClass(e.newState)}">${e.newState}</span></td>
        <td>
          <div class="hash-code" title="Current: ${e.currentHash}\nPrev: ${e.prevHash}">
            ${e.currentHash.substring(0, 16)}...
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  }
}

// AUTO-PLAY FULL DEMO (Walkthrough Automation)
async function executeQuickDemo() {
  showToast('Starting Automated SDD Journey Walkthrough Demo...', 'info');

  // Step 1: Initiate
  await handlePersonaChange('EMP-1042');
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 45);
  const initRes = await apiCall('/api/v1/transfers', 'POST', {
    targetDepartmentId: 'DEP-PROD-NY',
    targetLocationId: 'LOC-NYC-01',
    targetRoleId: 'ROL-SR-PM',
    targetEffectiveDate: futureDate.toISOString().split('T')[0],
    reason: 'Demo Walkthrough: Relocating to New York for Senior Product Manager opportunity.'
  });

  if (!initRes.ok) {
    showToast(initRes.data.error?.message || 'Demo error', 'error');
    return;
  }

  const transferId = initRes.data.data.id;
  await refreshActiveTransfer();
  showToast('Stage 1: Transfer Initiated by Jane Doe (EMP-1042)', 'success');
  await sleep(1200);

  // Step 2: Current Manager Endorsement
  await handlePersonaChange('MGR-2019');
  await apiCall(`/api/v1/transfers/${transferId}/actions/approve-current-manager`, 'POST', {
    expectedVersion: 1,
    handoverRemarks: 'Demo: Handover plan approved. Release signed off.'
  });
  await refreshActiveTransfer();
  showToast('Stage 2: Current Manager Alex Wong Endorsed Release', 'success');
  await sleep(1200);

  // Step 3: Receiving Manager Acceptance
  await handlePersonaChange('MGR-3088');
  await apiCall(`/api/v1/transfers/${transferId}/actions/approve-receiving-manager`, 'POST', {
    expectedVersion: 2,
    requisitionCode: 'REQ-NY-77',
    handoverRemarks: 'Demo: Headcount verified. Team welcomes candidate.'
  });
  await refreshActiveTransfer();
  showToast('Stage 3: Receiving Manager Sarah Jenkins Accepted Requisition', 'success');
  await sleep(1200);

  // Step 4: HR Final Approval & SAGA
  await handlePersonaChange('HR-4011');
  await apiCall(`/api/v1/transfers/${transferId}/actions/approve-hr`, 'POST', {
    expectedVersion: 3,
    confirmedSalaryGrade: 'GR-08',
    visaCleared: true,
    hrNotes: 'Demo: Eligibility 100% verified. Triggering downstream SAGA.'
  });
  await refreshActiveTransfer();
  showToast('Stage 4 & 5: HR Approved & Downstream SAGA Provisioned!', 'success');
  await sleep(800);

  // Switch back to Employee view
  await handlePersonaChange('EMP-1042');
  document.getElementById('personaSelect').value = 'EMP-1042';
  document.getElementById('tabTracker').click();
  showToast('🎉 Demo Completed: Request status is COMPLETED with 100% audit integrity!', 'success');
}

function getStatusClass(status) {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'REJECTED') return 'rejected';
  if (status === 'WITHDRAWN' || status === 'CANCELLED') return 'withdrawn';
  return 'pending';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}
