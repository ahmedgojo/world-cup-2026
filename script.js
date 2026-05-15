/**
 * WORLD CUP 2026 PREDICTOR - UPGRADED
 * Phase 0: Custom Allocation
 * Phase 1-3: Prediction Logic
 * Backend: PHP / MySQL / AJAX
 */

// --- STATE MANAGEMENT ---
let teams = []; // Loaded from DB
let groupsData = {}; // { 'A': [team1, team2, ...], ... }
let groupsState = {}; // { 'A': [pos1, pos2, ...], ... }
let selectedThirds = [];
let bracket = { R32: {}, R16: {}, QF: {}, SF: {}, F: {} };
let isBracketInitialized = false;

const roundsInfo = [
    { id: 'R32', name: 'SEIZIÈMES DE FINALE', matches: ['m73', 'm74', 'm75', 'm76', 'm77', 'm78', 'm79', 'm80', 'm81', 'm82', 'm83', 'm84', 'm85', 'm86', 'm87', 'm88'] },
    { id: 'R16', name: 'HUITIÈMES DE FINALE', matches: ['m89', 'm90', 'm91', 'm92', 'm93', 'm94', 'm95', 'm96'] },
    { id: 'QF', name: 'QUARTS DE FINALE', matches: ['m97', 'm98', 'm99', 'm100'] },
    { id: 'SF', name: 'DEMI-FINALES', matches: ['m101', 'm102'] },
    { id: 'F', name: 'FINALE', matches: ['m104'] }
];

const nextMatches = {
    m73: { round: 'R16', id: 'm89', slot: 't1' }, m74: { round: 'R16', id: 'm89', slot: 't2' },
    m75: { round: 'R16', id: 'm90', slot: 't1' }, m76: { round: 'R16', id: 'm90', slot: 't2' },
    m77: { round: 'R16', id: 'm91', slot: 't1' }, m78: { round: 'R16', id: 'm91', slot: 't2' },
    m79: { round: 'R16', id: 'm92', slot: 't1' }, m80: { round: 'R16', id: 'm92', slot: 't2' },
    m81: { round: 'R16', id: 'm93', slot: 't1' }, m82: { round: 'R16', id: 'm93', slot: 't2' },
    m83: { round: 'R16', id: 'm94', slot: 't1' }, m84: { round: 'R16', id: 'm94', slot: 't2' },
    m85: { round: 'R16', id: 'm95', slot: 't1' }, m86: { round: 'R16', id: 'm95', slot: 't2' },
    m87: { round: 'R16', id: 'm96', slot: 't1' }, m88: { round: 'R16', id: 'm96', slot: 't2' },
    m89: { round: 'QF', id: 'm97', slot: 't1' }, m90: { round: 'QF', id: 'm97', slot: 't2' },
    m91: { round: 'QF', id: 'm98', slot: 't1' }, m92: { round: 'QF', id: 'm98', slot: 't2' },
    m93: { round: 'QF', id: 'm99', slot: 't1' }, m94: { round: 'QF', id: 'm99', slot: 't2' },
    m95: { round: 'QF', id: 'm100', slot: 't1' }, m96: { round: 'QF', id: 'm100', slot: 't2' },
    m97: { round: 'SF', id: 'm101', slot: 't1' }, m98: { round: 'SF', id: 'm101', slot: 't2' },
    m99: { round: 'SF', id: 'm102', slot: 't1' }, m100: { round: 'SF', id: 'm102', slot: 't2' },
    m101: { round: 'F', id: 'm104', slot: 't1' }, m102: { round: 'F', id: 'm104', slot: 't2' },
};

// --- INITIALIZATION ---

