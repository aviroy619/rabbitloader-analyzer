const http = require('http');
const samplePages = require('./sample-pages');

const tests = [
    { name: 'jQuery Page', siteId: 'site-1', pageUrl: 'https://example.com/jquery', html: samplePages.jqueryPage },
    { name: 'Tracking Page', siteId: 'site-1', pageUrl: 'https://example.com/tracking', html: samplePages.trackingPage },
    { name: 'Inline Events', siteId: 'site-2', pageUrl: 'https://example.com/inline', html: samplePages.inlineEventPage },
    { name: 'Complex Page', siteId: 'site-2', pageUrl: 'https://example.com/complex', html: samplePages.complexPage }
];

function sendTest(test) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            siteId: test.siteId,
            pageUrl: test.pageUrl,
            html: test.html
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/analyze-page',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('Parse failed'));
                }
            });
        });

        req.on('error', err => reject(err));
        req.on('timeout', () => reject(new Error('Timeout')));
        req.write(data);
        req.end();
    });
}

async function runTests() {
    console.log('\n=== RabbitLoader Analyzer Test ===\n');

    for (const test of tests) {
        try {
            console.log('Test: ' + test.name);
            const result = await sendTest(test);

            console.log('  Status: ' + result.recommendation);
            console.log('  Risk Score: ' + result.riskScore);
            console.log('  Issues - High: ' + result.issuesSummary.highRisk + ', Medium: ' + result.issuesSummary.mediumRisk + ', Low: ' + result.issuesSummary.lowRisk + ', Safe: ' + result.issuesSummary.safe);
            console.log('');
        } catch (err) {
            console.log('  FAILED: ' + err.message + '\n');
        }
    }

    console.log('=== Test Complete ===\n');
    process.exit(0);
}

setTimeout(runTests, 1500);