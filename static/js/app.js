// Global state
let appData = {
    entries: [],
    dailyMetrics: [],
    monthlyMetrics: [],
    exchangeRate: 80
};

let charts = {
    cumulative: null,
    gainsLosses: null,
    balance: null,
    monthly: null
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    document.getElementById('entryDate').valueAsDate = new Date();
    
    // Load data from localStorage
    loadData();
    
    // Setup event listeners
    document.getElementById('addEntryForm').addEventListener('submit', handleAddEntry);
    document.getElementById('exchangeRate').addEventListener('change', function(e) {
        appData.exchangeRate = parseFloat(e.target.value);
        calculateMetrics();
    });
    
    // Setup date filter
    document.getElementById('dateFilter').addEventListener('change', function(e) {
        if (e.target.value === 'custom') {
            document.getElementById('customRange').style.display = 'flex';
        } else {
            document.getElementById('customRange').style.display = 'none';
            applyDateFilter();
        }
    });
    
    // Initial render
    calculateMetrics();
});

// Add new entry
function handleAddEntry(e) {
    e.preventDefault();
    
    const entry = {
        Date: document.getElementById('entryDate').value,
        Gain: parseFloat(document.getElementById('entryGain').value) || 0,
        Loss: parseFloat(document.getElementById('entryLoss').value) || 0,
        WD: parseFloat(document.getElementById('entryWD').value) || 0
    };
    
    appData.entries.push(entry);
    
    // Reset form
    document.getElementById('addEntryForm').reset();
    document.getElementById('entryDate').valueAsDate = new Date();
    
    // Save and recalculate
    saveData();
    calculateMetrics();
    
    showToast('Entry added successfully!', 'success');
}

// Calculate all metrics
async function calculateMetrics() {
    if (appData.entries.length === 0) {
        renderDashboard();
        return;
    }
    
    try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: appData.entries })
        });
        
        const result = await response.json();
        
        if (result.success) {
            appData.dailyMetrics = result.daily;
            appData.monthlyMetrics = result.monthly;
            renderDashboard();
            renderDailyView();
            renderMonthlyView();
            renderCharts();
        } else {
            showToast(result.error, 'error');
        }
    } catch (error) {
        console.error('Error calculating metrics:', error);
        showToast('Error calculating metrics', 'error');
    }
}

