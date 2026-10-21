import { Client, Databases, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    if (req.method === 'OPTIONS') {
        return res.send('', 200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Appwrite-Project'
        });
    }

    try {
        if (req.method !== 'POST') {
            return res.json({ success: false, message: 'Invalid request method' }, 405, {
                'Access-Control-Allow-Origin': '*'
            });
        }

        const client = new Client()
            .setEndpoint('https://cloud.appwrite.io/v1')
            .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || '6ad71a29000d4bde5d4e')
            .setKey(process.env.APPWRITE_API_KEY);

        const databases = new Databases(client);

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { documentId, data } = body;

        const DATABASE_ID = '6ad71cc10037a280c4db';
        const COLLECTION_ID = '6ad71e9a002241e3895e';

        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            documentId || ID.unique(),
            data
        );

        return res.json({ success: true, response }, 200, {
            'Access-Control-Allow-Origin': '*'
        });

    } catch (err) {
        error(err.message);
        return res.json({ success: false, message: err.message }, 500, {
            'Access-Control-Allow-Origin': '*'
        });
    }
};
