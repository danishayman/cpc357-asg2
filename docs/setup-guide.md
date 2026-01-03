# Smart Room Monitoring System - Complete Setup Guide (MongoDB on GCP VM)

## Part 1: Hardware Setup

### Component Connections

#### ESP32-S3 Feather Pin Connections:

**DHT11 Temperature & Humidity Sensor:**
- VCC → 3.3V
- GND → GND
- DATA → GPIO 4

**PIR Motion Sensor:**
- VCC → 5V (or 3.3V depending on your PIR)
- GND → GND
- OUT → GPIO 5

**LED:**
- Anode (+) → GPIO 2 (through 220Ω resistor)
- Cathode (-) → GND

**Relay Module:**
- VCC → 5V
- GND → GND
- IN → GPIO 15

## Part 2: Arduino IDE Setup

### Step 1: Install Arduino IDE
1. Download Arduino IDE from https://www.arduino.cc/en/software
2. Install the IDE on your computer

### Step 2: Add ESP32 Board Support
1. Open Arduino IDE
2. Go to **File → Preferences**
3. In "Additional Board Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click **OK**
5. Go to **Tools → Board → Boards Manager**
6. Search for "esp32"
7. Install "esp32 by Espressif Systems" (latest version)
8. Wait for installation to complete

### Step 3: Install Required Libraries
1. Go to **Sketch → Include Library → Manage Libraries**
2. Install these libraries one by one:
   - Search **"PubSubClient"** → Install "PubSubClient by Nick O'Leary"
   - Search **"DHT sensor library"** → Install "DHT sensor library by Adafruit"
   - Search **"Adafruit Unified Sensor"** → Install it (required dependency)
   - Search **"ArduinoJson"** → Install "ArduinoJson by Benoit Blanchon"

### Step 4: Select Board and Port
1. Go to **Tools → Board → esp32**
2. Select **"Adafruit Feather ESP32-S3 No PSRAM"**
3. Connect ESP32 to your computer via USB
4. Go to **Tools → Port** and select the port (e.g., COM3 on Windows)

## Part 3: Google Cloud Platform - Create VM Instance

### Step 1: Sign in to GCP
1. Go to https://console.cloud.google.com
2. Sign in with your Google account
3. Accept terms if first time

### Step 2: Create a New Project
1. Click project dropdown at top (says "Select a project")
2. Click **"NEW PROJECT"**
3. Enter project name: **smart-room-iot**
4. Click **"CREATE"**
5. Wait for project creation, then select it

### Step 3: Enable Compute Engine API
1. In the search bar, type "Compute Engine"
2. Click on "Compute Engine API"
3. Click **"ENABLE"** if not already enabled
4. Wait for it to activate

### Step 4: Create VM Instance
1. Go to Navigation Menu (≡) → **Compute Engine → VM instances**
2. Click **"CREATE INSTANCE"**
3. Configure the VM:

   **Basic settings:**
   - **Name:** `mqtt-mongodb-server`
   - **Region:** `asia-southeast1` (Singapore - closest to Malaysia)
   - **Zone:** `asia-southeast1-b`

   **Machine configuration:**
   - **Series:** E2
   - **Machine type:** `e2-medium` (2 vCPU, 4GB memory)
     - *Note: e2-micro might be too small for MongoDB*

   **Boot disk:**
   - Click **"CHANGE"**
   - **Operating system:** Ubuntu
   - **Version:** Ubuntu 22.04 LTS
   - **Boot disk type:** Balanced persistent disk
   - **Size:** 20 GB (minimum for MongoDB)
   - Click **"SELECT"**

   **Firewall:**
   - ✅ Check **"Allow HTTP traffic"**
   - ✅ Check **"Allow HTTPS traffic"**

