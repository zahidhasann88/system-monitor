# System Monitor

A web-based system monitoring application built with Flask and JavaScript that provides real-time insights into the performance of the machine it's running on. It tracks metrics such as CPU usage, memory consumption, disk activity, and system uptime in real time through a clean and interactive interface.

## Features

- **Real-time Monitoring**: Track CPU, memory, disk, and network usage in real-time
- **Historical Data**: View performance trends with interactive charts
- **Process Management**: See top processes by CPU and memory usage
- **Configurable Alerts**: Set custom thresholds for system resources and receive alerts
- **Scheduling**: Schedule automatic metrics collection at custom intervals
- **Responsive Design**: Works on desktop and mobile devices

## Requirements

- Python 3.6+
- Modern web browser

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/zahidhasann88/system-monitor.git
   cd system-monitor
   ```

2. Install the required Python packages:
   ```
   pip install -r requirements.txt
   ```

   Requirements:
   - flask
   - flask-cors
   - psutil
   - apscheduler

## Usage

1. Start the server:
   ```
   cd backend
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

3. The dashboard will load with current system metrics. You can:
   - Click "Collect Now" to manually update metrics
   - Schedule automatic updates using the "Schedule" buttons
   - Configure alert thresholds by clicking the "Configure Alerts" button
   - View historical data in the charts section
   - Change the time range for historical data using the dropdown

## API Endpoints

The application provides the following API endpoints:

- `GET /api/metrics`: Get the latest system metrics
- `GET /api/metrics/history`: Get historical metrics data
- `POST /api/metrics/collect`: Manually trigger metrics collection
- `POST /api/schedule`: Schedule automatic metrics collection
- `POST /api/schedule/stop`: Stop scheduled metrics collection
- `GET /api/alerts`: Get alerts history
- `GET /api/alerts/config`: Get alerts configuration
- `POST /api/alerts/config`: Update alerts configuration

## Alert System

The system can monitor and alert on:

- CPU usage exceeding threshold
- Memory usage exceeding threshold
- Swap usage exceeding threshold
- Disk usage exceeding threshold for any mount point

To configure alerts, click the "Configure Alerts" button on the dashboard and set the following for each metric:

- Enable/disable the alert
- Threshold percentage
- Duration (number of consecutive checks)

## Development

### Backend

The backend is built with Flask and uses:
- `psutil` for collecting system metrics
- `apscheduler` for scheduling metrics collection
- `flask-cors` for handling cross-origin requests

### Frontend

The frontend uses:
- Bootstrap 5 for responsive design
- Chart.js for interactive charts
- FontAwesome for icons
- Plain JavaScript (no framework dependencies)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

- **No data displayed**: Ensure the backend server is running and accessible
- **Charts not updating**: Check browser console for JavaScript errors
- **Permission denied errors**: The application may require elevated permissions to access certain system metrics

### Logs

Check the Flask server console for backend errors and your browser's developer console for frontend issues.

## Future Improvements

- Add user authentication
- Support for remote system monitoring
- Email/webhook notifications for alerts
- Dark mode theme
- Additional metrics (temperature, fan speeds, etc.)
- Export metrics data to CSV/JSON
