// ========================================
// DATABASE ACCESS
// ========================================
const AdminDB = {
  SA_KEY: 'sa_dtr_student_assistants',
  DTR_KEY: 'sa_dtr_records',
  
  getAllSAs() {
    const data = localStorage.getItem(this.SA_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  getAllDTRRecords() {
    const data = localStorage.getItem(this.DTR_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  saveDTRRecords(records) {
    localStorage.setItem(this.DTR_KEY, JSON.stringify(records));
  },
  
  getTodayDTR() {
    const records = this.getAllDTRRecords();
    const today = new Date().toISOString().split('T')[0];
    return records.filter(r => r.date === today);
  },
  
  getCurrentlyOnDuty() {
    const todayDTR = this.getTodayDTR();
    return todayDTR.filter(r => r.status === 'On Duty');
  },
  
  getMonthDTR() {
    const records = this.getAllDTRRecords();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    return records.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate.getFullYear() === year && recordDate.getMonth() === month;
    });
  },
  
  manualCheckout(recordId) {
    const records = this.getAllDTRRecords();
    const record = records.find(r => r.id === recordId);
    
    if (record && record.status === 'On Duty') {
      const now = new Date();
      record.timeOut = now.toISOString();
      record.status = 'Completed';
      
      // Calculate hours
      const timeIn = new Date(record.timeIn);
      const timeOut = new Date(record.timeOut);
      const durationMs = timeOut - timeIn;
      const hours = durationMs / (1000 * 60 * 60);
      record.hoursWorked = Math.round(hours * 100) / 100;
      
      this.saveDTRRecords(records);
      return record;
    }
    return null;
  }
};

// ========================================
// NAVIGATION
// ========================================
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      const viewName = item.getAttribute('data-view');
      showView(viewName);
      
      const viewTitle = item.querySelector('.nav-text').textContent;
      document.querySelector('.page-title').textContent = viewTitle;
    });
  });
}

function showView(viewName) {
  const views = document.querySelectorAll('.view-container');
  views.forEach(view => view.classList.remove('active'));
  
  const targetView = document.getElementById(`${viewName}-view`);
  if (targetView) {
    targetView.classList.add('active');
  }
}

// ========================================
// DASHBOARD STATS
// ========================================
function updateDashboardStats() {
  const allSAs = AdminDB.getAllSAs();
  const activeSAs = allSAs.filter(sa => sa.status === 'Active');
  const onDuty = AdminDB.getCurrentlyOnDuty();
  const todayDTR = AdminDB.getTodayDTR();
  const monthDTR = AdminDB.getMonthDTR();
  
  // Stats
  document.getElementById('stat-checked-in').textContent = onDuty.length;
  document.getElementById('stat-total-sas').textContent = allSAs.length;
  document.getElementById('stat-today-records').textContent = todayDTR.length;
  
  // Department breakdown
  const deptBreakdown = {};
  onDuty.forEach(r => {
    deptBreakdown[r.department] = (deptBreakdown[r.department] || 0) + 1;
  });
  const breakdownText = Object.entries(deptBreakdown)
    .map(([dept, count]) => `${dept}: ${count}`)
    .join(' • ');
  document.getElementById('stat-dept-breakdown').textContent = breakdownText || 'No one on duty';
  
  // Active SAs
  document.getElementById('stat-active-sas').textContent = `${activeSAs.length} Active`;
  
  // Month hours
  const totalMonthHours = monthDTR.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
  document.getElementById('stat-month-hours').textContent = Math.round(totalMonthHours);
  
  const avgHours = allSAs.length > 0 ? Math.round(totalMonthHours / allSAs.length) : 0;
  document.getElementById('stat-avg-hours').textContent = `Avg: ${avgHours}h per SA`;
  
  // Completed today
  const completed = todayDTR.filter(r => r.status === 'Completed').length;
  document.getElementById('stat-completed').textContent = `${completed} Completed`;
}

