// db.js - Vel Fin Corp Configuration

const { Client, Databases, Storage, ID, Query } = Appwrite;

// -----------------------------------------------------------------
// மோடு மேனுவல் கண்ட்ரோல் (Manual Mode Switcher)
// நீங்கள் லேப்டாப்பில் டெஸ்ட் செய்யும்போது 'TEST' என மாற்றவும்.
// லைவ் வெப்சைட்டிற்கு மாற்றும்போது 'LIVE' என மாற்றவும்.
// -----------------------------------------------------------------
const currentMode = 'LIVE'; // அல்லது 'TEST'
const isLive = currentMode === 'LIVE';

const client = new Client()
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')  
    .setProject('6ad71a29000d4bde5d4e');  

const databases = new Databases(client);
const storage = new Storage(client);

// 1. லைவ் டேட்டா ஐடிகள் (Live IDs)
const LIVE_DB = {
    DB_ID: '6ad71cc60012c0f125b9',
    BORROWERS_ID: '6ad71e920004bbc106eb', 
    LOANS_ID: '6ad71f29001d4ff46c50',     
    PAYMENTS_ID: '6ad71ee900312b70ce69', 
    CREDIT_VAULT_ID: '6ad71f29001d4ff46c50', 
    PERSONAL_LOAN_ID: '6ad71f29001d4ff46c50', 
    DOCUMENTS_BUCKET_ID: '6ad728e7001cd61e6b73' 
};

// 2. டெஸ்ட் டேட்டா ஐடிகள் (Test IDs - உங்கள் ஸ்கிரீன்ஷாட் டேபிள்கள்)
const TEST_DB = {
    DB_ID: '6ad71cc60012c0f125b9', 
    BORROWERS_ID: '6ae0d1d70007890d9920', 
    LOANS_ID: '6ae0d2170037063f483c',         
    PAYMENTS_ID: '6ae0d20500235423a1ea',   
    CREDIT_VAULT_ID: '6ae0d2170037063f483c', 
    PERSONAL_LOAN_ID: '6ae0d2170037063f483c', 
    DOCUMENTS_BUCKET_ID: '6ad728e7001cd61e6b73' 
};

const VFC_DB = isLive ? LIVE_DB : TEST_DB;

window.appwriteClient = client;
window.appwriteDatabases = databases;
window.appwriteStorage = storage;
window.VFC_DB = VFC_DB;
window.AppwriteID = ID;
window.AppwriteQuery = Query;

console.log("Vel Fin Corp Mode: " + currentMode);