async function init() {
    await loadScenarios();
    await loadTeams();

    if (INITIAL_LOAD_STATE || currentPredictionId) {
        loadStateData(INITIAL_LOAD_STATE);
    } else {
        // If no state exists, we need to create one first to get a currentPredictionId
        const res = await fetch('api.php?action=create', { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            currentPredictionId = data.id;
            await loadScenarios();
        }
        
        renderPool();
        initAllocationDragAndDrop();
    }

    // Initialize Phase Navigation
    const backBtn = document.getElementById('back-to-draw-btn');
    if (backBtn) {
        backBtn.onclick = () => {
            document.getElementById('prediction-wrapper').classList.add('hidden');
            document.getElementById('phase0').classList.remove('hidden');
            // Ensure pool and drag/drop are ready
            if (teams.length === 0) loadTeams().then(() => renderPool());
            else renderPool();
            initAllocationDragAndDrop();
        };
    }
}

async function loadTeams() {
    try {
        const response = await fetch('api.php?action=get_teams');
        teams = await response.json();
    } catch (e) {
        console.error("Failed to load teams", e);
    }
}

// --- PHASE 0: ALLOCATION LOGIC ---

function renderPool() {
    const pool = document.getElementById('team-pool');
    const poolCount = document.getElementById('pool-count');
    pool.innerHTML = '';
    
    // Filter out teams already assigned to groups
    const assignedIds = Object.values(groupsData).flat().map(t => t.id);
    const unassigned = teams.filter(t => !assignedIds.includes(t.id));
    
    unassigned.forEach(team => {
        const badge = createTeamBadge(team);
        badge.draggable = true;
        badge.dataset.teamId = team.id;
        badge.addEventListener('dragstart', handlePoolDragStart);
        pool.appendChild(badge);
    });
    
    poolCount.textContent = unassigned.length;
    checkAllocationCompletion();
}

function createTeamBadge(team) {
    const div = document.createElement('div');
    div.className = 'team-badge';
    div.innerHTML = `
        <img src="https://flagcdn.com/w40/${team.flag_code}.png" alt="${team.name}" class="team-flag-img"> 
        <span class="badge-code">${team.code.toUpperCase()}</span>
        <span class="badge-name">${team.name}</span>
        <div class="badge-drag-handle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </div>
    `;
    return div;
}

let draggedTeam = null;

function handlePoolDragStart(e) {
    draggedTeam = teams.find(t => t.id == this.dataset.teamId);
    e.dataTransfer.setData('text/plain', this.dataset.teamId);
}

function initAllocationDragAndDrop() {
    const slots = document.querySelectorAll('.allocation-slot');
    slots.forEach(slot => {
        slot.addEventListener('dragover', e => e.preventDefault());
        slot.addEventListener('dragenter', e => e.target.classList.add('drag-over'));
        slot.addEventListener('dragleave', e => e.target.classList.remove('drag-over'));
        slot.addEventListener('drop', handleAllocationDrop);
        slot.addEventListener('click', handleSlotClick);
    });
}

function handleAllocationDrop(e) {
    e.preventDefault();
    const slot = e.target.closest('.allocation-slot');
    slot.classList.remove('drag-over');
    
    if (draggedTeam && !slot.hasChildNodes()) {
        assignTeamToGroup(slot, draggedTeam);
        draggedTeam = null;
        renderPool();
    }
}

function handleSlotClick() {
    if (this.hasChildNodes()) {
        const teamId = this.dataset.teamId;
        const group = this.closest('.allocation-group').dataset.group;
        
        // Remove from groupsData
        groupsData[group] = groupsData[group].filter(t => t.id != teamId);
        
        this.innerHTML = '';
        delete this.dataset.teamId;
        renderPool();
    }
}

function assignTeamToGroup(slot, team) {
    const group = slot.closest('.allocation-group').dataset.group;
    if (!groupsData[group]) groupsData[group] = [];
    
    groupsData[group].push({
        id: team.id,
        name: team.name,
        flag: team.flag_code,
        code: team.code
    });
    
    slot.dataset.teamId = team.id;
    slot.appendChild(createTeamBadge(team));
}

function checkAllocationCompletion() {
    const btn = document.getElementById('save-groups-btn');
    let totalAssigned = 0;
    Object.values(groupsData).forEach(g => totalAssigned += g.length);
    
    if (totalAssigned === 48) {
        btn.disabled = false;
        btn.onclick = proceedToPredictor;
    } else {
        btn.disabled = true;
    }
}

async function proceedToPredictor() {
    // Initialize groupsState
    Object.keys(groupsData).forEach(g => {
        groupsState[g] = [];
    });
    
    // Transition UI
    document.getElementById('phase0').classList.add('hidden');
    document.getElementById('prediction-wrapper').classList.remove('hidden');
    
    renderGroups();
    
    // Phase 0: Manual Save on Proceed
    await saveState(false); 
}

// --- PHASE 1-3: PREDICTION LOGIC ---

function renderGroups() {
    const container = document.getElementById('groups-container');
    container.innerHTML = '';
    
    Object.keys(groupsData).sort().forEach(groupId => {
        const groupTeams = groupsData[groupId];
        const assigned = groupsState[groupId] || [];
        const unassigned = groupTeams.filter(t => !assigned.find(a => a.id === t.id));
        
        const card = document.createElement('div');
        card.className = 'card group-card';
        
        // Header
        card.innerHTML = `<div class="group-header heading-bold">Groupe ${groupId}</div>`;
        
        // Unassigned Area
        const unassignedArea = document.createElement('div');
        unassignedArea.className = 'unassigned-area';
        unassigned.forEach(t => {
            const badge = document.createElement('div');
            badge.className = 'team-badge';
            badge.innerHTML = `<img src="https://flagcdn.com/w40/${t.flag}.png" alt="${t.name}" class="team-flag-img"> ${t.code.toUpperCase()}`;
            badge.onclick = () => assignToPredictor(groupId, t);
            unassignedArea.appendChild(badge);
        });
        card.appendChild(unassignedArea);
        
        // Slots
        const slotsArea = document.createElement('div');
        slotsArea.className = 'slots-area';
        for (let i = 0; i < 4; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.innerHTML = `<div class="slot-number">${i + 1}</div>`;
            
            if (assigned[i]) {
                slot.classList.add('filled');
                slot.setAttribute('draggable', 'true');
                slot.dataset.group = groupId;
                slot.dataset.index = i;
                
                // Drag Reordering
                slot.addEventListener('dragstart', e => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({group: groupId, index: i}));
                    e.target.classList.add('dragging');
                });
                slot.addEventListener('dragover', e => e.preventDefault());
                slot.addEventListener('drop', handlePredictorDrop);
                slot.addEventListener('dragend', e => e.target.classList.remove('dragging'));

                slot.innerHTML += `
                    <div class="slot-content">
                        <div class="team-info" onclick="removeFromPredictor('${groupId}', ${i})">
                            <img src="https://flagcdn.com/w40/${assigned[i].flag}.png" alt="${assigned[i].name}" class="team-flag-img"> 
                            <span class="team-name">${assigned[i].name}</span>
                        </div>
                        <div class="drag-handle">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                        </div>
                    </div>
                `;
            }
            slotsArea.appendChild(slot);
        }
        card.appendChild(slotsArea);
        container.appendChild(card);
    });
    
    checkPhase1Completion();
}

