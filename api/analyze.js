import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Validate input data quality
function validateInputData(data) {
    const issues = [];

    // Check equipment type
    const type = (data.type || '').trim();
    const validTypes = ['pump', 'compressor', 'motor', 'engine', 'valve', 'turbine', 'generator', 'fan', 'blower', 'heat exchanger', 'boiler', 'насос', 'компрессор', 'двигатель', 'клапан', 'турбина', 'генератор', 'вентилятор', 'нагреватель', 'котел'];
    const isValidType = validTypes.some(validType => type.toLowerCase().includes(validType));

    if (!type) {
        issues.push('Equipment type is required');
    } else if (type.length < 3) {
        issues.push('Equipment type seems too short');
    } else if (!isValidType && !/^[a-zA-Zа-яА-Я\s-]+$/.test(type)) {
        issues.push('Equipment type contains invalid characters');
    } else if (!isValidType) {
        issues.push('Equipment type not recognized - please use standard equipment names (pump, compressor, motor, valve, etc.)');
    }

    // Check manufacturer
    const manufacturer = (data.manufacturer || '').trim();
    if (!manufacturer) {
        issues.push('Manufacturer is required');
    } else if (manufacturer.length < 2) {
        issues.push('Manufacturer name seems too short');
    } else if (!/^[a-zA-Zа-яА-Я0-9\s.-]+$/.test(manufacturer)) {
        issues.push('Manufacturer contains invalid characters');
    }

    // Check model
    const model = (data.model || '').trim();
    if (!model) {
        issues.push('Model is required');
    } else if (model.length < 2) {
        issues.push('Model seems too short');
    }

    // Check year
    const year = data.year;
    const currentYear = 2026;
    if (!year) {
        issues.push('Year of manufacture is required');
    } else if (year < 1950 || year > currentYear) {
        issues.push(`Year should be between 1950 and ${currentYear}`);
    }

    // Check operating hours
    const hours = data.hours;
    if (!hours || hours < 0) {
        issues.push('Operating hours must be a positive number');
    } else if (hours > 500000) {
        issues.push('Operating hours seem unrealistically high (>500,000 hours)');
    }

    // Check environment
    const environment = (data.environment || '').trim();
    if (!environment) {
        issues.push('Environmental conditions are required');
    } else if (environment.length < 3) {
        issues.push('Environmental conditions description seems too short');
    }

    return {
        isValid: issues.length === 0,
        issues: issues,
        quality: issues.length === 0 ? 'good' : issues.length <= 2 ? 'fair' : 'poor'
    };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const data = req.body;

    // Validate input data
    const validation = validateInputData(data);

    // If data quality is poor, return limited analysis with warnings
    if (!validation.isValid) {
        return res.json({
            failureProb: 50,
            commonCauses: 'Unable to analyze - invalid input data',
            avgLifetime: 5000,
            similarStats: {
                failureRatePercentage: 50,
                meanTimeBetweenFailureHours: 4000,
                commonFailureModes: 'Data validation required'
            },
            maintenanceRec: 'Please provide valid equipment information for accurate analysis',
            nextFailure: '2026-12-31',
            warnings: validation.issues
        });
    }

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