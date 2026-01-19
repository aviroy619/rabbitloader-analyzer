// Detect safe CSS frameworks
function detectSafeFrameworks(html) {
    const frameworks = [];

    if (/bootstrap/i.test(html)) {
        frameworks.push({
            name: 'Bootstrap',
            safe: true,
            canRemoveUnused: true
        });
    }

    if (/tailwind/i.test(html)) {
        frameworks.push({
            name: 'Tailwind CSS',
            safe: true,
            canRemoveUnused: true
        });
    }

    if (/font-?awesome/i.test(html)) {
        frameworks.push({
            name: 'Font Awesome',
            safe: true,
            canRemoveUnused: true
        });
    }

    if (/(normalize|reset)\.css/i.test(html)) {
        frameworks.push({
            name: 'Normalize/Reset CSS',
            safe: true,
            canRemoveUnused: false
        });
    }

    return frameworks;
}

module.exports = { detectSafeFrameworks };