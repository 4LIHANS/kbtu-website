require('dotenv').config();

const Groq = require('groq-sdk');
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
            analysis = JSON.parse(response);
        } catch (parseError) {
            console.error('Failed to parse Groq response as JSON:', response);
            return res.status(500).json({ error: 'Invalid response format from AI' });
        }

        res.json(analysis);
    } catch (error) {
        console.error('Groq API Error:', error.message);

        // Fallback disabled - return error instead
        res.status(500).json({ error: error.message });
    }
}