#!/bin/bash

# Smart Room Monitoring - GCP Server Setup Script
# This script automates the installation of all server components

echo "=================================================="
echo "Smart Room Monitoring System - Server Setup"
echo "=================================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "Please do not run as root (without sudo)"
  exit 1
fi

# Update system
echo "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Mosquitto MQTT Broker
echo ""
echo "Step 2: Installing Mosquitto MQTT Broker..."
sudo apt install -y mosquitto mosquitto-clients

# Configure Mosquitto
echo ""
echo "Step 3: Configuring Mosquitto..."
sudo bash -c 'cat > /etc/mosquitto/mosquitto.conf <<EOF
listener 1883 0.0.0.0
allow_anonymous false
password_file /etc/mosquitto/passwd
EOF'

# Create MQTT user
echo ""
echo "Step 4: Creating MQTT user..."
echo "Enter MQTT username:"
read -r MQTT_USER
if [ -z "$MQTT_USER" ]; then
    echo "Username is required!"
    exit 1
fi

echo "Enter MQTT password:"
read -rs MQTT_PASS
if [ -z "$MQTT_PASS" ]; then
    echo "Password is required!"
    exit 1
fi

sudo mosquitto_passwd -c -b /etc/mosquitto/passwd "$MQTT_USER" "$MQTT_PASS"

# Restart Mosquitto
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto

echo "✅ Mosquitto MQTT Broker installed and configured"

# Install MongoDB
echo ""
echo "Step 5: Installing MongoDB..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

# Configure MongoDB
echo ""
echo "Step 6: Configuring MongoDB..."
sudo sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' /etc/mongod.conf

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

echo "✅ MongoDB installed and configured"

# Install Node.js
echo ""
echo "Step 7: Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "✅ Node.js installed"

# Setup Bridge Service
echo ""
echo "Step 8: Setting up MQTT-MongoDB Bridge..."
mkdir -p ~/mqtt-mongodb-bridge
cd ~/mqtt-mongodb-bridge || exit

# Create package.json
cat > package.json <<EOF
{
  "name": "mqtt-mongodb-bridge",
  "version": "1.0.0",
  "description": "Bridge service to connect MQTT broker to MongoDB",
  "main": "bridge.js",
  "scripts": {
    "start": "node bridge.js"
  },
  "dependencies": {
    "mqtt": "^5.3.4",
    "mongodb": "^6.3.0"
  }
}
EOF

# Install dependencies
npm install

echo "✅ Bridge service dependencies installed"

# Create systemd service
echo ""
echo "Step 9: Creating systemd service..."
sudo bash -c "cat > /etc/systemd/system/mqtt-bridge.service <<EOF
[Unit]
Description=MQTT to MongoDB Bridge
After=network.target mongod.service mosquitto.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/mqtt-mongodb-bridge
ExecStart=/usr/bin/node bridge.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload

echo "✅ Systemd service created"

# Display configuration summary
echo ""
echo "=================================================="
echo "Installation Complete!"
echo "=================================================="
echo ""
echo "Configuration Summary:"
echo "- MQTT Broker: Mosquitto (Port 1883)"
echo "- MQTT Username: $MQTT_USER"
echo "- MongoDB: Running on Port 27017"
echo "- Bridge Service: Ready to start"
echo ""
echo "Next Steps:"
echo "1. Copy bridge.js to ~/mqtt-mongodb-bridge/"
echo "2. Update bridge.js with your credentials"
echo "3. Start the bridge service:"
echo "   sudo systemctl start mqtt-bridge"
echo "   sudo systemctl enable mqtt-bridge"
echo ""
echo "4. Check status:"
echo "   sudo systemctl status mqtt-bridge"
echo "   sudo journalctl -u mqtt-bridge -f"
echo ""
echo "5. Test MQTT:"
echo "   mosquitto_sub -h localhost -t test -u $MQTT_USER -P [password]"
echo ""
echo "=================================================="