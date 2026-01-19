// models/Analysis.js
const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
    siteId: {
        type: String,
        required: true,
        index: true
    },
    pageUrl: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },

    pageData: {
        htmlSize: Number,
        scriptCount: Number,
        cssCount: Number,
        rawHtml: String
    },

    // FIXED SCHEMA - Key changes below
    issues: {
        highRisk: [{
            type: { type: String },        // ← Changed from: type: String
            description: String,
            count: Number,
            selectors: [String],
            reason: String,
            action: String
        }],
        mediumRisk: [{
            type: { type: String },        // ← Changed from: type: String
            description: String,
            count: Number,
            selectors: [String],
            reason: String,
            action: String
        }],
        lowRisk: [{
            type: { type: String },        // ← Changed from: type: String
            description: String,
            count: Number,
            reason: String,
            action: String
        }],
        safe: [{
            type: { type: String },        // ← Changed from: type: String
            items: [String],
            reason: String,
            action: String
        }]
    },

    riskScore: {
        type: Number,
        min: 0,
        max: 1
    },
    recommendation: {
        level: String,
        strategy: String,
        tip: String
    },

    stats: {
        totalScripts: Number,
        totalCss: Number,
        totalHtmlSize: Number,
        hasJQuery: Boolean,
        hasReact: Boolean,
        hasVue: Boolean,
        trackingScripts: Number
    },

    userApproved: {
        type: Boolean,
        default: null
    },
    appliedOptimization: {
        type: String,
        enum: ['conservative', 'balanced', 'aggressive', null],
        default: null
    }
});

module.exports = mongoose.model('Analysis', analysisSchema);