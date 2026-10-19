document.addEventListener("DOMContentLoaded", function() {
    const sidebarHTML = `
    <div class="sidebar">
        <div class="sidebar-brand">
            <img src="velfincorp-logo.jpeg" alt="Logo" class="sidebar-logo">
            <div class="sidebar-title">VEL FIN CORP</div>
        </div>
        <ul class="sidebar-menu">
            <li><a href="dashboard.html"><i class="fas fa-home"></i> Main Dashboard</a></li>
            <li><a href="borrowers-details.html"><i class="fas fa-users"></i> Borrower Details</a></li>
            <li><a href="borrowers-report.html"><i class="fas fa-id-card"></i> Borrower Report</a></li>
            <li><a href="creditvault.html"><i class="fas fa-file-invoice-dollar"></i> Credit Vault Loan</a></li>
            <li><a href="personalloan.html"><i class="fas fa-hand-holding-usd"></i> Personal Loan</a></li>
            <li><a href="payments.html"><i class="fas fa-money-bill-wave"></i> Payment Collection</a></li>
            <li><a href="creditvault-report.html"><i class="fas fa-vault"></i> Credit Vault Report</a></li>
            <li><a href="personalloan-report.html"><i class="fas fa-chart-line"></i> Personal Loan Report</a></li>
            <li><a href="allpayments-report.html"><i class="fas fa-receipt"></i> All Payments Report</a></li>
            <li><a href="mail-inbox.html"><i class="fas fa-envelope"></i> Support Mail Inbox</a></li>
            <li><a href="reminders.html"><i class="fas fa-bell"></i> WhatsApp Reminders</a></li>
            <li><a href="retailers.html"><i class="fas fa-store"></i> Retailers & Staff</a></li>
            <li><a href="login.html"><i class="fas fa-key"></i> Access & Password</a></li>
        </ul>
        <div class="sidebar-footer">
            <button onclick="handleLogout()" class="btn-logout"><i class="fas fa-sign-out-alt"></i> Logout</button>
        </div>
    </div>`;

    // எந்தப் பக்கமாக இருந்தாலும் உடனே இந்த மெனுவை அங்கே கொண்டு போய் சேர்த்துவிடும்
    const placeholder = document.getElementById('sidebar-container');
    if (placeholder) {
        placeholder.innerHTML = sidebarHTML;
    }
});

function handleLogout() {
    sessionStorage.clear();
    localStorage.removeItem('velfincorp_logged_user');
    window.location.replace('login.html');
}
