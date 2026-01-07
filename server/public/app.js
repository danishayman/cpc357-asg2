// Chart instances
let tempChart, humidityChart;

// Initialize charts
function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#888',
                    maxTicksLimit: 8
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#888'
                }
            }
        }
    };

    // Temperature Chart
    const tempCtx = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature',
                data: [],
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }]
        },
        options: chartOptions
    });

    // Humidity Chart
    const humidityCtx = document.getElementById('humidityChart').getContext('2d');
    humidityChart = new Chart(humidityCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Humidity',
                data: [],
                borderColor: '#4ecdc4',
                backgroundColor: 'rgba(78, 205, 196, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }]
        },
        options: chartOptions
    });
}

// Fetch latest data
async function fetchLatest() {
    try {
        const response = await fetch('/api/latest');
        const data = await response.json();
        
        if (data) {
            document.getElementById('temperature').textContent = data.temperature?.toFixed(1) || '--';
            document.getElementById('humidity').textContent = data.humidity?.toFixed(1) || '--';
            
            const motionEl = document.getElementById('motion');
            motionEl.textContent = data.motion ? 'Detected' : 'None';
            motionEl.className = data.motion ? 'card-value status-on' : 'card-value';
            
            const ledEl = document.getElementById('led');
            ledEl.textContent = data.led_state ? 'ON' : 'OFF';
            ledEl.className = data.led_state ? 'card-value status-on' : 'card-value status-off';
            
            const relayEl = document.getElementById('relay');
            relayEl.textContent = data.relay_state ? 'ON' : 'OFF';
            relayEl.className = data.relay_state ? 'card-value status-on' : 'card-value status-off';
            
            document.getElementById('deviceId').textContent = data.device_id || '--';
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
        }
    } catch (err) {
        console.error('Error fetching latest data:', err);
    }
}

// Fetch statistics
async function fetchStats() {
    try {
        const response = await fetch('/api/stats?hours=24');
        const data = await response.json();
        
        if (data) {
            document.getElementById('avgTemp').textContent = data.avgTemp?.toFixed(1) + '°C' || '--';
            document.getElementById('tempRange').textContent = 
                `${data.minTemp?.toFixed(1) || '--'} / ${data.maxTemp?.toFixed(1) || '--'}°C`;
            document.getElementById('avgHumidity').textContent = data.avgHumidity?.toFixed(1) + '%' || '--';
            document.getElementById('totalReadings').textContent = data.totalReadings || 0;
        }
    } catch (err) {
        console.error('Error fetching stats:', err);
    }
}

// Fetch history and update charts
async function fetchHistory() {
    try {
        const response = await fetch('/api/history?hours=24');
        const data = await response.json();
        
        if (data && data.length > 0) {
            // Sample data if too many points
            const maxPoints = 50;
            const step = Math.max(1, Math.floor(data.length / maxPoints));
            const sampledData = data.filter((_, i) => i % step === 0);
            
            const labels = sampledData.map(d => {
                const date = new Date(d.received_at);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            });
            
            const temps = sampledData.map(d => d.temperature);
            const humidity = sampledData.map(d => d.humidity);
            
            // Update temperature chart
            tempChart.data.labels = labels;
            tempChart.data.datasets[0].data = temps;
            tempChart.update('none');
            
            // Update humidity chart
            humidityChart.data.labels = labels;
            humidityChart.data.datasets[0].data = humidity;
            humidityChart.update('none');
        }
    } catch (err) {
        console.error('Error fetching history:', err);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    
    // Initial fetch
    fetchLatest();
    fetchStats();
    fetchHistory();
    
    // Auto-refresh every 5 seconds
    setInterval(fetchLatest, 5000);
    setInterval(fetchStats, 30000);
    setInterval(fetchHistory, 60000);
});
