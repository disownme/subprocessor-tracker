const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const diff = require('diff');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Initialize SQLite database
const db = new sqlite3.Database('webpage_changes.db', (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
    } else {
        console.log("Connected to SQLite database.");
        db.run('CREATE TABLE IF NOT EXISTS websites ( \
            id INTEGER PRIMARY KEY AUTOINCREMENT, \
            url TEXT UNIQUE NOT NULL, \
            last_content TEXT \
        )');
        db.run('CREATE TABLE IF NOT EXISTS change_history ( \
            id INTEGER PRIMARY KEY AUTOINCREMENT, \
            website_id INTEGER, \
            date TEXT NOT NULL, \
            diff TEXT, \
            FOREIGN KEY (website_id) REFERENCES websites(id) \
        )');
    }
});

// Function to fetch webpage content
async function fetchWebpageContent(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching URL " + url + ": " + error.message);
        return null;
    }
}

// Function to compare content and store changes
async function checkWebpageChanges(website) {
    const currentContent = await fetchWebpageContent(website.url);
    if (currentContent === null) return;

    db.get("SELECT last_content FROM websites WHERE id = ?", [website.id], async (err, row) => {
        if (err) {
            console.error("Database query error:", err.message);
            return;
        }

        const lastContent = row ? row.last_content : null;

        if (lastContent) {
            const changes = diff.createPatch('content', lastContent, currentContent);
            if (changes.includes('\n@@')) { // Basic check if there are actual changes in content
            console.log("Changes detected for " + website.url);
                db.run("INSERT INTO change_history (website_id, date, diff) VALUES (?, ?, ?)", [website.id, new Date().toISOString(), changes]);
            } else {
                console.log("No changes for " + website.url);
            }
        } else {
            console.log("First check for " + website.url + ", no previous content to compare.");
        }

        db.run("UPDATE websites SET last_content = ? WHERE id = ?", [currentContent, website.id]);
    });
}

// Cron job to check websites daily
cron.schedule('0 0 * * *', () => { // Run daily at midnight
    console.log('Running daily website checks...');
    db.all("SELECT id, url FROM websites", [], (err, websites) => {
        if (err) {
            console.error("Error fetching websites:", err.message);
            return;
        }
        websites.forEach(website => {
            checkWebpageChanges(website);
        });
    });
}, {
    scheduled: true,
    timezone: "America/Los_Angeles" // Set timezone to Los Angeles
});

// API endpoint to add a new website
app.post('/api/websites', (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).send({ message: 'URL is required.' });
    }

    db.run("INSERT INTO websites (url) VALUES (?)", [url], function(err) {
        if (err) {
            if (err.errno === 19) { // SQLITE_CONSTRAINT, unique constraint violation
                return res.status(409).send({ message: 'Website URL already exists.' });
            } else {
                console.error("Database insert error:", err.message);
                return res.status(500).send({ message: 'Error adding website.' });
            }
        }
        res.status(201).send({ message: 'Website added successfully.', websiteId: this.lastID });
    });
});

// API endpoint to get all websites
app.get('/api/websites', (req, res) => {
    db.all("SELECT id, url FROM websites", [], (err, websites) => {
        if (err) {
            console.error("Error fetching websites:", err.message);
            return res.status(500).send({ message: 'Error fetching websites.' });
        }
        res.json(websites);
    });
});

// API endpoint to get change history for a website
app.get('/api/websites/:websiteId/history', (req, res) => {
    const websiteId = req.params.websiteId;
    db.all("SELECT date, diff FROM change_history WHERE website_id = ? ORDER BY date DESC", [websiteId], (err, history) => {
        if (err) {
            console.error("Error fetching history:", err.message);
            return res.status(500).send({ message: 'Error fetching change history.' });
        }
        res.json(history);
    });
});

app.listen(port, () => {
    console.log("Server listening at http://localhost:" + port);
});
