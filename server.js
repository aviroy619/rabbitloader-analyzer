require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/output', express.static(path.join(__dirname, 'output')));

connectDB();

app.use('/api', require('./routes/analyze'));
app.use('/api', require('./routes/compare'));
app.use('/api', require('./routes/comparisonHistory'));

app.get('/health', (req, res) => {
    res.json({ status: 'OK', db: 'rabbitloader_analyzer' });
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('🚀 Server running on port ' + PORT);
});