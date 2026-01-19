// Calculate overall risk score and recommendation
function calculateRisk(issues) {
    const weights = {
        highRisk: 1.0,
        mediumRisk: 0.5,
        lowRisk: 0.2,
        safe: 0
    };

    const totalIssues =
        issues.highRisk.length * weights.highRisk +
        issues.mediumRisk.length * weights.mediumRisk +
        issues.lowRisk.length * weights.lowRisk +
        issues.safe.length * weights.safe;

    const riskScore = Math.min(totalIssues / 10, 1);

    let level, strategy, tip;

    if (riskScore > 0.7) {
        level = 'HIGH_RISK';
        strategy = 'conservative';
        tip = 'Only defer non-critical scripts. Skip CSS removal.';
    } else if (riskScore > 0.4) {
        level = 'MEDIUM_RISK';
        strategy = 'balanced';
        tip = 'Defer scripts, carefully remove unused CSS, skip framework removal.';
    } else {
        level = 'LOW_RISK';
        strategy = 'aggressive';
        tip = 'Safe to aggressively optimize. Remove unused CSS and defer scripts.';
    }

    return {
        riskScore: parseFloat(riskScore.toFixed(2)),
        level,
        strategy,
        tip
    };
}

module.exports = { calculateRisk };