// ========================================
// LIVE DTR STATUS
// ========================================
function updateLiveDTR() {
  const onDuty = AdminDB.getCurrentlyOnDuty();
  const container = document.getElementById('live-dtr-list');
  
  if (onDuty.length === 0) {
    container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-dim);">No one currently on duty</div>';
    return;
  }
  
  container.innerHTML = onDuty.map(record => {
    const timeIn = new Date(record.timeIn);
    const now = new Date();
    const durationMs = now - timeIn;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `
      <div class="dtr-item">
        <div class="dtr-item-info">
          <div class="dtr-item-name">${record.sa.firstName} ${record.sa.lastName}</div>
          <div class="dtr-item-details">${record.sa.id} • ${record.department} • ${record.shiftType}</div>
        </div>
        <div class="dtr-item-time">
          <div class="dtr-item-duration">${hours}h ${minutes}m</div>
          <div style="font-size: 0.8rem; color: var(--text-dim);">Since ${timeIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ========================================
// DEPARTMENT SUMMARY
// ========================================
function updateDepartmentSummary() {
  const monthDTR = AdminDB.getMonthDTR();
  const deptSummary = {};
  
  monthDTR.forEach(record => {
    if (!deptSummary[record.department]) {
      deptSummary[record.department] = {
        count: 0,
        hours: 0
      };
    }
    deptSummary[record.department].count++;
    deptSummary[record.department].hours += (record.hoursWorked || 0);
  });
  
  const container = document.getElementById('dept-summary-list');
  
  if (Object.keys(deptSummary).length === 0) {
    container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-dim);">No data this month</div>';
    return;
  }
  
  container.innerHTML = Object.entries(deptSummary)
    .sort((a, b) => b[1].hours - a[1].hours)
    .map(([dept, data]) => `
      <div class="dept-item">
        <div>
          <div style="font-weight: 700; margin-bottom: 0.25rem;">${dept}</div>
          <div style="font-size: 0.85rem; color: var(--text-dim);">${data.count} records</div>
        </div>
        <div style="text-align: right;">
          <div class="dept-count">${Math.round(data.hours)}</div>
          <div style="font-size: 0.8rem; color: var(--text-dim);">hours</div>
        </div>
      </div>
    `).join('');
}

// ========================================
// TODAY'S DTR TABLE
// ========================================
function updateTodayDTRTable() {
  const todayDTR = AdminDB.getTodayDTR();
  const tbody = document.getElementById('today-dtr-body');
  
  if (todayDTR.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-dim);">No DTR records for today</td></tr>';
    return;
  }
  
  tbody.innerHTML = todayDTR
    .sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn))
    .map(record => {
      const timeIn = new Date(record.timeIn);
      const timeOut = record.timeOut ? new Date(record.timeOut) : null;
      
      let hoursDisplay = '-';
      if (record.hoursWorked) {
        const hours = Math.floor(record.hoursWorked);
        const minutes = Math.round((record.hoursWorked - hours) * 60);
        hoursDisplay = `${hours}h ${minutes}m`;
      } else if (record.status === 'On Duty') {
        const now = new Date();
        const durationMs = now - timeIn;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        hoursDisplay = `${hours}h ${minutes}m`;
      }
      
      const statusClass = record.status === 'On Duty' ? 'status-on-duty' : 'status-completed';
      const actionBtn = record.status === 'On Duty' ? 
        `<button class="action-btn" onclick="openCheckoutModal('${record.id}')">Check Out</button>` :
        '<span style="color: var(--text-dim); font-size: 0.85rem;">Completed</span>';
      
      return `
        <tr>
          <td>${record.sa.id}</td>
          <td>${record.sa.firstName} ${record.sa.lastName}</td>
          <td>${record.department}</td>
          <td>${record.shiftType}</td>
          <td>${timeIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
          <td>${timeOut ? timeOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
          <td>${hoursDisplay}</td>
          <td>${record.late ? record.late + ' min' : '-'}</td>
          <td><span class="status-badge ${statusClass}">${record.status}</span></td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }).join('');
}

// ========================================
// MANUAL CHECKOUT
// ========================================
let currentCheckoutId = null;

function openCheckoutModal(recordId) {
  const records = AdminDB.getAllDTRRecords();
  const record = records.find(r => r.id === recordId);
  
  if (!record) return;
  
  currentCheckoutId = recordId;
  
  document.getElementById('checkout-sa-name').textContent = 
    `${record.sa.firstName} ${record.sa.lastName}`;
  
  const timeIn = new Date(record.timeIn);
  document.getElementById('checkout-time-in').textContent = 
    timeIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const now = new Date();
  const durationMs = now - timeIn;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  document.getElementById('checkout-duration').textContent = `${hours}h ${minutes}m`;
  
  document.getElementById('checkout-modal').classList.add('show');
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal').classList.remove('show');
  currentCheckoutId = null;
}

function confirmCheckout() {
  if (!currentCheckoutId) return;
  
  const result = AdminDB.manualCheckout(currentCheckoutId);
  
  if (result) {
    closeCheckoutModal();
    refreshData();
    showNotification('Success', `${result.sa.firstName} ${result.sa.lastName} checked out successfully`);
  }
}

// ========================================
// DATETIME UPDATE
// ========================================
function updateDateTime() {
  const now = new Date();
  const options = { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit'
  };
  document.getElementById('current-datetime').textContent = 
    now.toLocaleDateString('en-US', options);
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================
function initSearch() {
  const searchInput = document.getElementById('search-dtr');
  if (!searchInput) return;
  
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#today-dtr-body tr');
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  });
}

