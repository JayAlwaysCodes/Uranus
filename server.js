require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Import the cors package
const axios = require('axios');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

// Proxy endpoint for the chatbot API
app.post('/api/chat', async (req, res) => {
    try {
        console.log("Received request:", req.body); // Log the request

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.API_KEY}`,
            req.body
        );

        console.log("API response:", response.data); // Log the API response
        res.json(response.data);
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message); // Log the error
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});