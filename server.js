import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public directory

// Groq setup
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

function normalizeAnalysisInput(data) {
    return {
        type: (data.type || data.eqType || 'ESP pump').trim(),
        manufacturer: (data.manufacturer || 'ESP equipment').trim(),
        model: (data.model || 'Field X ESP').trim(),
        year: Number(data.year || data.aiYear || 2024) || 2024,
        pressureTemp: (data.pressureTemp || data.aiPress || '35 atm').trim(),
        hours: Number(data.hours || data.aiHrs || 4380) || 4380,
        location: (data.location || 'Field X, Almaty').trim(),
        lastRepair: data.lastRepair || data.aiLastRepair || new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString().split('T')[0],
        environment: (data.environment || data.aiNotes || data.notes || 'Standard ESP operating conditions.').trim()
    };
}

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

// Advanced analysis logic based on input data
function analyzeEquipment(data) {
    console.log('Analyzing equipment data:', data);

    // Validate input data
    const validation = validateInputData(data);
    console.log('Validation result:', validation);

    // If data quality is poor, return limited analysis with warnings
    if (validation.quality === 'poor') {
        return {
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
        };
    }

    // Base values
    let baseFailureProb = 5; // base probability for new equipment
    let baseLifetime = 20000; // base hours for new equipment
    let riskFactors = [];
    let maintenanceSchedule = [];
    let nextFailureMonths = 24; // 2 years default

    // Equipment type analysis
    const equipmentType = (data.type || '').toLowerCase();
    if (equipmentType.includes('pump') || equipmentType.includes('насос')) {
        baseFailureProb += 8;
        riskFactors.push('Seal leakage', 'Bearing wear', 'Cavitation damage');
        maintenanceSchedule.push('Seal inspection every 3 months', 'Bearing lubrication every 6 months', 'Impeller inspection annually');
        baseLifetime = 15000;
    } else if (equipmentType.includes('compressor') || equipmentType.includes('компрессор')) {
        baseFailureProb += 12;
        riskFactors.push('Valve failure', 'Piston wear', 'Pressure loss');
        maintenanceSchedule.push('Valve testing monthly', 'Piston inspection every 6 months', 'Pressure system check weekly');
        baseLifetime = 12000;
    } else if (equipmentType.includes('motor') || equipmentType.includes('двигатель') || equipmentType.includes('engine')) {
        baseFailureProb += 6;
        riskFactors.push('Electrical faults', 'Bearing failure', 'Overheating');
        maintenanceSchedule.push('Electrical testing every 6 months', 'Temperature monitoring', 'Vibration analysis quarterly');
        baseLifetime = 18000;
    } else if (equipmentType.includes('valve') || equipmentType.includes('клапан')) {
        baseFailureProb += 4;
        riskFactors.push('Leakage', 'Blockage', 'Actuator failure');
        maintenanceSchedule.push('Leak testing monthly', 'Actuator calibration annually', 'Visual inspection weekly');
        baseLifetime = 25000;
    } else {
        // Unknown equipment type - conservative approach
        baseFailureProb += 10;
        riskFactors.push('General wear', 'Unknown failure modes');
        maintenanceSchedule.push('Regular visual inspection', 'Basic maintenance schedule');
        baseLifetime = 10000;
    }

    // Age factor (current year is 2026)
    const age = 2026 - (data.year || 2026);
    if (age > 0) {
        const ageRisk = Math.min(age * 3, 25); // Max 25% additional risk
        baseFailureProb += ageRisk;
        baseLifetime -= age * 800; // Age reduces lifetime
        riskFactors.push('Age-related degradation');
    }

    // Operating hours factor
    const hours = data.hours || 0;
    if (hours > 50000) {
        baseFailureProb += 20;
        riskFactors.push('High utilization fatigue');
        nextFailureMonths = Math.max(3, nextFailureMonths - 6);
    } else if (hours > 20000) {
        baseFailureProb += 10;
        riskFactors.push('Extended operation wear');
        nextFailureMonths = Math.max(6, nextFailureMonths - 3);
    } else if (hours > 10000) {
        baseFailureProb += 5;
        riskFactors.push('Moderate usage wear');
    }

    // Environmental factors
    const environment = (data.environment || '').toLowerCase();
    if (environment.includes('corrosion') || environment.includes('коррозия')) {
        baseFailureProb += 15;
        riskFactors.push('Corrosion damage', 'Material degradation');
        maintenanceSchedule.push('Anti-corrosion treatment every 6 months', 'Material thickness monitoring');
        baseLifetime -= 3000;
    }
    if (environment.includes('high temperature') || environment.includes('высокая температура') || (data.pressureTemp || '').includes('°C')) {
        baseFailureProb += 8;
        riskFactors.push('Thermal stress', 'Material expansion');
        maintenanceSchedule.push('Temperature monitoring', 'Thermal insulation checks');
    }
    if (environment.includes('dust') || environment.includes('пыль') || environment.includes('humidity') || environment.includes('влажность')) {
        baseFailureProb += 6;
        riskFactors.push('Contamination', 'Moisture ingress');
        maintenanceSchedule.push('Filter replacement monthly', 'Sealing checks');
    }
    if (environment.includes('vibration') || environment.includes('вибрация')) {
        baseFailureProb += 10;
        riskFactors.push('Vibration fatigue', 'Loosening of components');
        maintenanceSchedule.push('Vibration monitoring weekly', 'Fastener checks');
    }

    // Pressure/Temperature operating conditions
    const pressureTemp = data.pressureTemp || '';
    if (pressureTemp.includes('bar') || pressureTemp.includes('psi') || pressureTemp.includes('mpa')) {
        baseFailureProb += 5; // High pressure operations are riskier
        riskFactors.push('Pressure-related stress');
    }

    // Location factor
    const location = (data.location || '').toLowerCase();
    if (location.includes('outdoor') || location.includes('наруж') || location.includes('field')) {
        baseFailureProb += 8;
        riskFactors.push('Environmental exposure', 'Weather-related damage');
        maintenanceSchedule.push('Weather protection checks', 'External component inspection');
    }

    // Last repair factor
    const lastRepair = data.lastRepair;
    if (lastRepair) {
        const repairDate = new Date(lastRepair);
        const monthsSinceRepair = (new Date() - repairDate) / (1000 * 60 * 60 * 24 * 30);
        if (monthsSinceRepair < 6) {
            baseFailureProb -= 5; // Recent repair reduces risk
            nextFailureMonths += 3;
        } else if (monthsSinceRepair > 24) {
            baseFailureProb += 8; // Old repair increases risk
            nextFailureMonths -= 2;
        }
    }

    // Calculate final values
    const failureProb = Math.min(95, Math.max(1, baseFailureProb));
    const avgLifetime = Math.max(1000, baseLifetime);

    // Calculate next failure date
    const nextFailureDate = new Date();
    nextFailureDate.setMonth(nextFailureDate.getMonth() + Math.max(1, nextFailureMonths));

    // Remove duplicates from arrays
    const uniqueRiskFactors = [...new Set(riskFactors)];
    const uniqueMaintenance = [...new Set(maintenanceSchedule)];

    return {
        failureProb: Math.round(failureProb * 10) / 10, // Round to 1 decimal
        commonCauses: uniqueRiskFactors.slice(0, 4).join(', '),
        avgLifetime: Math.round(avgLifetime / 100) * 100, // Round to nearest 100
        similarStats: {
            failureRatePercentage: Math.round((failureProb + (Math.random() - 0.5) * 10) * 10) / 10,
            meanTimeBetweenFailureHours: Math.round(avgLifetime * 0.8 / 100) * 100,
            commonFailureModes: uniqueRiskFactors.slice(0, 3).join(', ')
        },
        maintenanceRec: uniqueMaintenance.join(', '),
        nextFailure: nextFailureDate.toISOString().split('T')[0]
    };
}

