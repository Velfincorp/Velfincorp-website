/* collection-core.js
   ONE place for the collection rules. Defaulters Report, My Collection List and Reminders all use this file,
   so if a rule changes (penalty amount, stage days, template names) you change it HERE only. */
(function () {
    /* ============ RULES ============ */
    const PENALTY_RULES = {
        weekly: { flat: 295 },                 // Rs 295, ONE time per missed installment
        daily:  { percent: 10, max: 75 }       // 10% of EMI, never more than Rs 75, ONE time per missed installment
    };

    // Upper limit of days overdue for Stage 1, 2, 3 (anything above = Stage 4)
    const STAGE_LIMITS = { weekly: [3, 7, 14], daily: [1, 4, 10] };

    const STAGE_INFO = {
        1: { label: 'Stage 1', text: 'WhatsApp alert',  color: '#D69E2E' },
        2: { label: 'Stage 2', text: 'Agent follow-up', color: '#DD6B20' },
        3: { label: 'Stage 3', text: 'Admin review',    color: '#C53030' },
        4: { label: 'Stage 4', text: 'Final action',    color: '#742A2A' }
    };

    // WhatsApp template names (must match the names approved in MSG91)
    const TEMPLATES = {
        advance: 'vel_fin_advance_reminder',
        overdue: { 1: 'vel_fin_overdue_stage1', 2: 'vel_fin_overdue_stage2', 3: 'vel_fin_overdue_stage3', 4: 'vel_fin_overdue_stage3' }
    };

    const OUTCOMES = {
        NOT_REACHED: { label: 'Not reached',   color: '#64748b' },
        PROMISED:    { label: 'Promised',      color: '#2B6CB0' },
        REFUSED:     { label: 'Refused',       color: '#C53030' },
        PAID:        { label: 'Says paid',     color: '#2F855A' }
    };

    const DAY_MS = 86400000;

    /* ============ small helpers ============ */
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function rupees(n) { return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN'); }
    function normText(v) { return String(v || '').trim().toLowerCase(); }
    // names are stored with different maximum lengths in different tables, so compare only the first 50 characters
    function nameKey(v) { return normText(v).slice(0, 50); }
    function last10(v) {
        const d = String(v || '').replace(/\D/g, '');
        return d.length > 10 ? d.slice(-10) : d;
    }

    function parseFlexibleDate(dateInput) {
        if (!dateInput) return new Date();
        if (dateInput instanceof Date) return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
        const str = String(dateInput).trim().split('T')[0];
        const parts = str.split(/[-\/]/);
        if (parts.length === 3) {
            if (parts[0].length === 4) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        const fb = new Date(dateInput);
        return isNaN(fb.getTime()) ? new Date() : new Date(fb.getFullYear(), fb.getMonth(), fb.getDate());
    }
    function formatIndianDate(d) {
        if (!d) return '-';
        const x = parseFlexibleDate(d);
        return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
    }
    function toISO(d) {
        const x = parseFlexibleDate(d);
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    }
    function todayISO() { return toISO(new Date()); }

    function isPersonalLoan(loan) {
        const category = String(loan.loan_category || '').trim();
        const id = String(loan.loan_id || '').toUpperCase();
        return category === 'Personal' || id.startsWith('VPL');
    }
    function loanKindText(loan) { return isPersonalLoan(loan) ? 'பர்சனல் லோன்' : 'பொருள் கடன் (Credit Vault)'; }

    // A payment belongs to a loan only if the Loan ID AND the borrower match
    function paymentBelongsToLoan(p, loan) {
        if (!p.loan_id || p.loan_id !== loan.loan_id) return false;
        const pName = normText(p.borrower_name || p.customer_name || p.full_name);
        if (pName) return pName === normText(loan.borrower_name);
        return true;
    }

    /* ============ penalty / stage / overdue ============ */
    function penaltyEach(type, emi) {
        if (type === 'daily') {
            const r = PENALTY_RULES.daily;
            return Math.min(Math.round(emi * r.percent / 100), r.max);
        }
        return PENALTY_RULES.weekly.flat;
    }

    function stageFor(type, days) {
        const lim = STAGE_LIMITS[type] || STAGE_LIMITS.weekly;
        if (days <= lim[0]) return 1;
        if (days <= lim[1]) return 2;
        if (days <= lim[2]) return 3;
        return 4;
    }

    /* Returns null if the loan is NOT overdue */
    function computeDefaulterInfo(loan, loanPayments, today) {
        const type = String(loan.loan_type || 'Weekly').toLowerCase().includes('daily') ? 'daily' : 'weekly';
        const step = type === 'daily' ? 1 : 7;
        const emi = parseFloat(loan.installment_amount || 0);
        let tenure = 10;
        const tm = String(loan.tenure || '').match(/\d+/);
        if (tm) tenure = parseInt(tm[0]);
        const total = parseFloat(loan.loan_amount || 0);
        const paid = loanPayments.reduce((s, p) => s + parseFloat(p.amount_paid || p.paid_amount || p.amount || 0), 0);
        const remaining = Math.max(0, total - paid);
        const paidInst = emi > 0 ? Math.min(tenure, Math.floor((paid + 0.01) / emi)) : 0;

        if (emi <= 0 || remaining <= 0.5 || paidInst >= tenure) return null;

        const start = parseFlexibleDate(loan.loan_date || loan.$createdAt);
        const diff = Math.round((today - start) / DAY_MS);
        // installments whose due date is strictly BEFORE today
        const dueCount = Math.max(0, Math.min(tenure, Math.ceil(diff / step) - 1));
        const missed = Math.max(0, dueCount - paidInst);
        if (missed <= 0) return null;

        const shortfall = Math.min(remaining, Math.max(0, dueCount * emi - paid));
        const oldestDue = new Date(start.getTime());
        oldestDue.setDate(oldestDue.getDate() + (paidInst + 1) * step);
        const overdueDays = Math.round((today - oldestDue) / DAY_MS);
        if (overdueDays <= 0) return null;

        const each = penaltyEach(type, emi);
        const penalty = missed * each;
        const stage = stageFor(type, overdueDays);

        let lastPaid = null;
        loanPayments.forEach(p => {
            const d = parseFlexibleDate(p.payment_date || p.$createdAt);
            if (!lastPaid || d > lastPaid) lastPaid = d;
        });

        return { type, emi, tenure, paidInst, missed, overdueDays, shortfall, penalty, penaltyEach: each, totalDue: shortfall + penalty, stage, lastPaid, remaining };
    }

    // Tamil singular / plural: 1 தவணை உள்ளது, 2 தவணைகள் உள்ளன ; 1 நாள், 2 நாட்கள்
    function daysTamil(n) { return n === 1 ? '1 நாள்' : `${n} நாட்கள்`; }
    function installmentsTamil(n) { return n === 1 ? '1 தவணை' : `${n} தவணைகள்`; }

    function waOverdueText(loan, info) {
        const name = String(loan.borrower_name || '').replace(/\s+/g, ' ').trim();
        const verb = info.missed === 1 ? 'உள்ளது' : 'உள்ளன';
        return `வணக்கம் ${name},\n\n` +
               `உங்கள் கடன் எண் ${loan.loan_id}-ல் ${installmentsTamil(info.missed)} நிலுவையில் ${verb} (${daysTamil(info.overdueDays)} தாமதம்).\n\n` +
               `நிலுவைத் தொகை: ${rupees(info.shortfall)}\n` +
               `தாமதக் கட்டணம்: ${rupees(info.penalty)}\n` +
               `மொத்தம் செலுத்த வேண்டியது: ${rupees(info.totalDue)}\n\n` +
               `தயவுசெய்து விரைவில் செலுத்தவும்.\n\nநன்றி,\nVel Fin Corp`;
    }

    function waOverdueLink(loan, info) {
        const mobile = last10(loan.phone_number);
        if (mobile.length !== 10) return '';
        return `https://wa.me/91${mobile}?text=${encodeURIComponent(waOverdueText(loan, info))}`;
    }

    /* ============ follow-ups / promises ============ */
    function isAutoFollowup(f) { return String(f.agent_phone || '') === 'SYSTEM' || String(f.outcome || '').startsWith('AUTO'); }

    // all follow-ups of one loan, newest first
    function followupsForLoan(list, loan) {
        return (list || [])
            .filter(f => f.loan_id === loan.loan_id && nameKey(f.borrower_name) === nameKey(loan.borrower_name))
            .sort((a, b) => {
                const d = parseFlexibleDate(b.followup_date || b.$createdAt) - parseFlexibleDate(a.followup_date || a.$createdAt);
                if (d !== 0) return d;
                return new Date(b.$createdAt) - new Date(a.$createdAt);
            });
    }

    // latest follow-up written by a PERSON (not the automatic WhatsApp log)
    function latestHumanFollowup(list, loan) {
        return followupsForLoan(list, loan).find(f => !isAutoFollowup(f)) || null;
    }

    // Promise-to-Pay status of the latest human follow-up. Returns null when there is no promise.
    function promiseStatus(f, stillOverdue, today) {
        if (!f || f.outcome !== 'PROMISED' || !f.promise_date) return null;
        const p = parseFlexibleDate(f.promise_date);
        if (!stillOverdue) return { code: 'KEPT', label: 'Cleared', color: '#2F855A' };
        const diff = Math.round((p - today) / DAY_MS);
        if (diff > 0) return { code: 'PENDING', label: 'Promise ' + formatIndianDate(p), color: '#2B6CB0' };
        if (diff === 0) return { code: 'TODAY', label: 'Promise TODAY', color: '#DD6B20' };
        return { code: 'BROKEN', label: 'Promise BROKEN (' + formatIndianDate(p) + ')', color: '#C53030' };
    }

    // the one active assignment of a loan (newest if more than one)
    function activeAssignmentFor(list, loan) {
        return (list || [])
            .filter(a => a.status === 'ACTIVE' && a.loan_id === loan.loan_id && nameKey(a.borrower_name) === nameKey(loan.borrower_name))
            .sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt))[0] || null;
    }

    window.VFC_COLLECTION = {
        PENALTY_RULES, STAGE_LIMITS, STAGE_INFO, TEMPLATES, OUTCOMES, DAY_MS,
        esc, rupees, normText, nameKey, last10,
        parseFlexibleDate, formatIndianDate, toISO, todayISO,
        isPersonalLoan, loanKindText, paymentBelongsToLoan,
        penaltyEach, stageFor, computeDefaulterInfo, waOverdueLink, waOverdueText, daysTamil, installmentsTamil,
        isAutoFollowup, followupsForLoan, latestHumanFollowup, promiseStatus, activeAssignmentFor
    };
})();
