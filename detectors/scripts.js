// Detect custom/risky scripts
function detectCustomScripts(html) {
    const scripts = html.match(/<script[^>]*src=["']([^"']+)["'][^>]*>/g) || [];
    const inlineScripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];

    const customScripts = [];
    const cdnPatterns = [
        /cdn\./,
        /jsdelivr\.net/,
        /cloudflare\.com/,
        /unpkg\.com/,
        /code\.jquery\.com/,
        /maxcdn\.bootstrapcdn\.com/,
        /googleapis\.com/,
        /ajax\.microsoft\.com/
    ];

    scripts.forEach(script => {
        const match = script.match(/src=["']([^"']+)["']/);
        if (match) {
            const src = match[1];
            const isFromCDN = cdnPatterns.some(pattern => pattern.test(src));

            if (!isFromCDN && !src.includes('google') && !src.includes('facebook')) {
                customScripts.push({
                    type: 'external',
                    src: src,
                    risk: 'MEDIUM'
                });
            }
        }
    });

    inlineScripts.forEach(script => {
        if (script.includes('window.') || script.includes('document.') ||
            script.includes('localStorage') || script.includes('sessionStorage')) {
            customScripts.push({
                type: 'inline',
                pattern: 'accesses globals',
                risk: 'MEDIUM'
            });
        }
    });

    return customScripts;
}

module.exports = { detectCustomScripts };