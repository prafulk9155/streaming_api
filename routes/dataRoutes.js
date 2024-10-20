const express = require('express');
const { saveData, getLatestData } = require('../controllers/dataController');
const router = express.Router();

// Endpoint to receive data
router.post('/data', saveData);

// Endpoint to get the latest data
router.get('/data/latest', getLatestData);

module.exports = router;
