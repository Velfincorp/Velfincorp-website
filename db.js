// db.js - Master Appwrite Configuration File for Vel Fin Corp

// Appwrite Web SDK Initialization
const { Client, Databases, Storage, ID, Query } = Appwrite;

// டொமைன் அடிப்படையில் லைவ் மற்றும் டெஸ்ட் மோடைத் தீர்மானித்தல்
const hostname = window.location.hostname;
const isLive = hostname === 'velfincorp.com' || hostname === 'www.velfincorp.com';

// லைவ் மற்றும் டெஸ்ட் டேட்டாபேஸ் ஐடிகள்
const activeDbId = '6ad71cc60012c0f125b9'; 

const client = new Client()
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')  
    .setProject('6ad71a29000d4bde5d4e');  

const databases = new Databases(client);
const storage = new Storage(client); // ஃபைல் அப்லோடுக்கு இது தேவை

// Vel Fin Corp Database, Collection & Bucket IDs
const VFC_DB = {
    DB_ID: activeDbId,
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

console.log("Vel Fin Corp Appwrite Initialized (Mode: " + (isLive ? "LIVE (velfincorp.com)" : "TEST (GitHub Pages)") + ")");
