// db.js - Domain Based Auto-Switch for Vel Fin Corp

const { Client, Databases, Storage, ID, Query } = Appwrite;

// டொமைனைச் சரிபார்த்தல்: உண்மையான லைவ் டொமைன் என்றால் மட்டும் LIVE, மற்றபடி TEST
const hostname = window.location.hostname;
const isLiveDomain = hostname === "www.velfincorp.com" || hostname === "velfincorp.com";

// நீங்கள் எப்போது வேண்டுமானாலும் மேனுவலாக மாற்ற விரும்பினால் கீழே உள்ளதை மாற்றலாம், 
// ஆனால் லைவ் டொமைனில் இது ஆட்டோமேட்டிக்காக லைவ் டேட்டாவை மட்டுமே எடுக்கும்.
const currentMode = isLiveDomain ? 'LIVE' : 'TEST';
const isLive = currentMode === 'LIVE';

const client = new Client()
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')  
    .setProject('6ad71a29000d4bde5d4e');  

const databases = new Databases(client);
const storage = new Storage(client);

// 1. உண்மையான லைவ் டேட்டாபேஸ் மற்றும் கலெக்ஷன் ஐடிகள் (Live IDs)
const LIVE_DB = {
    DB_ID: '6ad71cc60012c0f125b9',
    BORROWERS_ID: '6ad71e920004bbc106eb', // Live_Borrowers
    LOANS_ID: '6ad71f29001d4ff46c50',     // Live_Loans
    PAYMENTS_ID: '6ad71ee900312b70ce69', // Live_Payments
    CREDIT_VAULT_ID: '6ad71f29001d4ff46c50', 
    PERSONAL_LOAN_ID: '6ad71f29001d4ff46c50', 
    DOCUMENTS_BUCKET_ID: '6ad728e7001cd61e6b73' 
};

// 2. டெஸ்ட் டேட்டாபேஸ் மற்றும் கலெக்ஷன் ஐடிகள் (Test IDs - ஸ்கிரீன்ஷாட்களிலிருந்து பெறப்பட்டவை)
const TEST_DB = {
    DB_ID: '6ad71cc60012c0f125b9', 
    BORROWERS_ID: '6ae0d1d70007890d9920', // Test_Borrowers
    LOANS_ID: '6ae0d2170037063f483c',         // Test_Loans
    PAYMENTS_ID: '6ae0d20500235423a1ea',   // Test_Payments
    CREDIT_VAULT_ID: '6ae0d2170037063f483c', 
    PERSONAL_LOAN_ID: '6ae0d2170037063f483c', 
    DOCUMENTS_BUCKET_ID: '6ad728e7001cd61e6b73' 
};

// டொமைனின் அடிப்படையில் சரியான ஐடிகளைத் தேர்ந்தெடுத்தல்
const VFC_DB = isLive ? LIVE_DB : TEST_DB;

// Global variables
window.appwriteClient = client;
window.appwriteDatabases = databases;
window.appwriteStorage = storage;
window.VFC_DB = VFC_DB;
window.AppwriteID = ID;
window.AppwriteQuery = Query;

console.log("Vel Fin Corp Running in Mode: " + currentMode + " (Host: " + hostname + ")");