function assignToPredictor(groupId, team) {
    if (groupsState[groupId].length < 4) {
        groupsState[groupId].push(team);
        if (groupsState[groupId].length === 3) {
            const last = groupsData[groupId].find(t => !groupsState[groupId].find(a => a.id === t.id));
            if (last) groupsState[groupId].push(last);
        }
        renderGroups();
        saveState(true); // Auto-save
    }
}

function removeFromPredictor(groupId, index) {
    groupsState[groupId].splice(index, 1);
    renderGroups();
    saveState(true); // Auto-save
}

function handlePredictorDrop(e) {
    e.preventDefault();
    const source = JSON.parse(e.dataTransfer.getData('text/plain'));
    const targetGroup = this.dataset.group;
    const targetIndex = parseInt(this.dataset.index);

    if (source.group === targetGroup) {
        const arr = groupsState[source.group];
        [arr[source.index], arr[targetIndex]] = [arr[targetIndex], arr[source.index]];
        
        // Clean up 3rd place selection if needed
        const t1 = arr[source.index];
        const t2 = arr[targetIndex];
        selectedThirds = selectedThirds.filter(t => t.id !== t1.id && t.id !== t2.id);

        renderGroups();
        saveState(true); // Auto-save
    }
}

function checkPhase1Completion() {
    let complete = true;
    Object.keys(groupsData).forEach(g => { if (groupsState[g].length < 4) complete = false; });
    
    const p2 = document.getElementById('phase2');
    if (complete) {
        p2.classList.remove('hidden');
        renderPhase2();
    } else {
        p2.classList.add('hidden');
        document.getElementById('phase3').classList.add('hidden');
    }
}

function renderPhase2() {
    const container = document.getElementById('thirds-container');
    container.innerHTML = '';
    
    const currentThirds = Object.keys(groupsState).sort().map(g => ({ groupId: g, team: groupsState[g][2] }));
    selectedThirds = selectedThirds.filter(st => currentThirds.find(ct => ct.team.id === st.id));
    
    updateThirdsCounter();
    
    currentThirds.forEach(ct => {
        const isSelected = selectedThirds.find(t => t.id === ct.team.id);
        const card = document.createElement('div');
        card.className = `card third-team-card ${isSelected ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="radio-indicator"></div>
            <img src="https://flagcdn.com/w40/${ct.team.flag}.png" alt="${ct.team.name}" class="team-flag-img">
            <span class="team-name">${ct.team.name} <small style="color:var(--text-muted); display:block; font-size: 0.7rem;">Groupe ${ct.groupId}</small></span>
        `;
        card.onclick = () => toggleThirdPlace(ct.team);
        container.appendChild(card);
    });
    
    checkPhase2Completion();
}

