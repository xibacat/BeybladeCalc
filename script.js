document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const bladeSelect = document.getElementById('blade-select');
    const ratchetSelect = document.getElementById('ratchet-select');
    const bitSelect = document.getElementById('bit-select');

    // Preview Elements
    const bladePreview = document.getElementById('blade-preview');
    const ratchetPreview = document.getElementById('ratchet-preview');
    const bitPreview = document.getElementById('bit-preview');
    const combinationName = document.getElementById('combination-name');

    // Comparison Elements
    const btnCompare = document.getElementById('btn-compare');
    const comparisonSection = document.getElementById('comparison-section');
    const comparisonBody = document.getElementById('comparison-body');

    // View Elements
    const viewTableBtn = document.getElementById('view-table');
    const viewChartBtn = document.getElementById('view-chart');
    const tableView = document.getElementById('table-view');
    const chartView = document.getElementById('chart-view');
    const chartCanvas = document.getElementById('comparison-chart');
    let comparisonChart = null;

    // Chart Colors (Neon Palette)
    const chartColors = [
        { border: 'rgba(0, 255, 186, 1)', bg: 'rgba(0, 255, 186, 0.2)' }, // Green
        { border: 'rgba(0, 210, 255, 1)', bg: 'rgba(0, 210, 255, 0.2)' }, // Blue
        { border: 'rgba(255, 0, 90, 1)', bg: 'rgba(255, 0, 90, 0.2)' },   // Magenta
        { border: 'rgba(255, 204, 0, 1)', bg: 'rgba(255, 204, 0, 0.2)' }, // Yellow
        { border: 'rgba(157, 0, 255, 1)', bg: 'rgba(157, 0, 255, 0.2)' }, // Purple
        { border: 'rgba(255, 100, 0, 1)', bg: 'rgba(255, 100, 0, 0.2)' }  // Orange
    ];

    // Stats Elements
    const statsUI = {
        attack: { val: document.getElementById('val-attack'), bar: document.getElementById('bar-attack') },
        defense: { val: document.getElementById('val-defense'), bar: document.getElementById('bar-defense') },
        endurance: { val: document.getElementById('val-endurance'), bar: document.getElementById('bar-endurance') },
        dash: { val: document.getElementById('val-dash'), bar: document.getElementById('bar-dash') },
        burst_resistance: { val: document.getElementById('val-burst'), bar: document.getElementById('bar-burst') },
        weight: { val: document.getElementById('val-weight') } // No bar for weight
    };

    // State
    let partsData = {
        blades: [],
        ratchets: [],
        bits: []
    };

    let selectedParts = {
        blade: null,
        ratchet: null,
        bit: null
    };

    // Max values for bars (estimated based on potential max sums)
    // Blade ~60, Ratchet ~15, Bit ~45 => Total ~120? Let's verify.
    // Burst Res is high on bits (80).
    const MAX_STATS = {
        attack: 130,
        defense: 130,
        endurance: 130,
        dash: 60,
        burst_resistance: 100
    };

    // Fetch Data
    fetch('assets/Beyblade_parts.json')
        .then(response => response.json())
        .then(data => {
            partsData = data;
            initializeSelects();
        })
        .catch(error => {
            console.error('Error loading parts data:', error);
            alert('Failed to load Beyblade parts data.');
        });

    function initializeSelects() {
        populateSelect(bladeSelect, partsData.blades);
        populateSelect(ratchetSelect, partsData.ratchets);
        populateSelect(bitSelect, partsData.bits);

        // Event Listeners
        bladeSelect.addEventListener('change', (e) => handleSelection('blade', e.target.value));
        ratchetSelect.addEventListener('change', (e) => handleSelection('ratchet', e.target.value));
        bitSelect.addEventListener('change', (e) => handleSelection('bit', e.target.value));

        // Comparison Event Listener
        btnCompare.addEventListener('click', addToComparison);

        // View Toggle Listeners
        viewTableBtn.addEventListener('click', () => toggleView('table'));
        viewChartBtn.addEventListener('click', () => toggleView('chart'));

        initializeChart();
    }

    function populateSelect(selectElement, items) {
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            selectElement.appendChild(option);
        });
    }

    function handleSelection(type, id) {
        // If no valid ID (empty selection), clear the part
        if (!id || id === '') {
            selectedParts[type] = null;
            updatePreview(type, null);
            updateCombinationName();
            calculateTotalStats();
            return;
        }

        // Find the full object from the ID
        // Note: The ID in value is string, but in data might be number. Comparison needs to be loose or parsed.
        const idNum = parseInt(id);
        let collection = [];
        if (type === 'blade') collection = partsData.blades;
        if (type === 'ratchet') collection = partsData.ratchets;
        if (type === 'bit') collection = partsData.bits;

        const part = collection.find(p => p.id === idNum);
        selectedParts[type] = part;

        updatePreview(type, part);
        updateCombinationName();
        calculateTotalStats();
    }

    function updatePreview(type, part) {
        let previewEl, imageEl;
        if (type === 'blade') {
            previewEl = bladePreview;
            imageEl = document.getElementById('blade-image');
        }
        if (type === 'ratchet') {
            previewEl = ratchetPreview;
            imageEl = document.getElementById('ratchet-image');
        }
        if (type === 'bit') {
            previewEl = bitPreview;
            imageEl = document.getElementById('bit-image');
        }

        if (part) {
            // Update image
            if (part.image && imageEl) {
                imageEl.src = part.image;
                imageEl.alt = part.name;
                imageEl.style.display = 'block';
            } else if (imageEl) {
                imageEl.style.display = 'none';
            }

            // Update text info
            const partInfo = previewEl.querySelector('.part-info');
            partInfo.innerHTML = `
                <div class="part-info-name">${part.name}</div>
                <div class="part-info-desc">${part.description || part.type || ''}</div>
            `;
        } else {
            // Hide image
            if (imageEl) {
                imageEl.style.display = 'none';
            }

            const partInfo = previewEl.querySelector('.part-info');
            partInfo.innerHTML = `<span class="placeholder-text">No ${type.charAt(0).toUpperCase() + type.slice(1)} Selected</span>`;
        }
    }

    function updateCombinationName() {
        const { blade, ratchet, bit } = selectedParts;

        if (blade && ratchet && bit) {
            // Extract the letter from the bit name (e.g., "F" from "F (Flat)")
            const bitLetter = bit.name.split(' ')[0];
            const combinationText = `${blade.name} ${ratchet.name}${bitLetter}`;
            combinationName.textContent = combinationText.toUpperCase();

            // Enable compare button
            btnCompare.disabled = false;
        } else {
            combinationName.textContent = 'COMBINATION STATS';
            // Disable compare button
            btnCompare.disabled = true;
        }
    }

    function calculateTotalStats() {
        // Initialize totals
        let totals = {
            attack: 0,
            defense: 0,
            endurance: 0,
            dash: 0,
            burst_resistance: 0,
            weight: 0
        };

        // Sum up stats from all selected parts
        Object.values(selectedParts).forEach(part => {
            if (part) {
                // Add Weight
                if (part.weight) totals.weight += part.weight;

                // Add Stats
                if (part.stats) {
                    totals.attack += part.stats.attack || 0;
                    totals.defense += part.stats.defense || 0;
                    totals.endurance += part.stats.endurance || 0;
                    totals.dash += part.stats.dash || 0;
                    totals.burst_resistance += part.stats.burst_resistance || 0;
                }
            }
        });

        updateStatsUI(totals);
    }

    function updateStatsUI(totals) {
        // Update Numbers
        statsUI.attack.val.textContent = totals.attack;
        statsUI.defense.val.textContent = totals.defense;
        statsUI.endurance.val.textContent = totals.endurance;
        statsUI.dash.val.textContent = totals.dash;
        statsUI.burst_resistance.val.textContent = totals.burst_resistance;
        statsUI.weight.val.textContent = totals.weight.toFixed(1) + 'g';

        // Update Bars
        updateBar(statsUI.attack.bar, totals.attack, MAX_STATS.attack);
        updateBar(statsUI.defense.bar, totals.defense, MAX_STATS.defense);
        updateBar(statsUI.endurance.bar, totals.endurance, MAX_STATS.endurance);
        updateBar(statsUI.dash.bar, totals.dash, MAX_STATS.dash);
        updateBar(statsUI.burst_resistance.bar, totals.burst_resistance, MAX_STATS.burst_resistance);
    }

    function updateBar(element, value, max) {
        const percentage = Math.min((value / max) * 100, 100);
        element.style.width = `${percentage}%`;
    }

    function addToComparison() {
        // Get current data
        const name = combinationName.textContent;
        const currentStats = {
            attack: parseInt(statsUI.attack.val.textContent),
            defense: parseInt(statsUI.defense.val.textContent),
            endurance: parseInt(statsUI.endurance.val.textContent),
            dash: parseInt(statsUI.dash.val.textContent),
            burst_resistance: parseInt(statsUI.burst_resistance.val.textContent),
            weight: statsUI.weight.val.textContent
        };

        // 1. Add to Table
        // Create Row
        const rowId = 'row-' + Date.now();
        const row = document.createElement('tr');
        row.setAttribute('data-id', rowId);
        row.innerHTML = `
            <td>${name}</td>
            <td>${currentStats.attack}</td>
            <td>${currentStats.defense}</td>
            <td>${currentStats.endurance}</td>
            <td>${currentStats.dash}</td>
            <td>${currentStats.burst_resistance}</td>
            <td>${currentStats.weight}</td>
            <td><button class="delete-btn" title="Remove">X</button></td>
        `;

        // Add delete functionality
        row.querySelector('.delete-btn').addEventListener('click', () => {
            // Remove from table
            row.remove();

            // Remove from chart
            removeDataFromChart(rowId);

            if (comparisonBody.children.length === 0) {
                comparisonSection.style.display = 'none';
            }
        });

        // Add to table
        comparisonBody.appendChild(row);

        // 2. Add to Chart
        addDataToChart(name, currentStats, rowId);

        // Show section if hidden
        comparisonSection.style.display = 'block';
    }

    // Chart Functions
    function initializeChart() {
        Chart.defaults.color = '#888';
        Chart.defaults.borderColor = '#333';

        comparisonChart = new Chart(chartCanvas, {
            type: 'radar',
            data: {
                labels: ['Attack', 'Defense', 'Endurance', 'Dash', 'Burst Res.'],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: {
                            color: '#333'
                        },
                        grid: {
                            color: '#333'
                        },
                        pointLabels: {
                            color: '#fff',
                            font: {
                                family: 'Orbitron',
                                size: 12
                            }
                        },
                        ticks: {
                            display: false, // Hide numeric ticks for cleaner look
                            maxTicksLimit: 5
                        },
                        suggestedMin: 0,
                        suggestedMax: 100 // Scale roughly 0-100
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#fff',
                            font: {
                                family: 'Rajdhani'
                            }
                        }
                    }
                }
            }
        });
    }

    function addDataToChart(name, stats, id) {
        // Pick color based on current dataset length
        const colorIndex = comparisonChart.data.datasets.length % chartColors.length;
        const color = chartColors[colorIndex];

        const newDataset = {
            label: name,
            data: [
                stats.attack,
                stats.defense,
                stats.endurance,
                stats.dash,
                stats.burst_resistance
                // Weight excluded as requested
            ],
            fill: true,
            backgroundColor: color.bg,
            borderColor: color.border,
            pointBackgroundColor: color.border,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: color.border,
            borderWidth: 2,
            _rowId: id // Custom property to link with table row
        };

        comparisonChart.data.datasets.push(newDataset);
        comparisonChart.update();
    }

    function removeDataFromChart(id) {
        comparisonChart.data.datasets = comparisonChart.data.datasets.filter(ds => ds._rowId !== id);
        comparisonChart.update();
    }

    function toggleView(view) {
        if (view === 'table') {
            tableView.style.display = 'block';
            chartView.style.display = 'none';
            viewTableBtn.classList.add('active');
            viewChartBtn.classList.remove('active');
        } else {
            tableView.style.display = 'none';
            chartView.style.display = 'block';
            viewChartBtn.classList.add('active');
            viewTableBtn.classList.remove('active');
        }
    }
});
