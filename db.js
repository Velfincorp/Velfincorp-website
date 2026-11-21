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

/* ===== Feature switches ===== */
window.VFC_FEATURES = {
    // Send the customer a WhatsApp with portal login details when his FIRST loan starts.
    // Turn this to true ONLY after the MSG91 template "vel_fin_portal_login" shows Approved.
    PORTAL_LOGIN_MESSAGE: false,
    PORTAL_LOGIN_TEMPLATE: 'vel_fin_portal_access',

    // Message to the RETAILER when his Credit Vault loan is saved ("amount payable to you").
    // Turn to true only after the MSG91 template below shows Approved.
    RETAILER_PAYABLE_MESSAGE: true,
    RETAILER_PAYABLE_TEMPLATE: 'vel_fin_retailer_payable',

    // Message to the RETAILER when you mark the money as paid (with UTR).
    RETAILER_PAID_MESSAGE: true,
    RETAILER_PAID_TEMPLATE: 'vel_fin_retailer_paid'
};

/* 3-letter retailer code (same rule as the Credit Vault / Borrower forms) */
window.vfcRetailerCode = function(r) {
    const rawShop = String(r.name || '').replace(/\(.*\)/g, '').trim();
    const rawCity = String(r.city || '').trim();
    const shopWords = rawShop.split(/\s+/).filter(Boolean);
    if (rawShop.toLowerCase().includes('vinayaga')) return 'KSV';
    if (rawShop.toLowerCase().includes('kamala')) return 'PKM';
    if (rawCity && rawCity !== '-' && shopWords.length >= 2) return (rawCity[0] + shopWords[0][0] + shopWords[1][0]).toUpperCase();
    if (shopWords.length >= 3) return (shopWords[0][0] + shopWords[1][0] + shopWords[2][0]).toUpperCase();
    if (shopWords.length === 2) return (shopWords[0].substring(0, 2) + shopWords[1][0]).toUpperCase();
    return rawShop.substring(0, 3).toUpperCase() || 'RET';
};

/* Retailer messages (professional Tamil wording) */
window.vfcRupeeText = function(n) { return Math.round(Number(n) || 0).toLocaleString('en-IN'); };
window.vfcRetailerPayableText = function(retailerName, customer, loanId, product, price, down, payable) {
    return `வணக்கம் ${retailerName},\n\nஉங்கள் விற்பனைக்கான கடன் அங்கீகரிக்கப்பட்டுள்ளது.\n\n` +
           `வாடிக்கையாளர்: ${customer}\nகடன் எண்: ${loanId}\nபொருள்: ${product}\n` +
           `பொருளின் விலை: ₹${window.vfcRupeeText(price)}\nடவுன் பேமெண்ட்: ₹${window.vfcRupeeText(down)}\n` +
           `உங்களுக்குச் செலுத்த வேண்டிய தொகை: ₹${window.vfcRupeeText(payable)}\n\n` +
           `இத்தொகை உங்கள் வங்கிக் கணக்கிற்கு அனுப்பப்படும்போது மீண்டும் தெரிவிக்கப்படும். உதவிக்கு: +91 9486886293\n\nநன்றி,\nTeam Vel Fin Corp`;
};
window.vfcRetailerPaidText = function(retailerName, loanId, customer, amount, utr, dateText) {
    return `வணக்கம் ${retailerName},\n\nஉங்களுக்குச் செலுத்த வேண்டிய தொகை உங்கள் வங்கிக் கணக்கிற்கு அனுப்பப்பட்டுள்ளது.\n\n` +
           `கடன் எண்: ${loanId}\nவாடிக்கையாளர்: ${customer}\nஅனுப்பிய தொகை: ₹${window.vfcRupeeText(amount)}\n` +
           `பரிவர்த்தனை எண் (UTR): ${utr}\nதேதி: ${dateText}\n\nஉதவிக்கு: +91 9486886293\n\nநன்றி,\nTeam Vel Fin Corp`;
};

