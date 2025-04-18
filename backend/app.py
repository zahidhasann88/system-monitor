from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
import os
import time
import json
from collector import collect_metrics, save_metrics_to_file
from alerts import AlertSystem

app = Flask(__name__, static_folder='../frontend')
CORS(app)  # Enable CORS for all routes
alert_system = AlertSystem(config_file="../config/alerts.json", alerts_log="../data/alerts_log.json")

# Create a scheduler
scheduler = BackgroundScheduler()
job = None

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    """Get the latest metrics from the file and check for alerts"""
    latest_file = "../data/latest_metrics.json"
    all_file = "../data/metrics.json"
    
    if os.path.exists(latest_file):
        try:
            with open(latest_file, 'r') as f:
                metrics = json.load(f)
                # Check for alerts
                alerts = alert_system.check_alerts(metrics)
                # Add alerts to response
                metrics["alerts"] = alerts
                return jsonify(metrics)
        except json.JSONDecodeError:
            pass
    
    # If latest file doesn't exist or is corrupt, collect metrics now
    metrics = collect_metrics()
    alerts = alert_system.check_alerts(metrics)
    metrics["alerts"] = alerts
    save_metrics_to_file(metrics)
    return jsonify(metrics)

# Add these new API endpoints for alerts
@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get alerts history"""
    limit = request.args.get('limit', 50, type=int)
    alerts = alert_system.get_alerts(limit)
    return jsonify(alerts)

@app.route('/api/alerts/config', methods=['GET'])
def get_alerts_config():
    """Get alerts configuration"""
    config = alert_system.get_config()
    return jsonify(config)

@app.route('/api/alerts/config', methods=['POST'])
def update_alerts_config():
    """Update alerts configuration"""
    new_config = request.json
    updated_config = alert_system.update_config(new_config)
    return jsonify(updated_config)

@app.route('/api/metrics/history', methods=['GET'])
def get_metrics_history():
    """Get historical metrics from file"""
    file_path = "../data/metrics.json"
    
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r') as f:
                metrics = json.load(f)
                return jsonify(metrics)
        except json.JSONDecodeError:
            return jsonify([])
    
    return jsonify([])

@app.route('/api/metrics/collect', methods=['POST'])
def trigger_metrics_collection():
    """Manually trigger metrics collection"""
    metrics = collect_metrics()
    save_metrics_to_file(metrics)
    return jsonify({"status": "success", "message": "Metrics collected successfully"})

@app.route('/api/schedule', methods=['POST'])
def schedule_metrics():
    """Set up a schedule for metrics collection"""
    global job
    
    data = request.json
    interval = data.get('interval', 60)  # Default to 60 seconds
    
    # Remove existing job if any
    if job:
        scheduler.remove_job(job.id)
    
    # Add new job
    job = scheduler.add_job(
        func=lambda: save_metrics_to_file(collect_metrics()),
        trigger='interval',
        seconds=interval,
        id='metrics_collector'
    )
    
    return jsonify({
        "status": "success", 
        "message": f"Metrics collection scheduled every {interval} seconds"
    })

@app.route('/api/schedule/stop', methods=['POST'])
def stop_schedule():
    """Stop scheduled metrics collection"""
    global job
    
    if job:
        scheduler.remove_job(job.id)
        job = None
        return jsonify({"status": "success", "message": "Scheduled metrics collection stopped"})
    
    return jsonify({"status": "warning", "message": "No scheduled job was running"})

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve frontend files"""
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Start the scheduler
    scheduler.start()
    
    try:
        # Run the Flask app
        app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
    finally:
        # Shut down the scheduler when exiting
        scheduler.shutdown()