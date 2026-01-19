// Detect jQuery event listeners
function detectJQueryListeners(html) {
    const patterns = [
        /\$\(['"](\.[\w\-]+)['"]?\)\.on\(/g,
        /\$\(['"](#[\w\-]+)['"]?\)\.on\(/g,
        /\$\(['"](\.[\w\-]+)['"]?\)\.click\(/g,
        /\$\(['"](#[\w\-]+)['"]?\)\.click\(/g,
        /jQuery\(['"](\.[\w\-]+)['"]?\)\.on\(/g,
        /\$\(document\)\.on\(/g,
        /\$\(window\)\.on\(/g
    ];

    const matches = [];
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            matches.push(match[1] || match[0]);
        }
    });

    return [...new Set(matches)];
}

module.exports = { detectJQueryListeners };