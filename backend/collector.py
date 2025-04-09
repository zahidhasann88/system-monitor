import os
import json
import time
import psutil
import datetime

def collect_metrics():
    """Collect system metrics similar to htop"""
    
    # CPU metrics
    cpu_percent = psutil.cpu_percent(interval=1, percpu=True)
    cpu_times = psutil.cpu_times_percent(interval=1)
    cpu_count = psutil.cpu_count()
    cpu_freq = psutil.cpu_freq() if hasattr(psutil, 'cpu_freq') and psutil.cpu_freq() else {"current": 0, "min": 0, "max": 0}
    
    # Memory metrics
    memory = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    # Disk metrics
    disk_usage = {disk.mountpoint: psutil.disk_usage(disk.mountpoint)._asdict() 
                 for disk in psutil.disk_partitions() if os.path.exists(disk.mountpoint)}
    
    # Network metrics
    net_io = psutil.net_io_counters()
    
    # Process information (top processes by CPU and memory)
    processes = []
    for proc in sorted(psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent']), 
                      key=lambda p: p.info['cpu_percent'], 
                      reverse=True)[:10]:  # Top 10 CPU consuming processes
        try:
            proc_info = proc.info
            proc_info['cpu_percent'] = proc.cpu_percent()
            proc_info['memory_percent'] = proc.memory_percent()
            processes.append(proc_info)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    
    # Load average
    try:
        load_avg = os.getloadavg()
    except (AttributeError, OSError):
        load_avg = (0, 0, 0)  # Fallback for Windows or other systems
    
    # System uptime
    boot_time = datetime.datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M:%S")
    uptime_seconds = time.time() - psutil.boot_time()
    uptime = {
        "days": int(uptime_seconds // (24 * 3600)),
        "hours": int((uptime_seconds % (24 * 3600)) // 3600),
        "minutes": int((uptime_seconds % 3600) // 60),
        "seconds": int(uptime_seconds % 60)
    }
    
    metrics = {
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "cpu": {
            "percent": cpu_percent,
            "average_percent": sum(cpu_percent) / len(cpu_percent) if cpu_percent else 0,
            "count": cpu_count,
            "times_percent": cpu_times._asdict(),
            "frequency": {
                "current": cpu_freq.current if hasattr(cpu_freq, 'current') else 0,
                "min": cpu_freq.min if hasattr(cpu_freq, 'min') else 0,
                "max": cpu_freq.max if hasattr(cpu_freq, 'max') else 0
            }
        },
        "memory": {
            "total": memory.total,
            "available": memory.available,
            "percent": memory.percent,
            "used": memory.used,
            "free": memory.free,
            "swap": {
                "total": swap.total,
                "used": swap.used,
                "free": swap.free,
                "percent": swap.percent
            }
        },
        "disk": {mount: {
            "total": data["total"],
            "used": data["used"],
            "free": data["free"],
            "percent": data["percent"]
        } for mount, data in disk_usage.items()},
        "network": {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv,
            "errin": net_io.errin,
            "errout": net_io.errout,
            "dropin": net_io.dropin,
            "dropout": net_io.dropout
        },
        "processes": processes,
        "load_average": {
            "1min": load_avg[0],
            "5min": load_avg[1],
            "15min": load_avg[2]
        },
        "system": {
            "boot_time": boot_time,
            "uptime": uptime
        }
    }
    
    return metrics

def save_metrics_to_file(metrics, file_path="../data/metrics.json"):
    """Save metrics to JSON file"""
    # Create the directory if it doesn't exist
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # Get existing data if the file exists
    all_metrics = []
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r') as f:
                all_metrics = json.load(f)
                # Keep only the last 100 metrics to avoid huge files
                if len(all_metrics) >= 100:
                    all_metrics = all_metrics[-99:]
        except json.JSONDecodeError:
            # If file is corrupted, start with empty list
            all_metrics = []
    
    # Add new metrics
    all_metrics.append(metrics)
    
    # Write all metrics back to file
    with open(file_path, 'w') as f:
        json.dump(all_metrics, f, indent=2)
    
    # Also save the latest metrics separately for quick access
    with open(os.path.dirname(file_path) + "/latest_metrics.json", 'w') as f:
        json.dump(metrics, f, indent=2)
    
    return file_path

if __name__ == "__main__":
    # Test the collector
    metrics = collect_metrics()
    file_path = save_metrics_to_file(metrics)
    print(f"Metrics saved to {file_path}")