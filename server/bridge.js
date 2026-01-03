require('dotenv').config();
const mqtt = require('mqtt');
const { MongoClient } = require('mongodb');

// MQTT Configuration
const mqttBroker = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const mqttTopic = process.env.MQTT_TOPIC || 'smartroom/sensors';
const mqttUser = process.env.MQTT_USER || 'YOUR_MQTT_USERNAME';
const mqttPass = process.env.MQTT_PASS || 'YOUR_MQTT_PASSWORD';

// MongoDB Configuration - WITHOUT authentication
// const mongoUrl = 'mongodb://localhost:27017';

// MongoDB Configuration - WITH authentication (use this if you set up auth)
const mongoUrl = process.env.MONGODB_URL || 'mongodb://YOUR_MONGO_USER:YOUR_MONGO_PASSWORD@localhost:27017/smartroom_db?authSource=smartroom_db';

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