/* ===== WhatsApp message with login details for a Retailer / Staff (opens WhatsApp, text already typed) ===== */
window.vfcCredentialsText = function(name, role, mobile, password) {
    const isStaff = String(role).toLowerCase() === 'staff';
    return `வணக்கம் ${String(name || '').trim()},\n\n` +
           `Vel Fin Corp ${isStaff ? 'பணியாளர்' : 'பார்ட்னர்'} போர்ட்டலில் உங்கள் கணக்கு தயாராகிவிட்டது.\n\n` +
           `இணையதளம்: https://velfincorp.com/login.html\n` +
           `Role: ${isStaff ? 'Staff / Collection Agent' : 'Retailer / Showroom Partner'}\n` +
           `Username: ${window.vfcLast10(mobile)}\n` +
           `Password: ${password}\n\n` +
           `இந்த விவரங்களை வேறு யாருடனும் பகிர வேண்டாம்.\n` +
           `உதவிக்கு: +91 9486886293\n\n` +
           `நன்றி,\nTeam Vel Fin Corp`;
};
window.vfcCredentialsLink = function(name, role, mobile, password) {
    const m = window.vfcLast10(mobile);
    return 'https://wa.me/91' + m + '?text=' + encodeURIComponent(window.vfcCredentialsText(name, role, mobile, password));
};

/* ===== Photos / documents: shared helpers (used by every report, the NOC and the collection pages) ===== */
window.vfcFileUrl = function(fileId) {
    if (!fileId || typeof fileId !== 'string' || !fileId.trim()) return '';
    try {
        const r = window.appwriteStorage.getFileView(VFC_DB.DOCUMENTS_BUCKET_ID, fileId);
        return (r && r.href) ? r.href : String(r);
    } catch (e) { return ''; }
};
window.vfcFilePreviewUrl = function(fileId, w, h) {
    if (!fileId || typeof fileId !== 'string' || !fileId.trim()) return '';
    try {
        const r = window.appwriteStorage.getFilePreview(VFC_DB.DOCUMENTS_BUCKET_ID, fileId, w, h);
        return (r && r.href) ? r.href : String(r);
    } catch (e) { return window.vfcFileUrl(fileId); }
};

/* photo -> small JPEG data URL (so it is also captured in PDFs). '' if it cannot be loaded. Cached. */
const vfcPhotoCache = {};
window.vfcPhotoDataUrl = async function(fileId, maxDim) {
    if (!fileId || typeof fileId !== 'string') return '';
    maxDim = maxDim || 500;
    const key = fileId + '|' + maxDim;
    if (vfcPhotoCache[key] !== undefined) return vfcPhotoCache[key];
    let out = '';
    try {
        const res = await fetch(window.vfcFileUrl(fileId));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        out = await new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                try {
                    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
                    const c = document.createElement('canvas');
                    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
                    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
                    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                    resolve(c.toDataURL('image/jpeg', 0.85));
                } catch (e) { resolve(''); }
                URL.revokeObjectURL(objUrl);
            };
            img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(''); };
            img.src = objUrl;
        });
    } catch (e) { console.warn('Photo could not be loaded:', e); out = ''; }
    vfcPhotoCache[key] = out;
    return out;
};

/* <img> for a stored photo (or a dashed "No photo" box). opts.thumb = small preview first, full photo as fallback. */
window.vfcPhotoTag = function(fileId, w, h, opts) {
    opts = opts || {};
    const box = 'width:' + w + 'px; height:' + h + 'px; object-fit:cover; border:2px solid #0F1D36; border-radius:6px; background:#f1f5f9; flex-shrink:0;';
    if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
        return '<div style="' + box + ' display:flex; align-items:center; justify-content:center; font-size:10px; color:#94a3b8; text-align:center; border-style:dashed;">No<br>photo</div>';
    }
    const full = window.vfcFileUrl(fileId);
    const first = opts.thumb ? window.vfcFilePreviewUrl(fileId, w * 2, h * 2) : full;
    return '<img data-fid="' + fileId + '" src="' + first + '" loading="lazy" alt="Photo" style="' + box + '" onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src=\'' + full + '\';}else{window.vfcPhotoFailed(this);}">';
};