4. Click **"CREATE"** at the bottom
5. Wait 1-2 minutes for VM to start
6. Note the **External IP** address (you'll need this!)

### Step 5: Configure Firewall Rules

#### Rule 1: Allow MQTT (Port 1883)
1. Go to Navigation Menu (≡) → **VPC network → Firewall**
2. Click **"CREATE FIREWALL RULE"**
3. Configure:
   - **Name:** `allow-mqtt`
   - **Description:** Allow MQTT connections
   - **Logs:** Off
   - **Network:** default
   - **Priority:** 1000
   - **Direction of traffic:** Ingress
   - **Action on match:** Allow
   - **Targets:** All instances in the network
   - **Source filter:** IPv4 ranges
   - **Source IPv4 ranges:** `0.0.0.0/0`
   - **Protocols and ports:** Specified protocols and ports
     - ✅ Check **TCP** and enter: `1883`
4. Click **"CREATE"**

#### Rule 2: Allow MongoDB (Port 27017)
1. Click **"CREATE FIREWALL RULE"** again
2. Configure:
   - **Name:** `allow-mongodb`
   - **Description:** Allow MongoDB connections
   - **Logs:** Off
   - **Network:** default
   - **Priority:** 1000
   - **Direction of traffic:** Ingress
   - **Action on match:** Allow
   - **Targets:** All instances in the network
   - **Source filter:** IPv4 ranges
   - **Source IPv4 ranges:** `0.0.0.0/0`
   - **Protocols and ports:** Specified protocols and ports
     - ✅ Check **TCP** and enter: `27017`
3. Click **"CREATE"**

## Part 4: Install Mosquitto MQTT Broker on VM

### Step 1: Connect to Your VM
1. Go back to **Compute Engine → VM instances**
2. Find your VM: `mqtt-mongodb-server`
3. Click the **SSH** button (opens browser terminal)
4. Wait for connection (may take 10-20 seconds)

### Step 2: Update System
```bash
sudo apt update
sudo apt upgrade -y
```
Press Enter and wait (2-3 minutes)

### Step 3: Install Mosquitto MQTT Broker
```bash
sudo apt install -y mosquitto mosquitto-clients
```
Wait for installation to complete

### Step 4: Enable Mosquitto to Start on Boot
```bash
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```

### Step 5: Configure Mosquitto
```bash
sudo nano /etc/mosquitto/mosquitto.conf
```

**Delete everything** and add these lines:
```
listener 1883 0.0.0.0
allow_anonymous false
password_file /etc/mosquitto/passwd
```

**To save and exit:**
- Press `Ctrl + X`
- Press `Y` (yes)
- Press `Enter`

### Step 6: Create MQTT Username and Password
```bash
sudo mosquitto_passwd -c /etc/mosquitto/passwd iotuser
```
- Enter password when prompted (e.g., `iotpass123`)
- Re-enter password to confirm
- Remember these credentials!

### Step 7: Restart Mosquitto
```bash
sudo systemctl restart mosquitto
```

### Step 8: Test MQTT Broker
Open a second SSH window (click SSH button again on same VM), then:

**Terminal 1 (Subscriber):**
```bash
mosquitto_sub -h localhost -t test -u iotuser -P iotpass123
```
Leave this running

**Terminal 2 (Publisher):**
```bash
mosquitto_pub -h localhost -t test -m "Hello MQTT" -u iotuser -P iotpass123
```

You should see "Hello MQTT" appear in Terminal 1! ✅

Press `Ctrl + C` in Terminal 1 to stop. Close Terminal 2.

## Part 5: Install MongoDB on the Same VM

### Step 1: Import MongoDB GPG Key
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
```

### Step 2: Add MongoDB Repository
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

### Step 3: Update Package List
```bash
sudo apt update
```

### Step 4: Install MongoDB
```bash
sudo apt install -y mongodb-org
```
Wait 2-3 minutes for installation

### Step 5: Start MongoDB
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Step 6: Verify MongoDB is Running
```bash
sudo systemctl status mongod
```
You should see **"active (running)"** in green. Press `Q` to quit.

### Step 7: Configure MongoDB for Remote Access
```bash
sudo nano /etc/mongod.conf
```

Find the line that says:
```yaml
net:
  port: 27017
  bindIp: 127.0.0.1
```

Change `bindIp` to:
```yaml
net:
  port: 27017
  bindIp: 0.0.0.0
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

### Step 8: Restart MongoDB
```bash
sudo systemctl restart mongod
```

### Step 9: Test MongoDB Connection
```bash
mongosh
```

You should see MongoDB shell. Type:
```javascript
show dbs
```

You should see list of databases. Type `exit` to quit.

### Step 10: Create Database and User (Optional but Recommended)

Connect to MongoDB:
```bash
mongosh
```

Create admin user:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "adminpass123",
  roles: ["root"]
})
```

Create database and user for your app:
```javascript
use smartroom_db
db.createUser({
  user: "iotuser",
  pwd: "iotpass123",
  roles: [{role: "readWrite", db: "smartroom_db"}]
})
exit
```

Enable authentication:
```bash
sudo nano /etc/mongod.conf
```

Add under `security:` section (add if not exists):
```yaml
security:
  authorization: enabled
