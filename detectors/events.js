// Detect inline event handlers
function detectInlineEvents(html) {
    const eventPatterns = [
        /onclick=["']([^"']+)["']/g,
        /onload=["']([^"']+)["']/g,
        /onchange=["']([^"']+)["']/g,
        /onerror=["']([^"']+)["']/g,
        /onsubmit=["']([^"']+)["']/g,
        /onblur=["']([^"']+)["']/g,
        /onfocus=["']([^"']+)["']/g,
        /onmouseover=["']([^"']+)["']/g,
        /onmouseout=["']([^"']+)["']/g
    ];

    const matches = [];
    eventPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            matches.push({
                event: pattern.source.split('=')[0].replace(/=/g, ''),
                handler: match[1]
            });
        }
    });

    return matches;
}

module.exports = { detectInlineEvents };