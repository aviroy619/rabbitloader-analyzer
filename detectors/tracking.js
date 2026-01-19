// Detect tracking and analytics scripts
function detectTrackingScripts(html) {
    const trackingPatterns = [
        { name: 'Google Analytics', pattern: /google.*analytics|gtag|_gaq/gi },
        { name: 'Google Tag Manager', pattern: /googletagmanager|gtm\.js/gi },
        { name: 'Facebook Pixel', pattern: /facebook\.com.*pixel|fbq/gi },
        { name: 'Hotjar', pattern: /hj\.hotjar|hotjar\.com/gi },
        { name: 'Mixpanel', pattern: /mixpanel\.com|mixpanel\.push/gi },
        { name: 'Segment', pattern: /segment\.com|analytics\.js/gi },
        { name: 'Intercom', pattern: /intercom|intercomSettings/gi },
        { name: 'Drift', pattern: /drift\.com|driftApi/gi }
    ];

    const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    const matches = [];

    trackingPatterns.forEach(tracker => {
        scripts.forEach(script => {
            if (tracker.pattern.test(script)) {
                if (!matches.find(m => m.name === tracker.name)) {
                    matches.push(tracker);
                }
            }
        });
    });

    return matches;
}

module.exports = { detectTrackingScripts };