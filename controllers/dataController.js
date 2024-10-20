const Data = require('../models/Data');

// Save incoming data to MongoDB
exports.saveData = async (req, res) => {
    try {
        const { value } = req.body;
        const newData = new Data({ value });
        await newData.save();
        res.status(201).json(newData);
    } catch (error) {
        res.status(500).json({ message: 'Error saving data', error });
    }
};

// Fetch latest data from MongoDB
exports.getLatestData = async (req, res) => {
    try {
        const latestData = await Data.find().sort({ timestamp: -1 }).limit(10); // Get latest 10 entries
        res.status(200).json(latestData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching data', error });
    }
};
