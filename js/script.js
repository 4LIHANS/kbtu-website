// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

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

    // Show default section (analysis)
    showSection('analysis');
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
        const response = await fetch('http://localhost:3000/analyze', {
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
        document.getElementById('similar-stats').textContent = result.similarStats || 'N/A';
        document.getElementById('maintenance-rec').textContent = result.maintenanceRec || 'N/A';
        document.getElementById('next-failure').textContent = result.nextFailure || 'N/A';

        // Reliability chart
        const ctx = document.getElementById('reliability-chart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                datasets: [{
                    label: 'Failure Probability (%)',
                    data: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
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