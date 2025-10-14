// ===================================
// BACKEND SERVER - Emotion Game
// Node.js + Express server to save CSV locally
// ===================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files (HTML, CSS, JS)

// CSV file path
const CSV_FILE = path.join(__dirname, 'resultados_emocoes.csv');

// Ensure CSV file exists with header
function initializeCSV() {
    if (!fs.existsSync(CSV_FILE)) {
        const header = 'FirstName,LastName,School,Score,Timestamp\n';
        fs.writeFileSync(CSV_FILE, header, 'utf8');
        console.log('✓ CSV file created:', CSV_FILE);
    } else {
        console.log('✓ CSV file exists:', CSV_FILE);
    }
}

// POST endpoint to save student results
app.post('/api/save-result', (req, res) => {
    try {
        const { firstName, lastName, school, score, timestamp } = req.body;

        // Validate data
        if (!firstName || !lastName || !school || score === undefined || !timestamp) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Create CSV line
        const csvLine = `"${firstName}","${lastName}","${school}","${score}","${timestamp}"\n`;

        // Append to CSV file
        fs.appendFileSync(CSV_FILE, csvLine, 'utf8');

        console.log(`✓ Saved result: ${firstName} ${lastName} - Score: ${score}`);

        res.json({
            success: true,
            message: 'Result saved successfully',
            file: CSV_FILE
        });

    } catch (error) {
        console.error('Error saving result:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving result',
            error: error.message
        });
    }
});

// GET endpoint to download all results
app.get('/api/download-results', (req, res) => {
    try {
        if (!fs.existsSync(CSV_FILE)) {
            return res.status(404).json({
                success: false,
                message: 'No results file found'
            });
        }

        const today = new Date().toISOString().split('T')[0];
        const filename = `resultados_emocoes_${today}.csv`;

        res.download(CSV_FILE, filename, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).json({
                    success: false,
                    message: 'Error downloading file'
                });
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading results',
            error: error.message
        });
    }
});

// GET endpoint to view results count
app.get('/api/results-count', (req, res) => {
    try {
        if (!fs.existsSync(CSV_FILE)) {
            return res.json({ count: 0 });
        }

        const content = fs.readFileSync(CSV_FILE, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const count = Math.max(0, lines.length - 1); // Subtract header

        res.json({ count });

    } catch (error) {
        console.error('Error reading results:', error);
        res.status(500).json({
            success: false,
            message: 'Error reading results',
            error: error.message
        });
    }
});

// Initialize CSV and start server
initializeCSV();

app.listen(PORT, () => {
    console.log('');
    console.log('════════════════════════════════════════════════');
    console.log('  🎮 DESAFIO DAS EMOÇÕES - Server Running');
    console.log('════════════════════════════════════════════════');
    console.log(`  📡 Server: http://localhost:${PORT}`);
    console.log(`  📊 CSV File: ${CSV_FILE}`);
    console.log('  ✓ Ready to receive results!');
    console.log('════════════════════════════════════════════════');
    console.log('');
});
