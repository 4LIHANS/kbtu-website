import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

function normalizeAnalysisInput(data) {
    const normalizeString = value => value === undefined || value === null ? '' : String(value).trim();
    return {
        type: normalizeString(data.type || data.eqType || 'ESP pump'),
        manufacturer: normalizeString(data.manufacturer || 'ESP equipment'),
        model: normalizeString(data.model || 'Field X ESP'),
        year: Number(data.year || data.aiYear || 2024) || 2024,
        pressureTemp: normalizeString(data.pressureTemp || data.aiPress || ''),
        hours: Number(data.hours || data.aiHrs || 4380) || 4380,
        motorTemp: normalizeString(data.motorTemp || data.aiTemp || ''),
        vibration: normalizeString(data.vibration || data.aiVib || ''),
        intakePressure: normalizeString(data.intakePressure || data.aiPress || ''),
        flowRate: normalizeString(data.flowRate || data.aiFlow || ''),
        sandContent: normalizeString(data.sandContent || data.aiSand || ''),
        current: normalizeString(data.current || data.aiCurrent || ''),
        voltage: normalizeString(data.voltage || data.aiVoltage || ''),
        insulation: normalizeString(data.insulation || data.aiInsulation || ''),
        sealTemp: normalizeString(data.sealTemp || data.aiSealTemp || ''),
        lubricantLevel: normalizeString(data.lubricantLevel || data.aiLubricant || ''),
        pressureDifferential: normalizeString(data.pressureDifferential || data.aiDiffPress || ''),
        leak: normalizeString(data.leak || data.aiLeak || ''),
        gasTemp: normalizeString(data.gasTemp || data.aiGasTemp || ''),
        gasOilRatio: normalizeString(data.gasOilRatio || data.aiGOR || ''),
        liquidCarryover: normalizeString(data.liquidCarryover || data.aiLCO || ''),
        suctionPressure: normalizeString(data.suctionPressure || data.aiSuction || ''),
        dischargePressure: normalizeString(data.dischargePressure || data.aiDischarge || ''),
        oilTemp: normalizeString(data.oilTemp || data.aiOilTemp || ''),
        rpm: normalizeString(data.rpm || data.aiRpm || ''),
        waterQuality: normalizeString(data.waterQuality || data.aiWaterQuality || ''),
        location: normalizeString(data.location || 'Field X, Almaty'),
        lastRepair: normalizeString(data.lastRepair || data.aiLastRepair || new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString().split('T')[0]),
        environment: normalizeString(data.environment || data.aiNotes || data.notes || 'Standard ESP operating conditions.')
    };
}

// Validate input data quality
function validateInputData(data) {
    const issues = [];

    // Check equipment type
    const type = (data.type || '').trim();
    const validTypes = ['pump', 'compressor', 'motor', 'engine', 'valve', 'turbine', 'generator', 'fan', 'blower', 'separator', 'seal', 'protector', 'injection', 'heat exchanger', 'boiler', 'насос', 'компрессор', 'двигатель', 'клапан', 'турбина', 'генератор', 'вентилятор', 'нагреватель', 'котел'];
    const isValidType = validTypes.some(validType => type.toLowerCase().includes(validType));

    if (!type) {
        issues.push('Equipment type is required');
    } else if (type.length < 3) {
        issues.push('Equipment type seems too short');
    } else if (!isValidType && !/^[a-zA-Zа-яА-Я\d\s()\[\]\-_,./%]+$/.test(type)) {
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

    const data = normalizeAnalysisInput(req.body);

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
- Operating Conditions: ${data.pressureTemp || 'N/A'}
- Operating Hours: ${data.hours}
- Motor Temperature: ${data.motorTemp || 'N/A'}
- Vibration: ${data.vibration || 'N/A'}
- Intake Pressure: ${data.intakePressure || 'N/A'}
- Flow Rate: ${data.flowRate || 'N/A'}
- Sand Content: ${data.sandContent || 'N/A'}
- Current: ${data.current || 'N/A'}
- Voltage: ${data.voltage || 'N/A'}
- Insulation Resistance: ${data.insulation || 'N/A'}
- Seal Temperature: ${data.sealTemp || 'N/A'}
- Lubricant Level: ${data.lubricantLevel || 'N/A'}
- Pressure Differential: ${data.pressureDifferential || 'N/A'}
- Leak Indication: ${data.leak || 'N/A'}
- Gas Temperature: ${data.gasTemp || 'N/A'}
- Gas/Oil Ratio: ${data.gasOilRatio || 'N/A'}
- Liquid Carryover: ${data.liquidCarryover || 'N/A'}
- Suction Pressure: ${data.suctionPressure || 'N/A'}
- Discharge Pressure: ${data.dischargePressure || 'N/A'}
- Oil Temperature: ${data.oilTemp || 'N/A'}
- RPM: ${data.rpm || 'N/A'}
- Water Quality: ${data.waterQuality || 'N/A'}
- Location: ${data.location}
- Last Repair: ${data.lastRepair}
- Notes: ${data.environment}

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