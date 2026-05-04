const API_BASE = 'http://localhost:5000/api';
let currentToken = null;

document.addEventListener('DOMContentLoaded', () => {
    currentToken = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!currentToken) {
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('userNameDisplay').textContent = `Welcome, ${user.name || user.email}`;
    fetchViolations(currentToken);
});

async function fetchViolations(token) {
    const tbody = document.getElementById('violationsTableBody');
    
    try {
        const response = await fetch(`${API_BASE}/traffic/violations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        const data = await response.json();
        
        if (response.ok) {
            renderViolations(data.violations);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${data.message}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to connect to server. Ensure backend is running.</td></tr>`;
    }
}

function renderViolations(violations) {
    const tbody = document.getElementById('violationsTableBody');
    
    if (!violations || violations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No violations found.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = violations.map(v => `
        <tr>
            <td>#${v.id}</td>
            <td class="fw-bold">${v.vehicle_number}</td>
            <td>${v.violation_type}</td>
            <td>$${v.fine_amount.toFixed(2)}</td>
            <td>
                <span class="badge bg-${v.status === 'paid' ? 'success' : v.status === 'pending' ? 'warning text-dark' : 'danger'}">
                    ${v.status.toUpperCase()}
                </span>
            </td>
            <td>${new Date(v.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="initiatePayment(${v.id}, ${v.fine_amount})" ${v.status === 'paid' ? 'disabled' : ''}>
                    Pay Now
                </button>
            </td>
        </tr>
    `).join('');
}

function initiatePayment(violationId, amount) {
    // Show modal stating integration is pending
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
