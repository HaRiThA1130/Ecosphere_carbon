// EcoSphere Application Logic - Core JavaScript

// 1. Core Emission Coefficients (annual kg CO2e)
const COEFF = {
    carMile: 0.35,              // kg CO2 per mile (average petrol vehicle)
    transitHour: 1.2,           // kg CO2 per hour of public transport
    flightHour: 90,             // kg CO2 per hour of flight
    electricityKwh: 0.37,       // kg CO2 per kWh of grid electricity
    heating: {
        'natural-gas': 1400,    // kg CO2/year baseline
        'electricity': 800,     // kg CO2/year baseline
        'heating-oil': 2200,    // kg CO2/year baseline
        'none': 0               // Renewable/none
    },
    diet: {
        'heavy-meat': 3000,     // kg CO2/year
        'medium-meat': 2000,    // kg CO2/year
        'low-meat': 1400,       // kg CO2/year
        'vegetarian': 1000,     // kg CO2/year
        'vegan': 600            // kg CO2/year
    },
    foodWaste: {
        'high': 300,            // kg CO2/year
        'medium': 100,          // kg CO2/year
        'low': 0                // kg CO2/year
    },
    shopping: {
        'high': 1800,           // kg CO2/year
        'medium': 800,          // kg CO2/year
        'low': 300              // kg CO2/year
    },
    recycleBenefit: -150        // Savings if user recycles regularly
};

// 2. Habits Definition
const HABITS = [
    { id: 'public-transit', title: 'Transit / Cycle Commute', impact: 8.5, xp: 15, icon: 'bike' },
    { id: 'plant-meal', title: 'Plant-Based Meal', impact: 4.2, xp: 10, icon: 'apple' },
    { id: 'unplug', title: 'Device Standby Unplug', impact: 1.5, xp: 5, icon: 'zap' },
    { id: 'thermostat', title: 'Adjust Thermostat +/- 2°', impact: 3.0, xp: 8, icon: 'home' },
    { id: 'cold-wash', title: 'Cold-water Wash Laundry', impact: 2.0, xp: 8, icon: 'droplet' },
    { id: 'zero-waste', title: 'Composting & Plastic-Free', impact: 1.8, xp: 10, icon: 'trash-2' }
];

// 3. Pledges Definition
const PLEDGES = [
    { id: 'led-bulbs', title: 'Full LED Lighting Upgrade', impact: 250, xp: 50, icon: 'lightbulb' },
    { id: 'green-power', title: 'Green Energy Power Shift', impact: 800, xp: 100, icon: 'zap' },
    { id: 'electric-bike', title: 'E-Bike Commuter Shift', impact: 600, xp: 80, icon: 'bike' },
    { id: 'meatless-mondays', title: 'Weekly Vegetarian Days', impact: 400, xp: 60, icon: 'utensils' }
];

// 4. Default Application State
let state = {
    completedOnboarding: false,
    inputs: {
        carMiles: 0,
        transitHours: 0,
        flightHours: 0,
        electricity: 0,
        heatingSource: 'electricity',
        householdSize: 1,
        dietStyle: 'medium-meat',
        foodWaste: 'medium',
        shoppingSpend: 'medium',
        recycle: true
    },
    emissions: {
        transport: 0,
        energy: 0,
        diet: 0,
        shopping: 0
    },
    totalEmissions: 0, // metric tons
    xp: 0,
    level: 1,
    offsetAmount: 0, // kg CO2 simulation
    offsetType: 'trees',
    completedHabits: [], // IDs done today
    pledgedActions: [],  // IDs pledged
    savedCO2: 0,         // Cumulative savings in kg
    unlockedBadges: [],
    trees: [],           // Drawn coordinates for canvas
    bonusClicks: 0       // Limit user clicking forest for XP
};

// Global Chart instance
let emissionsChart = null;
let historyChart = null;

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    loadStateFromStorage();
    initLucide();
    setupEventListeners();
    initForestCanvas();
    
    if (state.completedOnboarding) {
        hideModal();
        renderDashboard();
    } else {
        showModal();
        updateWizardSteps();
    }
});

// Init Lucide Icons helper
function initLucide() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 5. STORAGE INTEGRATION
function saveStateToStorage() {
    localStorage.setItem('ecosphere_state', JSON.stringify(state));
}

function loadStateFromStorage() {
    const raw = localStorage.getItem('ecosphere_state');
    if (raw) {
        try {
            state = JSON.parse(raw);
            // Re-validate structure to avoid old storage format issues
            if (!state.completedHabits) state.completedHabits = [];
            if (!state.pledgedActions) state.pledgedActions = [];
            if (!state.unlockedBadges) state.unlockedBadges = [];
            if (!state.trees) state.trees = [];
            if (!state.history) state.history = [];
            if (state.bonusClicks === undefined) state.bonusClicks = 0;
        } catch (e) {
            console.error("Error parsing stored user state, fallback to defaults.", e);
        }
    }
}

