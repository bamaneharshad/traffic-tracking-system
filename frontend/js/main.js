document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const navLinks = document.getElementById('nav-links');
    
    if (token && navLinks) {
        navLinks.innerHTML = `
            <li class="nav-item">
                <a class="nav-link btn btn-outline-light ms-2" href="dashboard.html">Go to Dashboard</a>
            </li>
        `;
    }
});
