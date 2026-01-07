require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// MongoDB Configuration
const mongoUrl = process.env.MONGODB_URL || 'mongodb://smart-room:smart-room@localhost:27017/smartroom_db?authSource=smartroom_db';
const dbName = 'smartroom_db';
const collectionName = 'sensor_data';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
let db, collection;

async function connectDB() {
    try {
        const client = await MongoClient.connect(mongoUrl);
        console.log('✅ Connected to MongoDB');
        db = client.db(dbName);
        collection = db.collection(collectionName);
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
}

// API Routes

// Get latest sensor reading
app.get('/api/latest', async (req, res) => {
    try {
        const latest = await collection.findOne({}, { sort: { received_at: -1 } });
        res.json(latest || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get historical data
app.get('/api/history', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        const data = await collection.find({
            received_at: { $gte: since }
        }).sort({ received_at: 1 }).toArray();
        
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        const stats = await collection.aggregate([
            { $match: { received_at: { $gte: since } } },
            {
                $group: {
                    _id: null,
                    avgTemp: { $avg: '$temperature' },
                    minTemp: { $min: '$temperature' },
                    maxTemp: { $max: '$temperature' },
                    avgHumidity: { $avg: '$humidity' },
                    minHumidity: { $min: '$humidity' },
                    maxHumidity: { $max: '$humidity' },
                    totalReadings: { $sum: 1 },
                    motionEvents: { $sum: { $cond: ['$motion', 1, 0] } }
                }
            }
        ]).toArray();
        
        res.json(stats[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get total record count
app.get('/api/count', async (req, res) => {
    try {
        const count = await collection.countDocuments();
        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start server
connectDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Dashboard running at http://localhost:${PORT}`);
        console.log('Press Ctrl+C to stop\n');
    });
});
