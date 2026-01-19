// models/ComparisonResult.js
const mongoose = require('mongoose');

const ViewportResultSchema = new mongoose.Schema({
    size: String,
    name: String,
    width: Number,
    height: Number,
    status: { type: String, enum: ['SAFE', 'WARNING', 'BROKEN', 'FAILED'] },
    visualChange: Number,
    jsErrors: [String],
    consoleErrors: [String],
    networkErrors: [{
        url: String,
        error: String
    }],
    domChanges: {
        elementCountDiff: Number,
        formsDiff: Number,
        buttonsDiff: Number,
        inputsDiff: Number,
        imagesDiff: Number
    },
    before: {
        errors: Number,
        consoleErrors: Number,
        networkErrors: Number,
        elements: Number,
        forms: Number,
        buttons: Number,
        inputs: Number,
        images: Number
    },
    after: {
        errors: Number,
        consoleErrors: Number,
        networkErrors: Number,
        elements: Number,
        forms: Number,
        buttons: Number,
        inputs: Number,
        images: Number
    },
    screenshots: {
        before: String,
        after: [{ delay: Number, url: String }]
    }
});

const ComparisonResultSchema = new mongoose.Schema({
    siteId: { type: String, required: true, index: true },
    beforeUrl: { type: String, required: true },
    afterUrl: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ['SAFE', 'WARNING', 'BROKEN', 'FAILED'], required: true },
    recommendation: {
        type: String,
        enum: ['SAFE_TO_DEPLOY', 'DEPLOY_WITH_CAUTION', 'DO_NOT_DEPLOY', 'REVIEW_REQUIRED'],
        required: true
    },
    severity: { type: String, enum: ['OK', 'WARNING', 'CRITICAL'], required: true },
    viewports: [ViewportResultSchema],
    summary: {
        totalViewports: Number,
        safeViewports: Number,
        warningViewports: Number,
        brokenViewports: Number,
        maxVisualChange: Number,
        totalJsErrors: Number
    },
    delays: [Number],
    reportGenerated: { type: Boolean, default: true }
}, {
    timestamps: true
});

// Index for faster queries
ComparisonResultSchema.index({ siteId: 1, timestamp: -1 });
ComparisonResultSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model('ComparisonResult', ComparisonResultSchema);