// 6. EVENT LISTENERS
function setupEventListeners() {
    // Recalculate Button
    document.getElementById('btn-recalculate').addEventListener('click', () => {
        showModal();
    });

    // Wizard Controls
    let currentStep = 1;
    const nextBtn = document.getElementById('btn-wizard-next');
    const prevBtn = document.getElementById('btn-wizard-prev');

    nextBtn.addEventListener('click', () => {
        if (currentStep < 4) {
            currentStep++;
            showStep(currentStep);
        } else {
            // Calculate and submit!
            calculateEmissionsFromForm();
            state.completedOnboarding = true;
            saveStateToStorage();
            hideModal();
            renderDashboard();
            showToast("Eco Footprint Calculated!", "globe");
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    });

    function showStep(stepNum) {
        currentStep = stepNum;
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.remove('active');
        });
        document.querySelector(`.wizard-step[data-step="${stepNum}"]`).classList.add('active');
        
        // Update progress indicators
        document.getElementById('wizard-steps-indicator').innerText = `Step ${stepNum} of 4`;
        document.getElementById('wizard-progress-fill').style.width = `${stepNum * 25}%`;
        
        // Update Buttons
        prevBtn.disabled = stepNum === 1;
        if (stepNum === 4) {
            nextBtn.innerText = "Calculate Footprint";
        } else {
            nextBtn.innerText = "Next";
        }
    }

    // Offset Slider
    const slider = document.getElementById('offset-slider');
    const sliderLabel = document.getElementById('offset-amount-label');
    const costLabel = document.getElementById('offset-cost-val');
    
    slider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        sliderLabel.innerText = `${value.toLocaleString()} kg CO₂`;
        state.offsetAmount = value;
        updateOffsetCostDisplay();
    });

    // Offset Project Type Selection
    document.querySelectorAll('.offset-option').forEach(option => {
        option.addEventListener('click', (e) => {
            document.querySelectorAll('.offset-option').forEach(o => o.classList.remove('active'));
            const clicked = e.currentTarget;
            clicked.classList.add('active');
            state.offsetType = clicked.dataset.type;
            updateOffsetCostDisplay();
        });
    });

    // Purchase/Simulate Offset Button
    document.getElementById('btn-purchase-offset').addEventListener('click', () => {
        if (state.offsetAmount === 0) {
            showToast("Please select offset amount greater than 0 kg", "alert-circle");
            return;
        }
        
        const cost = calculateOffsetCost();
        // Give XP and tree counts proportional to offsets
        const treesEarned = Math.floor(state.offsetAmount / 50);
        const xpGained = Math.floor(state.offsetAmount / 10);
        
        state.savedCO2 += state.offsetAmount;
        addXp(xpGained);
        
        // Plant trees in forest State
        for (let i = 0; i < treesEarned; i++) {
            plantRandomTree();
        }
        
        showToast(`Offset simulated! Planted ${treesEarned} virtual trees & gained +${xpGained} XP!`, "sparkles");
        
        // Reset slider
        slider.value = 0;
        sliderLabel.innerText = "0 kg CO₂";
        state.offsetAmount = 0;
        updateOffsetCostDisplay();
        
        saveStateToStorage();
        renderDashboard();
    });

    // Canvas click - Interaction with trees
    const canvas = document.getElementById('forestCanvas');
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Check if clicked near any tree top
        let clickedTree = false;
        state.trees.forEach(tree => {
            // Distance check to tree trunk/top
            const dx = clickX - tree.x;
            const dy = clickY - tree.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 40) {
                clickedTree = true;
                // Animate tree water splash
                createWaterSplatter(tree.x, tree.y);
            }
        });

        if (clickedTree) {
            if (state.bonusClicks < 5) {
                state.bonusClicks++;
                addXp(3);
                showToast("You watered a tree! +3 Bonus XP!", "droplet");
                saveStateToStorage();
                renderDashboard();
            } else {
                showToast("Your forest is well hydrated for today!", "leaf");
            }
        }
    });

    // Forest Buttons
    document.getElementById('btn-water-forest').addEventListener('click', () => {
        addXp(5);
        showToast("Forest watered! You gained +5 XP!", "droplet");
        // Animate water over the canvas
        triggerRainEffect();
        saveStateToStorage();
        renderDashboard();
    });

    document.getElementById('btn-plant-seed').addEventListener('click', () => {
        const threshold = 50;
        // Check if there is enough CO2 saved that hasn't been planted
        const maxPlantedTrees = Math.floor(state.savedCO2 / threshold);
        if (state.trees.length < maxPlantedTrees) {
            plantRandomTree();
            showToast("New seedling sprouted! Grow it big!", "sprout");
            saveStateToStorage();
            renderDashboard();
        } else {
            showToast(`Needs 50kg savings per tree. Current savings: ${state.savedCO2}kg (${state.trees.length} trees).`, "alert-circle");
        }
    });

    // Export / Print Buttons (history)
    const btnExportJson = document.getElementById('btn-export-json');
    const btnExportCsv = document.getElementById('btn-export-csv');
    const btnPrint = document.getElementById('btn-print-report');
    if (btnExportJson) btnExportJson.addEventListener('click', exportHistoryJSON);
    if (btnExportCsv) btnExportCsv.addEventListener('click', exportHistoryCSV);
    if (btnPrint) btnPrint.addEventListener('click', printReport);
}

function updateOffsetCostDisplay() {
    const cost = calculateOffsetCost();
    document.getElementById('offset-cost-val').innerText = `$${cost.toFixed(2)}`;
}

function calculateOffsetCost() {
    const option = document.querySelector(`.offset-option[data-type="${state.offsetType}"]`);
    const rate = parseFloat(option.dataset.cost);
    return state.offsetAmount * rate;
}

// 7. WIZARD HELPERS
function showModal() {
    document.getElementById('calculator-modal').style.display = 'flex';
}

function hideModal() {
    document.getElementById('calculator-modal').style.display = 'none';
}

