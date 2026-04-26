require('dotenv').config();

const express = require('express');
const path = require('path');
const Groq = require('groq-sdk');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve static files from parent directory

// Groq setup
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Endpoint for analysis
app.post('/analyze', async (req, res) => {
    const data = req.body;

    const prompt = `
Analyze the equipment characteristics and provide reliability analysis:

Equipment Type: ${data.type}
Manufacturer: ${data.manufacturer}
Model: ${data.model}
Year of Manufacture: ${data.year}
Operating Pressure / Temperature: ${data.pressureTemp}
Operating Hours: ${data.hours}
Location of Operation: ${data.location}
Last Repair Date: ${data.lastRepair}
Environmental Conditions: ${data.environment}

Provide analysis in JSON format with these keys:
- failureProb: Failure probability (percentage)
- commonCauses: Most common failure causes
- avgLifetime: Average lifespan
- similarStats: Statistics on similar equipment
- maintenanceRec: Maintenance recommendations
- nextFailure: When next failure is likely

Respond ONLY with valid JSON, no additional text.
`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            model: 'openai/gpt-oss-20b',
            temperature: 0.7,
            max_tokens: 1024,
        });

        const response = chatCompletion.choices[0]?.message?.content || '';

        // Try to parse as JSON
        let analysis;
        try {
            // Remove any markdown formatting if present
            const cleanedText = response.replace(/```json\n?|\n?```/g, '').replace(/```\n?|\n?```/g, '').trim();
            analysis = JSON.parse(cleanedText);
        } catch (e) {
            analysis = { error: 'Failed to parse AI response', raw: response };
        }

        res.json(analysis);
    } catch (error) {
        console.error('Groq API Error:', error.message);
        
        // Fallback disabled - return error instead
        res.status(500).json({ error: error.message });
    }
});

// Export for Vercel
module.exports = app;