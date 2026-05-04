const API_BASE = 'https://traffic-tracking-system.onrender.com/api';

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const alertBox = document.getElementById('loginAlert');
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'dashboard.html';
        } else {
            alertBox.textContent = data.message || 'Login failed';
            alertBox.classList.remove('d-none');
        }
    } catch (error) {
        alertBox.textContent = 'Server error. Please try again later.';
        alertBox.classList.remove('d-none');
    }
});
