// db.js - Live Master Configuration File for Vel Fin Corp

const { Client, Databases, Storage, Functions, Account, ID, Query } = Appwrite;

// எப்போதும் லைவ் மோடில் மட்டுமே இயங்கும்
const currentMode = 'LIVE';
const isLive = true;

const APPWRITE_ENDPOINT = 'https://sfo.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '6ad71a29000d4bde5d4e';

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const storage = new Storage(client);
const functions = new Functions(client);
const accountService = new Account(client);

// உண்மையான லைவ் டேட்டாபேஸ் மற்றும் கலெக்ஷன் ஐடிகள் (Live IDs)
const LIVE_DB = {
    ENDPOINT: APPWRITE_ENDPOINT,
    PROJECT_ID: APPWRITE_PROJECT_ID,
    DB_ID: '6ad71cc60012c0f125b9',
    BORROWERS_ID: '6ad71e920004bbc106eb',       // Live_Borrowers
    LOANS_ID: '6ad71f29001d4ff46c50',           // Live_Loans
    PAYMENTS_ID: '6ad71ee900312b70ce69',        // Live_Payments
    RETAILERS_ID: '6ada05fd0007206813cf',       // Retialers/Staffs
    STAFFS_ID: '6ada05fd0007206813cf',          // Retialers/Staffs (Alias)
    CREDIT_VAULT_ID: '6ad71f29001d4ff46c50',
    PERSONAL_LOAN_ID: '6ad71f29001d4ff46c50',
    DOCUMENTS_BUCKET_ID: '6ad728e7001cd61e6b73',

    // Collection tables (Agent / Follow-up / Cash)
    ASSIGNMENTS_ID: '6aec5d4e003c0ab1eb7f',     // assignments
    FOLLOWUPS_ID: '6aec5d600027adfa08b0',       // followups
    CASH_HANDOVERS_ID: '6aec5d72003d0a9b6810'   // cash_handovers
};

// Global variables - லைவ் ஐடிகள் மட்டுமே இணைக்கப்படும்
window.appwriteClient = client;
window.appwriteDatabases = databases;
window.appwriteStorage = storage;
window.appwriteFunctions = functions;
window.appwriteAccount = accountService;
window.VFC_DB = LIVE_DB;
window.AppwriteID = ID;
window.AppwriteQuery = Query;

/* ================= Shared helper functions (used by login, borrower portal, reminders ...) ================= */

// Last 10 digits of any phone number
window.vfcLast10 = function(v) {
    const d = String(v || '').replace(/\D/g, '');
    return d.length > 10 ? d.slice(-10) : d;
};

// Read ALL documents of a collection (Appwrite returns only 25 by default, 100 max per request)
window.vfcFetchAll = async function(collectionId) {
    const all = [];
    const hasOffset = typeof Query.offset === 'function';
    let offset = 0;
    while (true) {
        const queries = [Query.limit(100)];
        if (hasOffset) queries.push(Query.offset(offset));
        const res = await databases.listDocuments(LIVE_DB.DB_ID, collectionId, queries);
        const docs = res.documents || [];
        all.push(...docs);
        if (!hasOffset || docs.length < 100) break;
        offset += 100;
    }
    return all;
};

// Read only the rows where field == value (needs an Index on that field in Appwrite).
// If the index does not exist, it safely falls back to reading everything and filtering here.
window.vfcQueryEqualOrAll = async function(collectionId, field, value, fallbackMatchFn) {
    try {
        const out = [];
        const hasOffset = typeof Query.offset === 'function';
        let offset = 0;
        while (true) {
            const queries = [Query.equal(field, [value]), Query.limit(100)];
            if (hasOffset) queries.push(Query.offset(offset));
            const res = await databases.listDocuments(LIVE_DB.DB_ID, collectionId, queries);
            const docs = res.documents || [];
            out.push(...docs);
            if (!hasOffset || docs.length < 100) break;
            offset += 100;
        }
        return out;
    } catch (e) {
        const all = await window.vfcFetchAll(collectionId);
        return typeof fallbackMatchFn === 'function' ? all.filter(fallbackMatchFn) : all;
    }
};

