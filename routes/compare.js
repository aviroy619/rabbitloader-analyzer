const express = require('express');
const router = express.Router();
const comparator = require('../services/comparator');

router.post('/compare-pages', async (req, res) => {
    try {
        const { beforeUrl, afterUrl, siteId, delays, viewport } = req.body;

        if (!beforeUrl || !afterUrl || !siteId) {
            return res.status(400).json({ error: 'Missing: beforeUrl, afterUrl, siteId' });
        }

        // Parse delays - can be array or single value
        let delayArray;
        if (Array.isArray(delays)) {
            delayArray = delays.filter(d => d > 0).slice(0, 3); // Max 3 delays
        } else if (delays) {
            delayArray = [parseInt(delays)];
        } else {
            delayArray = [3000]; // Default
        }

        // Parse viewport with defaults
        const viewportSize = viewport || { width: 1920, height: 1080 };

        console.log('Comparing for ' + siteId + ' with delays: ' + delayArray.join(', ') + 'ms, viewport: ' + viewportSize.width + 'x' + viewportSize.height);
        const result = await comparator.comparePages(beforeUrl, afterUrl, delayArray, viewportSize);

        if (result.status === 'failed') {
            return res.status(500).json(result);
        }

        return res.json(result);

    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;