// Render Dashboard
function renderDashboard() {
    if (appData.dailyMetrics.length === 0) {
        document.getElementById('recentEntries').innerHTML = '<p class="empty-state">No entries yet. Add your first entry to get started!</p>';
        return;
    }
    
    const latest = appData.dailyMetrics[appData.dailyMetrics.length - 1];
    const totalGains = appData.dailyMetrics.reduce((sum, item) => sum + item.Gain, 0);
    const totalLosses = appData.dailyMetrics.reduce((sum, item) => sum + item.Loss, 0);
    const netPnL = totalGains - totalLosses;
    const tradingDays = appData.dailyMetrics.filter(item => item.Net !== 0).length;
    const avgDaily = tradingDays > 0 ? netPnL / tradingDays : 0;
    
    document.getElementById('totalGains').textContent = formatCurrency(totalGains);
    document.getElementById('totalLosses').textContent = formatCurrency(totalLosses);
    document.getElementById('netPnL').textContent = formatCurrency(netPnL);
    document.getElementById('netPnL').style.color = netPnL >= 0 ? 'var(--success)' : 'var(--danger)';
    document.getElementById('currentBalance').textContent = formatCurrency(latest.Balance);
    document.getElementById('currentBalance').style.color = latest.Balance >= 0 ? 'var(--success)' : 'var(--danger)';
    document.getElementById('totalWD').textContent = formatCurrency(latest.CWD);
    document.getElementById('totalWDINR').textContent = '₹' + latest.CWD_INR.toFixed(2);
    document.getElementById('tradingDays').textContent = tradingDays;
    document.getElementById('avgDaily').textContent = formatCurrency(avgDaily);
    
    // Recent entries table
    const recentData = appData.dailyMetrics.slice(-10).reverse();
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Gain ($)</th>
                    <th>Loss ($)</th>
                    <th>Net ($)</th>
                    <th>Cum ($)</th>
                    <th>Balance ($)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    recentData.forEach(item => {
        html += `
            <tr>
                <td>${item.Date}</td>
                <td style="color: var(--success)">${item.Gain.toFixed(2)}</td>
                <td style="color: var(--danger)">${item.Loss.toFixed(2)}</td>
                <td style="color: ${item.Net >= 0 ? 'var(--success)' : 'var(--danger)'}">${item.Net.toFixed(2)}</td>
                <td>${item.Cum.toFixed(2)}</td>
                <td style="color: ${item.Balance >= 0 ? 'var(--success)' : 'var(--danger)'}">${item.Balance.toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('recentEntries').innerHTML = html;
}

// Render Daily View
function renderDailyView() {
    if (appData.dailyMetrics.length === 0) {
        document.getElementById('dailyTable').innerHTML = '<p class="empty-state">No daily records available.</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Sl</th>
                    <th>Date</th>
                    <th>Gain ($)</th>
                    <th>Cgain ($)</th>
                    <th>Loss ($)</th>
                    <th>Closs ($)</th>
                    <th>Net ($)</th>
                    <th>Cum ($)</th>
                    <th>W/D ($)</th>
                    <th>CWD ($)</th>
                    <th>Balance ($)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    appData.dailyMetrics.forEach(item => {
        html += `
            <tr>
                <td>${item.Sl}</td>
                <td>${item.Date}</td>
                <td style="color: var(--success)">${item.Gain.toFixed(2)}</td>
                <td>${item.Cgain.toFixed(2)}</td>
                <td style="color: var(--danger)">${item.Loss.toFixed(2)}</td>
                <td>${item.Closs.toFixed(2)}</td>
                <td style="color: ${item.Net >= 0 ? 'var(--success)' : 'var(--danger)'}">${item.Net.toFixed(2)}</td>
                <td>${item.Cum.toFixed(2)}</td>
                <td>${item.WD.toFixed(2)}</td>
                <td>${item.CWD.toFixed(2)}</td>
                <td style="color: ${item.Balance >= 0 ? 'var(--success)' : 'var(--danger)'}">${item.Balance.toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('dailyTable').innerHTML = html;
}

// Render Monthly View
function renderMonthlyView() {
    if (appData.monthlyMetrics.length === 0) {
        document.getElementById('monthlyTable').innerHTML = '<p class="empty-state">No monthly data available.</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Sl</th>
                    <th>Month</th>
                    <th>Gain ($)</th>
                    <th>Loss ($)</th>
                    <th>Net ($)</th>
                    <th>Cum ($)</th>
                    <th>W/D ($)</th>
                    <th>CWD ($)</th>
                    <th>Balance ($)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    appData.monthlyMetrics.forEach(item => {
        html += `
            <tr>
                <td>${item.Sl}</td>
                <td>${formatMonth(item.Month)}</td>
                <td style="color: var(--success)">${item.Gain.toFixed(2)}</td>
                <td style="color: var(--danger)">${item.Loss.toFixed(2)}</td>
                <td style="color: ${item.Net >= 0 ? 'var(--success)' : 'var(--danger)'}">${item.Net.toFixed(2)}</td>
                <td>${item.Cum.toFixed(2)}</td>
                <td>${item.WD.toFixed(2)}</td>
                <td>${item.CWD.toFixed(2)}</td>
                <td style="color: ${item.Balance >= 0 ? 'var(--success)' : 'var(--danger)'}">${item.Balance.toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('monthlyTable').innerHTML = html;
}

// Render Charts
function renderCharts() {
    if (appData.dailyMetrics.length === 0) return;
    
    // Cumulative P&L Chart
    if (charts.cumulative) charts.cumulative.destroy();
    const ctxCum = document.getElementById('cumulativePnLChart').getContext('2d');
    charts.cumulative = new Chart(ctxCum, {
        type: 'line',
        data: {
            labels: appData.dailyMetrics.map(item => item.Date),
            datasets: [{
                label: 'Cumulative P&L ($)',
                data: appData.dailyMetrics.map(item => item.Cum),
                borderColor: 'rgb(102, 126, 234)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Cumulative P&L Over Time'
                }
            }
        }
    });
    
    // Gains vs Losses Chart
    if (charts.gainsLosses) charts.gainsLosses.destroy();
    const ctxGL = document.getElementById('gainsLossesChart').getContext('2d');
    charts.gainsLosses = new Chart(ctxGL, {
        type: 'bar',
        data: {
            labels: appData.dailyMetrics.map(item => item.Date),
            datasets: [{
                label: 'Gains ($)',
                data: appData.dailyMetrics.map(item => item.Gain),
                backgroundColor: 'rgba(16, 185, 129, 0.8)'
            }, {
                label: 'Losses ($)',
                data: appData.dailyMetrics.map(item => item.Loss),
                backgroundColor: 'rgba(239, 68, 68, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Daily Gains vs Losses'
                }
            }
        }
    });
    
    // Balance Chart
    if (charts.balance) charts.balance.destroy();
    const ctxBal = document.getElementById('balanceChart').getContext('2d');
    charts.balance = new Chart(ctxBal, {
        type: 'line',
        data: {
            labels: appData.dailyMetrics.map(item => item.Date),
            datasets: [{
                label: 'Balance ($)',
                data: appData.dailyMetrics.map(item => item.Balance),
                borderColor: 'rgb(245, 158, 11)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Account Balance Over Time'
                }
            }
        }
    });
    
    // Monthly P&L Chart
    if (appData.monthlyMetrics.length > 0) {
        if (charts.monthly) charts.monthly.destroy();
        const ctxMon = document.getElementById('monthlyPnLChart').getContext('2d');
        charts.monthly = new Chart(ctxMon, {
            type: 'bar',
            data: {
                labels: appData.monthlyMetrics.map(item => formatMonth(item.Month)),
                datasets: [{
                    label: 'Monthly Net P&L ($)',
                    data: appData.monthlyMetrics.map(item => item.Net),
                    backgroundColor: appData.monthlyMetrics.map(item => 
                        item.Net >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                    )
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Net P&L'
                    }
                }
            }
        });
    }
}

// Tab switching
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
}

// Date filter
function applyDateFilter() {
    const filter = document.getElementById('dateFilter').value;
    // Implementation for filtering daily view
    renderDailyView();
}

// Export to Excel
async function exportExcel() {
    if (appData.entries.length === 0) {
        showToast('No data to export', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/export/excel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: appData.entries })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `PnL_Tracker_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast('Excel exported successfully!', 'success');
        } else {
            showToast('Error exporting Excel', 'error');
        }
    } catch (error) {
        console.error('Error exporting:', error);
        showToast('Error exporting Excel', 'error');
    }
}

// Import file
async function importFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/import/excel', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            appData.entries = result.data;
            saveData();
            calculateMetrics();
            showToast('Data imported successfully!', 'success');
        } else {
            showToast(result.error, 'error');
        }
    } catch (error) {
        console.error('Error importing:', error);
        showToast('Error importing file', 'error');
    }
    
    // Reset file input
    event.target.value = '';
}

// Clear all data
function clearData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        appData.entries = [];
        appData.dailyMetrics = [];
        appData.monthlyMetrics = [];
        saveData();
        renderDashboard();
        renderDailyView();
        renderMonthlyView();
        showToast('All data cleared', 'success');
    }
}

// Save/Load data from localStorage
function saveData() {
    localStorage.setItem('pnlTrackerData', JSON.stringify(appData.entries));
}

function loadData() {
    const saved = localStorage.getItem('pnlTrackerData');
    if (saved) {
        appData.entries = JSON.parse(saved);
    }
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + (type === 'error' ? 'error' : '');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Utility functions
function formatCurrency(value) {
    return '$' + value.toFixed(2);
}

function formatMonth(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}