function updateWizardSteps() {
    // Fill wizard inputs from state in case they are re-running
    document.getElementById('input-car-miles').value = state.inputs.carMiles || '';
    document.getElementById('input-transit-hours').value = state.inputs.transitHours || '';
    document.getElementById('input-flight-hours').value = state.inputs.flightHours || '';
    document.getElementById('input-electricity').value = state.inputs.electricity || '';
    document.getElementById('select-heating').value = state.inputs.heatingSource;
    document.getElementById('input-household-size').value = state.inputs.householdSize || 1;
    document.getElementById('select-diet').value = state.inputs.dietStyle;
    document.getElementById('select-waste').value = state.inputs.foodWaste;
    document.getElementById('select-shopping-goods').value = state.inputs.shoppingSpend;
    document.getElementById('checkbox-recycle').checked = state.inputs.recycle;
}

// 8. CALCULATOR LOGIC
function calculateEmissionsFromForm() {
    // Save Form Values into State
    state.inputs.carMiles = parseFloat(document.getElementById('input-car-miles').value) || 0;
    state.inputs.transitHours = parseFloat(document.getElementById('input-transit-hours').value) || 0;
    state.inputs.flightHours = parseFloat(document.getElementById('input-flight-hours').value) || 0;
    
    state.inputs.electricity = parseFloat(document.getElementById('input-electricity').value) || 0;
    state.inputs.heatingSource = document.getElementById('select-heating').value;
    state.inputs.householdSize = parseInt(document.getElementById('input-household-size').value) || 1;
    
    state.inputs.dietStyle = document.getElementById('select-diet').value;
    state.inputs.foodWaste = document.getElementById('select-waste').value;
    
    state.inputs.shoppingSpend = document.getElementById('select-shopping-goods').value;
    state.inputs.recycle = document.getElementById('checkbox-recycle').checked;

    // Run Calculations using pure helper (calculations.js)
    if (window.EcoCalc && typeof window.EcoCalc.calculateEmissionsFromValues === 'function') {
        const out = window.EcoCalc.calculateEmissionsFromValues(state.inputs);
        state.emissions.transport = out.emissions.transport;
        state.emissions.energy = out.emissions.energy;
        state.emissions.diet = out.emissions.diet;
        state.emissions.shopping = out.emissions.shopping;
        state.totalEmissions = out.totalTons;
    } else {
        console.warn('EcoCalc module not available, using fallback calculations');
        // fallback to previous inline calculation
        const transportEmissions = (state.inputs.carMiles * 52 * COEFF.carMile) + 
                                    (state.inputs.transitHours * 52 * COEFF.transitHour) + 
                                    (state.inputs.flightHours * COEFF.flightHour);
        const energyEmissions = ((state.inputs.electricity * 12 * COEFF.electricityKwh) + 
                                 COEFF.heating[state.inputs.heatingSource]) / state.inputs.householdSize;
        const dietEmissions = COEFF.diet[state.inputs.dietStyle] + COEFF.foodWaste[state.inputs.foodWaste];
        let shoppingEmissions = COEFF.shopping[state.inputs.shoppingSpend];
        if (state.inputs.recycle) shoppingEmissions += COEFF.recycleBenefit;
        state.emissions.transport = transportEmissions;
        state.emissions.energy = energyEmissions;
        state.emissions.diet = dietEmissions;
        state.emissions.shopping = shoppingEmissions;
        const totalKg = transportEmissions + energyEmissions + dietEmissions + shoppingEmissions;
        state.totalEmissions = Math.max(0.1, totalKg / 1000);
    }
    // Compute Carbon Health Score and store assessment in history
    const score = computeCarbonScore(state.totalEmissions);
    const caveats = generateCaveats();

    // Append to assessment history
    if (!state.history) state.history = [];
    state.history.push({
        ts: Date.now(),
        totalTons: state.totalEmissions,
        breakdown: {
            transport: Math.round(state.emissions.transport),
            energy: Math.round(state.emissions.energy),
            diet: Math.round(state.emissions.diet),
            shopping: Math.round(state.emissions.shopping)
        },
        score: score,
        caveats: caveats
    });

    // Keep only last 48 records to avoid storage bloat
    if (state.history.length > 48) state.history.shift();

    saveStateToStorage();
}

// Compute a simple explainable Carbon Health Score (0-100)
function computeCarbonScore(totalTons) {
    // Map 0 - 24 tons into 100 -> 0 linearly, with some bias towards easy wins
    const min = 0.0;
    const max = 24.0;
    const clamped = Math.max(min, Math.min(max, totalTons));
    const raw = 100 - ((clamped - min) / (max - min)) * 100;
    const score = Math.round(Math.max(0, Math.min(100, raw)));
    return score;
}

function generateCaveats() {
    return 'Results use simplified emission factors for home energy, transport, food and goods; household shares applied where relevant. These are estimates, not audited measurements.';
}

