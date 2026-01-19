const express = require('express');
const router = express.Router();
const Analysis = require('../models/Analysis');
const { detectJQueryListeners } = require('../detectors/jquery');
const { detectInlineEvents } = require('../detectors/events');
const { detectTrackingScripts } = require('../detectors/tracking');
const { detectCustomScripts } = require('../detectors/scripts');
const { detectSafeFrameworks } = require('../detectors/frameworks');
const { calculateRisk } = require('../helpers/riskCalculator');

router.post('/analyze-page', async (req, res) => {
    try {
        const { siteId, pageUrl, html } = req.body;
        if (!siteId || !pageUrl || !html) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log('Analyzing: ' + siteId + ' - ' + pageUrl);

        const jqueryListeners = detectJQueryListeners(html);
        const inlineEvents = detectInlineEvents(html);
        const trackingScripts = detectTrackingScripts(html);
        const customScripts = detectCustomScripts(html);
        const frameworks = detectSafeFrameworks(html);

        const issues = {
            highRisk: [
                ...jqueryListeners.map(selector => ({
                    type: 'jquery_listener',
                    description: 'jQuery event listener',
                    selectors: [selector],
                    reason: 'CSS removal may break event targeting',
                    action: 'SKIP_CSS_REMOVAL'
                })),
                ...inlineEvents.map(evt => ({
                    type: 'inline_event',
                    description: 'Inline event handler: ' + evt.event,
                    selectors: [],
                    reason: 'HTML structure changes break handlers',
                    action: 'SKIP_HTML_CHANGES'
                }))
            ],
            mediumRisk: [
                ...customScripts.filter(s => s.risk === 'MEDIUM').map(script => ({
                    type: 'custom_script',
                    description: 'Custom script detected',
                    reason: 'May break if minified incorrectly',
                    action: 'SKIP_MINIFY'
                }))
            ],
            lowRisk: [
                ...trackingScripts.map(tracker => ({
                    type: 'tracking_script',
                    description: tracker.name,
                    reason: 'Can be safely deferred',
                    action: 'DEFER_OK'
                }))
            ],
            safe: [
                ...frameworks.map(fw => ({
                    type: 'safe_framework',
                    items: [fw.name],
                    reason: fw.name + ' can be aggressively optimized',
                    action: 'OPTIMIZE'
                }))
            ]
        };

        const recommendation = calculateRisk(issues);

        const analysis = new Analysis({
            siteId,
            pageUrl,
            pageData: {
                htmlSize: html.length,
                scriptCount: (html.match(/<script/g) || []).length,
                cssCount: (html.match(/<link.*css|<style/g) || []).length,
                rawHtml: html.substring(0, 5000)
            },
            issues,
            riskScore: recommendation.riskScore,
            recommendation,
            stats: {
                totalScripts: (html.match(/<script/g) || []).length,
                totalCss: (html.match(/<link.*css|<style/g) || []).length,
                totalHtmlSize: html.length,
                hasJQuery: /jquery|\\$\(/i.test(html),
                hasReact: /react|ReactDOM/i.test(html),
                hasVue: /vue|Vue/i.test(html),
                trackingScripts: trackingScripts.length
            }
        });

        await analysis.save();
        console.log('✅ Analysis complete: ' + analysis._id);

        return res.json({
            status: 'analyzed',
            analysisId: analysis._id,
            riskScore: recommendation.riskScore,
            recommendation: recommendation.level,
            issuesSummary: {
                highRisk: issues.highRisk.length,
                mediumRisk: issues.mediumRisk.length,
                lowRisk: issues.lowRisk.length,
                safe: issues.safe.length
            }
        });

    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/analyze/:id', async (req, res) => {
    try {
        const analysis = await Analysis.findById(req.params.id);
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        res.json(analysis);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/site/:siteId', async (req, res) => {
    try {
        const analyses = await Analysis.find({ siteId: req.params.siteId })
            .sort({ timestamp: -1 })
            .limit(10);
        res.json(analyses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;