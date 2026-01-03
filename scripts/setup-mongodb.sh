#!/bin/bash

# MongoDB Setup Script for Smart Room Monitoring
# This script installs and configures MongoDB on Ubuntu

echo "=================================================="
echo "MongoDB Setup for Smart Room Monitoring"
echo "=================================================="
echo ""

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
   echo "Please run with sudo: sudo bash setup-mongodb.sh"
   exit 1
fi

# Step 1: Import MongoDB public GPG key
echo "Step 1: Importing MongoDB GPG key..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

if [ $? -eq 0 ]; then
    echo "✅ GPG key imported successfully"
else
    echo "❌ Failed to import GPG key"
    exit 1
fi

# Step 2: Add MongoDB repository
echo ""
echo "Step 2: Adding MongoDB repository..."
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Step 3: Update package list
echo ""
echo "Step 3: Updating package list..."
apt update

# Step 4: Install MongoDB
echo ""
echo "Step 4: Installing MongoDB..."
apt install -y mongodb-org

if [ $? -eq 0 ]; then
    echo "✅ MongoDB installed successfully"
else
    echo "❌ Failed to install MongoDB"
    exit 1
fi

# Step 5: Configure MongoDB for remote access
echo ""
echo "Step 5: Configuring MongoDB..."

# Backup original config
cp /etc/mongod.conf /etc/mongod.conf.backup

# Update bindIp to allow remote connections
sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' /etc/mongod.conf

echo "✅ MongoDB configured to accept remote connections"

# Step 6: Start and enable MongoDB
echo ""
echo "Step 6: Starting MongoDB service..."
systemctl start mongod
systemctl enable mongod

# Verify MongoDB is running
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB is running"
else
    echo "❌ MongoDB failed to start"
    echo "Check logs: sudo journalctl -u mongod -n 50"
    exit 1
fi

# Step 7: Wait for MongoDB to be ready
echo ""
echo "Step 7: Waiting for MongoDB to be ready..."
sleep 5

# Step 8: Create database and user (optional)
echo ""
read -p "Do you want to create a database user? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Enter database name (default: smartroom_db):"
    read DB_NAME
    DB_NAME=${DB_NAME:-smartroom_db}
    
    echo "Enter username:"
    read DB_USER
    if [ -z "$DB_USER" ]; then
        echo "Username is required!"
        exit 1
    fi
    
    echo "Enter password:"
    read -s DB_PASS
    DB_PASS=${DB_PASS:-iotpass123}
    
    echo ""
    echo "Creating database user..."
    
    mongosh --eval "
    use $DB_NAME;
    db.createUser({
      user: '$DB_USER',
      pwd: '$DB_PASS',
      roles: [{role: 'readWrite', db: '$DB_NAME'}]
    });
    " > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Database user created successfully"
        
        # Ask about enabling authentication
        echo ""
        read -p "Do you want to enable MongoDB authentication? (y/n): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Check if security section exists
            if ! grep -q "^security:" /etc/mongod.conf; then
                echo "security:" >> /etc/mongod.conf
                echo "  authorization: enabled" >> /etc/mongod.conf
            else
                sed -i '/^security:/a\  authorization: enabled' /etc/mongod.conf
            fi
            
            systemctl restart mongod
            echo "✅ MongoDB authentication enabled"
        fi
    else
        echo "⚠️  Failed to create database user"
    fi
fi

# Step 9: Display summary
echo ""
echo "=================================================="
echo "MongoDB Setup Complete!"
echo "=================================================="
echo ""
echo "MongoDB Status:"
systemctl status mongod --no-pager -l | head -n 10
echo ""
echo "MongoDB Version:"
mongod --version | head -n 1
echo ""
echo "Configuration:"
echo "- MongoDB is listening on: 0.0.0.0:27017"
echo "- Config file: /etc/mongod.conf"
echo "- Data directory: /var/lib/mongodb"
echo "- Log file: /var/log/mongodb/mongod.log"
echo ""

if [[ $DB_USER ]]; then
    echo "Database Credentials:"
    echo "- Database: $DB_NAME"
    echo "- Username: $DB_USER"
    echo "- Password: [hidden]"
    echo ""
    echo "Connection string (no auth):"
    echo "  mongodb://localhost:27017"
    echo ""
    echo "Connection string (with auth):"
    echo "  mongodb://$DB_USER:$DB_PASS@localhost:27017/$DB_NAME?authSource=$DB_NAME"
    echo ""
fi

echo "Useful Commands:"
echo "- Connect to MongoDB: mongosh"
echo "- Check status: sudo systemctl status mongod"
echo "- View logs: sudo journalctl -u mongod -f"
echo "- Restart MongoDB: sudo systemctl restart mongod"
echo ""
echo "To test MongoDB:"
echo "  mongosh"
echo "  show dbs"
echo "  use $DB_NAME"
echo "  db.test.insertOne({message: 'Hello MongoDB'})"
echo "  db.test.find()"
echo ""
echo "=================================================="