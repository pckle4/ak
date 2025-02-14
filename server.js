const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const app = express();

// Define data file path
const DATA_FILE = path.join(__dirname, 'data', 'matchState.json');

// Middleware to parse JSON
app.use(express.json());

// Load state from file
async function loadState() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

// Save state to file
async function saveState(state) {
    await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2));
}

// Match state storage
let matchState = {
    court1: {
        team1: 'Team A',
        team2: 'Team B',
        servingTeam: 'team1',
        status: 'paused',
        timeRemaining: 600,
        lastUpdateTime: Date.now()
    },
    court2: {
        team1: 'Team C',
        team2: 'Team D',
        servingTeam: 'team1',
        status: 'paused',
        timeRemaining: 600,
        lastUpdateTime: Date.now()
    },
    nextMatch: 'Upcoming Match',
    upcoming: []
};

// SSE client connections
let clients = [];

// Middleware
app.use(express.static('public'));


// Timer update function
function updateTimers() {
    const currentTime = Date.now();

    ['court1', 'court2'].forEach(court => {
        if (matchState[court].status === 'live') {
            const timePassed = Math.floor((currentTime - matchState[court].lastUpdateTime) / 1000);
            matchState[court].timeRemaining = Math.max(0, matchState[court].timeRemaining - timePassed);
            // Status will only be changed through admin panel, not automatically
        }
        matchState[court].lastUpdateTime = currentTime;
    });
}

// SSE endpoint
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };
    clients.push(newClient);

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
    });

    // Send initial state
    sendEventToClient(newClient, matchState);
});

function sendEventToClient(client, data) {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcastEvent(data) {
    updateTimers();
    clients.forEach(client => sendEventToClient(client, matchState));
}

// Routes
app.get('/match-data', (req, res) => {
    updateTimers();
    res.json(matchState);
});

app.post('/update-match', async (req, res) => {
    try {
        const newState = req.body;
        ['court1', 'court2'].forEach(court => {
            if (newState[court]) {
                // Only update the status if it's explicitly provided
                if (newState[court].status) {
                    if (newState[court].status === 'completed') {
                        matchState[court].timeRemaining = 600;
                    }
                    matchState[court].status = newState[court].status;
                }

                // Update other fields if provided
                if (newState[court].team1) matchState[court].team1 = newState[court].team1;
                if (newState[court].team2) matchState[court].team2 = newState[court].team2;
                if (newState[court].servingTeam) matchState[court].servingTeam = newState[court].servingTeam;

                // Always update lastUpdateTime
                matchState[court].lastUpdateTime = Date.now();
            }
        });

        // Update upcoming matches and next match if provided
        if (newState.upcoming) matchState.upcoming = newState.upcoming;
        if (newState.nextMatch) matchState.nextMatch = newState.nextMatch;

        // Save state to file
        await saveState(matchState);

        broadcastEvent(matchState);
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error updating match state:', error);
        res.status(500).json({ error: 'Failed to update match state' });
    }
});

// Admin route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Regular interval updates for connected clients
setInterval(() => {
    if (clients.length > 0) {
        broadcastEvent(matchState);
    }
}, 1000);

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
