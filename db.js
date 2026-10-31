// db.js - Live Master Configuration File for Vel Fin Corp

const { Client, Databases, Storage, Functions, ID, Query } = Appwrite;

// எப்போதும் லைவ் மோடில் மட்டுமே இயங்கும்
const currentMode = 'LIVE';
const isLive = true;

const client = new Client()
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')  
    .setProject('6ad71a29000d4bde5d4e');  

const databases = new Databases(client);
const storage = new Storage(client);
const functions = new Functions(client);

// உண்மையான லைவ் டேட்டாபேஸ் மற்றும் கலெக்ஷன் ஐடிகள் (Live IDs)
const LIVE_DB = {
    DB_ID: '6ad71cc60012c0f125b9',
    BORROWERS_ID: '6ad71e920004bbc106eb',       // Live_Borrowers
    LOANS_ID: '6ad71f29001d4ff46c50',           // Live_Loans
    PAYMENTS_ID: '6ad71ee900312b70ce69',        // Live_Payments
    RETAILERS_ID: '6ada05fd0007206813cf',       // Retialers/Staffs
    STAFFS_ID: '6ada05fd0007206813cf',          // Retialers/Staffs (Alias)
    CREDIT_VAULT_ID: '6ad71f29001d4ff46c50',  
    PERSONAL_LOAN_ID: '6ad71f29001d4ff46c50',  
    DOCUMENTS_BUCKET_ID: '6ad728e7001cd61e6b73' 
};

// Global variables - லைவ் ஐடிகள் மட்டுமே இணைக்கப்படும்
window.appwriteClient = client;
window.appwriteDatabases = databases;
window.appwriteStorage = storage;
window.appwriteFunctions = functions;
window.VFC_DB = LIVE_DB;
window.AppwriteID = ID;
window.AppwriteQuery = Query;

// Global Favicon + Role-Based Module Access Protection
(function() {
    window.addEventListener('DOMContentLoaded', () => {
        // 1. Inject Website Logo (Favicon)
        let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/jpeg';
        link.rel = 'icon';
        link.href = 'velfincorp-logo.jpeg';
        document.getElementsByTagName('head')[0].appendChild(link);

        // 2. Enforce Module Access Restrictions for Retailer & Staff
        const userRole = sessionStorage.getItem('velfincorp_role');
        const currentPage = window.location.pathname.split("/").pop() || "index.html";
        const publicPages = ['index.html', 'login.html', 'contact.html', 'borrower-portal.html', ''];

        if (!userRole || userRole === 'admin' || publicPages.includes(currentPage)) {
            return;
        }

        let allowedModules = ['borrowers-details.html', 'creditvault.html'];
        try {
            const storedPerms = JSON.parse(sessionStorage.getItem('velfincorp_permissions') || 'null');
            if (Array.isArray(storedPerms) && storedPerms.length > 0) {
                allowedModules = storedPerms.map(p => p === 'Support Mail' ? 'mail-inbox.html' : p);
            }
        } catch (e) {
            allowedModules = ['borrowers-details.html', 'creditvault.html'];
        }

        // रीडெய்லருக்கு எப்போதும் Borrower Details & Credit Vault Loan மட்டுமே
        if (userRole === 'retailer' && (!allowedModules || allowedModules.length === 0)) {
            allowedModules = ['borrowers-details.html', 'creditvault.html'];
        }

        // Sidebar-ல் அனுமதி இல்லாத மாடியூல்களை மறைத்தல்
        const menuLinks = document.querySelectorAll('.sidebar-menu li a');
        menuLinks.forEach(a => {
            const href = a.getAttribute('href');
            if (href && !allowedModules.includes(href)) {
                a.parentElement.style.display = 'none';
            }
        });

        // அனுமதி இல்லாத பக்கத்தை ஓபன் செய்தால், அனுமதிக்கப்பட்ட முதல் பக்கத்திற்கு மாற்றுதல்
        if (!allowedModules.includes(currentPage)) {
            window.location.replace(allowedModules[0] || 'borrowers-details.html');
        }
    });
})();

console.log("Vel Fin Corp Live Environment Initialized Successfully with Global Access Control");
