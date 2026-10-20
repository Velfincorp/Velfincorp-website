// db.js - Master Appwrite Configuration File for Vel Fin Corp

// Appwrite Web SDK Initialization
const { Client, Databases, ID, Query } = Appwrite;

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1') 
    .setProject('6ad71a29000d4bde5d4e'); 

const databases = new Databases(client);

// Vel Fin Corp Database & Collection IDs
const VFC_DB = {
    DB_ID: '6ad71cc60012c0f125b9',
    BORROWERS_ID: '6ad71e920004bbc106eb',
    LOANS_ID: '6ad71f29001d4ff46c50',
    PAYMENTS_ID: '6ad71ee900312b70ce69'
};

// Global variables to make them available across all pages
window.appwriteClient = client;
window.appwriteDatabases = databases;
window.VFC_DB = VFC_DB;
window.AppwriteID = ID;
window.AppwriteQuery = Query;

console.log("Vel Fin Corp Appwrite Database Initialized Successfully!");