function toggleThirdPlace(team) {
    const idx = selectedThirds.findIndex(t => t.id === team.id);
    if (idx >= 0) selectedThirds.splice(idx, 1);
    else if (selectedThirds.length < 8) selectedThirds.push(team);
    
    renderPhase2();
    saveState(true); // Auto-save
}

function updateThirdsCounter() {
    const c = document.getElementById('third-place-counter');
    c.textContent = `${selectedThirds.length}/8 sélectionnées`;
    c.classList.toggle('valid', selectedThirds.length === 8);
}

function checkPhase2Completion() {
    const p3 = document.getElementById('phase3');
    if (selectedThirds.length === 8) {
        p3.classList.remove('hidden');
        generateKnockouts();
    } else {
        p3.classList.add('hidden');
    }
}

function generateKnockouts() {
    const W = {}; const R = {}; const T = selectedThirds;
    Object.keys(groupsState).forEach(g => { W[g] = groupsState[g][0]; R[g] = groupsState[g][1]; });

    if (!isBracketInitialized || !bracket.R32?.m73) {
        roundsInfo.forEach(r => {
            bracket[r.id] = {};
            r.matches.forEach(m => bracket[r.id][m] = { t1: null, t2: null, winner: null });
        });
        isBracketInitialized = true;
    }

    const base = {
        m73: { t1: W['A'], t2: T[0] }, m74: { t1: R['B'], t2: R['F'] },
        m75: { t1: W['C'], t2: T[1] }, m76: { t1: R['D'], t2: R['I'] },
        m77: { t1: W['E'], t2: T[2] }, m78: { t1: W['G'], t2: R['A'] },
        m79: { t1: W['I'], t2: T[3] }, m80: { t1: W['K'], t2: R['C'] },
        m81: { t1: W['B'], t2: T[4] }, m82: { t1: R['E'], t2: R['J'] },
        m83: { t1: W['D'], t2: T[5] }, m84: { t1: W['F'], t2: R['H'] },
        m85: { t1: W['H'], t2: T[6] }, m86: { t1: W['J'], t2: R['L'] },
        m87: { t1: W['L'], t2: T[7] }, m88: { t1: R['G'], t2: R['K'] }
    };

    Object.keys(base).forEach(mId => {
        const m = bracket.R32[mId];
        if (m.winner && m.winner.id !== base[mId].t1?.id && m.winner.id !== base[mId].t2?.id) {
            clearDownstream(mId, m.winner.id);
            m.winner = null;
        }
        m.t1 = base[mId].t1; m.t2 = base[mId].t2;
    });

    renderKnockouts();
}

function renderKnockouts() {
    const container = document.getElementById('knockout-container');
    container.innerHTML = '';
    
    roundsInfo.forEach(r => {
        const section = document.createElement('div');
        section.className = 'round-section';
        section.innerHTML = `<h3 class="heading-bold">${r.name}</h3>`;
        const grid = document.createElement('div');
        grid.className = 'matches-grid';
        
        r.matches.forEach(mId => {
            const m = bracket[r.id][mId];
            const card = document.createElement('div');
            card.className = 'card match-card';
            card.innerHTML = `<div class="match-header">Match ${mId.substring(1)}</div>`;
            const teamsDiv = document.createElement('div');
            teamsDiv.className = 'match-teams';
            
            [m.t1, m.t2].forEach((team, idx) => {
                const div = document.createElement('div');
                div.className = `match-team ${!team ? 'empty' : (m.winner?.id === team.id ? 'active' : '')}`;
                div.innerHTML = team ? `<div class="radio-indicator"></div><img src="https://flagcdn.com/w40/${team.flag}.png" alt="${team.name}" class="team-flag-img"><span class="team-name">${team.name}</span>` : 'À DÉTERMINER';
                if (team) div.onclick = () => setWinner(r.id, mId, idx + 1);
                teamsDiv.appendChild(div);
            });
            card.appendChild(teamsDiv);
            grid.appendChild(card);
        });
        section.appendChild(grid);
        container.appendChild(section);
    });
    
    if (bracket.F.m104?.winner) {
        const win = bracket.F.m104.winner;
        const div = document.createElement('div');
        div.className = 'round-section';
        div.innerHTML = `<h3 class="heading-bold" style="color:var(--primary);text-align:center;">CHAMPION DU MONDE 2026</h3>
            <div class="card final-winner-card">
                <img src="https://flagcdn.com/w80/${win.flag}.png" alt="${win.name}" class="team-flag-img">
                <div class="team-name">${win.name}</div>
            </div>`;
        container.appendChild(div);
        renderSummaryTable();
    } else {
        const sumContainer = document.getElementById('summary-container');
        if (sumContainer) sumContainer.innerHTML = '';
    }
}

