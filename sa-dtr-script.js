// ========================================
// DATABASE (LocalStorage-based)
// ========================================
const SADTRDB = {
  SA_KEY: 'sa_dtr_student_assistants',
  DTR_KEY: 'sa_dtr_records',
  
  init() {
    if (!this.getAllSAs().length) {
      const sampleSAs = [
        { 
          id: 'SA001', 
          firstName: 'Neil', 
          lastName: 'Domingo',
          studentNumber: '2021-12345',
          department: 'Procurement', 
          dutyHours: 5,
          email: 'NeilDomingo@s.ubaguio.edu',
          phone: '+63 912 345 6789',
          status: 'Active',
          createdAt: new Date().toISOString()
        },
        { 
          id: 'SA002', 
          firstName: 'Dane', 
          lastName: 'Arciaga',
          studentNumber: '2021-23456',
          department: 'Procurement', 
          dutyHours: 4,
          email: 'dane.arciaga@s.ubaguio.edu',
          phone: '+63 912 456 7890',
          status: 'Active',
          createdAt: new Date().toISOString()
        },
        { 
          id: 'SA003', 
          firstName: 'Mark Angelo', 
          lastName: 'Garcia',
          studentNumber: '2021-34567',
          department: 'Procurement', 
          dutyHours: 6,
          email: 'juan.delacruz@s.ubaguio.edu',
          phone: '+63 912 567 8901',
          status: 'Active',
          createdAt: new Date().toISOString()
        }
      ];
      
      this.saveAllSAs(sampleSAs);
    }
    
    this.renderQuickButtons();
  },
  
  getAllSAs() {
    const data = localStorage.getItem(this.SA_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  saveAllSAs(sas) {
    localStorage.setItem(this.SA_KEY, JSON.stringify(sas));
  },
  
  getSAById(id) {
    const sas = this.getAllSAs();
    return sas.find(sa => sa.id === id);
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
  
  getMonthDTR(saId, year, month) {
    const records = this.getAllDTRRecords();
    return records.filter(r => {
      const recordDate = new Date(r.date);
      return r.saId === saId && 
             recordDate.getFullYear() === year && 
             recordDate.getMonth() === month;
    });
  },
  
  checkIn(saId, department, shiftType) {
    const sa = this.getSAById(saId);
    
    if (!sa) {
      throw new Error('Student Assistant ID not found. Please contact HRMO.');
    }
    
    if (sa.status !== 'Active') {
      throw new Error('Your SA account is not active. Please contact HRMO.');
    }
    
    const records = this.getAllDTRRecords();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // Check if already checked in today for this shift
    const existingShift = records.find(r => 
      r.saId === saId && 
      r.date === today && 
      r.shiftType === shiftType &&
      r.status === 'On Duty'
    );
    
    if (existingShift) {
      throw new Error(`You are already checked in for ${shiftType}`);
    }
    
    // Create new DTR record
    const record = {
      id: `DTR${Date.now()}`,
      saId: saId,
      sa: sa,
      department: department,
      shiftType: shiftType,
      date: today,
      day: now.getDate(),
      timeIn: now.toISOString(),
      timeOut: null,
      status: 'On Duty',
      hoursWorked: null,
      late: null,
      undertime: null
    };
    
    records.push(record);
    this.saveDTRRecords(records);
    
    return record;
  },
  
  checkOut(saId, shiftType) {
    const records = this.getAllDTRRecords();
    const today = new Date().toISOString().split('T')[0];
    
    const record = records.find(r => 
      r.saId === saId && 
      r.date === today && 
      r.shiftType === shiftType &&
      r.status === 'On Duty'
    );
    
    if (!record) {
      throw new Error(`No active check-in found for ${shiftType}. Please check in first.`);
    }
    
    const now = new Date();
    record.timeOut = now.toISOString();
    record.status = 'Completed';
    
    // Calculate hours worked
    const timeIn = new Date(record.timeIn);
    const timeOut = new Date(record.timeOut);
    const durationMs = timeOut - timeIn;
    const hours = durationMs / (1000 * 60 * 60);
    const hoursWorked = Math.round(hours * 100) / 100; // Round to 2 decimals
    
    record.hoursWorked = hoursWorked;
    
    // Calculate if late or undertime (you can customize these rules)
    const timeInHour = timeIn.getHours();
    const timeOutHour = timeOut.getHours();
    
    // Example: First shift expected 8:00-12:00, Second shift 13:00-17:00
    if (shiftType === 'First Shift' && timeInHour > 8) {
      record.late = (timeInHour - 8) * 60 + timeIn.getMinutes();
    }
    
    if (shiftType === 'First Shift' && timeOutHour < 12) {
      record.undertime = (12 - timeOutHour) * 60 - timeOut.getMinutes();
    }
    
    this.saveDTRRecords(records);
    
    return record;
  },
  
  renderQuickButtons() {
    const sas = this.getAllSAs().slice(0, 6);
    const container = document.getElementById('quick-buttons');
    
    if (!container) return;
    
    container.innerHTML = sas.map(sa => `
      <button class="quick-btn" onclick="quickFill('${sa.id}')">
        ${sa.id}
      </button>
    `).join('');
  }
};

// Initialize on load
SADTRDB.init();

// ========================================
// DTR CHECK-IN/CHECK-OUT HANDLING
// ========================================
function handleDTRAction(event) {
  event.preventDefault();
  
  const saId = document.getElementById('sa-id').value.trim().toUpperCase();
  const department = document.getElementById('department').value;
  const shiftType = document.getElementById('shift-type').value;
  
  // Determine which button was clicked
  const clickedButton = event.submitter;
  const action = clickedButton.getAttribute('data-action');
  
  if (!saId || !department || !shiftType) {
    showError('Please fill in all fields');
    return;
  }
  
  // Disable buttons
  document.getElementById('checkin-btn').disabled = true;
  document.getElementById('checkout-btn').disabled = true;
  
  try {
    if (action === 'checkin') {
      const record = SADTRDB.checkIn(saId, department, shiftType);
      showCheckInSuccess(record);
      playSound('success');
    } else if (action === 'checkout') {
      const record = SADTRDB.checkOut(saId, shiftType);
      showCheckOutSuccess(record);
      playSound('success');
    }
    
    // Reset form after delay
    setTimeout(() => {
      document.getElementById('dtr-form').style.display = 'none';
    }, 1000);
  } catch (error) {
    showError(error.message);
    playSound('error');
    document.getElementById('checkin-btn').disabled = false;
    document.getElementById('checkout-btn').disabled = false;
  }
}

function showCheckInSuccess(record) {
  const { sa, timeIn, department, shiftType } = record;
  const time = new Date(timeIn);
  
  const resultDiv = document.getElementById('result');
  resultDiv.className = 'result success';
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `
    <div class="result-icon">✓</div>
    <div class="result-title" style="color: var(--success);">
      Check-In Successful!
    </div>
    <div class="result-message">
      Welcome, <strong>${sa.firstName} ${sa.lastName}</strong>
    </div>
    
    <div class="dtr-info">
      <div class="dtr-info-row">
        <span class="dtr-info-label">SA ID:</span>
        <span class="dtr-info-value">${sa.id}</span>
      </div>
      <div class="dtr-info-row">
        <span class="dtr-info-label">Department:</span>
        <span class="dtr-info-value">${department}</span>
      </div>
      <div class="dtr-info-row">
        <span class="dtr-info-label">Shift Type:</span>
        <span class="dtr-info-value">${shiftType}</span>
      </div>
      <div class="dtr-info-row">
        <span class="dtr-info-label">Time In:</span>
        <span class="dtr-info-value">${time.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })}</span>
      </div>
      <div class="dtr-info-row">
        <span class="dtr-info-label">Date:</span>
        <span class="dtr-info-value">${time.toLocaleDateString('en-US', { 
          year: 'numeric',
          month: 'long', 
          day: 'numeric' 
        })}</span>
      </div>
    </div>
    
    <button class="btn-another" onclick="resetForm()">
      Check In Another SA
    </button>
  `;
}

function showCheckOutSuccess(record) {
  const { sa, timeIn, timeOut, hoursWorked, shiftType } = record;
  const timeInDate = new Date(timeIn);
  const timeOutDate = new Date(timeOut);
  
  const hours = Math.floor(hoursWorked);
  const minutes = Math.round((hoursWorked - hours) * 60);
  
  const resultDiv = document.getElementById('result');
  resultDiv.className = 'result success';
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `
    <div class="result-icon">↩</div>
    <div class="result-title" style="color: var(--warning);">
      Check-Out Successful!
    </div>
    <div class="result-message">
      Thank you for your service, <strong>${sa.firstName} ${sa.lastName}</strong>
    </div>
    
    <div class="dtr-info">
      <div class="dtr-info-row">
        <span class="dtr-info-label">Shift Type:</span>
        <span class="dtr-info-value">${shiftType}</span>
      </div>
      <div class="dtr-info-row">
        <span class="dtr-info-label">Time In:</span>
        <span class="dtr-info-value">${timeInDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })}</span>
      </div>
      <div class="dtr-info-row">
        <span class="dtr-info-label">Time Out:</span>
        <span class="dtr-info-value">${timeOutDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })}</span>
      </div>
      <div class="dtr-info-row">
        <span class="dtr-info-label">Hours Worked:</span>
        <span class="dtr-info-value" style="color: var(--success); font-size: 1.25rem;">
          ${hours}h ${minutes}m
        </span>
      </div>
      ${record.late ? `
      <div class="dtr-info-row">
        <span class="dtr-info-label">Late:</span>
        <span class="dtr-info-value" style="color: var(--warning);">${record.late} mins</span>
      </div>
      ` : ''}
      ${record.undertime ? `
      <div class="dtr-info-row">
        <span class="dtr-info-label">Undertime:</span>
        <span class="dtr-info-value" style="color: var(--warning);">${record.undertime} mins</span>
      </div>
      ` : ''}
    </div>
    
    <button class="btn-another" onclick="resetForm()">
      Process Another Record
    </button>
  `;
}

function showError(message) {
  const resultDiv = document.getElementById('result');
  resultDiv.className = 'result error';
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `
    <div class="result-icon">✕</div>
    <div class="result-title" style="color: var(--error);">
      Action Failed
    </div>
    <div class="result-message">
      ${message}
    </div>
    
    <button class="btn-another" onclick="hideResult()">
      Try Again
    </button>
  `;
}

function resetForm() {
  document.getElementById('dtr-form').reset();
  document.getElementById('dtr-form').style.display = 'block';
  document.getElementById('result').style.display = 'none';
  document.getElementById('checkin-btn').disabled = false;
  document.getElementById('checkout-btn').disabled = false;
  document.getElementById('sa-id').focus();
}

function hideResult() {
  document.getElementById('result').style.display = 'none';
  document.getElementById('checkin-btn').disabled = false;
  document.getElementById('checkout-btn').disabled = false;
}

function quickFill(id) {
  document.getElementById('sa-id').value = id;
  
  // Auto-select department if SA exists
  const sa = SADTRDB.getSAById(id);
  if (sa) {
    document.getElementById('department').value = sa.department;
  }
  
  // Focus on shift type
  document.getElementById('shift-type').focus();
}

// ========================================
// REGISTRATION
// ========================================
function openRegistration() {
  document.getElementById('registration-modal').classList.add('show');
  document.getElementById('registration-form').style.display = 'block';
  document.getElementById('registration-success').style.display = 'none';
  document.getElementById('reg-firstname').focus();
}

function closeRegistration() {
  document.getElementById('registration-modal').classList.remove('show');
  document.getElementById('registration-form').reset();
}

function handleRegistration(event) {
  event.preventDefault();
  
  const btn = document.getElementById('register-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  
  try {
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const studentNumber = document.getElementById('reg-student-number').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const department = document.getElementById('reg-department').value;
    const dutyHours = parseInt(document.getElementById('reg-duty-hours').value);
    const notes = document.getElementById('reg-notes').value.trim();
    
    // Generate unique SA ID
    const sas = SADTRDB.getAllSAs();
    let maxNum = 0;
    sas.forEach(sa => {
      const num = parseInt(sa.id.replace('SA', ''));
      if (num > maxNum) maxNum = num;
    });
    const newId = `SA${String(maxNum + 1).padStart(3, '0')}`;
    
    const newSA = {
      id: newId,
      firstName,
      lastName,
      studentNumber,
      department,
      dutyHours,
      email,
      phone,
      status: 'Active',
      notes,
      createdAt: new Date().toISOString()
    };
    
    sas.push(newSA);
    SADTRDB.saveAllSAs(sas);
    SADTRDB.renderQuickButtons();
    
    showRegistrationSuccess(newSA);
    playSound('success');
  } catch (error) {
    alert('Registration failed: ' + error.message);
    btn.disabled = false;
    btn.textContent = '✓ Complete Registration';
  }
}

function showRegistrationSuccess(sa) {
  document.getElementById('registration-form').style.display = 'none';
  document.getElementById('registration-success').style.display = 'block';
  
  document.getElementById('new-sa-id').textContent = sa.id;
  document.getElementById('new-sa-details').innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Name:</span>
      <span class="detail-value">${sa.firstName} ${sa.lastName}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Student Number:</span>
      <span class="detail-value">${sa.studentNumber}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Department:</span>
      <span class="detail-value">${sa.department}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Duty Hours/Week:</span>
      <span class="detail-value">${sa.dutyHours} hours</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Email:</span>
      <span class="detail-value">${sa.email}</span>
    </div>
  `;
}

function useNewID() {
  const newId = document.getElementById('new-sa-id').textContent;
  closeRegistration();
  document.getElementById('sa-id').value = newId;
  
  const sa = SADTRDB.getSAById(newId);
  if (sa) {
    document.getElementById('department').value = sa.department;
  }
  
  document.getElementById('shift-type').focus();
}

// ========================================
// VIEW MY DTR
// ========================================
function viewMyDTR() {
  const saId = prompt('Enter your SA ID:');
  if (!saId) return;
  
  const sa = SADTRDB.getSAById(saId.toUpperCase());
  if (!sa) {
    alert('SA ID not found');
    return;
  }
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const records = SADTRDB.getMonthDTR(sa.id, year, month);
  
  displayDTRModal(sa, records, year, month);
}

function displayDTRModal(sa, records, year, month) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  
  document.getElementById('dtr-month-display').textContent = 
    `${monthNames[month]} ${year} - ${sa.firstName} ${sa.lastName}`;
  
  // Calculate totals
  const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
  const totalLate = records.reduce((sum, r) => sum + (r.late || 0), 0);
  const totalUndertime = records.reduce((sum, r) => sum + (r.undertime || 0), 0);
  const daysWorked = new Set(records.map(r => r.date)).size;
  
  // Summary
  document.getElementById('dtr-summary').innerHTML = `
    <div class="summary-card">
      <div class="summary-value">${Math.round(totalHours * 100) / 100}</div>
      <div class="summary-label">Total Hours</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${daysWorked}</div>
      <div class="summary-label">Days Worked</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${totalLate}</div>
      <div class="summary-label">Total Late (mins)</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${totalUndertime}</div>
      <div class="summary-label">Total Undertime (mins)</div>
    </div>
  `;
  
  // Table
  const tableHtml = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Day</th>
        <th>Shift Type</th>
        <th>Time In</th>
        <th>Time Out</th>
        <th>Hours</th>
        <th>Late</th>
        <th>Undertime</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${records.length === 0 ? 
        '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-dim);">No records for this month</td></tr>' :
        records.sort((a, b) => new Date(a.date) - new Date(b.date)).map(r => {
          const timeIn = r.timeIn ? new Date(r.timeIn) : null;
          const timeOut = r.timeOut ? new Date(r.timeOut) : null;
          
          return `
            <tr>
              <td>${new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
              <td>${r.day}</td>
              <td>${r.shiftType}</td>
              <td>${timeIn ? timeIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
              <td>${timeOut ? timeOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
              <td>${r.hoursWorked ? `${Math.floor(r.hoursWorked)}h ${Math.round((r.hoursWorked - Math.floor(r.hoursWorked)) * 60)}m` : '-'}</td>
              <td>${r.late || '-'}</td>
              <td>${r.undertime || '-'}</td>
              <td><span class="status-badge ${r.status === 'On Duty' ? 'status-on-duty' : 'status-completed'}">${r.status}</span></td>
            </tr>
          `;
        }).join('')
      }
    </tbody>
  `;
  
  document.getElementById('dtr-table').innerHTML = tableHtml;
  document.getElementById('dtr-view-modal').classList.add('show');
}

function closeDTRView() {
  document.getElementById('dtr-view-modal').classList.remove('show');
}

function exportDTR() {
  alert('Export feature coming soon!');
}

// ========================================
// UTILITIES
// ========================================
function updateCurrentDate() {
  const now = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric',
    month: 'long', 
    day: 'numeric' 
  };
  document.getElementById('current-date').textContent = 
    now.toLocaleDateString('en-US', options);
}

function playSound(type) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = type === 'success' ? 880 : 440;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Audio not supported');
  }
}

function initializeParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;
  
  const particleCount = 30;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 18 + 's';
    particle.style.animationDuration = (12 + Math.random() * 12) + 's';
    particlesContainer.appendChild(particle);
  }
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  updateCurrentDate();
  initializeParticles();
  document.getElementById('sa-id').focus();
  
  // Update date every minute
  setInterval(updateCurrentDate, 60000);
});
