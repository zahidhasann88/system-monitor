# Create a new file named alerts.py in the backend folder

import json
import os
from datetime import datetime

class AlertSystem:
    def __init__(self, config_file="config/alerts.json", alerts_log="data/alerts_log.json"):
        self.config_file = config_file
        self.alerts_log = alerts_log
        self.config = self._load_config()
        self._ensure_log_exists()
    
    def _load_config(self):
        """Load alert configuration from file"""
        if not os.path.exists(self.config_file):
            # Create default configuration if not exists
            os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
            default_config = {
                "cpu": {
                    "enabled": True,
                    "threshold": 80,
                    "duration": 2  # Number of consecutive checks
                },
                "memory": {
                    "enabled": True,
                    "threshold": 90,
                    "duration": 2
                },
                "disk": {
                    "enabled": True,
                    "threshold": 85,
                    "duration": 1
                },
                "swap": {
                    "enabled": True,
                    "threshold": 80,
                    "duration": 2
                }
            }
            with open(self.config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
            return default_config
        
        # Load existing configuration
        try:
            with open(self.config_file, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            # If file is corrupted, return default
            return {
                "cpu": {"enabled": True, "threshold": 80, "duration": 2},
                "memory": {"enabled": True, "threshold": 90, "duration": 2},
                "disk": {"enabled": True, "threshold": 85, "duration": 1},
                "swap": {"enabled": True, "threshold": 80, "duration": 2}
            }
    
    def _ensure_log_exists(self):
        """Make sure the alerts log file exists"""
        os.makedirs(os.path.dirname(self.alerts_log), exist_ok=True)
        if not os.path.exists(self.alerts_log):
            with open(self.alerts_log, 'w') as f:
                json.dump([], f)
    
    def check_alerts(self, metrics):
        """Check metrics against alert thresholds and log alerts"""
        alerts = []
        
        # Check CPU alert
        if self.config["cpu"]["enabled"] and metrics["cpu"]["average_percent"] > self.config["cpu"]["threshold"]:
            alerts.append({
                "type": "cpu",
                "message": f"CPU usage is high: {metrics['cpu']['average_percent']:.1f}% (threshold: {self.config['cpu']['threshold']}%)",
                "level": "warning",
                "timestamp": metrics["timestamp"]
            })
        
        # Check Memory alert
        if self.config["memory"]["enabled"] and metrics["memory"]["percent"] > self.config["memory"]["threshold"]:
            alerts.append({
                "type": "memory",
                "message": f"Memory usage is high: {metrics['memory']['percent']:.1f}% (threshold: {self.config['memory']['threshold']}%)",
                "level": "warning",
                "timestamp": metrics["timestamp"]
            })
        
        # Check Swap alert
        if self.config["swap"]["enabled"] and metrics["memory"]["swap"]["percent"] > self.config["swap"]["threshold"]:
            alerts.append({
                "type": "swap",
                "message": f"Swap usage is high: {metrics['memory']['swap']['percent']:.1f}% (threshold: {self.config['swap']['threshold']}%)",
                "level": "warning",
                "timestamp": metrics["timestamp"]
            })
        
        # Check Disk alerts
        if self.config["disk"]["enabled"]:
            for mount, data in metrics["disk"].items():
                if data["percent"] > self.config["disk"]["threshold"]:
                    alerts.append({
                        "type": "disk",
                        "message": f"Disk usage for {mount} is high: {data['percent']:.1f}% (threshold: {self.config['disk']['threshold']}%)",
                        "level": "warning",
                        "timestamp": metrics["timestamp"]
                    })
        
        # Log alerts if any
        if alerts:
            self._log_alerts(alerts)
        
        return alerts
    
    def _log_alerts(self, new_alerts):
        """Add alerts to the log file"""
        try:
            with open(self.alerts_log, 'r') as f:
                try:
                    existing_alerts = json.load(f)
                except json.JSONDecodeError:
                    existing_alerts = []
        except FileNotFoundError:
            existing_alerts = []
        
        # Add new alerts
        existing_alerts.extend(new_alerts)
        
        # Keep only the latest 100 alerts
        if len(existing_alerts) > 100:
            existing_alerts = existing_alerts[-100:]
        
        # Write back to file
        with open(self.alerts_log, 'w') as f:
            json.dump(existing_alerts, f, indent=2)
    
    def get_alerts(self, limit=50):
        """Get recent alerts from the log"""
        try:
            with open(self.alerts_log, 'r') as f:
                alerts = json.load(f)
                return alerts[-limit:] if len(alerts) > limit else alerts
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def update_config(self, new_config):
        """Update alert configuration"""
        self.config.update(new_config)
        os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
        return self.config
    
    def get_config(self):
        """Get current alert configuration"""
        return self.config