function setWinner(round, mId, idx) {
    const m = bracket[round][mId];
    const win = idx === 1 ? m.t1 : m.t2;
    if (!win) return;
    
    if (m.winner && m.winner.id !== win.id) clearDownstream(mId, m.winner.id);
    m.winner = win;
    advance(mId, win);
    renderKnockouts();
    saveState(true); // Auto-save
}

function advance(srcId, team) {
    const n = nextMatches[srcId];
    if (n) {
        const nm = bracket[n.round][n.id];
        nm[n.slot] = team;
        if (nm.winner && nm.winner.id !== nm.t1?.id && nm.winner.id !== nm.t2?.id) {
            clearDownstream(n.id, nm.winner.id);
            nm.winner = null;
        }
    }
}

function clearDownstream(srcId, oldId) {
    let curr = nextMatches[srcId];
    while (curr) {
        const m = bracket[curr.round][curr.id];
        if (m.t1?.id === oldId) m.t1 = null;
        if (m.t2?.id === oldId) m.t2 = null;
        if (m.winner?.id === oldId) {
            m.winner = null;
            curr = nextMatches[curr.id];
        } else break;
    }
}

// --- SYNCING & TOASTS ---

let saveTimeout = null;
let currentToast = null;

async function saveState(isAuto = true) {
    // If auto-saving, use a debounce to avoid flooding the server
    if (isAuto) {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => performSave(true), 1000);
    } else {
        // Manual save (Phase 0) happens instantly
        return await performSave(false);
    }
}

async function performSave(isAuto) {
    const toast = showToast(isAuto ? "Sauvegarde..." : "Finalisation...", "saving");
    
    const data = { groupsData, groupsState, selectedThirds, bracket };
    try {
        const url = currentPredictionId ? `api.php?action=save&id=${currentPredictionId}` : 'api.php?action=save';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            updateToast(toast, "Sauvegardé ✔", "saved");
            setTimeout(() => hideToast(toast), 2000);
            return true;
        }
    } catch (e) {
        console.error("Save failed", e);
        updateToast(toast, "Erreur de sauvegarde", "error");
        setTimeout(() => hideToast(toast), 3000);
        return false;
    }
}