// Render deterministic, context-aware recommendations (no external AI required)
function renderRecommendations() {
    const container = document.getElementById('recommendations-container');
    container.replaceChildren();

    const recs = (window.EcoCalc && typeof window.EcoCalc.buildRecommendations === 'function')
        ? window.EcoCalc.buildRecommendations(state.inputs, state.emissions)
        : [];

    recs.forEach(rec => {
        const el = document.createElement('div');
        el.className = 'recommendation-item';

        const left = document.createElement('div');
        left.className = 'rec-left';

        const title = document.createElement('div');
        title.className = 'rec-title';
        title.textContent = rec.title;

        const sub = document.createElement('div');
        sub.className = 'rec-sub';
        const savingsStrong = document.createElement('strong');
        savingsStrong.textContent = `${rec.savingsKg} kg/yr`;
        sub.append('Estimated savings: ');
        sub.appendChild(savingsStrong);

        left.appendChild(title);
        left.appendChild(sub);

        const actions = document.createElement('div');
        actions.className = 'rec-actions';

        const button = document.createElement('button');
        button.className = 'btn btn-sm btn-primary apply-rec';
        button.type = 'button';
        button.dataset.type = rec.action.type;
        button.dataset.id = rec.action.id;
        button.dataset.savings = String(rec.savingsKg);
        button.textContent = 'Apply';

        actions.appendChild(button);
        el.appendChild(left);
        el.appendChild(actions);
        container.appendChild(el);
    });

    // Wire up apply buttons
    container.querySelectorAll('.apply-rec').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.currentTarget.dataset.type;
            const id = e.currentTarget.dataset.id;
            const savings = parseInt(e.currentTarget.dataset.savings) || 0;
            applyRecommendation(type, id, savings);
        });
    });
}

function applyRecommendation(type, id, savingsKg) {
    if (type === 'habit') {
        if (!state.completedHabits.includes(id)) {
            state.completedHabits.push(id);
            state.savedCO2 += savingsKg;
            addXp(10);
            showToast(`Recommendation applied: ${id}. +${savingsKg} kg saved (estimate)`, 'check-circle');
        } else {
            showToast('Recommendation already applied today', 'alert-circle');
        }
    } else if (type === 'pledge') {
        if (!state.pledgedActions.includes(id)) {
            state.pledgedActions.push(id);
            state.totalEmissions = Math.max(0.1, state.totalEmissions - (savingsKg / 1000));
            state.savedCO2 += savingsKg;
            addXp(20);
            showToast(`Pledge made: ${id}. Estimated permanent reduction applied.`, 'award');
        } else {
            showToast('Already pledged', 'alert-circle');
        }
    }

    saveStateToStorage();
    renderDashboard();
}

// Render assessment history as a small line chart and list
function renderHistory() {
    const list = document.getElementById('history-list');
    list.replaceChildren();

    const labels = state.history.map(h => {
        const d = new Date(h.ts);
        return `${d.getMonth()+1}/${d.getDate()}`;
    });
    const data = state.history.map(h => Number(h.totalTons.toFixed(2)));

    // destroy previous chart
    const ctx = document.getElementById('historyChart').getContext('2d');
    if (historyChart) historyChart.destroy();

    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 't CO2e/yr',
                data: data,
                borderColor: '#60A5FA',
                backgroundColor: 'rgba(96,165,250,0.08)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
    });

    // History list entries (latest first)
    const recent = [...state.history].reverse().slice(0,6);
    recent.forEach(h => {
        const d = new Date(h.ts);
        const el = document.createElement('div');
        el.className = 'history-item';

        const dateEl = document.createElement('div');
        dateEl.className = 'history-date';
        dateEl.textContent = d.toLocaleString();

        const valEl = document.createElement('div');
        valEl.className = 'history-val';
        valEl.textContent = `${h.totalTons.toFixed(2)} t`;

        el.appendChild(dateEl);
        el.appendChild(valEl);
        list.appendChild(el);
    });
}

