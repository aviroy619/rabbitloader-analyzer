// routes/comparisonHistory.js
const express = require('express');
const router = express.Router();
const ComparisonResult = require('../models/ComparisonResult');

// Get comparison history
router.get('/comparison-history', async (req, res) => {
    try {
        const { siteId, status, limit = 50, skip = 0 } = req.query;

        const query = {};
        if (siteId) query.siteId = siteId;
        if (status) query.status = status;

        const results = await ComparisonResult.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .select('-viewports.jsErrors -viewports.consoleErrors -viewports.networkErrors'); // Exclude large arrays for list view

        const total = await ComparisonResult.countDocuments(query);

        res.json({
            results,
            total,
            limit: parseInt(limit),
            skip: parseInt(skip)
        });
    } catch (err) {
        console.error('Error fetching comparison history:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get single comparison result by ID
router.get('/reports/:reportId', async (req, res) => {
    try {
        const result = await ComparisonResult.findById(req.params.reportId);

        if (!result) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.json(result);
    } catch (err) {
        console.error('Error fetching report:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get latest status for a site
router.get('/latest-status', async (req, res) => {
    try {
        const { siteId } = req.query;

        if (!siteId) {
            return res.status(400).json({ error: 'siteId is required' });
        }

        const latest = await ComparisonResult.findOne({ siteId })
            .sort({ timestamp: -1 })
            .select('siteId timestamp status recommendation severity summary');

        if (!latest) {
            return res.status(404).json({ error: 'No results found for this site' });
        }

        res.json(latest);
    } catch (err) {
        console.error('Error fetching latest status:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Save comparison result (called from compare-all-viewports)
router.post('/save-comparison', async (req, res) => {
    try {
        const comparisonResult = new ComparisonResult(req.body);
        await comparisonResult.save();

        res.json({
            success: true,
            reportId: comparisonResult._id,
            message: 'Comparison result saved successfully'
        });
    } catch (err) {
        console.error('Error saving comparison result:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