```

Save and restart:
```bash
sudo systemctl restart mongod
```

Test with authentication:
```bash
mongosh -u admin -p adminpass123 --authenticationDatabase admin
```

Type `exit` to quit.

## Part 6: Create MQTT to MongoDB Bridge

### Step 1: Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 2: Verify Installation
```bash
node --version
npm --version
```
Should show version numbers

### Step 3: Create Project Directory
```bash
mkdir ~/mqtt-mongodb-bridge
cd ~/mqtt-mongodb-bridge
```

### Step 4: Initialize Node.js Project
```bash
npm init -y
```

### Step 5: Install Required Packages
```bash
npm install mqtt mongodb
```
Wait for installation

### Step 6: Create Bridge Script
```bash
nano bridge.js
```

Copy and paste this code (right-click to paste in SSH terminal):

```javascript
const mqtt = require('mqtt');
const { MongoClient } = require('mongodb');

// MQTT Configuration
const mqttBroker = 'mqtt://localhost:1883';
const mqttTopic = 'smartroom/sensors';
const mqttUser = 'iotuser';
const mqttPass = 'iotpass123';

// MongoDB Configuration - WITHOUT authentication
const mongoUrl = 'mongodb://localhost:27017';

// MongoDB Configuration - WITH authentication (use this if you set up auth)
// const mongoUrl = 'mongodb://iotuser:iotpass123@localhost:27017/smartroom_db?authSource=smartroom_db';

const dbName = 'smartroom_db';
const collectionName = 'sensor_data';

console.log('Starting MQTT to MongoDB Bridge...');

// Connect to MongoDB
let db, collection;
MongoClient.connect(mongoUrl)
  .then(client => {
    console.log('✅ Connected to MongoDB');
    db = client.db(dbName);
    collection = db.collection(collectionName);
    
    // Create index on timestamp for faster queries
    collection.createIndex({ timestamp: -1 });
    collection.createIndex({ received_at: -1 });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Connect to MQTT Broker
const mqttClient = mqtt.connect(mqttBroker, {
  username: mqttUser,
  password: mqttPass,
  reconnectPeriod: 1000
});

// MQTT Event Handlers
mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  mqttClient.subscribe(mqttTopic, (err) => {
    if (err) {
      console.error('❌ Subscription error:', err);
    } else {
      console.log(`✅ Subscribed to topic: ${mqttTopic}`);
      console.log('📡 Waiting for sensor data...\n');
    }
  });
});

mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    
    // Add server timestamp
    data.received_at = new Date();
    
    // Save to MongoDB
    const result = await collection.insertOne(data);
    
    console.log('📊 Data saved to MongoDB:');
    console.log(`   Device: ${data.device_id}`);
    console.log(`   Temperature: ${data.temperature}°C`);
    console.log(`   Humidity: ${data.humidity}%`);
    console.log(`   Motion: ${data.motion ? 'Detected' : 'None'}`);
    console.log(`   MongoDB ID: ${result.insertedId}`);
    console.log('---');
    
  } catch (err) {
    console.error('❌ Error processing message:', err);
    console.error('   Raw message:', message.toString());
  }
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT error:', err);
});

mqttClient.on('offline', () => {
  console.log('⚠️  MQTT client offline, attempting reconnection...');
});

mqttClient.on('reconnect', () => {
  console.log('🔄 Reconnecting to MQTT broker...');
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  mqttClient.end();
  process.exit(0);
});

console.log('🚀 Bridge is running!');
console.log('Press Ctrl+C to stop\n');
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

### Step 7: Test the Bridge
```bash
node bridge.js
```