/* If the photo file cannot be opened at all (no permission / deleted), show a clear box instead of a broken-image icon */
window.vfcPhotoFailed = function(img) {
    try {
        const d = document.createElement('div');
        d.style.cssText = 'width:' + (img.style.width || '90px') + '; height:' + (img.style.height || '110px') + '; border:2px dashed #C53030; border-radius:6px; background:#fef2f2; display:flex; align-items:center; justify-content:center; font-size:10px; color:#C53030; text-align:center; flex-shrink:0;';
        d.title = 'The photo file could not be opened (storage permission, or the file was deleted).';
        d.innerHTML = 'Photo<br>not<br>available';
        img.replaceWith(d);
    } catch (e) {}
};

/* make every photo inside root PDF-safe (data URLs). Call (and await) before html2pdf. */
window.vfcHydratePhotos = async function(root) {
    if (!root) return;
    const imgs = Array.from(root.querySelectorAll('img[data-fid]'));
    await Promise.all(imgs.map(async img => {
        const d = await window.vfcPhotoDataUrl(img.dataset.fid, 500);
        if (d) img.src = d;
    }));
};

/* put the customer photo on the SIDE of whatever is already inside a modal body */
window.vfcAddPhotoSide = function(container, fileId, caption) {
    if (!container) return;
    const inner = container.innerHTML;
    const cap = caption ? '<div style="font-size:11px; color:#475569; margin-top:5px; word-break:break-word;">' + String(caption).replace(/</g, '&lt;') + '</div>' : '';
    container.innerHTML = '<div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">' +
        '<div style="flex:0 0 130px; text-align:center;">' + window.vfcPhotoTag(fileId, 120, 150) + cap + '</div>' +
        '<div style="flex:1; min-width:300px; overflow-x:auto;">' + inner + '</div></div>';
    window.vfcHydratePhotos(container);
};

window.vfcFindBorrowerProfile = function(list, name, phone) {
    const nm = String(name || '').trim().toLowerCase();
    const ph = window.vfcLast10(phone);
    const phoneMatch = b => ph && (window.vfcLast10(b.phone_number) === ph || window.vfcLast10(b.whatsapp_number) === ph);
    return (list || []).find(b => String(b.full_name || '').trim().toLowerCase() === nm && phoneMatch(b))
        || (list || []).find(b => String(b.full_name || '').trim().toLowerCase() === nm)
        || null;
};

/* ===== Customer portal login details (same rule as login.html) =====
   username = 10-digit mobile number, password = date of birth DDMMYYYY
   (the last 4 digits of the mobile are used only when no date of birth is saved for the borrower) */
window.vfcDobToDDMMYYYY = function(dob) {
    const str = String(dob || '').trim().split('T')[0];
    const parts = str.split(/[-\/]/);
    if (parts.length !== 3) return '';
    let d, m, y;
    if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; } else { d = parts[0]; m = parts[1]; y = parts[2]; }
    if (!/^\d{1,2}$/.test(d) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(y)) return '';
    return d.padStart(2, '0') + m.padStart(2, '0') + y;
};
window.vfcPortalCredentials = function(b) {
    const username = window.vfcLast10(b.phone_number || b.whatsapp_number);
    const dob = window.vfcDobToDDMMYYYY(b.dob);
    if (dob) return { username: username, password: dob, scheme: 'DOB' };
    return { username: username, password: username.slice(-4), scheme: 'LAST4' };
};
window.vfcPortalLoginText = function(name, c) {
    const pwHint = c.scheme === 'DOB' ? 'உங்கள் பிறந்த தேதி, DDMMYYYY' : 'உங்கள் மொபைல் எண்ணின் கடைசி 4 இலக்கங்கள்';
    return `வணக்கம் ${String(name || '').replace(/\s+/g, ' ').trim()},\n\n` +
           `Vel Fin Corp-ல் உங்கள் கடன் கணக்கை இணையதளத்தில் பார்க்கலாம்.\n\n` +
           `இணையதளம்: https://velfincorp.com/login.html\n` +
           `Role: Borrower / Customer\n` +
           `Username: ${c.username} (உங்கள் மொபைல் எண்)\n` +
           `Password: ${c.password} (${pwHint})\n\n` +
           `இங்கே உங்கள் EMI, நிலுவை, payment வரலாறு மற்றும் UPI மூலம் செலுத்தும் வசதி உள்ளது. இந்த விவரங்களை வேறு யாருடனும் பகிர வேண்டாம்.\n` +
           `உதவிக்கு: +91 9486886293\n\nநன்றி,\nTeam Vel Fin Corp`;
};