// ========================================
// REFRESH DATA
// ========================================
function refreshData() {
  updateDashboardStats();
  updateLiveDTR();
  updateDepartmentSummary();
  updateTodayDTRTable();
  updateDateTime();
  
  const refreshIcon = document.querySelector('.refresh-icon');
  if (refreshIcon) {
    refreshIcon.style.animation = 'spin 0.5s linear';
    setTimeout(() => {
      refreshIcon.style.animation = '';
    }, 500);
  }
}

// ========================================
// EXPORT FUNCTIONS
// ========================================
function exportTodayDTR() {
  const todayDTR = AdminDB.getTodayDTR();
  const csv = convertToCSV(todayDTR);
  const today = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `SA-DTR-${today}.csv`);
  showNotification('Success', 'Today\'s DTR exported successfully');
}

function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = ['SA ID', 'Name', 'Student Number', 'Department', 'Shift Type', 'Date', 'Time In', 'Time Out', 'Hours Worked', 'Late (min)', 'Undertime (min)', 'Status'];
  const rows = data.map(record => [
    record.sa.id,
    `${record.sa.firstName} ${record.sa.lastName}`,
    record.sa.studentNumber,
    record.department,
    record.shiftType,
    record.date,
    new Date(record.timeIn).toLocaleString(),
    record.timeOut ? new Date(record.timeOut).toLocaleString() : 'N/A',
    record.hoursWorked || 'Ongoing',
    record.late || 0,
    record.undertime || 0,
    record.status
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function exportAllData() {
  const data = {
    studentAssistants: AdminDB.getAllSAs(),
    dtrRecords: AdminDB.getAllDTRRecords(),
    exportDate: new Date().toISOString()
  };
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SA-DTR-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  window.URL.revokeObjectURL(url);
  
  showNotification('Success', 'Complete database exported successfully');
}

function clearAllData() {
  if (confirm('⚠️ WARNING: This will delete ALL Student Assistant and DTR data permanently. This action cannot be undone!\n\nAre you absolutely sure?')) {
    if (confirm('This is your final confirmation. All data will be permanently deleted. Continue?')) {
      localStorage.removeItem(AdminDB.SA_KEY);
      localStorage.removeItem(AdminDB.DTR_KEY);
      refreshData();
      showNotification('Success', 'All data has been cleared');
    }
  }
}

function backupData() {
  exportAllData();
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function showNotification(title, message) {
  alert(`${title}: ${message}`);
}

function viewAllDTR() {
  showView('dtr-records');
  document.querySelector('[data-view="dtr-records"]').click();
}

function applyFilters() {
  showNotification('Info', 'Filters applied');
}

function openAddSA() {
  showNotification('Info', 'Add SA feature - Coming soon');
}

function generateReport() {
  showNotification('Info', 'Report generation - Coming soon');
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  refreshData();
  initSearch();
  
  // Update datetime every minute
  setInterval(updateDateTime, 60000);
  
  // Auto-refresh data every 30 seconds
  setInterval(refreshData, 30000);
  
  console.log('SA DTR Admin Dashboard initialized');
});

// Add CSS animation for refresh icon
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