// Endpoint for analysis
app.post('/api/analyze', async (req, res) => {
    const rawData = req.body;
    const data = normalizeAnalysisInput(rawData);
    console.log('Received analysis request:', rawData);
    console.log('Normalized analysis data:', data);

    // Validate input data
    const validation = validateInputData(data);
    console.log('Validation result:', validation);

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

Use the sensor-driven Field X context: ESP pumps at 1800–2800m depth, medium vibration, occasional sand and corrosion. Give practical, oilfield-aware analysis.

Provide your output in this exact JSON format only:
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
        console.log('Calling Groq API with model openai/gpt-oss-20b');
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
        console.log('Groq response received:', response.substring(0, 100) + '...');

        // Try to parse as JSON
        let analysis;
        try {
            analysis = JSON.parse(response);
        } catch (parseError) {
            console.error('Failed to parse Groq response as JSON:', response);
            console.log('Falling back to local analysis due to invalid JSON');
            // Fallback to local analysis
            const analysis = analyzeEquipment(data);
            res.json(analysis);
            return;
        }

        console.log('Analysis result from Groq:', analysis);
        res.json(analysis);
    } catch (error) {
        console.error('Groq API Error:', error.message);
        console.log('Falling back to local analysis');

        // Fallback to local analysis
        const analysis = analyzeEquipment(data);
        res.json(analysis);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});