/* A small pop-up that shows a ready WhatsApp message with "Send on WhatsApp" and "Copy text" */
window.vfcShowWhatsAppDialog = function(title, text, link) {
    const old = document.getElementById('vfcWaDialog');
    if (old) old.remove();
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ov = document.createElement('div');
    ov.id = 'vfcWaDialog';
    ov.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,.55); z-index:9000; display:flex; align-items:center; justify-content:center; padding:12px;';
    ov.innerHTML = '<div style="background:#fff; max-width:520px; width:100%; max-height:92vh; overflow:auto; border-radius:12px; border-top:5px solid #0F1D36; padding:20px; box-sizing:border-box;">' +
        '<div style="font-weight:800; color:#0F1D36; font-size:16px; margin-bottom:8px;">' + esc(title) + '</div>' +
        '<pre id="vfcWaText" style="white-space:pre-wrap; background:#f1f5f9; padding:12px; border-radius:8px; font-family:inherit; font-size:13px; line-height:1.6; margin:0;">' + esc(text) + '</pre>' +
        '<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:14px;">' +
        '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="background:#25D366; color:#fff; text-decoration:none; padding:11px 16px; border-radius:8px; font-weight:700; font-size:14px;">Send on WhatsApp</a>' +
        '<button type="button" id="vfcWaCopy" style="background:#0F1D36; color:#fff; border:none; padding:11px 16px; border-radius:8px; font-weight:700; cursor:pointer;">Copy text</button>' +
        '<button type="button" id="vfcWaClose" style="background:#e2e8f0; color:#0F1D36; border:none; padding:11px 16px; border-radius:8px; font-weight:700; cursor:pointer;">Close</button>' +
        '</div></div>';
    document.body.appendChild(ov);
    document.getElementById('vfcWaClose').onclick = function() { ov.remove(); };
    document.getElementById('vfcWaCopy').onclick = function() {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function() { alert('Copied!'); });
        else prompt('Copy this text:', text);
    };
};

window.vfcShowPortalLoginDialog = function(b) {
    if (!b) { alert('Borrower details were not found.'); return; }
    const c = window.vfcPortalCredentials(b);
    if (c.username.length !== 10) { alert('This borrower has no valid 10-digit mobile number.'); return; }
    const text = window.vfcPortalLoginText(b.full_name, c);
    const sendTo = window.vfcLast10(b.whatsapp_number || b.phone_number);
    window.vfcShowWhatsAppDialog('Send portal login details to ' + (b.full_name || 'customer'), text, 'https://wa.me/91' + sendTo + '?text=' + encodeURIComponent(text));
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
            { href: 'my-collection.html',     icon: 'fa-clipboard-list',       label: 'My Collection List' },
            { href: 'collection-dashboard.html', icon: 'fa-chart-pie',          label: 'Daily Collection' },
            { href: 'noc.html',                icon: 'fa-certificate',          label: 'NOC / Loan Closure' }
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