You should see:
```
Starting MQTT to MongoDB Bridge...
✅ Connected to MongoDB
✅ Connected to MQTT broker
✅ Subscribed to topic: smartroom/sensors
📡 Waiting for sensor data...
```

**Keep this running!** Open a new SSH terminal for next steps.

### Step 8: Make Bridge Run as a Service (Important!)

Open a **new SSH terminal**, then:

```bash
sudo nano /etc/systemd/system/mqtt-bridge.service
```

Add this content (replace `your_username` with your actual username - type `whoami` to check):

```ini
[Unit]
Description=MQTT to MongoDB Bridge
After=network.target mongod.service mosquitto.service

[Service]
Type=simple
User=your_username
WorkingDirectory=/home/your_username/mqtt-mongodb-bridge
ExecStart=/usr/bin/node bridge.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

Stop the manual bridge (press `Ctrl+C` in the terminal running bridge.js), then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable mqtt-bridge
sudo systemctl start mqtt-bridge
```

### Step 9: Check Bridge Status
```bash
sudo systemctl status mqtt-bridge
```

Should show **"active (running)"**. Press `Q` to quit.

View live logs:
```bash
sudo journalctl -u mqtt-bridge -f
```

Press `Ctrl+C` to stop viewing logs.

## Part 7: Upload Code to ESP32

### Step 1: Get Your VM's External IP
1. Go to **Compute Engine → VM instances**
2. Copy the **External IP** (e.g., `34.87.123.45`)

### Step 2: Prepare Arduino Code
1. Open the Arduino code I provided earlier
2. Update these values:

```cpp
// WiFi credentials
const char* ssid = "YOUR_WIFI_NAME";           // Your WiFi name
const char* password = "YOUR_WIFI_PASSWORD";   // Your WiFi password

// MQTT Broker settings
const char* mqtt_server = "34.87.123.45";      // Your GCP VM External IP
const int mqtt_port = 1883;
const char* mqtt_user = "iotuser";             // Your MQTT username
const char* mqtt_password = "iotpass123";      // Your MQTT password
```

### Step 3: Verify and Upload
1. Click the **✓ Verify** button (checkmark icon)
2. Wait for compilation (should say "Done compiling")
3. Click the **→ Upload** button (arrow icon)
4. Wait for upload to complete (should say "Done uploading")

### Step 4: Open Serial Monitor
1. Go to **Tools → Serial Monitor**
2. Set baud rate to **115200** (bottom right dropdown)
3. You should see:
   ```
   Connecting to WiFi...
   WiFi connected
   IP address: 192.168.x.x
   Attempting MQTT connection...connected
   Smart Room Monitoring System Started
   Data published:
   {"device_id":"ESP32-S3-001","timestamp":12345...}
   ```

## Part 8: Verify Everything Works

### Step 1: Check MQTT Messages on Server
SSH into your VM and run:
```bash
mosquitto_sub -h localhost -t smartroom/sensors -u iotuser -P iotpass123
```

You should see JSON data every 5 seconds! Press `Ctrl+C` to stop.

### Step 2: Check Bridge Logs
```bash
sudo journalctl -u mqtt-bridge -f --lines=20
```

You should see "Data saved to MongoDB" messages. Press `Ctrl+C` to stop.

### Step 3: Check MongoDB Data
```bash
mongosh
```

If you set up authentication:
```bash
mongosh -u admin -p adminpass123 --authenticationDatabase admin
```

Then query your data:
```javascript
use smartroom_db
db.sensor_data.find().pretty()
```

You should see your sensor data! Type `exit` to quit.

### Step 4: Count Your Records
```javascript
use smartroom_db
db.sensor_data.countDocuments()
```

Should show increasing number of records.

### Step 5: Get Latest Data
```javascript
db.sensor_data.find().sort({received_at: -1}).limit(5).pretty()
```

Shows 5 most recent records.

## Part 9: Test Your Sensors

### Test 1: PIR Motion Sensor
1. Wave your hand in front of PIR sensor
2. LED should turn ON
3. Check Serial Monitor - should show `Motion: Detected`
4. Move away from PIR sensor
5. LED should turn OFF after 2-3 seconds

