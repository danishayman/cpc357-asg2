# Smart Room Monitoring System

IoT-based smart room monitoring system using ESP32-S3, MQTT, and MongoDB on Google Cloud Platform.

## Project Overview

This project implements a real-time room monitoring system that collects environmental data (temperature, humidity) and motion detection, transmitting it to a cloud-based database for storage and analysis.

### System Components

**Hardware:**
- Adafruit Feather ESP32-S3
- DHT11 Temperature & Humidity Sensor
- PIR Motion Sensor
- LED Indicator
- Relay Module (for device control)

**Software & Cloud:**
- Google Cloud Platform (GCP) Compute Engine
- Mosquitto MQTT Broker
- MongoDB Database
- Node.js Bridge Service

## System Architecture

```
┌─────────────────┐
│   ESP32-S3      │
│   - DHT11       │
│   - PIR Sensor  │
│   - LED         │
│   - Relay       │
└────────┬────────┘
         │ WiFi/MQTT
         ↓
┌─────────────────┐
│  GCP VM Instance│
│  ┌───────────┐  │
│  │ Mosquitto │  │
│  │   MQTT    │  │
│  └─────┬─────┘  │
│        ↓        │
│  ┌───────────┐  │
│  │  Bridge   │  │
│  │  Node.js  │  │
│  └─────┬─────┘  │
│        ↓        │
│  ┌───────────┐  │
│  │  MongoDB  │  │
│  └───────────┘  │
└─────────────────┘
```

## Features

- Real-time temperature and humidity monitoring
- Motion detection with automatic LED control
- Automatic relay control based on temperature threshold
- MQTT protocol for efficient data transmission
- Cloud-based data storage in MongoDB
- Persistent data logging with timestamps
- Auto-restart services on VM reboot

## 🔧 Hardware Setup

### Pin Connections

| Component | ESP32-S3 Pin | Notes |
|-----------|--------------|-------|
| DHT11 VCC | 3.3V | Power supply |
| DHT11 GND | GND | Ground |
| DHT11 DATA | GPIO 4 | Data signal |
| PIR VCC | 5V | Power supply |
| PIR GND | GND | Ground |
| PIR OUT | GPIO 5 | Motion signal |
| LED (+) | GPIO 2 | Via 220Ω resistor |
| LED (-) | GND | Ground |
| Relay VCC | 5V | Power supply |
| Relay GND | GND | Ground |
| Relay IN | GPIO 15 | Control signal |

### Circuit Diagram
*(Include your circuit diagram here)*

## Software Setup

### Prerequisites

- ESP32-S3 Board
- Arduino IDE with ESP32 Board Support
- Google Cloud Platform account
- Node.js 25.x or higher (on server)
- MongoDB 7.0 or higher (on server)

### Arduino Libraries Required

```
- PubSubClient (v2.8)
- DHT sensor library by Adafruit (v1.4.4)
- Adafruit Unified Sensor (v1.1.9)
- ArduinoJson (v7.x)
```

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/danishayman/cpc357-asg2.git
cd cpc357-asg2
```

### 2. GCP VM Setup

#### Option A: Quick Start (Using Scripts)

You can use the provided setup scripts to automate the installation:

```bash
# Clone the repo on your GCP VM
git clone https://github.com/danishayman/cpc357-asg2.git
cd cpc357-asg2

# Run the complete server setup script (installs Mosquitto, MongoDB, Node.js)
bash scripts/setup-server.sh
```

The script will prompt you to enter:
- MQTT username and password
- MongoDB credentials (optional)

**Or run individual setup scripts:**

```bash
# Install and configure MongoDB only
sudo bash scripts/setup-mongodb.sh

# Then run the server setup for Mosquitto and Node.js
bash scripts/setup-server.sh
```

#### Option B: Manual Installation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Mosquitto MQTT Broker
sudo apt install -y mosquitto mosquitto-clients

# Install MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Configure MQTT Broker

```bash
# Copy configuration
sudo cp config/mosquitto.conf /etc/mosquitto/mosquitto.conf

# Create MQTT user
sudo mosquitto_passwd -c /etc/mosquitto/passwd iotuser

# Restart Mosquitto
sudo systemctl restart mosquitto
```

### 4. Configure Bridge Service

```bash
cd server

# Copy environment template and configure your credentials
cp .env.example .env
nano .env  # Edit with your MQTT and MongoDB credentials

# Install dependencies
npm install

# Test the bridge
npm start
```

### 5. Setup as System Service (Auto-start on reboot)

```bash
# Copy service file
sudo cp config/mqtt-bridge.service /etc/systemd/system/

