// Global variables
let allData = [];
let dailyData = [];
let monthlyData = [];
let performanceChart = null;
let balanceChart = null;
let startingBalance = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    document.getElementById('date').valueAsDate = new Date();
    
    // Load settings and data
    loadSettings();
    loadData();
});

// Load settings (starting balance)
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const result = await response.json();
        
        if (result.success) {
            startingBalance = result.data.starting_balance || 0;
            document.getElementById('startingBalance').value = startingBalance;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Update starting balance
async function updateStartingBalance() {
    const newBalance = parseFloat(document.getElementById('startingBalance').value) || 0;
    
    try {
        const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                starting_balance: newBalance
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            startingBalance = newBalance;
            showToast('Starting balance updated successfully!', 'success');
            // Recalculate everything with new starting balance
            await calculateMetrics();
        } else {
            showToast('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error updating starting balance', 'error');
        console.error('Error:', error);
    }
}

// Load all data from database
async function loadData() {
    try {
        const response = await fetch('/api/entries');
        const result = await response.json();
        
        if (result.success) {
            allData = result.data;
            await calculateMetrics();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data', 'error');
    }
}

// Add new entry
async function addEntry() {
    const date = document.getElementById('date').value;
    const gain = parseFloat(document.getElementById('gain').value) || 0;
    const loss = parseFloat(document.getElementById('loss').value) || 0;
    const withdrawal = parseFloat(document.getElementById('withdrawal').value) || 0;
    const deposit = parseFloat(document.getElementById('deposit').value) || 0;
    
    if (!date) {
        showToast('Please select a date', 'error');
        return;
    }
    
    const entry = {
        Date: date,
        Gain: gain,
        Loss: loss,
        Withdrawal: withdrawal,
        Deposit: deposit
    };
    
    try {
        const response = await fetch('/api/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(entry)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Entry added successfully!', 'success');
            // Clear form
            document.getElementById('gain').value = '';
            document.getElementById('loss').value = '';
            document.getElementById('withdrawal').value = '';
            document.getElementById('deposit').value = '';
            // Reload data
            await loadData();
        } else {
            showToast('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error adding entry', 'error');
        console.error('Error:', error);
    }
}

// Delete entry
async function deleteEntry(entryId) {
    if (!confirm('Are you sure you want to delete this entry?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/entries/${entryId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Entry deleted successfully!', 'success');
            await loadData();
        } else {
            showToast('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error deleting entry', 'error');
        console.error('Error:', error);
    }
}

// Calculate all metrics
async function calculateMetrics() {
    if (allData.length === 0) {
        updateDashboard([], []);
        return;
    }
    
    try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: allData
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            dailyData = result.daily;
            monthlyData = result.monthly;
            updateDashboard(dailyData, monthlyData);
        }
    } catch (error) {
        console.error('Error calculating metrics:', error);
    }
}

// Update dashboard
function updateDashboard(daily, monthly) {
    if (daily.length === 0) {
        // Show empty state
        document.getElementById('totalGains').textContent = '$0.00';
        document.getElementById('totalLosses').textContent = '$0.00';
        document.getElementById('netPnL').textContent = '$0.00';
        document.getElementById('currentBalance').textContent = '$' + startingBalance.toFixed(2);
        document.getElementById('totalWithdrawals').textContent = '$0.00';
        document.getElementById('totalDeposits').textContent = '$0.00';
        document.getElementById('tradingDays').textContent = '0';
        document.getElementById('avgDailyPnL').textContent = '$0.00';
        
        document.getElementById('recentTableBody').innerHTML = '<tr><td colspan="7" class="no-data">No entries yet. Add your first entry!</td></tr>';
        document.getElementById('dailyTableBody').innerHTML = '<tr><td colspan="13" class="no-data">No data available</td></tr>';
        document.getElementById('monthlyTableBody').innerHTML = '<tr><td colspan="11" class="no-data">No data available</td></tr>';
        return;
    }
    
    const lastEntry = daily[daily.length - 1];
    
    // Update key metrics
    document.getElementById('totalGains').textContent = '$' + lastEntry.Cgain.toFixed(2);
    document.getElementById('totalLosses').textContent = '$' + lastEntry.Closs.toFixed(2);
    document.getElementById('netPnL').textContent = '$' + lastEntry.Cum.toFixed(2);
    document.getElementById('currentBalance').textContent = '$' + lastEntry.Balance.toFixed(2);
    document.getElementById('totalWithdrawals').textContent = '$' + lastEntry.CWithdrawal.toFixed(2);
    document.getElementById('totalDeposits').textContent = '$' + lastEntry.CDeposit.toFixed(2);
    document.getElementById('tradingDays').textContent = daily.length;
    
    const avgDaily = lastEntry.Cum / daily.length;
    document.getElementById('avgDailyPnL').textContent = '$' + avgDaily.toFixed(2);
    
    // Update recent entries table (last 10)
    const recentEntries = daily.slice(-10).reverse();
    const recentTableBody = document.getElementById('recentTableBody');
    recentTableBody.innerHTML = '';
    
    recentEntries.forEach(entry => {
        const row = document.createElement('tr');
        const netClass = entry.Net >= 0 ? 'positive' : 'negative';
        
        // Find the entry ID from allData
        const originalEntry = allData.find(e => e.Date === entry.Date);
        const entryId = originalEntry ? originalEntry.id : null;
        
        row.innerHTML = `
            <td>${entry.Date}</td>
            <td>$${entry.Gain.toFixed(2)}</td>
            <td>$${entry.Loss.toFixed(2)}</td>
            <td class="${netClass}">$${entry.Net.toFixed(2)}</td>
            <td>$${entry.Cum.toFixed(2)}</td>
            <td>$${entry.Balance.toFixed(2)}</td>
            <td>
                ${entryId ? `<button class="btn btn-sm btn-danger" onclick="deleteEntry(${entryId})"><i class="fas fa-trash"></i></button>` : ''}
            </td>
        `;
        recentTableBody.appendChild(row);
    });
    
    // Update daily table
    updateDailyTable(daily);
    
    // Update monthly table
    updateMonthlyTable(monthly);
    
    // Update charts
    updateCharts(daily);
}

