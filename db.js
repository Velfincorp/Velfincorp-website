// db.js - Master Appwrite Configuration File for Vel Fin Corp

const { Client, Databases, Storage, ID, Query } = Appwrite;

// -----------------------------------------------------------------
// மோடு மாற்றுவதற்கான பகுதி (Mode Switcher)
// டெஸ்ட் செய்யும்போது 'TEST' எனவும், லைவுக்கு மாற்றும்போது 'LIVE' எனவும் மாற்றிக்கொள்ளலாம்.
// -----------------------------------------------------------------
const currentMode = 'TEST'; 
const isLive = currentMode === 'LIVE';

const client = new Client()
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')  
    .setProject('6ad71a29000d4bde5d4e');  

const databases = new Databases(client);
const storage = new Storage(client);

// லைவ் மற்றும் டெஸ்ட் ஐடிகளைத் தனித்தனியாகப் பராமரிக்கலாம்
const VFC_DB = {
    // இப்போதைக்கு இரண்டும் ஒரே ஐடியில் இருந்தாலும், டெஸ்டிற்குத் தனி டேட்டாபேஸ்/கலெக்ஷன் உருவாக்கினால் இங்கே மாற்றிக்கொள்ளலாம்
    DB_ID: '6ad71cc60012c0f125b9',
    BORROWERS_ID: '6ad71e920004bbc106eb',
    LOANS_ID: '6ad71f29001d4ff46c50',
    PAYMENTS_ID: '6ad71ee900312b70ce69',
    CREDIT_VAULT_ID: '6ad71f29001d4ff46c50', 
    PERSONAL_LOAN_ID: '6ad71f29001d4ff46c50', 
    DOCUMENTS_BUCKET_ID: '6ad728e7001cd61e6b73' 
};

// Global variables
window.appwriteClient = client;
window.appwriteDatabases = databases;
window.appwriteStorage = storage;
window.VFC_DB = VFC_DB;
window.AppwriteID = ID;
window.AppwriteQuery = Query;

console.log("Vel Fin Corp Appwrite Initialized (Mode: " + currentMode + ")");
