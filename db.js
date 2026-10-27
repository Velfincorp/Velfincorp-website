// db.js - Master Appwrite Configuration File for Vel Fin Corp

// Appwrite Web SDK Initialization
const { Client, Databases, Storage, ID, Query } = Appwrite;

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1') 
    .setProject('6ad71a29000d4bde5d4e'); 

const databases = new Databases(client);
const storage = new Storage(client); // ஃபைல் அப்லோடுக்கு இது தேவை

// Vel Fin Corp Database, Collection & Bucket IDs
const VFC_DB = {
    DB_ID: '6ad71cc60012c0f125b9',
    BORROWERS_ID: '6ad71e920004bbc106eb',
    LOANS_ID: '6ad71f29001d4ff46c50',
    PAYMENTS_ID: '6ad71ee900312b70ce69',
    CREDIT_VAULT_ID: '6ad71f29001d4ff46c50', // Credit Vault லோன்களுக்காக இணைக்கப்பட்டுள்ளது
    PERSONAL_LOAN_ID: '6ad71f29001d4ff46c50', // Personal Loan-க்காக இணைக்கப்பட்டுள்ளது
    DOCUMENTS_BUCKET_ID: '6ad728e7001cd61e6b73' // Storage ID
};

// Global variables
window.appwriteClient = client;
window.appwriteDatabases = databases;
window.appwriteStorage = storage;
window.VFC_DB = VFC_DB;
window.AppwriteID = ID;
window.AppwriteQuery = Query;

console.log("Vel Fin Corp Appwrite Initialized (Database & Storage)!");
