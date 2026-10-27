// db.js - Master Appwrite Configuration File for Vel Fin Corp

const { Client, Databases, Storage, ID, Query } = Appwrite;

// -----------------------------------------------------------------
// மோடு மாற்றுவதற்கான பகுதி (Mode Switcher)
// டெஸ்ட் செய்யும்போது 'TEST' எனவும், லைவிற்கு மாற்றும்போது 'LIVE' எனவும் மாற்றிக்கொள்ளலாம்.
// -----------------------------------------------------------------
const currentMode = 'TEST'; 
const isLive = currentMode === 'LIVE';

const client = new Client()
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')  
    .setProject('6ad71a29000d4bde5d4e');  

const databases = new Databases(client);
const storage = new Storage(client);

// 1. லைவ் டேட்டாபேஸ் மற்றும் கலெக்ஷன் ஐடிகள் (Live IDs)
const LIVE_DB = {
    DB_ID: '6ad71cc60012c0f125b9',
    BORROWERS_ID: '6ad71e920004bbc106eb',
    LOANS_ID: '6ad71f29001d4ff46c50',
    PAYMENTS_ID: '6ad71ee900312b70ce69',
    CREDIT_VAULT_ID: '6ad71f29001d4ff46c50', 
    PERSONAL_LOAN_ID: '6ad71f29001d4ff46c50', 
    DOCUMENTS_BUCKET_ID: '6ad728e7001cd61e6b73' 
};

// 2. டெஸ்ட் டேட்டாபேஸ் மற்றும் கலெக்ஷன் ஐடிகள் (Test IDs)
// (Appwrite-ல் டெஸ்டிற்காக தனி டேட்டாபேஸ்/கலெக்ஷன் உருவாக்கி அதன் ஐடியை இங்கே போட்டுக்கொள்ளலாம்)
const TEST_DB = {
    DB_ID: '6ad71cc60012c0f125b9', // தேவைப்பட்டால் டெஸ்டிற்கு தனி DB_ID உருவாக்கிக் கொள்ளலாம்
    BORROWERS_ID: '6ad71e920004bbc106eb', // தேவைப்பட்டால் டெஸ்டிற்கு தனி Collection ID மாற்றிக் கொள்ளலாம்
    LOANS_ID: '6ad71f29001d4ff46c50',
    PAYMENTS_ID: '6ad71ee900312b70ce69',
    CREDIT_VAULT_ID: '6ad71f29001d4ff46c50', 
    PERSONAL_LOAN_ID: '6ad71f29001d4ff46c50', 
    DOCUMENTS_BUCKET_ID: '6ad728e7001cd61e6b73' 
};

// மோடின் அடிப்படையில் சரியான ஐடிகளைத் தேர்ந்தெடுத்தல்
const VFC_DB = isLive ? LIVE_DB : TEST_DB;

// Global variables
window.appwriteClient = client;
window.appwriteDatabases = databases;
window.appwriteStorage = storage;
window.VFC_DB = VFC_DB;
window.AppwriteID = ID;
window.AppwriteQuery = Query;

console.log("Vel Fin Corp Appwrite Initialized (Mode: " + currentMode + ")");