function showToast(text, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast show ${type}`;
    toast.innerHTML = `
        <div class="toast-dot"></div>
        <span class="toast-text">${text}</span>
    `;
    
    // If there's an existing toast, remove it
    if (currentToast) {
        hideToast(currentToast);
    }
    
    container.appendChild(toast);
    currentToast = toast;
    return toast;
}

function updateToast(toast, text, type) {
    if (!toast) return;
    toast.className = `toast show ${type}`;
    toast.querySelector('.toast-text').textContent = text;
}

function hideToast(toast) {
    if (!toast) return;
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
        if (currentToast === toast) currentToast = null;
    }, 400);
}

// --- MULTI-SAVE & SCENARIO LOGIC ---

async function loadScenarios() {
    const res = await fetch('api.php?action=get_predictions');
    if (!res.ok) return;
    const scenarios = await res.json();
    const switcher = document.getElementById('scenario-switcher');
    if (!switcher) return;
    
    switcher.innerHTML = '';
    scenarios.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.prediction_name;
        if (s.id == currentPredictionId) opt.selected = true;
        switcher.appendChild(opt);
    });

    switcher.onchange = async (e) => {
        const id = e.target.value;
        const resp = await fetch(`api.php?action=load_prediction&id=${id}`);
        if (resp.ok) {
            const state = await resp.json();
            currentPredictionId = id;
            loadStateData(state);
        }
    };
}

function loadStateData(state) {
    if (!state) state = {};
    groupsData = state.groupsData || {};
    groupsState = state.groupsState || {};
    selectedThirds = state.selectedThirds || [];
    bracket = state.bracket || { R32: {}, R16: {}, QF: {}, SF: {}, F: {} };
    isBracketInitialized = !!state.bracket;
    
    // Check if empty (Phase 0)
    let totalAssigned = 0;
    Object.values(groupsData).forEach(g => totalAssigned += g.length);
    
    if (totalAssigned < 48) {
        document.getElementById('prediction-wrapper').classList.add('hidden');
        document.getElementById('phase0').classList.remove('hidden');
        renderPool();
        initAllocationDragAndDrop();
    } else {
        document.getElementById('phase0').classList.add('hidden');
        document.getElementById('prediction-wrapper').classList.remove('hidden');
        renderGroups();
        checkPhase1Completion(); 
        if (selectedThirds.length === 8) {
            renderKnockouts();
        }
    }
}

document.getElementById('start-new-btn')?.addEventListener('click', async () => {
    const res = await fetch('api.php?action=create', { method: 'POST' });
    if (res.ok) {
        const data = await res.json();
        currentPredictionId = data.id;
        
        groupsData = {};
        groupsState = {};
        selectedThirds = [];
        bracket = { R32: {}, R16: {}, QF: {}, SF: {}, F: {} };
        isBracketInitialized = false;
        
        document.getElementById('prediction-wrapper').classList.add('hidden');
        document.getElementById('phase0').classList.remove('hidden');
        document.getElementById('phase2').classList.add('hidden');
        document.getElementById('phase3').classList.add('hidden');
        
        await loadScenarios();
        if (teams.length === 0) await loadTeams();
        renderPool();
        initAllocationDragAndDrop();
        
        showToast("Nouveau scénario démarré", "saved");
    }
});

document.getElementById('delete-scenario-btn')?.addEventListener('click', async () => {
    if (!currentPredictionId) return;
    
    if (confirm("Êtes-vous sûr de vouloir supprimer cette prédiction ?")) {
        const res = await fetch(`api.php?action=delete&id=${currentPredictionId}`, { method: 'POST' });
        if (res.ok) {
            showToast("Prédiction supprimée", "saved");
            
            currentPredictionId = null;
            await loadScenarios();
            
            const switcher = document.getElementById('scenario-switcher');
            if (switcher && switcher.options.length > 0) {
                switcher.value = switcher.options[0].value;
                switcher.dispatchEvent(new Event('change'));
            } else {
                document.getElementById('start-new-btn')?.click();
            }
        } else {
            showToast("Erreur de suppression", "error");
        }
    }
});

function renderSummaryTable() {
    const container = document.getElementById('summary-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="summary-container">
            <h2 class="heading-bold section-title" style="text-align: center; margin-bottom: 30px;">Résumé du Tournoi</h2>
            
            <div class="summary-tier">
                <div class="summary-tier-header">Champion</div>
                <div class="summary-tier-content">${renderTeamBadge(bracket.F.m104.winner)}</div>
            </div>
            
            <div class="summary-tier">
                <div class="summary-tier-header">Finaliste</div>
                <div class="summary-tier-content">${renderTeamBadge(getLoser(bracket.F.m104))}</div>
            </div>
            
            <div class="summary-tier">
                <div class="summary-tier-header">Demi-finalistes</div>
                <div class="summary-tier-content">
                    ${renderTeamBadge(getLoser(bracket.SF.m101))}
                    ${renderTeamBadge(getLoser(bracket.SF.m102))}
                </div>
            </div>
            
            <div class="summary-tier">
                <div class="summary-tier-header">Quart-de-finalistes</div>
                <div class="summary-tier-content">
                    ${Object.values(bracket.QF).map(m => renderTeamBadge(getLoser(m))).join('')}
                </div>
            </div>
            
            <div class="summary-tier">
                <div class="summary-tier-header">Huitièmes de finalistes</div>
                <div class="summary-tier-content">
                    ${Object.values(bracket.R16).map(m => renderTeamBadge(getLoser(m))).join('')}
                </div>
            </div>
        </div>
    `;
}

function getLoser(m) {
    if (!m.winner || !m.t1 || !m.t2) return null;
    return m.winner.id === m.t1.id ? m.t2 : m.t1;
}

function renderTeamBadge(team) {
    if (!team) return '';
    return `
        <div class="summary-team">
            <img src="https://flagcdn.com/w40/${team.flag}.png" alt="${team.name}">
            <span>${team.name}</span>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', init);