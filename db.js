// db.js - Test Environment Configuration for Vel Fin Corp

const { Client, Databases, Storage, ID, Query } = Appwrite;

// டெஸ்ட் ரிபாசிட்டரி என்பதால் எப்போதும் 'TEST' மோடில் மட்டுமே இயங்கும்
const currentMode = 'TEST';
const isLive = false;

const client = new Client()
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')  
    .setProject('6ad71a29000d4bde5d4e');  

const databases = new Databases(client);
const storage = new Storage(client);

// டெஸ்ட் டேட்டாபேஸ் மற்றும் கலெக்ஷன் ஐடிகள் (Test IDs)
const TEST_DB = {
    DB_ID: '6ad71cc60012c0f125b9', 
    BORROWERS_ID: '6ae0d1d70007890d9920', // Test_Borrowers
    LOANS_ID: '6ae0d2170037063f483c',         // Test_Loans
    PAYMENTS_ID: '6ae0d20500235423a1ea',   // Test_Payments
    CREDIT_VAULT_ID: '6ae0d2170037063f483c', 
    PERSONAL_LOAN_ID: '6ae0d2170037063f483c', 
    DOCUMENTS_BUCKET_ID: '6ad728e7001cd61e6b73' 
};

// டெஸ்டிற்கான ஐடிகளை மட்டும் ஒதுக்குதல்
window.appwriteClient = client;
window.appwriteDatabases = databases;
window.appwriteStorage = storage;
window.VFC_DB = TEST_DB;
window.AppwriteID = ID;
window.AppwriteQuery = Query;

console.log("Vel Fin Corp Test Environment Initialized");