// Borrowers registered with this mobile number (phone OR whatsapp)
window.vfcFindBorrowersByMobile = async function(mobile) {
    const m = window.vfcLast10(mobile);
    const matchFn = b => window.vfcLast10(b.phone_number) === m || window.vfcLast10(b.whatsapp_number) === m;
    const a = await window.vfcQueryEqualOrAll(LIVE_DB.BORROWERS_ID, 'phone_number', m, matchFn);
    const b = await window.vfcQueryEqualOrAll(LIVE_DB.BORROWERS_ID, 'whatsapp_number', m, matchFn);
    const seen = new Set();
    return a.concat(b).filter(d => (seen.has(d.$id) ? false : (seen.add(d.$id), true)));
};

// Strict Global Role-Based Security & Back-Forward Cache (bfcache) Protection
(function() {
    const publicPages = ['index.html', 'login.html', 'contact.html', ''];

    let adminVerified = false;   // kept in memory only - cannot be forged from the browser console
    let adminVerifying = false;

    function getAllowedModulesForCurrentUser(userRole) {
        if (userRole === 'retailer') {
            // ரீடெய்லருக்கு எப்போதும் இந்த 2 மாடியூல்கள் மட்டுமே
            return ['borrowers-details.html', 'creditvault.html'];
        }
        if (userRole === 'borrower') {
            return ['borrower-portal.html'];
        }
        if (userRole === 'staff') {
            try {
                const stored = JSON.parse(sessionStorage.getItem('velfincorp_permissions') || 'null');
                if (Array.isArray(stored) && stored.length > 0) {
                    return stored
                        .map(p => p === 'Support Mail' ? 'mail-inbox.html' : p)
                        .filter(p => p !== 'dashboard.html');
                }
            } catch (e) {}
            return ['borrowers-details.html', 'payments.html'];
        }
        return null; // admin gets all modules
    }

    function forceLogoutToLogin() {
        document.documentElement.style.display = 'none';
        sessionStorage.clear();
        localStorage.removeItem('velfincorp_logged_user');
        window.location.replace('login.html');
    }

    // Admin must have a REAL Appwrite login session (created at login.html with the admin e-mail & password)
    function verifyAdminSession() {
        if (!window.appwriteAccount) return Promise.resolve(false);
        return window.appwriteAccount.get().then(() => true).catch(() => false);
    }

    // பக்கம் லோடு ஆவதற்கு முன்பே அனுமதி இல்லாத சைடுபார் மெனுக்களை CSS மூலம் மறைத்தல்
    function injectImmediateSidebarLockStyle() {
        const currentPage = window.location.pathname.split("/").pop() || "index.html";
        const userRole = sessionStorage.getItem('velfincorp_role');
        if (!userRole || userRole === 'admin' || publicPages.includes(currentPage)) return;

        if (!document.getElementById('vfc-strict-menu-lock')) {
            const style = document.createElement('style');
            style.id = 'vfc-strict-menu-lock';
            style.innerHTML = `.sidebar-menu li:not(.vfc-allowed-module) { display: none !important; }`;
            document.head.appendChild(style);
        }
    }

    // Adds extra links to every page's sidebar automatically (admin sees them; staff only if allowed)
    function injectExtraMenuItems() {
        const menu = document.querySelector('.sidebar-menu');
        if (!menu) return;
        const items = [
            { href: 'defaulters-report.html', icon: 'fa-exclamation-triangle', label: 'Defaulters Report' },
            { href: 'my-collection.html',     icon: 'fa-clipboard-list',       label: 'My Collection List' }
        ];
        let anchor = menu.querySelector('a[href="allpayments-report.html"]');
        let after = (anchor && anchor.parentElement && anchor.parentElement.parentElement === menu) ? anchor.parentElement : null;
        items.forEach(it => {
            let existing = menu.querySelector('a[href="' + it.href + '"]');
            if (existing) { after = existing.parentElement; return; }
            const li = document.createElement('li');
            li.innerHTML = '<a href="' + it.href + '"><i class="fas ' + it.icon + '"></i> ' + it.label + '</a>';
            if (after) menu.insertBefore(li, after.nextSibling); else menu.appendChild(li);
            after = li;
        });
    }

    function applySidebarMenuFilter() {
        injectExtraMenuItems();
        const userRole = sessionStorage.getItem('velfincorp_role');
        if (!userRole || userRole === 'admin') {
            const lockStyle = document.getElementById('vfc-strict-menu-lock');
            if (lockStyle) lockStyle.remove();
            document.querySelectorAll('.sidebar-menu li').forEach(li => {
                li.style.display = '';
            });
            return;
        }

        const allowedModules = getAllowedModulesForCurrentUser(userRole) || [];
        const menuLinks = document.querySelectorAll('.sidebar-menu li a');
        menuLinks.forEach(a => {
            const href = (a.getAttribute('href') || '').trim();
            const li = a.parentElement;
            if (href && allowedModules.includes(href)) {
                li.classList.add('vfc-allowed-module');
                li.style.display = 'block';
            } else if (li) {
                li.classList.remove('vfc-allowed-module');
                li.remove(); // அனுமதி இல்லாத மெனுவை DOM-ல் இருந்தே நீக்குதல்
            }
        });
    }

    function enforcePortalSecurity() {
        const currentPage = window.location.pathname.split("/").pop() || "index.html";

        // லாகின் பக்கத்தில் இருந்தால் செஷனை அழித்துப் புதிய லாகின் கேட்கச் செய்தல்
        if (currentPage === 'login.html') {
            sessionStorage.clear();
            localStorage.removeItem('velfincorp_logged_user');
            if (!window.__vfcLoginSessionCleared) {
                window.__vfcLoginSessionCleared = true;
                // also end any old Appwrite admin session (once per page load)
                if (window.appwriteAccount) window.appwriteAccount.deleteSession('current').catch(() => {});
            }
            return;
        }

        if (publicPages.includes(currentPage)) {
            return;
        }

        const loggedUser = sessionStorage.getItem('velfincorp_logged_user');
        const userRole = sessionStorage.getItem('velfincorp_role');

        // லாகின் செய்யாமல் Back/Forward பட்டன் மூலம் உள்ளே வர முயன்றால் உடனடியாக லாகின் பக்கத்திற்குத் திருப்பி அனுப்புதல்
        if (!loggedUser || !userRole) {
            document.documentElement.style.display = 'none';
            window.location.replace('login.html');
            return;
        }

        // Admin: verify the real Appwrite session before showing anything
        if (userRole === 'admin' && !adminVerified) {
            document.documentElement.style.visibility = 'hidden';
            if (!adminVerifying) {
                adminVerifying = true;
                verifyAdminSession().then(ok => {
                    adminVerifying = false;
                    if (ok) {
                        adminVerified = true;
                        document.documentElement.style.visibility = '';
                    } else {
                        forceLogoutToLogin();
                    }
                });
            }
        }

        // Admin அல்லாதவர்கள் (Retailer / Staff / Borrower) அனுமதி இல்லாத பக்கத்திற்கு Back/Forward மூலம் சென்றால் உடனடியாக லாக்-அவுட்
        if (userRole !== 'admin') {
            const allowedModules = getAllowedModulesForCurrentUser(userRole) || [];
            if (!allowedModules.includes(currentPage)) {
                forceLogoutToLogin();
                return;
            }
        }

        injectImmediateSidebarLockStyle();
        applySidebarMenuFilter();
    }

    // 1. Run immediately before page renders
    enforcePortalSecurity();

    // 2. Run on DOMContentLoaded + Inject Favicon
    window.addEventListener('DOMContentLoaded', () => {
        let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/jpeg';
        link.rel = 'icon';
        link.href = 'velfincorp-logo.jpeg';
        document.getElementsByTagName('head')[0].appendChild(link);

        enforcePortalSecurity();
    });

    // 3. Run every time Mobile/Desktop Back or Forward button is pressed (bfcache restore)
    window.addEventListener('pageshow', (event) => {
        enforcePortalSecurity();
    });

    window.addEventListener('popstate', () => {
        enforcePortalSecurity();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            enforcePortalSecurity();
        }
    });
})();


