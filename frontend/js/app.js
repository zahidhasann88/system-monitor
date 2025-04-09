document.addEventListener('DOMContentLoaded', function() {
    // Base URL for API calls
    const API_BASE_URL = '/api';
    
    // Application state
    const state = {
        isScheduling: false,
        currentInterval: null,
        lastNetworkBytes: {
            sent: 0,
            recv: 0
        }
    };
    
    // DOM Elements
    const collectBtn = document.getElementById('collectBtn');
    const scheduleButtons = document.querySelectorAll('.schedule-btn');
    const stopScheduleBtn = document.getElementById('stopScheduleBtn');
    const statusAlert = document.getElementById('statusAlert');
    
    // Charts for historical data
    let cpuChart, memoryChart, networkChart, diskChart;
    let historicalDataLoaded = false;
    
    // Initialize
    initializeCharts();
    fetchLatestMetrics();
    fetchHistoricalData();
    
    // Event listeners
    collectBtn.addEventListener('click', fetchLatestMetrics);
    
    scheduleButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const interval = parseInt(this.getAttribute('data-interval'));
            scheduleMetricsCollection(interval);
        });
    });
    
    stopScheduleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        stopScheduleCollection();
    });
    
    // Add event listener for time range selector
    document.getElementById('timeRangeSelect').addEventListener('change', function() {
        if (historicalDataLoaded) {
            fetchHistoricalData();
        }
    });
    
    // Functions
    async function fetchLatestMetrics() {
        try {
            showLoading();
            
            const response = await fetch(`${API_BASE_URL}/metrics`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const metrics = await response.json();
            updateUI(metrics);
            updateLastUpdateTime();
            
            // Update charts if historical data is loaded
            if (historicalDataLoaded) {
                fetchHistoricalData();
            }
            
            showSuccess("Metrics collected successfully!");
        } catch (error) {
            console.error("Error fetching metrics:", error);
            showError("Failed to collect metrics. Check the console for details.");
        }
    }
    
    async function scheduleMetricsCollection(interval) {
        try {
            const response = await fetch(`${API_BASE_URL}/schedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ interval })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Update application state
            state.isScheduling = true;
            state.currentInterval = interval;
            
            // Update UI to show scheduling is active
            collectBtn.classList.add('schedule-active');
            showInfo(`${result.message}. Auto-refreshing metrics...`);
            
            // Set up local refresh for UI updates
            if (window.metricsInterval) {
                clearInterval(window.metricsInterval);
            }
            
            window.metricsInterval = setInterval(fetchLatestMetrics, interval * 1000);
            
        } catch (error) {
            console.error("Error scheduling metrics collection:", error);
            showError("Failed to schedule metrics collection. Check the console for details.");
        }
    }
    
    async function stopScheduleCollection() {
        try {
            const response = await fetch(`${API_BASE_URL}/schedule/stop`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Update application state
            state.isScheduling = false;
            state.currentInterval = null;
            
            // Update UI
            collectBtn.classList.remove('schedule-active');
            showInfo(result.message);
            
            // Clear interval
            if (window.metricsInterval) {
                clearInterval(window.metricsInterval);
                window.metricsInterval = null;
            }
            
        } catch (error) {
            console.error("Error stopping scheduled collection:", error);
            showError("Failed to stop scheduled collection. Check the console for details.");
        }
    }
    
    function updateUI(metrics) {
        // Update System Overview
        updateSystemOverview(metrics);
        
        // Update CPU Usage
        updateCpuUsage(metrics.cpu);
        
        // Update Memory Usage
        updateMemoryUsage(metrics.memory);
        
        // Update Disk Usage
        updateDiskUsage(metrics.disk);
        
        // Update Network Usage
        updateNetworkUsage(metrics.network);
        
        // Update Process Table
        updateProcessTable(metrics.processes);
    }
    
    function updateSystemOverview(metrics) {
        // Update uptime
        const uptime = metrics.system.uptime;
        document.getElementById('systemUptime').textContent = 
            `${uptime.days}d ${uptime.hours}h ${uptime.minutes}m ${uptime.seconds}s`;
        
        // Update CPU info
        document.getElementById('cpuInfo').textContent = 
            `${metrics.cpu.count} cores @ ${(metrics.cpu.frequency.current/1000).toFixed(2)} GHz, Average: ${metrics.cpu.average_percent.toFixed(1)}%`;
        
        // Update load average
        document.getElementById('loadAvg').textContent = 
            `1min: ${metrics.load_average["1min"].toFixed(2)}, 5min: ${metrics.load_average["5min"].toFixed(2)}, 15min: ${metrics.load_average["15min"].toFixed(2)}`;
        
        // Update memory info
        const totalGB = (metrics.memory.total / (1024 * 1024 * 1024)).toFixed(2);
        const usedGB = (metrics.memory.used / (1024 * 1024 * 1024)).toFixed(2);
        document.getElementById('memInfo').textContent = 
            `${usedGB} GB / ${totalGB} GB (${metrics.memory.percent.toFixed(1)}%)`;
    }
    
    function updateCpuUsage(cpuData) {
        // Update main CPU progress bar
        const cpuProgressContainer = document.getElementById('cpuProgressContainer');
        const avgPercent = cpuData.average_percent;
        
        cpuProgressContainer.innerHTML = `
            <div class="progress" role="progressbar" style="width: 100%">
                <div class="progress-bar ${getProgressBarColor(avgPercent)}" style="width: ${avgPercent}%">
                    ${avgPercent.toFixed(1)}%
                </div>
            </div>
        `;
        
        // Update individual cores
        const cpuCoresContainer = document.getElementById('cpuCoresContainer');
        cpuCoresContainer.innerHTML = '';
        
        cpuData.percent.forEach((corePercent, index) => {
            const coreDiv = document.createElement('div');
            coreDiv.className = 'mb-2';
            coreDiv.innerHTML = `
                <div class="cpu-core-label">Core ${index + 1}</div>
                <div class="progress cpu-core-progress">
                    <div class="progress-bar ${getProgressBarColor(corePercent)}" 
                         role="progressbar" 
                         style="width: ${corePercent}%" 
                         aria-valuenow="${corePercent}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                        ${corePercent.toFixed(1)}%
                    </div>
                </div>
            `;
            cpuCoresContainer.appendChild(coreDiv);
        });
    }
    
    function updateMemoryUsage(memoryData) {
        // RAM
        const ramPercent = memoryData.percent;
        document.getElementById('ramProgress').style.width = `${ramPercent}%`;
        document.getElementById('ramProgress').textContent = `${ramPercent.toFixed(1)}%`;
        document.getElementById('ramProgress').className = `progress-bar ${getProgressBarColor(ramPercent)}`;
        
        // Convert bytes to GB
        const totalGB = (memoryData.total / (1024 * 1024 * 1024)).toFixed(2);
        const usedGB = (memoryData.used / (1024 * 1024 * 1024)).toFixed(2);
        const freeGB = (memoryData.free / (1024 * 1024 * 1024)).toFixed(2);
        
        document.getElementById('ramTotal').textContent = `${totalGB} GB`;
        document.getElementById('ramUsed').textContent = `${usedGB} GB`;
        document.getElementById('ramFree').textContent = `${freeGB} GB`;
        
        // Swap
        const swapPercent = memoryData.swap.percent;
        document.getElementById('swapProgress').style.width = `${swapPercent}%`;
        document.getElementById('swapProgress').textContent = `${swapPercent.toFixed(1)}%`;
        document.getElementById('swapProgress').className = `progress-bar ${getProgressBarColor(swapPercent)}`;
        
        // Convert bytes to GB for swap
        const swapTotalGB = (memoryData.swap.total / (1024 * 1024 * 1024)).toFixed(2);
        const swapUsedGB = (memoryData.swap.used / (1024 * 1024 * 1024)).toFixed(2);
        const swapFreeGB = (memoryData.swap.free / (1024 * 1024 * 1024)).toFixed(2);
        
        document.getElementById('swapTotal').textContent = `${swapTotalGB} GB`;
        document.getElementById('swapUsed').textContent = `${swapUsedGB} GB`;
        document.getElementById('swapFree').textContent = `${swapFreeGB} GB`;
    }
    
    function updateDiskUsage(diskData) {
        const diskUsageContainer = document.getElementById('diskUsage');
        diskUsageContainer.innerHTML = '';
        
        for (const [mountPoint, data] of Object.entries(diskData)) {
            const diskDiv = document.createElement('div');
            diskDiv.className = 'mb-3';
            
            // Convert bytes to GB
            const totalGB = (data.total / (1024 * 1024 * 1024)).toFixed(2);
            const usedGB = (data.used / (1024 * 1024 * 1024)).toFixed(2);
            const freeGB = (data.free / (1024 * 1024 * 1024)).toFixed(2);
            
            diskDiv.innerHTML = `
                <h6>${mountPoint}</h6>
                <div class="progress mb-2">
                    <div class="progress-bar ${getProgressBarColor(data.percent)}" 
                         role="progressbar" 
                         style="width: ${data.percent}%" 
                         aria-valuenow="${data.percent}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                        ${data.percent.toFixed(1)}%
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <small class="text-muted">Total: ${totalGB} GB</small>
                    </div>
                    <div class="col-md-4">
                        <small class="text-muted">Used: ${usedGB} GB</small>
                    </div>
                    <div class="col-md-4">
                        <small class="text-muted">Free: ${freeGB} GB</small>
                    </div>
                </div>
            `;
            
            diskUsageContainer.appendChild(diskDiv);
        }
        
        if (Object.keys(diskData).length === 0) {
            diskUsageContainer.innerHTML = '<p class="text-center">No disk information available</p>';
        }
    }
    
    function updateNetworkUsage(networkData) {
        // Calculate rates if we have previous data
        let sentRate = 0;
        let recvRate = 0;
        
        if (state.lastNetworkBytes.sent > 0 && state.lastNetworkBytes.recv > 0) {
            // Simple rate calculation (bytes per second)
            // In a real app, you'd need to track the exact time between updates
            sentRate = networkData.bytes_sent - state.lastNetworkBytes.sent;
            recvRate = networkData.bytes_recv - state.lastNetworkBytes.recv;
            
            // If negative (e.g., counter reset), set to zero
            if (sentRate < 0) sentRate = 0;
            if (recvRate < 0) recvRate = 0;
        }
        
        // Save current values for next calculation
        state.lastNetworkBytes.sent = networkData.bytes_sent;
        state.lastNetworkBytes.recv = networkData.bytes_recv;
        
        // Update UI
        document.getElementById('netSent').innerHTML = `
            Total: ${formatBytes(networkData.bytes_sent)}<br>
            Packets: ${networkData.packets_sent.toLocaleString()}<br>
            Rate: ${formatBytes(sentRate)}/s
        `;
        
        document.getElementById('netRecv').innerHTML = `
            Total: ${formatBytes(networkData.bytes_recv)}<br>
            Packets: ${networkData.packets_recv.toLocaleString()}<br>
            Rate: ${formatBytes(recvRate)}/s
        `;
        
        document.getElementById('netErrIn').textContent = networkData.errin.toLocaleString();
        document.getElementById('netErrOut').textContent = networkData.errout.toLocaleString();
        document.getElementById('netDropIn').textContent = networkData.dropin.toLocaleString();
        document.getElementById('netDropOut').textContent = networkData.dropout.toLocaleString();
    }
    
    function updateProcessTable(processes) {
        const processesTable = document.getElementById('processesTable');
        processesTable.innerHTML = '';
        
        if (processes.length === 0) {
            processesTable.innerHTML = '<tr><td colspan="5" class="text-center">No process information available</td></tr>';
            return;
        }
        
        processes.forEach(process => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${process.pid}</td>
                <td>${process.name}</td>
                <td>${process.username || 'N/A'}</td>
                <td>${process.cpu_percent ? process.cpu_percent.toFixed(1) : '0.0'}%</td>
                <td>${process.memory_percent ? process.memory_percent.toFixed(1) : '0.0'}%</td>
            `;
            
            processesTable.appendChild(row);
        });
    }
    
    function updateLastUpdateTime() {
        const now = new Date();
        document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
    }
    
    // Helper functions
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    function getProgressBarColor(percent) {
        if (percent < 50) return 'bg-success';
        if (percent < 75) return 'bg-warning';
        return 'bg-danger';
    }
    
    // Status message functions
    function showLoading() {
        statusAlert.className = 'alert alert-primary';
        statusAlert.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading system metrics...';
    }
    
    function showSuccess(message) {
        statusAlert.className = 'alert alert-success';
        statusAlert.innerHTML = `<i class="fas fa-check-circle me-2"></i>${message}`;
    }
    
    function showError(message) {
        statusAlert.className = 'alert alert-danger';
        statusAlert.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>${message}`;
    }
    
    function showInfo(message) {
        statusAlert.className = 'alert alert-info';
        statusAlert.innerHTML = `<i class="fas fa-info-circle me-2"></i>${message}`;
    }
    
    // Initialize charts
    function initializeCharts() {
        // Set Chart.js defaults
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        Chart.defaults.font.size = 12;
        Chart.defaults.color = '#666';
        
        // CPU History Chart
        const cpuCtx = document.getElementById('cpuHistoryChart').getContext('2d');
        cpuChart = new Chart(cpuCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'CPU Usage (%)',
                    data: [],
                    borderColor: 'rgb(220, 53, 69)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Percentage'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
        
        // Memory History Chart
        const memoryCtx = document.getElementById('memoryHistoryChart').getContext('2d');
        memoryChart = new Chart(memoryCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'RAM Usage (%)',
                    data: [],
                    borderColor: 'rgb(40, 167, 69)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Swap Usage (%)',
                    data: [],
                    borderColor: 'rgb(255, 193, 7)',
                    backgroundColor: 'rgba(255, 193, 7, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Percentage'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
        
        // Network History Chart
        const networkCtx = document.getElementById('networkHistoryChart').getContext('2d');
        networkChart = new Chart(networkCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Network Sent (KB/s)',
                    data: [],
                    borderColor: 'rgb(0, 123, 255)',
                    backgroundColor: 'rgba(0, 123, 255, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'Network Received (KB/s)',
                    data: [],
                    borderColor: 'rgb(23, 162, 184)',
                    backgroundColor: 'rgba(23, 162, 184, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'KB/s'
                        },
                        min: 0.1
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
        
        // Disk I/O History Chart
        const diskCtx = document.getElementById('diskHistoryChart').getContext('2d');
        diskChart = new Chart(diskCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Read (MB/s)',
                    data: [],
                    borderColor: 'rgb(111, 66, 193)',
                    backgroundColor: 'rgba(111, 66, 193, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'Write (MB/s)',
                    data: [],
                    borderColor: 'rgb(253, 126, 20)',
                    backgroundColor: 'rgba(253, 126, 20, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'MB/s'
                        },
                        min: 0.01
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }
    
    // Fetch historical data and update charts
    async function fetchHistoricalData() {
        try {
            const response = await fetch(`${API_BASE_URL}/metrics/history`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const historyData = await response.json();
            if (historyData.length === 0) {
                showInfo("No historical data available yet.");
                return;
            }
            
            updateHistoricalCharts(historyData);
            historicalDataLoaded = true;
        } catch (error) {
            console.error("Error fetching historical data:", error);
            showError("Failed to load historical data. Check the console for details.");
        }
    }
    
    // Update charts with historical data
    function updateHistoricalCharts(historyData) {
        // Get selected time range
        const timeRangeHours = parseInt(document.getElementById('timeRangeSelect').value);
        const timeRangeMs = timeRangeHours * 60 * 60 * 1000;
        
        // Filter data based on time range
        const now = new Date();
        const filteredData = historyData.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return (now - entryDate) <= timeRangeMs;
        });
        
        if (filteredData.length === 0) {
            showInfo(`No data available for the last ${timeRangeHours} hour(s).`);
            return;
        }
        
        // Prepare data for charts
        const labels = filteredData.map(entry => {
            const date = new Date(entry.timestamp);
            return date.toLocaleTimeString();
        });
        
        // CPU data
        const cpuData = filteredData.map(entry => entry.cpu.average_percent);
        
        // Memory data
        const ramData = filteredData.map(entry => entry.memory.percent);
        const swapData = filteredData.map(entry => entry.memory.swap.percent);
        
        // Network data - calculate rates
        const netSentData = [];
        const netRecvData = [];
        
        for (let i = 1; i < filteredData.length; i++) {
            const timeDiff = (new Date(filteredData[i].timestamp) - new Date(filteredData[i-1].timestamp)) / 1000;
            
            if (timeDiff > 0) {
                const sentDiff = filteredData[i].network.bytes_sent - filteredData[i-1].network.bytes_sent;
                const recvDiff = filteredData[i].network.bytes_recv - filteredData[i-1].network.bytes_recv;
                
                // Convert to KB/s
                netSentData.push(Math.max(0, sentDiff / 1024 / timeDiff));
                netRecvData.push(Math.max(0, recvDiff / 1024 / timeDiff));
            } else {
                netSentData.push(0);
                netRecvData.push(0);
            }
        }
        
        // Add 0 for the first point (no rate calculation possible)
        netSentData.unshift(0);
        netRecvData.unshift(0);
        
        // Update CPU chart
        cpuChart.data.labels = labels;
        cpuChart.data.datasets[0].data = cpuData;
        cpuChart.update();
        
        // Update Memory chart
        memoryChart.data.labels = labels;
        memoryChart.data.datasets[0].data = ramData;
        memoryChart.data.datasets[1].data = swapData;
        memoryChart.update();
        
        // Update Network chart
        networkChart.data.labels = labels;
        networkChart.data.datasets[0].data = netSentData;
        networkChart.data.datasets[1].data = netRecvData;
        networkChart.update();
        
        // For disk I/O, we'll just use placeholder data for now
        // In a real implementation, you would calculate these rates from disk read/write counters
        const diskReadData = filteredData.map(() => Math.random() * 5);
        const diskWriteData = filteredData.map(() => Math.random() * 8);
        
        diskChart.data.labels = labels;
        diskChart.data.datasets[0].data = diskReadData;
        diskChart.data.datasets[1].data = diskWriteData;
        diskChart.update();
    }
});