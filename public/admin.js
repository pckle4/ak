// Event Source for real-time updates
const eventSource = new EventSource('https://ak-sable.vercel.app/events');

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    updateAdminFormFromData(data);
};

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getCurrentFormData() {
    const data = {
        court1: {
            team1: document.getElementById('court1team1').value,
            team2: document.getElementById('court1team2').value,
            servingTeam: document.getElementById('court1servingTeam').value,
            status: document.getElementById('court1status').value,
            timeRemaining: 600
        },
        court2: {
            team1: document.getElementById('court2team1').value,
            team2: document.getElementById('court2team2').value,
            servingTeam: document.getElementById('court2servingTeam').value,
            status: document.getElementById('court2status').value,
            timeRemaining: 600
        },
        nextMatch: document.getElementById('nextMatch').value,
        upcoming: []
    };

    document.querySelectorAll('.match-input-group').forEach(match => {
        data.upcoming.push({
            team1: match.querySelector('.upcoming-team1').value,
            team2: match.querySelector('.upcoming-team2').value,
            time: match.querySelector('.upcoming-time').value,
            court: match.querySelector('.upcoming-court').value
        });
    });

    return data;
}

function updateAdminFormFromData(data) {
    // Court 1
    document.getElementById('court1team1').value = data.court1?.team1 || '';
    document.getElementById('court1team2').value = data.court1?.team2 || '';
    document.getElementById('court1servingTeam').value = data.court1?.servingTeam || 'team1';
    document.getElementById('court1status').value = data.court1?.status || 'paused';
    document.getElementById('court1timer').textContent = 
        `Time Remaining: ${formatTime(data.court1?.timeRemaining || 600)}`;

    // Court 2
    document.getElementById('court2team1').value = data.court2?.team1 || '';
    document.getElementById('court2team2').value = data.court2?.team2 || '';
    document.getElementById('court2servingTeam').value = data.court2?.servingTeam || 'team1';
    document.getElementById('court2status').value = data.court2?.status || 'paused';
    document.getElementById('court2timer').textContent = 
        `Time Remaining: ${formatTime(data.court2?.timeRemaining || 600)}`;

    document.getElementById('nextMatch').value = data.nextMatch || '';

    const upcomingContainer = document.getElementById('upcomingMatches');
    upcomingContainer.innerHTML = '';
    (data.upcoming || []).forEach(match => {
        addMatchField(match.team1, match.team2, match.time, match.court);
    });
}

function showSaveFeedback() {
    const btn = document.querySelector('.admin-btn.save');
    btn.style.backgroundColor = '#4ECDC4';
    btn.textContent = '✓ Saved!';
    setTimeout(() => {
        btn.style.backgroundColor = '#2ECC71';
        btn.textContent = 'Save All 💾';
    }, 2000);
}

async function saveDataToServer(data) {
    try {
        const response = await fetch('https://ak-sable.vercel.app/update-match', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Network response was not ok');
        showSaveFeedback();
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

function addMatchField(team1 = '', team2 = '', time = '', court = '1') {
    const div = document.createElement('div');
    div.className = 'match-input-group';
    div.innerHTML = `
        <input type="text" placeholder="Team A" class="upcoming-team1" value="${team1}" 
            style="background: ${getRandomTeamColor()}; font-family: 'Luckiest Guy'">
        <span style="font-family: 'Shadows Into Light'">vs</span>
        <input type="text" placeholder="Team B" class="upcoming-team2" value="${team2}"
            style="background: ${getRandomTeamColor()}; font-family: 'Luckiest Guy'">
        <input type="time" class="upcoming-time" value="${time}">
        <select class="upcoming-court" style="padding: 0.5rem">
            <option value="1" ${court === '1' ? 'selected' : ''}>Court 1</option>
            <option value="2" ${court === '2' ? 'selected' : ''}>Court 2</option>
        </select>
        <button type="button" class="remove-match">×</button>
    `;
    document.getElementById('upcomingMatches').appendChild(div);
}

function getRandomTeamColor() {
    const colors = ['#FF6B6B30', '#4ECDC430', '#FFE66D30', '#FF9F1C30', '#9B59B630'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Event Listeners
document.getElementById('matchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveDataToServer(getCurrentFormData());
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-match')) {
        e.target.parentElement.remove();
        saveDataToServer(getCurrentFormData());
    }
});

// Status change handlers
document.getElementById('court1status').addEventListener('change', () => {
    saveDataToServer(getCurrentFormData());
});

document.getElementById('court2status').addEventListener('change', () => {
    saveDataToServer(getCurrentFormData());
});

// Initial data load
fetch('https://ak-sable.vercel.app/match-data')
    .then(response => response.json())
    .then(data => {
        updateAdminFormFromData(data);
    })
    .catch(error => console.error('Error loading data:', error));