// Export history as JSON file
function exportHistoryJSON() {
        const blob = new Blob([JSON.stringify(state.history || [], null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ecosphere_history_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('Exported history as JSON', 'download');
}

// Export history as CSV file
function exportHistoryCSV() {
        const rows = [['timestamp','total_tons','transport_kg','energy_kg','diet_kg','shopping_kg','score','caveats']];
        (state.history || []).forEach(h => {
                rows.push([
                        new Date(h.ts).toISOString(),
                        h.totalTons,
                        h.breakdown.transport,
                        h.breakdown.energy,
                        h.breakdown.diet,
                        h.breakdown.shopping,
                        h.score,
                        '"' + (h.caveats || '').replace(/"/g,'""') + '"'
                ]);
        });

        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ecosphere_history_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('Exported history as CSV', 'download');
}

// Print a clean summary report
function printReport() {
        const win = window.open('', '_blank');
        if (!win) {
                showToast('Pop-up blocked. Allow pop-ups to print report.', 'alert-circle');
                return;
        }

        const now = new Date();
        const breakdown = state.emissions;
    const topRecommendations = Array.from(document.querySelectorAll('.recommendation-item .rec-title'))
        .slice(0, 5)
        .map(el => `<li>${escapeHtml(el.textContent)}</li>`)
        .join('');

    const historyRows = (state.history || [])
        .slice(-6)
        .map(h => `<tr><td>${escapeHtml(new Date(h.ts).toLocaleString())}</td><td>${h.totalTons.toFixed(2)}</td><td>${h.score}</td></tr>`)
        .join('');

    const html = `
        <html><head><title>EcoSphere Report</title>
        <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}h1{color:#0b6}</style>
        </head><body>
        <h1>EcoSphere Assessment Summary</h1>
        <p><strong>Date:</strong> ${escapeHtml(now.toLocaleString())}</p>
        <h2>Total Footprint: ${state.totalEmissions.toFixed(2)} t CO₂e/yr</h2>
        <p><strong>Carbon Health Score:</strong> ${computeCarbonScore(state.totalEmissions)}</p>
        <h3>Breakdown (kg/year)</h3>
        <ul>
            <li>Transportation: ${Math.round(breakdown.transport)} kg</li>
            <li>Home Energy: ${Math.round(breakdown.energy)} kg</li>
            <li>Diet & Food: ${Math.round(breakdown.diet)} kg</li>
            <li>Shopping: ${Math.round(breakdown.shopping)} kg</li>
        </ul>
        <h3>Top Recommendations</h3>
        <ul>${topRecommendations}</ul>
        <h3>Recent History</h3>
        <table border="1" cellpadding="6" cellspacing="0">
            <tr><th>Date</th><th>Total t CO₂e/yr</th><th>Score</th></tr>
            ${historyRows}
        </table>
        <p style="margin-top:24px;color:#666;font-size:12px">Caveats: ${escapeHtml(generateCaveats())}</p>
        </body></html>`;

        win.document.write(html);
        win.document.close();
        win.focus();
        // Delay printing to allow resources to load
        setTimeout(() => { win.print(); }, 500);
}

// 9. DASHBOARD RENDERER
function renderDashboard() {
    // Ensure dashboard container is visible
    document.getElementById('main-dashboard').classList.remove('is-hidden');

    // Update Header Level & XP
    document.getElementById('user-level-badge').innerText = state.level;
    document.getElementById('user-xp-val').innerText = state.xp;
    
    const xpThreshold = 100 * state.level;
    const xpPercent = Math.min(100, (state.xp / xpThreshold) * 100);
    document.getElementById('user-xp-fill').style.width = `${xpPercent}%`;
    
    // Update Rank Name
    document.getElementById('user-rank-name').innerText = getRankName(state.level);

    // Update Footprint Card
    const scoreVal = state.totalEmissions.toFixed(1);
    document.getElementById('total-score-val').innerText = scoreVal;
    document.getElementById('comp-lbl-user').innerText = `${scoreVal} t`;
    
    // Status color classes
    const statusTag = document.getElementById('footprint-status-tag');
    statusTag.classList.remove('status-green', 'status-yellow', 'status-red');
    if (state.totalEmissions < 4.0) {
        statusTag.innerText = "Excellent";
        statusTag.classList.add('status-green');
    } else if (state.totalEmissions <= 12.0) {
        statusTag.innerText = "Moderate";
        statusTag.classList.add('status-yellow');
    } else {
        statusTag.innerText = "High Impact";
        statusTag.classList.add('status-red');
    }

    // Comparison scale positioning
    // Global: 4t, US Average: 16t, Range: 0 to 24t
    const maxBarValue = 24.0;
    const userPercent = Math.min(100, (state.totalEmissions / maxBarValue) * 100);
    document.getElementById('comp-bar-user').style.width = `${userPercent}%`;

    // Carbon Health Score and caveats
    if (document.getElementById('carbon-score')) {
        const carbonScore = computeCarbonScore(state.totalEmissions);
        document.getElementById('carbon-score').innerText = carbonScore;
    }
    if (document.getElementById('score-caveats')) {
        document.getElementById('score-caveats').innerText = generateCaveats();
    }

    // Render Doughnut Chart
    renderEmissionsChart();

    // Render Daily Habits Checklists
    renderHabitsList();

    // Render Pledges list
    renderPledgesList();

    // Update Savings Counter
    document.getElementById('total-co2-saved-val').innerText = Math.round(state.savedCO2);
    
    // Forest Count
    const forestTreeCount = state.trees.length;
    document.getElementById('forest-tree-count').innerText = `${forestTreeCount} ${forestTreeCount === 1 ? 'Tree' : 'Trees'}`;

    // Verify Badges
    checkAchievements();
    renderBadgesGrid();

    // Context Insights
    updateContextInsights();

    // Render coach recommendations and history
    try { renderRecommendations(); } catch (e) { console.warn(e); }
    try { renderHistory(); } catch (e) { console.warn(e); }
    try { renderCommunityComparison(); } catch (e) { console.warn(e); }

    // Forest Visual Draw
    drawForest();
}

function getRankName(level) {
    if (level < 2) return "Eco Explorer";
    if (level < 4) return "Green Citizen";
    if (level < 6) return "Carbon Fighter";
    if (level < 9) return "Climate Guardian";
    return "Planet Champion";
}

// 10. DOUGHNUT CHART SETUP
function renderEmissionsChart() {
    const ctx = document.getElementById('emissionsChart').getContext('2d');
    
    const transportData = Math.round(state.emissions.transport);
    const energyData = Math.round(state.emissions.energy);
    const dietData = Math.round(state.emissions.diet);
    const shoppingData = Math.round(state.emissions.shopping);
    const totalData = transportData + energyData + dietData + shoppingData;

    const dataValues = [transportData, energyData, dietData, shoppingData];
    const labels = ['Transportation', 'Home Energy', 'Diet & Food', 'Shopping'];
    const colors = ['#60A5FA', '#F59E0B', '#10B981', '#A78BFA'];

    if (emissionsChart) {
        emissionsChart.destroy();
    }

    emissionsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: colors,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // We render custom HTML legend
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            const pct = totalData > 0 ? ((val / totalData) * 100).toFixed(0) : 0;
                            return ` ${context.label}: ${val.toLocaleString()} kg (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });

    // Custom HTML legend
    const legendContainer = document.getElementById('chart-legend');
    legendContainer.replaceChildren();
    
    labels.forEach((label, i) => {
        const val = dataValues[i];
        const pct = totalData > 0 ? ((val / totalData) * 100).toFixed(0) : 0;
        
        const item = document.createElement('div');
        item.className = 'legend-item';
        const color = document.createElement('span');
        color.className = 'legend-color';
        color.style.backgroundColor = colors[i];
        const labelEl = document.createElement('span');
        labelEl.className = 'legend-label';
        labelEl.textContent = label;
        const valueEl = document.createElement('span');
        valueEl.className = 'legend-value';
        valueEl.textContent = `${pct}%`;
        item.appendChild(color);
        item.appendChild(labelEl);
        item.appendChild(valueEl);
        legendContainer.appendChild(item);
    });
}

// 18. COMMUNITY COMPARISON
function renderCommunityComparison() {
    const canvas = document.getElementById('communityChart');
    if (!canvas || !(window.Chart)) return;

    // Generate a mock community distribution (log-normal around 4 t)
    const distribution = [];
    for (let i=0;i<300;i++){
        // lognormal-ish sample
        const val = Math.max(0.1, Math.exp( Math.random()*1.2 + Math.log(3 + Math.random()*2) ));
        distribution.push(Number(val.toFixed(2)));
    }

    // compute percentile using EcoCalc helper
    let percentile = 50;
    if (window.EcoCalc && typeof window.EcoCalc.computePercentile === 'function') {
        const res = window.EcoCalc.computePercentile(state.totalEmissions, distribution, [2,4,8,16,32]);
        percentile = res.percentile;
        // render legend counts
        const legend = document.getElementById('community-legend');
        if (legend) {
            legend.innerText = `Median: ${median(distribution).toFixed(1)} t`;
        }
    }

    document.getElementById('community-percentile').innerText = `${percentile}%`;

    // Prepare histogram buckets for chart
    const bins = [0,2,4,8,16,32];
    const counts = bins.map(_=>0);
    distribution.forEach(v => {
        for (let j=0;j<bins.length;j++){
            if (v <= bins[j]) { counts[j]++; break; }
            if (j===bins.length-1) counts[j]++;
        }
    });

    const labels = bins.map((b,i)=> i===0 ? `<=${b}` : `${bins[i-1]}-${b}`);
    const ctx = canvas.getContext('2d');
    if (window.communityChart) { window.communityChart.destroy(); }
    window.communityChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ data: counts, backgroundColor: '#60A5FA' }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{display:false}} }
    });
}

function median(arr){
    const a = arr.slice().sort((x,y)=>x-y);
    const mid = Math.floor(a.length/2);
    return a.length%2 ? a[mid] : (a[mid-1]+a[mid])/2;
}

// 11. HABITS LIST GENERATOR
function renderHabitsList() {
    const container = document.getElementById('habits-list-container');
    container.replaceChildren();

    HABITS.forEach(habit => {
        const isChecked = state.completedHabits.includes(habit.id);
        const item = document.createElement('div');
        item.className = `habit-item ${isChecked ? 'completed' : ''}`;

        const label = document.createElement('label');
        label.className = 'habit-checkbox-label';
        label.htmlFor = `habit-${habit.id}`;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `habit-${habit.id}`;
        input.className = 'habit-checkbox';
        input.checked = isChecked;
        input.dataset.id = habit.id;

        const custom = document.createElement('span');
        custom.className = 'custom-checkbox';

        const details = document.createElement('div');
        details.className = 'habit-details';

        const title = document.createElement('span');
        title.className = 'habit-title';
        title.textContent = habit.title;

        const impact = document.createElement('span');
        impact.className = 'habit-impact';
        impact.textContent = `-${habit.impact} kg CO₂e | +${habit.xp} XP`;

        details.appendChild(title);
        details.appendChild(impact);
        label.appendChild(input);
        label.appendChild(custom);
        label.appendChild(details);
        item.appendChild(label);
        
        // Listen to check event
        item.querySelector('.habit-checkbox').addEventListener('change', (e) => {
            handleHabitToggle(e.target.dataset.id, e.target.checked);
        });

        container.appendChild(item);
    });
}

function handleHabitToggle(habitId, isChecked) {
    const habit = HABITS.find(h => h.id === habitId);
    if (!habit) return;

    if (isChecked) {
        if (!state.completedHabits.includes(habitId)) {
            state.completedHabits.push(habitId);
            state.savedCO2 += habit.impact;
            addXp(habit.xp);
            showToast(`Completed! Saved ${habit.impact}kg CO₂ & gained +${habit.xp} XP!`, "check-circle");
        }
    } else {
        const idx = state.completedHabits.indexOf(habitId);
        if (idx > -1) {
            state.completedHabits.splice(idx, 1);
            state.savedCO2 = Math.max(0, state.savedCO2 - habit.impact);
            state.xp = Math.max(0, state.xp - habit.xp);
            showToast(`Reverted habit savings`, "alert-circle");
        }
    }

    saveStateToStorage();
    renderDashboard();
}

// 12. PLEDGES HUB RENDERER
function renderPledgesList() {
    const container = document.getElementById('pledges-list-container');
    container.replaceChildren();

    PLEDGES.forEach(pledge => {
        const isPledged = state.pledgedActions.includes(pledge.id);
        const item = document.createElement('div');
        item.className = 'pledge-item';

        const details = document.createElement('div');
        details.className = 'pledge-details';

        const title = document.createElement('span');
        title.className = 'pledge-title';
        title.textContent = pledge.title;

        const impact = document.createElement('span');
        impact.className = 'pledge-impact';
        impact.textContent = `-${pledge.impact} kg CO₂/yr permanent reduction`;

        details.appendChild(title);
        details.appendChild(impact);

        const button = document.createElement('button');
        button.className = `btn btn-sm ${isPledged ? 'btn-pledged' : 'btn-primary'}`;
        button.type = 'button';
        button.dataset.id = pledge.id;
        if (isPledged) {
            const icon = document.createElement('i');
            icon.setAttribute('data-lucide', 'check');
            button.appendChild(icon);
            button.appendChild(document.createTextNode(' Committed'));
        } else {
            button.textContent = 'Pledge';
        }

        item.appendChild(details);
        item.appendChild(button);

        item.querySelector('button').addEventListener('click', (e) => {
            handlePledgeToggle(pledge.id);
        });

        container.appendChild(item);
    });
    
    initLucide();
}

function handlePledgeToggle(pledgeId) {
    const pledge = PLEDGES.find(p => p.id === pledgeId);
    if (!pledge) return;

    const idx = state.pledgedActions.indexOf(pledgeId);
    if (idx === -1) {
        // Pledge it!
        state.pledgedActions.push(pledgeId);
        
        // Permanent impact recalculation offset
        state.totalEmissions = Math.max(0.1, state.totalEmissions - (pledge.impact / 1000));
        state.savedCO2 += (pledge.impact / 10); // immediate seed savings bonus
        addXp(pledge.xp);
        
        // Plant 2 seed trees as visual reward
        plantRandomTree();
        plantRandomTree();
        
        showToast(`Committed to ${pledge.title}! +${pledge.xp} XP & planted 2 tree seeds!`, "award");
    } else {
        // Unpledge (revert emissions)
        state.pledgedActions.splice(idx, 1);
        state.totalEmissions = state.totalEmissions + (pledge.impact / 1000);
        state.savedCO2 = Math.max(0, state.savedCO2 - (pledge.impact / 10));
        state.xp = Math.max(0, state.xp - pledge.xp);
        showToast("Pledge cancelled", "alert-circle");
    }

    saveStateToStorage();
    renderDashboard();
}

// 13. ACHIEVEMENTS & BADGES
function checkAchievements() {
    // 1. Commute Champion (bike badge)
    if (state.completedHabits.includes('public-transit') || state.pledgedActions.includes('electric-bike')) {
        unlockBadge('badge-commute');
    }
    
    // 2. Green Gourmet (apple badge)
    if (state.inputs.dietStyle === 'vegetarian' || state.inputs.dietStyle === 'vegan') {
        unlockBadge('badge-diet');
    }

    // 3. Watt Saver (zap badge)
    const energyTons = (state.inputs.electricity * 12 * COEFF.electricityKwh) / state.inputs.householdSize / 1000;
    if (energyTons > 0 && energyTons < 2.0) {
        unlockBadge('badge-energy');
    }

    // 4. Forest Guardian (trees badge)
    const treeSavings = state.savedCO2;
    if (treeSavings >= 1000) {
        unlockBadge('badge-offset');
    }

    // 5. Eco Warrior (shield badge)
    if (state.completedHabits.length >= 5) {
        unlockBadge('badge-habits');
    }

    // 6. Minimalist (leaf badge)
    if (state.totalEmissions < 4.0) {
        unlockBadge('badge-carbon');
    }
}

function unlockBadge(badgeId) {
    if (!state.unlockedBadges.includes(badgeId)) {
        state.unlockedBadges.push(badgeId);
        addXp(40); // 40 XP reward
        showToast(`UNLOCKED BADGE: ${document.getElementById(badgeId).dataset.title}! (+40 XP)`, "award");
        saveStateToStorage();
    }
}

function renderBadgesGrid() {
    document.querySelectorAll('.badge-item').forEach(badge => {
        const id = badge.id;
        if (state.unlockedBadges.includes(id)) {
            badge.classList.remove('locked');
        } else {
            badge.classList.add('locked');
        }
    });

    document.getElementById('unlocked-badge-count').innerText = `${state.unlockedBadges.length}/6 Unlocked`;
}

// 14. CONTEXT INSIGHTS GENERATOR
function updateContextInsights() {
    const transportVal = state.emissions.transport;
    const energyVal = state.emissions.energy;
    const dietVal = state.emissions.diet;
    const shoppingVal = state.emissions.shopping;

    const maxVal = Math.max(transportVal, energyVal, dietVal, shoppingVal);
    let insightText = "";

    if (maxVal === 0) {
        insightText = "Calculating emissions profile. Finish onboarding to view environmental insights.";
    } else if (maxVal === transportVal) {
        insightText = "Transportation is your highest carbon source. Commuting via bicycle, carpooling, or taking trains can cut emissions by up to 80% compared to solo driving.";
    } else if (maxVal === energyVal) {
        insightText = "Home energy accounts for the largest share. Consider lowering your thermostat in winter, washing clothes in cold water, or investing in smart insulation.";
    } else if (maxVal === dietVal) {
        insightText = "Dietary choices make up your highest impact. Reducing red meat consumption and switching to local/seasonal produce can instantly trim 1.5 Tons of CO2e per year.";
    } else {
        insightText = "Consumer items and shopping goods are your highest emission driver. Prioritize buying secondhand goods, recycling everything you can, and investing in durable items.";
    }

    document.getElementById('insight-text').innerText = insightText;
}

// 15. XP & LEVELING SYSTEM
function addXp(amount) {
    state.xp += amount;
    let xpThreshold = 100 * state.level;
    
    // Check level up
    while (state.xp >= xpThreshold) {
        state.xp -= xpThreshold;
        state.level++;
        xpThreshold = 100 * state.level;
        showToast(`CONGRATULATIONS! You reached Level ${state.level}!`, "sparkles");
    }
}

// 16. TOAST BANNER NOTIFICATION SYSTEM
function showToast(message, iconName = "sparkles") {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (message.includes("XP")) {
        toast.className = 'toast toast-xp';
    }
    
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    const iconNode = document.createElement('i');
    iconNode.setAttribute('data-lucide', iconName);
    icon.appendChild(iconNode);

    const msg = document.createElement('div');
    msg.className = 'toast-message';
    msg.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(msg);

    container.appendChild(toast);
    initLucide();

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = "toast-enter 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// 17. CANVAS VIRTUAL FOREST VISUALS
let canvas, ctx;
let ripples = [];
let weatherActive = false;
let weatherAlpha = 0;

function initForestCanvas() {
    canvas = document.getElementById('forestCanvas');
    ctx = canvas.getContext('2d');

    // Resize handler
    window.addEventListener('resize', resizeForestCanvas);
    resizeForestCanvas();

    // Populate random trees based on state saving
    updateForestTreeCoordinates();
}

function resizeForestCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    drawForest();
}

// Coordinate sync for trees state
function updateForestTreeCoordinates() {
    const threshold = 50; // 50kg per tree
    const targetCount = Math.floor(state.savedCO2 / threshold);
    
    // If we have fewer trees stored than the threshold count, generate coordinates
    while (state.trees.length < targetCount) {
        plantRandomTree();
    }
}

function plantRandomTree() {
    // Determine random coordinates avoiding edges
    const padX = 40;
    const padY = 50;
    const x = padX + Math.random() * (canvas.width - padX * 2 || 300);
    const y = padY + Math.random() * (canvas.height - padY * 2 || 150);
    
    // Random sizes and green colors
    const scale = 0.5 + Math.random() * 0.6;
    const colors = ['#10B981', '#34D399', '#059669', '#6EE7B7'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Tree types: 0 (Deciduous), 1 (Coniferous)
    const type = Math.random() > 0.5 ? 0 : 1;
    
    state.trees.push({
        x: x,
        y: y,
        scale: scale,
        color: color,
        type: type,
        age: 0.1 // starts small and grows
    });
}

function drawForest() {
    if (!ctx) return;
    
    // Clear background with rich color matching theme
    ctx.fillStyle = '#090e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stylized grass hills
    ctx.fillStyle = '#0b162d';
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height * 1.5, canvas.width * 0.8, canvas.height, 0, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#0f1f3e';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.2, canvas.height * 1.3, canvas.width * 0.5, canvas.height * 0.8, 0, 0, 2 * Math.PI);
    ctx.fill();

    // Sort trees by Y coordinate so trees in front overlap trees in back
    const sortedTrees = [...state.trees].sort((a, b) => a.y - b.y);

    sortedTrees.forEach(tree => {
        // Growth animation (increment age slightly on each render loop)
        if (tree.age < 1.0) {
            tree.age += 0.02;
            if (tree.age > 1.0) tree.age = 1.0;
        }

        drawSingleTree(tree.x, tree.y, tree.scale * tree.age, tree.color, tree.type);
    });

    // Draw click ripples
    ripples.forEach((rip, i) => {
        rip.radius += 1.5;
        rip.alpha -= 0.04;
        if (rip.alpha <= 0) {
            ripples.splice(i, 1);
            return;
        }

        ctx.strokeStyle = `rgba(52, 211, 153, ${rip.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, 2 * Math.PI);
        ctx.stroke();
    });

    // Draw rain if weather active
    if (weatherActive) {
        ctx.strokeStyle = 'rgba(174, 207, 238, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 15; i++) {
            const rx = Math.random() * canvas.width;
            const ry = Math.random() * canvas.height;
            const len = 10 + Math.random() * 20;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx - 2, ry + len);
            ctx.stroke();
        }
    }
}

// Drawing vector assets for trees
function drawSingleTree(x, y, scale, color, type) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Draw Trunk
    ctx.fillStyle = '#78350F'; // Brown
    ctx.fillRect(-4, -15, 8, 15);

    if (type === 0) {
        // Deciduous Tree Leaves (3 fluffy layers)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -22, 18, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = adjustColorBrightness(color, -10);
        ctx.beginPath();
        ctx.arc(-10, -16, 12, 0, 2 * Math.PI);
        ctx.arc(10, -16, 12, 0, 2 * Math.PI);
        ctx.fill();
    } else {
        // Coniferous Pine Tree (Triangle layers)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(-15, -18);
        ctx.lineTo(15, -18);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = adjustColorBrightness(color, -15);
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(-20, -5);
        ctx.lineTo(20, -5);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function adjustColorBrightness(hex, percent) {
    let num = parseInt(hex.replace("#",""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
}

// Animations helpers
function createWaterSplatter(x, y) {
    ripples.push({
        x: x,
        y: y,
        radius: 5,
        alpha: 1.0
    });
    
    // Force redraw loop frame
    animateCanvasLoop();
}

function triggerRainEffect() {
    weatherActive = true;
    setTimeout(() => {
        weatherActive = false;
    }, 3000);
    animateCanvasLoop();
}

// RequestAnimationFrame draw loop utility
let animationFrameId = null;
function animateCanvasLoop() {
    drawForest();
    if (ripples.length > 0 || weatherActive) {
        animationFrameId = requestAnimationFrame(animateCanvasLoop);
    } else {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}