/* ================= Responsive layout for phones & tablets (all pages) ================= */
(function () {
    const css = `
    .vfc-menu-btn { display: none; }
    .vfc-backdrop { display: none; }
    @media (max-width: 900px) {
        html, body { overflow-x: hidden; max-width: 100%; }
        body.vfc-has-sidebar { display: block !important; }
        body.vfc-has-sidebar .sidebar { transform: translateX(-105%); transition: transform .25s ease; z-index: 3000 !important; width: 272px !important; top: 0 !important; bottom: 0 !important; height: auto !important; -webkit-overflow-scrolling: touch; }
        body.vfc-menu-open .sidebar { transform: translateX(0); box-shadow: 0 0 40px rgba(0,0,0,.45); }
        body.vfc-menu-open .vfc-backdrop { display: block; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.45); z-index: 2500; }
        .vfc-menu-btn { display: flex; position: fixed; top: 10px; left: 10px; z-index: 2400; width: 44px; height: 44px; border: none; border-radius: 10px; background: #0F1D36; color: #C5A059; font-size: 20px; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,.25); cursor: pointer; }
        body.vfc-menu-open .vfc-menu-btn { display: none; }
        body.vfc-has-sidebar .main-content { margin-left: 0 !important; padding: 64px 12px 24px !important; width: 100% !important; max-width: 100vw; box-sizing: border-box; height: auto !important; min-width: 0; }
        .container { padding: 16px !important; max-width: 100% !important; }
        .form-row { flex-direction: column; gap: 12px !important; }
        .form-group { min-width: 0 !important; width: 100%; }
        input, select, textarea { font-size: 16px !important; }
        .modal-content { width: 96% !important; max-width: 96% !important; padding: 16px !important; }
        .container > table, .admin-control-box > table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .header-flex, .header-row, .header { flex-wrap: wrap; }
        .mail-app-container { flex-direction: column; }
        .mail-folders { width: 100% !important; box-sizing: border-box; border-right: none !important; border-bottom: 1px solid #e2e8f0; }
        .cards-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
    }`;
    try {
        const style = document.createElement('style');
        style.id = 'vfc-responsive-style';
        style.textContent = css;
        document.head.appendChild(style);
    } catch (e) {}

    window.addEventListener('DOMContentLoaded', function () {
        if (!document.querySelector('.sidebar')) return;
        document.body.classList.add('vfc-has-sidebar');

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vfc-menu-btn';
        btn.setAttribute('aria-label', 'Menu');
        btn.innerHTML = '&#9776;';
        const backdrop = document.createElement('div');
        backdrop.className = 'vfc-backdrop';

        btn.addEventListener('click', function () { document.body.classList.add('vfc-menu-open'); });
        backdrop.addEventListener('click', function () { document.body.classList.remove('vfc-menu-open'); });
        document.body.appendChild(btn);
        document.body.appendChild(backdrop);

        // close the drawer after choosing a menu item
        document.querySelectorAll('.sidebar a').forEach(function (a) {
            a.addEventListener('click', function () { document.body.classList.remove('vfc-menu-open'); });
        });
    });
})();

console.log("Vel Fin Corp Live Environment Initialized with Strict Role & Back-Button Protection");
