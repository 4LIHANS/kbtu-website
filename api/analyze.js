import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const data = req.body;

    const prompt = `
You are an expert equipment reliability analyst. Analyze the following equipment characteristics and provide a detailed reliability assessment.

EQUIPMENT DETAILS:
- Type: ${data.type}
- Manufacturer: ${data.manufacturer}
- Model: ${data.model}
- Year: ${data.year}
- Operating Conditions: ${data.pressureTemp}
- Operating Hours: ${data.hours}
- Location: ${data.location}
- Last Repair: ${data.lastRepair}
- Environment: ${data.environment}

Based on industry standards and historical data for similar equipment, provide analysis in this EXACT JSON format:

{
  "failureProb": 12.5,
  "commonCauses": "Bearing wear, Seal leakage, Electrical faults, Corrosion",
  "avgLifetime": 15000,
  "similarStats": {
    "failureRatePercentage": 15,
    "meanTimeBetweenFailureHours": 12000,
    "commonFailureModes": "Seal leakage, Bearing wear, Electrical fault"
  },
  "maintenanceRec": "Regular bearing inspection every 6 months, Seal replacement every 2 years, Annual electrical testing, Monthly vibration monitoring",
  "nextFailure": "2026-07-15"
}

IMPORTANT:
- failureProb: Number between 0-100 representing percentage
- commonCauses: String with comma-separated failure causes
- avgLifetime: Number representing hours
- similarStats: Object with failureRatePercentage, meanTimeBetweenFailureHours, commonFailureModes
- maintenanceRec: String with comma-separated recommendations
- nextFailure: Date string in YYYY-MM-DD format

Respond ONLY with valid JSON, no additional text or explanations.
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