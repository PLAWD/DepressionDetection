// server.js
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 5000;

// CORS Configuration
app.use(cors({
    origin: 'http://localhost:5173', // Your frontend URL
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Middleware to Parse JSON Request Bodies
app.use(express.json());

// Handle OPTIONS Preflight Requests
app.options('/api/tweets', (req, res) => {
    res.sendStatus(200);
});

// POST /api/tweets route
app.post('/api/tweets', async (req, res) => {
    console.log('✅ POST /api/tweets hit', req.body);
    const { username } = req.body;

    if (!username) {
        console.log('❌ No username provided');
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        // Simulated fetch from a real API
        const response = await axios.get(`https://jsonplaceholder.typicode.com/posts`);
        
        // Format the data as needed (e.g., mock tweets)
        const tweets = response.data.slice(0, 5).map((item) => ({
            post: item.title
        }));

        console.log('📦 Sending real tweets:', tweets);
        res.json({ tweets });

    } catch (error) {
        console.error('❌ Error fetching tweets:', error.message);
        res.status(500).json({ error: 'Failed to fetch tweets from API' });
    }
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Default 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', message: `Cannot ${req.method} ${req.url}` });
});

// Start the Server
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