// Update daily table
function updateDailyTable(data) {
    const tbody = document.getElementById('dailyTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="no-data">No data available</td></tr>';
        return;
    }
    
    data.forEach(entry => {
        const row = document.createElement('tr');
        const netClass = entry.Net >= 0 ? 'positive' : 'negative';
        
        row.innerHTML = `
            <td>${entry.Sl}</td>
            <td>${entry.Date}</td>
            <td>$${entry.Gain.toFixed(2)}</td>
            <td>$${entry.Cgain.toFixed(2)}</td>
            <td>$${entry.Loss.toFixed(2)}</td>
            <td>$${entry.Closs.toFixed(2)}</td>
            <td class="${netClass}">$${entry.Net.toFixed(2)}</td>
            <td>$${entry.Cum.toFixed(2)}</td>
            <td>$${entry.Withdrawal.toFixed(2)}</td>
            <td>$${entry.CWithdrawal.toFixed(2)}</td>
            <td>$${entry.Deposit.toFixed(2)}</td>
            <td>$${entry.CDeposit.toFixed(2)}</td>
            <td class="${entry.Balance >= startingBalance ? 'positive' : 'negative'}">$${entry.Balance.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Update monthly table
function updateMonthlyTable(data) {
    const tbody = document.getElementById('monthlyTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="no-data">No data available</td></tr>';
        return;
    }
    
    data.forEach(entry => {
        const row = document.createElement('tr');
        const netClass = entry.Net >= 0 ? 'positive' : 'negative';
        
        // Format month as "MMM YYYY"
        const monthDate = new Date(entry.Month);
        const monthStr = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        row.innerHTML = `
            <td>${entry.Sl}</td>
            <td>${monthStr}</td>
            <td>$${entry.Gain.toFixed(2)}</td>
            <td>$${entry.Loss.toFixed(2)}</td>
            <td class="${netClass}">$${entry.Net.toFixed(2)}</td>
            <td>$${entry.Cum.toFixed(2)}</td>
            <td>$${entry.Withdrawal.toFixed(2)}</td>
            <td>$${entry.CWithdrawal.toFixed(2)}</td>
            <td>$${entry.Deposit.toFixed(2)}</td>
            <td>$${entry.CDeposit.toFixed(2)}</td>
            <td class="${entry.Balance >= startingBalance ? 'positive' : 'negative'}">$${entry.Balance.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Update charts
function updateCharts(data) {
    const labels = data.map(d => d.Date);
    const gains = data.map(d => d.Gain);
    const losses = data.map(d => d.Loss);
    const netValues = data.map(d => d.Net);
    const balances = data.map(d => d.Balance);
    
    // Performance Chart
    const performanceCtx = document.getElementById('performanceChart');
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    performanceChart = new Chart(performanceCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Gain ($)',
                    data: gains,
                    backgroundColor: 'rgba(52, 211, 153, 0.8)',
                    borderColor: 'rgb(52, 211, 153)',
                    borderWidth: 1
                },
                {
                    label: 'Loss ($)',
                    data: losses,
                    backgroundColor: 'rgba(248, 113, 113, 0.8)',
                    borderColor: 'rgb(248, 113, 113)',
                    borderWidth: 1
                },
                {
                    label: 'Net ($)',
                    data: netValues,
                    backgroundColor: 'rgba(96, 165, 250, 0.8)',
                    borderColor: 'rgb(96, 165, 250)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Daily Performance'
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Balance Chart
    const balanceCtx = document.getElementById('balanceChart');
    if (balanceChart) {
        balanceChart.destroy();
    }
    
    balanceChart = new Chart(balanceCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Balance ($)',
                    data: balances,
                    borderColor: 'rgb(139, 92, 246)',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Balance Over Time'
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Switch tabs
function switchTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Remove active class from all buttons
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// Export to Excel
async function exportExcel() {
    if (allData.length === 0) {
        showToast('No data to export', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/export/excel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: allData
            })
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
            showToast('Excel file exported successfully!', 'success');
        } else {
            showToast('Error exporting file', 'error');
        }
    } catch (error) {
        showToast('Error exporting file', 'error');
        console.error('Error:', error);
    }
}

// Import from Excel/CSV
async function importExcel() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/import/excel', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Data imported successfully!', 'success');
            fileInput.value = '';
            await loadData();
        } else {
            showToast('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error importing file', 'error');
        console.error('Error:', error);
    }
}

// Clear all data
async function clearAll() {
    if (!confirm('Are you sure you want to delete ALL entries? This cannot be undone!')) {
        return;
    }
    
    try {
        // Delete all entries one by one
        const deletePromises = allData.map(entry => 
            fetch(`/api/entries/${entry.id}`, { method: 'DELETE' })
        );
        
        await Promise.all(deletePromises);
        
        showToast('All entries cleared!', 'success');
        await loadData();
    } catch (error) {
        showToast('Error clearing data', 'error');
        console.error('Error:', error);
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