### Test 2: DHT11 Temperature/Humidity
1. Breathe warm air on DHT11 sensor
2. Temperature and humidity should increase
3. Check Serial Monitor for changed values

### Test 3: Relay Control
1. Heat the DHT11 above 30°C (use hair dryer or hot air)
2. Relay should turn ON (you'll hear a click)
3. Cool it down below 30°C
4. Relay should turn OFF

## Part 10: Troubleshooting

### ESP32 Won't Connect to WiFi
```
Solution:
- Verify WiFi name and password (case-sensitive)
- Make sure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Check if WiFi has special characters (use simple password)
- Move ESP32 closer to router
```

### MQTT Connection Failed
```
Check:
1. VM External IP correct?
   mosquitto_pub -h YOUR_VM_IP -t test -m "test" -u iotuser -P iotpass123
   
2. Firewall rule exists?
   GCP Console → VPC Network → Firewall → check "allow-mqtt"
   
3. Mosquitto running?
   sudo systemctl status mosquitto
```

### Bridge Not Saving to MongoDB
```
Check:
1. Bridge running?
   sudo systemctl status mqtt-bridge
   
2. View errors:
   sudo journalctl -u mqtt-bridge -n 50
   
3. MongoDB running?
   sudo systemctl status mongod
   
4. Test MongoDB:
   mongosh
   use smartroom_db
   db.sensor_data.find()
```

### DHT11 Shows NaN or 0
```
Solution:
- Check wiring (VCC, GND, DATA)
- Add 10kΩ pull-up resistor between DATA and VCC
- Wait 2 seconds after power on
- Try different GPIO pin
```

### VM Stopped or Restarted
```
If you stop your VM, External IP might change!
1. Get new External IP from GCP Console
2. Update Arduino code with new IP
3. Re-upload to ESP32
```

## Part 11: What You Have Now

✅ **ESP32-S3** reading sensors every 5 seconds
✅ **MQTT Broker** (Mosquitto) receiving data
✅ **Bridge Service** automatically saving data
✅ **MongoDB** storing all sensor readings
✅ **Everything runs automatically** - even after VM restart!

## Part 12: View Your Data

### Option 1: MongoDB Shell (Command Line)
```bash
mongosh
use smartroom_db

# View all data
db.sensor_data.find().pretty()

# View latest 10 records
db.sensor_data.find().sort({received_at: -1}).limit(10).pretty()

# Count records
db.sensor_data.countDocuments()

# Get average temperature
db.sensor_data.aggregate([
  {$group: {_id: null, avgTemp: {$avg: "$temperature"}}}
])
```

### Option 2: Install MongoDB Compass (GUI)
1. Download from: https://www.mongodb.com/try/download/compass
2. Connect to: `mongodb://YOUR_VM_IP:27017`
3. Click database: `smartroom_db`
4. Click collection: `sensor_data`
5. View your data visually!

## Part 13: Important Notes for Your Assignment

### Your System Architecture:
```
ESP32-S3 (Sensors) 
    ↓ WiFi
MQTT Broker (Mosquitto on GCP)
    ↓
Bridge Script (Node.js)
    ↓
MongoDB (Database on GCP)
```

### Components You Can Document:
1. **Hardware Layer:** ESP32-S3, DHT11, PIR, LED, Relay
2. **Communication Layer:** WiFi, MQTT Protocol
3. **Cloud Infrastructure:** GCP VM (Ubuntu)
4. **Software Layer:** Mosquitto, Node.js Bridge, MongoDB
5. **Security:** MQTT Authentication, Firewall Rules

### For Your Report, Include:
- Architecture diagram (draw the flow above)
- Screenshots of: VM creation, code upload, Serial Monitor, MongoDB data
- Security measures: MQTT username/password, firewall configuration
- Design considerations: Why MQTT? Why MongoDB? Why GCP?

## Need Help?

If something doesn't work:
1. Check all passwords match
2. Verify VM External IP
3. Check firewall rules exist
4. View logs: `sudo journalctl -u mqtt-bridge -f`
5. Test MQTT: `mosquitto_sub -h localhost -t smartroom/sensors -u iotuser -P iotpass123`

**Your system is complete!** 🎉