# Edit service file to update YOUR_USERNAME with your actual username
sudo nano /etc/systemd/system/mqtt-bridge.service

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable mqtt-bridge
sudo systemctl start mqtt-bridge
```

### 5. Configure ESP32

1. Open `ESP32/smart-room.ino` in Arduino IDE
2. Update WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. Update MQTT server IP:
   ```cpp
   const char* mqtt_server = "YOUR_GCP_VM_IP";
   ```
4. Update MQTT credentials to match your Mosquitto setup:
   ```cpp
   const char* mqtt_user = "YOUR_MQTT_USERNAME";
   const char* mqtt_password = "YOUR_MQTT_PASSWORD";
   ```
5. Upload to ESP32-S3

## Security Considerations

### Implemented Security Measures

1. **MQTT Authentication**
   - Username/password authentication enabled
   - Anonymous connections disabled

2. **Network Security**
   - GCP Firewall rules limiting access to specific ports
   - Only necessary ports exposed (1883, 27017)

3. **Data Protection**
   - MongoDB authentication enabled (optional)
   - Secure credential storage

### Security Recommendations for Production

- Enable TLS/SSL for MQTT (port 8883)
- Use certificate-based authentication
- Implement MongoDB user roles and authentication
- Restrict source IP ranges in firewall rules
- Use environment variables for credentials
- Regular security updates and patches

## Data Format

### MQTT Message Structure

```json
{
  "device_id": "ESP32-S3-001",
  "timestamp": 1234567890,
  "temperature": 28.5,
  "humidity": 65.2,
  "motion": 1,
  "led_state": 1,
  "relay_state": 0
}
```

### MongoDB Document Structure

```json
{
  "_id": ObjectId("..."),
  "device_id": "ESP32-S3-001",
  "timestamp": 1234567890,
  "temperature": 28.5,
  "humidity": 65.2,
  "motion": 1,
  "led_state": 1,
  "relay_state": 0,
  "received_at": ISODate("2026-01-03T16:30:00.000Z")
}
```

## Testing

### Test MQTT Connection

```bash
# Subscribe to topic
mosquitto_sub -h localhost -t smartroom/sensors -u YOUR_MQTT_USERNAME -P YOUR_MQTT_PASSWORD

# Publish test message
mosquitto_pub -h localhost -t smartroom/sensors -m "test" -u YOUR_MQTT_USERNAME -P YOUR_MQTT_PASSWORD
```

### Verify MongoDB Data

```bash
mongosh
use smartroom_db
db.sensor_data.find().pretty()
db.sensor_data.countDocuments()
```

### Check Service Status

```bash
sudo systemctl status mqtt-bridge
sudo journalctl -u mqtt-bridge -f
```

## Monitoring & Logs

### View Bridge Logs
```bash
sudo journalctl -u mqtt-bridge -f --lines=50
```

### View MQTT Activity
```bash
sudo tail -f /var/log/mosquitto/mosquitto.log
```

### MongoDB Query Examples

```javascript
// Get latest 10 records
db.sensor_data.find().sort({received_at: -1}).limit(10)

// Average temperature in last hour
db.sensor_data.aggregate([
  {$match: {received_at: {$gte: new Date(Date.now() - 3600000)}}},
  {$group: {_id: null, avgTemp: {$avg: "$temperature"}}}
])

// Count motion detections today
db.sensor_data.countDocuments({
  motion: 1,
  received_at: {$gte: new Date(new Date().setHours(0,0,0,0))}
})
```

## Design Considerations

### Technology Choices

**MQTT Protocol:**
- Lightweight and efficient for IoT devices
- Publish-subscribe pattern suitable for sensor data
- Low bandwidth consumption
- Built-in QoS levels

**MongoDB:**
- Flexible schema for evolving data structures
- Excellent for time-series data
- Easy to scale horizontally
- JSON-like documents match MQTT payloads

**Node.js Bridge:**
- Event-driven architecture perfect for MQTT
- Fast and lightweight
- Easy integration with MongoDB
- Cross-platform compatibility

### Trade-offs

1. **Security vs. Simplicity**
   - Opted for basic authentication for easier setup
   - Production systems should use TLS/SSL

2. **Local Storage vs. Cloud**
   - Cloud storage chosen for accessibility and scalability
   - Trade-off: Requires internet connectivity

3. **Polling vs. Event-driven**
   - Event-driven MQTT chosen over HTTP polling
   - Lower latency and bandwidth usage

## Troubleshooting

### ESP32 Won't Connect to WiFi
- Verify SSID and password are correct
- Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Check WiFi signal strength

### MQTT Connection Fails
- Verify GCP VM external IP
- Check firewall rules allow port 1883
- Confirm MQTT credentials are correct

### No Data in MongoDB
- Check bridge service status: `sudo systemctl status mqtt-bridge`
- View logs: `sudo journalctl -u mqtt-bridge -f`
- Verify MongoDB is running: `sudo systemctl status mongod`

### DHT11 Returns NaN
- Check wiring connections
- Add 10kΩ pull-up resistor between DATA and VCC
- Wait 2 seconds after power on before reading



## Team Members

- MUHAMMAD DANISH AIMAN BIN MUHAMMAD NAZIR - 163371

## References

- [ESP32-S3 Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/)
- [MQTT Protocol Specification](https://mqtt.org/mqtt-specification/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Google Cloud Platform Documentation](https://cloud.google.com/docs)

## Project Structure

```
cpc357-asg2/
├── README.md              # Project documentation
├── config/
│   ├── mosquitto.conf     # MQTT broker configuration
│   └── mqtt-bridge.service # Systemd service file
├── docs/
│   └── setup-guide.md     # Detailed setup instructions
├── ESP32/
│   └── smart-room.ino     # Arduino firmware for ESP32-S3
├── scripts/
│   ├── setup-mongodb.sh   # MongoDB installation script
│   └── setup-server.sh    # Complete server setup script
└── server/
    ├── bridge.js          # MQTT to MongoDB bridge
    └── package.json       # Node.js dependencies
```

## License

This project is created for educational purposes as part of CPC357 coursework.

## Acknowledgments

- Course: CPC357 - IoT Architecture & Smart Applications
- Institution: Universiti Sains Malaysia (USM)
- Academic Session: 2025/2026