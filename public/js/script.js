// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    // Initially hide all sections except the active one
    sections.forEach(section => {
        if (!section.classList.contains('active')) {
            section.classList.remove('active');
        }
    });

    function showSection(sectionId) {
        // Hide all sections
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all nav links
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Add active class to clicked nav link
        const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // Add click event listeners to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            showSection(sectionId);
        });
    });
});

document.getElementById('equipment-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    // Get data from form
    const data = {
        type: document.getElementById('type').value,
        manufacturer: document.getElementById('manufacturer').value,
        model: document.getElementById('model').value,
        year: parseInt(document.getElementById('year').value),
        pressureTemp: document.getElementById('pressure-temp').value,
        hours: parseInt(document.getElementById('hours').value),
        location: document.getElementById('location').value,
        lastRepair: document.getElementById('last-repair').value,
        environment: document.getElementById('environment').value
    };

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.error) {
            alert('Analysis Error: ' + result.error);
            return;
        }

        // Display results
        document.getElementById('failure-prob').textContent = result.failureProb || 'N/A';
        document.getElementById('common-causes').textContent = result.commonCauses || 'N/A';
        document.getElementById('avg-lifetime').textContent = result.avgLifetime || 'N/A';

        // Handle similar stats - format object properly
        let similarStatsText = 'N/A';
        if (result.similarStats) {
            if (typeof result.similarStats === 'string') {
                similarStatsText = result.similarStats;
            } else if (Array.isArray(result.similarStats)) {
                similarStatsText = result.similarStats.join(', ');
            } else if (typeof result.similarStats === 'object') {
                const stats = result.similarStats;
                similarStatsText = `Failure Rate: ${stats.failureRatePercentage || 'N/A'}%, MTBF: ${stats.meanTimeBetweenFailureHours || 'N/A'} hours, Common Issues: ${stats.commonFailureModes || 'N/A'}`;
            }
        }
        document.getElementById('similar-stats').textContent = similarStatsText;

        // Handle maintenance recommendations - format properly
        let maintenanceText = 'N/A';
        if (result.maintenanceRec) {
            if (typeof result.maintenanceRec === 'string') {
                maintenanceText = result.maintenanceRec;
            } else if (Array.isArray(result.maintenanceRec)) {
                maintenanceText = result.maintenanceRec.join(', ');
            } else if (typeof result.maintenanceRec === 'object') {
                maintenanceText = Object.values(result.maintenanceRec).join(', ');
            }
        }
        document.getElementById('maintenance-rec').textContent = maintenanceText;

        // Handle next failure date - format it properly
        let nextFailureText = 'N/A';
        if (result.nextFailure) {
            if (typeof result.nextFailure === 'string') {
                const date = new Date(result.nextFailure);
                if (!isNaN(date.getTime())) {
                    nextFailureText = date.toLocaleDateString();
                } else {
                    nextFailureText = result.nextFailure;
                }
            } else if (result.nextFailure instanceof Date) {
                nextFailureText = result.nextFailure.toLocaleDateString();
            } else {
                nextFailureText = String(result.nextFailure);
            }
        }
        document.getElementById('next-failure').textContent = nextFailureText;

        // Show validation warnings if any
        if (result.warnings && result.warnings.length > 0) {
            alert('Validation Warnings: ' + result.warnings.join(', '));
        }

        // Reliability chart - make it dynamic based on failure probability
        const failureProb = parseFloat(result.failureProb) || 0;
        const ctx = document.getElementById('reliability-chart').getContext('2d');

        // Destroy existing chart if it exists
        if (window.reliabilityChart) {
            window.reliabilityChart.destroy();
        }

        // Generate data points based on failure probability
        const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10'];
        const failureData = years.map((_, index) => {
            return Math.min(100, failureProb * (1 + index * 0.1));
        });

        window.reliabilityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Failure Probability (%)',
                    data: failureData,
                    borderColor: '#00d4ff',
                    borderWidth: 2,
                    fill: false,
                    pointBackgroundColor: '#00d4ff',
                    pointBorderColor: '#00d4ff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: '#cccccc'
                        },
                        grid: {
                            color: '#333333'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#cccccc'
                        },
                        grid: {
                            color: '#333333'
                        }
                    }
                }
            }
        });

        // Display warnings if present
        const warningsDiv = document.getElementById('warnings-section');
        if (result.warnings && result.warnings.length > 0) {
            warningsDiv.innerHTML = `
                <div style="background: #2a1a1a; border: 1px solid #ff6b35; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="color: #ff6b35; margin: 0 0 10px 0;">⚠️ Data Quality Warnings:</h4>
                    <ul style="color: #ff6b35; margin: 0; padding-left: 20px;">
                        ${result.warnings.map(warning => `<li style="margin-bottom: 5px;">${warning}</li>`).join('')}
                    </ul>
                    <p style="color: #cccccc; font-size: 0.9em; margin: 10px 0 0 0;">Analysis results may be less accurate due to input data quality.</p>
                </div>
            `;
            warningsDiv.style.display = 'block';
        } else {
            warningsDiv.style.display = 'none';
        }

        // Show results section with animation
        const analysisContainer = document.querySelector('.analysis-container');
        const resultsSection = document.getElementById('results-section');

        // Add analyzed class to trigger layout change
        analysisContainer.classList.add('analyzed');

        // Show results after a short delay for smooth animation
        setTimeout(() => {
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    } catch (error) {
        alert('Error during analysis: ' + error.message);
    }
});