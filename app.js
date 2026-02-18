/**
 * Danish Energy Prices Widget
 * Fetches electricity prices from Energi Data Service API
 * and displays fuel, gas, and water prices
 */

// Configuration
const CONFIG = {
    ELECTRICITY_API_BASE: 'https://api.energidataservice.dk/dataset',
    FUEL_API_BASE: 'https://mobility-prices.ok.dk/api/v1/fuel-prices',
    OK_FACILITY_NUMBER: 27, // Selected OK station
    DATASET_NEW: 'DayAheadPrices', // For data after 2025-10-01
    DATASET_OLD: 'Elspotprices',   // For historical data before 2025-10-01
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
    MWH_TO_KWH: 1000, // Convert MWh to kWh
    VAT: 1.25, // 25% VAT in Denmark
    
    // Fixed fees (DKK/kWh without VAT) - 2025/2026 rates
    FIXED_FEES: {
        transmission: 0.049,  // Energinet transmission tariff
        system: 0.054,        // System tariff
        elafgift: 0.00872,    // Electricity tax (reduced rate)
    },
    
    // Distribution tariffs (nettarif) by grid company (DKK/kWh without VAT)
    // Winter tariffs (Oct-Mar) - 2025/2026
    GRID_TARIFFS: {
        DK1: {
            // West Denmark - N1/Konstant/Norlys
            LOW: 0.1536,      // Night (00-06)
            MEDIUM: 0.4098,   // Shoulder (06-17, 21-00)
            HIGH: 0.9821,     // Peak (17-21)
        },
        DK2: {
            // East Denmark - Radius (Copenhagen area)
            LOW: 0.1863,      // Night (00-06)
            MEDIUM: 0.5477,   // Shoulder (06-17, 21-00) 
            HIGH: 1.3520,     // Peak (17-21)
        }
    },
    
    // Static prices (water, gas, fjernvarme don't have real-time APIs)
    // These can be auto-updated via config/prices.json
    STATIC_PRICES: {
        // Novafos water prices 2026 (DKK/m³ including VAT)
        water: 56.25, // Drikkevand + spildevand + afgifter
        // Evida/Andel gas price (DKK/m³)
        gas: 8.95,
        // Egedal Fjernvarme 2026 (DKK/MWh)
        fjernvarme: 485.00,
    },
    
    // Config file URL for auto-updated prices
    PRICES_CONFIG_URL: './config/prices.json',
};

// State
let state = {
    region: 'DK2', // Default to DK2 (East Denmark/Copenhagen)
    currentPrices: null,
    todayPrices: [],
    tomorrowPrices: [],
    historicalPrices: [],
    lastUpdated: null,
    chart: null,
    historyChart: null,
};

// DOM Elements
const elements = {
    loadingOverlay: document.getElementById('loading-overlay'),
    elecPrice: document.getElementById('elec-price'),
    spotPrice: document.getElementById('spot-price'),
    gridCost: document.getElementById('grid-cost'),
    elecMin: document.getElementById('elec-min'),
    elecMax: document.getElementById('elec-max'),
    elecAvg: document.getElementById('elec-avg'),
    elecTrend: document.getElementById('elec-trend'),
    benzinPrice: document.getElementById('benzin-price'),
    dieselPrice: document.getElementById('diesel-price'),
    gasPrice: document.getElementById('gas-price'),
    waterPrice: document.getElementById('water-price'),
    fjernvarmePrice: document.getElementById('fjernvarme-price'),
    lastUpdatedText: document.getElementById('last-updated-text'),
    refreshBtn: document.getElementById('refresh-btn'),
    dk1Btn: document.getElementById('dk1-btn'),
    dk2Btn: document.getElementById('dk2-btn'),
    forecastAlert: document.getElementById('forecast-alert'),
    forecastText: document.getElementById('forecast-text'),
    bestHoursList: document.getElementById('best-hours-list'),
    worstHoursList: document.getElementById('worst-hours-list'),
    priceChart: document.getElementById('priceChart'),
    historyChart: document.getElementById('historyChart'),
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Load cached data if available
    loadFromCache();
    
    // Set up event listeners
    setupEventListeners();
    
    // Fetch fresh data
    await refreshAllData();
    
    // Set up auto-refresh
    setInterval(refreshAllData, CONFIG.REFRESH_INTERVAL);
    
    // Register service worker
    registerServiceWorker();
}

function setupEventListeners() {
    // Region buttons
    elements.dk1Btn.addEventListener('click', () => switchRegion('DK1'));
    elements.dk2Btn.addEventListener('click', () => switchRegion('DK2'));
    
    // Refresh button
    elements.refreshBtn.addEventListener('click', refreshAllData);
    
    // Chart period tabs
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            updateChart(e.target.dataset.period);
        });
    });
}

function switchRegion(region) {
    state.region = region;
    
    // Update button states
    elements.dk1Btn.classList.toggle('active', region === 'DK1');
    elements.dk2Btn.classList.toggle('active', region === 'DK2');
    
    // Update displays
    updateElectricityDisplay();
    updateChart('today');
    updateForecast();
    
    // Save preference
    localStorage.setItem('preferredRegion', region);
}

async function refreshAllData() {
    showLoading(true);
    
    try {
        // Use allSettled to ensure all fetches complete even if some fail
        await Promise.allSettled([
            fetchElectricityPrices(),
            fetchFuelPrices(),
        ]);
        
        // Always update displays even if some data failed to load
        updateAllDisplays();
        saveToCache();
        
        state.lastUpdated = new Date();
        updateLastUpdatedText();
    } catch (error) {
        console.error('Failed to refresh data:', error);
        // Still try to update displays with whatever data we have
        updateAllDisplays();
    } finally {
        showLoading(false);
    }
}

/**
 * Fetch electricity prices from Energi Data Service
 */
async function fetchElectricityPrices() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(todayStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);
    
    // Fetch today and tomorrow prices
    let url = `${CONFIG.ELECTRICITY_API_BASE}/${CONFIG.DATASET_NEW}?` +
        `start=${formatDateParam(todayStart)}&` +
        `end=${formatDateParam(tomorrowEnd)}&` +
        `filter={"PriceArea":["${state.region}"]}&` +
        `sort=TimeUTC asc&` +
        `limit=0`;
    
    try {
        let response = await fetch(url);
        if (!response.ok) throw new Error('API request failed');
        
        let data = await response.json();
        
        // If no data for today, fetch latest available
        if (!data.records || data.records.length === 0) {
            url = `${CONFIG.ELECTRICITY_API_BASE}/${CONFIG.DATASET_NEW}?` +
                `filter={"PriceArea":["${state.region}"]}&` +
                `sort=TimeUTC desc&limit=48`;
            response = await fetch(url);
            data = await response.json();
            if (data.records?.length) {
                data.records.reverse();
            }
        }
        
        if (data.records && data.records.length > 0) {
            processPriceData(data.records);
        } else {
            // Fallback to legacy dataset
            await fetchElectricityPricesLegacy();
        }
    } catch (error) {
        console.error('Failed to fetch electricity prices:', error);
        // Try fallback to old dataset
        await fetchElectricityPricesLegacy();
    }
    
    // Also fetch historical data for trends
    await fetchHistoricalPrices();
}

async function fetchElectricityPricesLegacy() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(todayStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);
    
    const url = `${CONFIG.ELECTRICITY_API_BASE}/${CONFIG.DATASET_OLD}?` +
        `start=${formatDateParam(todayStart)}&` +
        `end=${formatDateParam(tomorrowEnd)}&` +
        `filter={"PriceArea":["${state.region}"]}&` +
        `sort=HourUTC asc&` +
        `limit=0`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.json();
        
        if (data.records && data.records.length > 0) {
            processPriceDataLegacy(data.records);
        }
    } catch (error) {
        console.error('Failed to fetch legacy electricity prices:', error);
    }
}

async function fetchHistoricalPrices() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    
    const url = `${CONFIG.ELECTRICITY_API_BASE}/${CONFIG.DATASET_NEW}?` +
        `start=${formatDateParam(start)}&` +
        `end=${formatDateParam(end)}&` +
        `filter={"PriceArea":["${state.region}"]}&` +
        `sort=TimeUTC asc&` +
        `limit=0`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.records && data.records.length > 0) {
            state.historicalPrices = data.records.map(record => {
                const time = new Date(record.TimeUTC || record.TimeDK);
                const spotPrice = record.DayAheadPriceDKK / CONFIG.MWH_TO_KWH;
                const gridCost = getGridCost(time, state.region);
                return {
                    time: time,
                    spotPriceDKK: spotPrice,
                    gridCost: gridCost,
                    priceDKK: spotPrice + gridCost,
                    priceEUR: record.DayAheadPriceEUR / CONFIG.MWH_TO_KWH,
                };
            });
        }
    } catch (error) {
        console.error('Failed to fetch historical prices:', error);
    }
}

/**
 * Get all fees (grid tariff + fixed fees) based on time of day and region
 * Returns object with breakdown for display
 */
function getGridCost(time, region) {
    const hour = time.getHours();
    const tariffs = CONFIG.GRID_TARIFFS[region] || CONFIG.GRID_TARIFFS.DK2;
    const fixed = CONFIG.FIXED_FEES;
    
    // Get distribution tariff based on time of day
    let distributionTariff;
    if (hour >= 0 && hour < 6) {
        distributionTariff = tariffs.LOW;      // Night: 00-06
    } else if (hour >= 17 && hour < 21) {
        distributionTariff = tariffs.HIGH;     // Peak: 17-21
    } else {
        distributionTariff = tariffs.MEDIUM;   // Shoulder: 06-17, 21-00
    }
    
    // Total fees before VAT
    const feesBeforeVAT = distributionTariff + fixed.transmission + fixed.system + fixed.elafgift;
    
    // Return total fees including VAT
    return feesBeforeVAT * CONFIG.VAT;
}

/**
 * Calculate total price with all components
 */
function calculateTotalPrice(spotPriceBeforeVAT, time, region) {
    const tariffs = CONFIG.GRID_TARIFFS[region] || CONFIG.GRID_TARIFFS.DK2;
    const fixed = CONFIG.FIXED_FEES;
    const hour = time.getHours();
    
    // Get distribution tariff based on time
    let distributionTariff;
    if (hour >= 0 && hour < 6) {
        distributionTariff = tariffs.LOW;
    } else if (hour >= 17 && hour < 21) {
        distributionTariff = tariffs.HIGH;
    } else {
        distributionTariff = tariffs.MEDIUM;
    }
    
    // Total before VAT
    const totalBeforeVAT = spotPriceBeforeVAT + distributionTariff + fixed.transmission + fixed.system + fixed.elafgift;
    
    // Total with 25% VAT
    return totalBeforeVAT * CONFIG.VAT;
}

function processPriceData(records) {
    const now = new Date();
    
    const allPrices = records.map(record => {
        const time = new Date(record.TimeUTC || record.TimeDK);
        const spotPriceBeforeVAT = record.DayAheadPriceDKK / CONFIG.MWH_TO_KWH; // Raw spot price (no VAT)
        const totalPrice = calculateTotalPrice(spotPriceBeforeVAT, time, state.region);
        const gridCost = getGridCost(time, state.region);
        const spotPriceWithVAT = spotPriceBeforeVAT * CONFIG.VAT;
        
        return {
            time: time,
            spotPriceDKK: spotPriceWithVAT,  // Spot price with VAT for display
            gridCost: gridCost,              // All fees with VAT for display
            priceDKK: totalPrice,            // Total price with all fees and VAT
            priceEUR: record.DayAheadPriceEUR / CONFIG.MWH_TO_KWH,
        };
    });
    
    // Use the data we have - take latest 24 and next 24 hours
    // This handles both current data and fallback historical data
    state.todayPrices = allPrices.slice(0, 24);
    state.tomorrowPrices = allPrices.slice(24, 48);
    
    // Get current price (closest to now, or latest if showing historical)
    const currentPriceEntry = allPrices.find(p => {
        const pTime = p.time.getTime();
        const nowTime = now.getTime();
        return pTime <= nowTime && (pTime + 15 * 60 * 1000) > nowTime;
    }) || allPrices[allPrices.length - 1] || allPrices[0];
    
    if (currentPriceEntry) {
        state.currentPrices = {
            ...(state.currentPrices || {}),
            electricity: currentPriceEntry.priceDKK,
            spotPrice: currentPriceEntry.spotPriceDKK,
            gridCost: currentPriceEntry.gridCost,
            electricityEUR: currentPriceEntry.priceEUR,
        };
    }
}

function processPriceDataLegacy(records) {
    const now = new Date();
    
    const allPrices = records.map(record => {
        const time = new Date(record.HourUTC || record.HourDK);
        const spotPriceBeforeVAT = record.SpotPriceDKK / CONFIG.MWH_TO_KWH;
        const totalPrice = calculateTotalPrice(spotPriceBeforeVAT, time, state.region);
        const gridCost = getGridCost(time, state.region);
        const spotPriceWithVAT = spotPriceBeforeVAT * CONFIG.VAT;
        
        return {
            time: time,
            spotPriceDKK: spotPriceWithVAT,
            gridCost: gridCost,
            priceDKK: totalPrice,
            priceEUR: record.SpotPriceEUR / CONFIG.MWH_TO_KWH,
        };
    });
    
    // Use the data we have - take latest 24 and next 24 hours
    state.todayPrices = allPrices.slice(0, 24);
    state.tomorrowPrices = allPrices.slice(24, 48);
    
    const currentPriceEntry = allPrices.find(p => {
        const pTime = p.time.getTime();
        const nowTime = now.getTime();
        return pTime <= nowTime && (pTime + 60 * 60 * 1000) > nowTime;
    }) || allPrices[allPrices.length - 1] || allPrices[0];
    
    if (currentPriceEntry) {
        state.currentPrices = {
            ...(state.currentPrices || {}),
            electricity: currentPriceEntry.priceDKK,
            spotPrice: currentPriceEntry.spotPriceDKK,
            gridCost: currentPriceEntry.gridCost,
            electricityEUR: currentPriceEntry.priceEUR,
        };
    }
}

/**
 * Fetch fuel prices from OK API
 * Uses facility_number 27 as specified
 */
async function fetchFuelPrices() {
    // Initialize currentPrices if null
    if (!state.currentPrices) {
        state.currentPrices = {};
    }
    
    // Try to load prices from config file (auto-updated via GitHub Actions)
    try {
        const configResponse = await fetch(CONFIG.PRICES_CONFIG_URL);
        if (configResponse.ok) {
            const configData = await configResponse.json();
            
            // Load fjernvarme price
            if (configData.fjernvarme?.egedal?.prices?.variablePris) {
                state.currentPrices.fjernvarme = configData.fjernvarme.egedal.prices.variablePris;
            }
            
            // Load gas price
            if (configData.gas?.evida?.price) {
                state.currentPrices.gas = configData.gas.evida.price;
            }
            
            // Load water price
            if (configData.water?.novafos?.price) {
                state.currentPrices.water = configData.water.novafos.price;
            }
            
            console.log('Loaded prices from config:', configData.lastUpdated);
        }
    } catch (error) {
        console.log('Config file not available, using defaults');
    }
    
    // Set static prices as fallback (if not loaded from config)
    if (!state.currentPrices.gas) state.currentPrices.gas = CONFIG.STATIC_PRICES.gas;
    if (!state.currentPrices.water) state.currentPrices.water = CONFIG.STATIC_PRICES.water;
    if (!state.currentPrices.fjernvarme) state.currentPrices.fjernvarme = CONFIG.STATIC_PRICES.fjernvarme;
    
    console.log('Static prices set:', { 
        gas: state.currentPrices.gas, 
        water: state.currentPrices.water,
        fjernvarme: state.currentPrices.fjernvarme 
    });
    
    // Fetch fuel prices from OK API (with CORS proxy fallback)
    try {
        let data;
        try {
            const response = await fetch(CONFIG.FUEL_API_BASE);
            if (!response.ok) throw new Error('Direct fetch failed');
            data = await response.json();
        } catch (directError) {
            console.log('Direct OK API failed, trying CORS proxy...', directError.message);
            const proxyUrl = 'https://corsproxy.io/?url=' + encodeURIComponent(CONFIG.FUEL_API_BASE);
            const proxyResponse = await fetch(proxyUrl);
            if (!proxyResponse.ok) throw new Error('Proxy fetch also failed');
            data = await proxyResponse.json();
        }
        
        // Find facility 27 or use first available
        const facility = data.items?.find(f => f.facility_number === CONFIG.OK_FACILITY_NUMBER) 
                       || data.items?.[0];
        
        if (facility && facility.prices) {
            // Extract benzin (Blyfri 95) and diesel prices
            const benzin = facility.prices.find(p => p.product_name === 'Blyfri 95');
            const diesel = facility.prices.find(p => p.product_name === 'Svovlfri Diesel');
            
            if (benzin) {
                state.currentPrices.benzin = benzin.price;
            }
            if (diesel) {
                state.currentPrices.diesel = diesel.price;
            }
            
            console.log(`Fuel prices from OK facility ${facility.facility_number} (${facility.city})`);
        }
    } catch (error) {
        console.error('Failed to fetch OK fuel prices:', error);
        // Fallback to sample prices
        state.currentPrices = {
            ...(state.currentPrices || {}),
            benzin: 13.39,  // Fallback based on typical prices
            diesel: 12.69,
        };
    }
}

function formatDateParam(date) {
    return date.toISOString().split('T')[0];
}

function updateAllDisplays() {
    updateElectricityDisplay();
    updateFuelDisplay();
    updateChart('today');
    updateHistoryChart();
    updateForecast();
}

function updateElectricityDisplay() {
    if (!state.currentPrices || !state.currentPrices.electricity) return;
    
    const price = state.currentPrices.electricity;
    const spotPrice = state.currentPrices.spotPrice || price;
    const gridCost = state.currentPrices.gridCost || 0;
    
    elements.elecPrice.textContent = price.toFixed(2);
    elements.elecPrice.className = 'price-value ' + getPriceClass(price);
    
    // Update breakdown display
    if (elements.spotPrice) {
        elements.spotPrice.textContent = spotPrice.toFixed(2);
    }
    if (elements.gridCost) {
        elements.gridCost.textContent = gridCost.toFixed(2);
    }
    
    // Calculate min, max, avg for today (using total price)
    if (state.todayPrices.length > 0) {
        const prices = state.todayPrices.map(p => p.priceDKK);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        elements.elecMin.textContent = min.toFixed(2);
        elements.elecMin.className = 'detail-value ' + getPriceClass(min);
        
        elements.elecMax.textContent = max.toFixed(2);
        elements.elecMax.className = 'detail-value ' + getPriceClass(max);
        
        elements.elecAvg.textContent = avg.toFixed(2);
        elements.elecAvg.className = 'detail-value ' + getPriceClass(avg);
    }
    
    // Update trend indicator
    updatePriceTrend();
}

function updateFuelDisplay() {
    if (!state.currentPrices) return;
    
    if (state.currentPrices.benzin) {
        elements.benzinPrice.textContent = state.currentPrices.benzin.toFixed(2);
    }
    if (state.currentPrices.diesel) {
        elements.dieselPrice.textContent = state.currentPrices.diesel.toFixed(2);
    }
    if (state.currentPrices.gas) {
        elements.gasPrice.textContent = state.currentPrices.gas.toFixed(2);
    }
    if (state.currentPrices.water) {
        elements.waterPrice.textContent = state.currentPrices.water.toFixed(2);
    }
    if (state.currentPrices.fjernvarme && elements.fjernvarmePrice) {
        elements.fjernvarmePrice.textContent = state.currentPrices.fjernvarme.toFixed(0);
    }
}

function updatePriceTrend() {
    const prices = state.todayPrices;
    if (prices.length < 2) return;
    
    const now = new Date();
    const currentIdx = prices.findIndex(p => p.time.getTime() > now.getTime()) - 1;
    
    if (currentIdx < 0 || currentIdx >= prices.length - 1) {
        elements.elecTrend.className = 'price-trend stable';
        return;
    }
    
    const currentPrice = prices[currentIdx].priceDKK;
    const nextPrice = prices[currentIdx + 1].priceDKK;
    
    if (nextPrice > currentPrice * 1.1) {
        elements.elecTrend.className = 'price-trend up';
    } else if (nextPrice < currentPrice * 0.9) {
        elements.elecTrend.className = 'price-trend down';
    } else {
        elements.elecTrend.className = 'price-trend stable';
    }
}

function getPriceClass(price) {
    if (price < 1.5) return 'price-cheap';
    if (price < 3) return 'price-moderate';
    return 'price-expensive';
}

function getPriceColor(price) {
    if (price < 1.5) return 'rgba(6, 214, 160, 0.8)';  // Green
    if (price < 3) return 'rgba(255, 209, 102, 0.8)';   // Yellow
    return 'rgba(239, 71, 111, 0.8)';                   // Red
}

function updateChart(period) {
    const ctx = elements.priceChart.getContext('2d');
    
    let chartData;
    let labels;
    
    if (period === 'today') {
        chartData = state.todayPrices;
    } else if (period === 'tomorrow') {
        chartData = state.tomorrowPrices.length > 0 ? state.tomorrowPrices : state.todayPrices;
    } else if (period === 'week') {
        chartData = state.historicalPrices;
    }
    
    if (!chartData || chartData.length === 0) {
        return;
    }
    
    // Aggregate data for week view
    if (period === 'week') {
        chartData = aggregateByHour(chartData);
    }
    
    labels = chartData.map(p => formatTimeLabel(p.time, period));
    
    // Extract spot prices and grid costs for stacked chart
    const spotPrices = chartData.map(p => p.spotPriceDKK || p.priceDKK);
    const gridCosts = chartData.map(p => p.gridCost || 0);
    
    // Get colors based on total price
    const spotColors = chartData.map(p => {
        const total = p.priceDKK || (p.spotPriceDKK + p.gridCost);
        if (total < 1.5) return 'rgba(6, 214, 160, 0.85)';  // Green
        if (total < 3) return 'rgba(255, 209, 102, 0.85)';   // Yellow
        return 'rgba(239, 71, 111, 0.85)';                   // Red
    });
    
    if (state.chart) {
        state.chart.destroy();
    }
    
    state.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Spot Price',
                    data: spotPrices,
                    backgroundColor: spotColors,
                    borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
                    borderSkipped: false,
                    stack: 'stack0',
                },
                {
                    label: 'Grid Cost (Net)',
                    data: gridCosts,
                    backgroundColor: 'rgba(100, 100, 120, 0.7)',
                    borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
                    borderSkipped: false,
                    stack: 'stack0',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#a0a0a0',
                        usePointStyle: true,
                        padding: 10,
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const idx = context[0].dataIndex;
                            const spot = spotPrices[idx];
                            const grid = gridCosts[idx];
                            const total = spot + grid;
                            return `\nTotal: ${total.toFixed(2)} DKK/kWh`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: '#a0a0a0',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: period === 'week' ? 7 : 12,
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                    },
                    ticks: {
                        color: '#a0a0a0',
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    }
                }
            }
        }
    });
}

function updateHistoryChart() {
    const ctx = elements.historyChart.getContext('2d');
    
    if (!state.historicalPrices || state.historicalPrices.length === 0) return;
    
    // Aggregate by day
    const dailyData = aggregateByDay(state.historicalPrices);
    
    const labels = dailyData.map(d => d.label);
    const avgPrices = dailyData.map(d => d.avgPrice);
    const minPrices = dailyData.map(d => d.minPrice);
    const maxPrices = dailyData.map(d => d.maxPrice);
    
    if (state.historyChart) {
        state.historyChart.destroy();
    }
    
    state.historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Average',
                    data: avgPrices,
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    fill: true,
                    tension: 0.4,
                },
                {
                    label: 'Min',
                    data: minPrices,
                    borderColor: '#06d6a0',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                },
                {
                    label: 'Max',
                    data: maxPrices,
                    borderColor: '#ef476f',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#a0a0a0',
                        usePointStyle: true,
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: '#a0a0a0',
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                    },
                    ticks: {
                        color: '#a0a0a0',
                        callback: (value) => value.toFixed(1)
                    }
                }
            }
        }
    });
}

function aggregateByHour(data) {
    // Sample every 4 data points for cleaner display
    return data.filter((_, i) => i % 4 === 0);
}

function aggregateByDay(data) {
    const days = {};
    
    data.forEach(entry => {
        const date = entry.time.toISOString().split('T')[0];
        if (!days[date]) {
            days[date] = { prices: [] };
        }
        days[date].prices.push(entry.priceDKK);
    });
    
    return Object.entries(days).map(([date, { prices }]) => ({
        label: new Date(date).toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric' }),
        avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
    }));
}

function formatTimeLabel(time, period) {
    if (period === 'week') {
        return time.toLocaleDateString('da-DK', { weekday: 'short', hour: '2-digit' });
    }
    return time.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}

function updateForecast() {
    const prices = [...state.todayPrices, ...state.tomorrowPrices];
    
    if (prices.length === 0) {
        elements.forecastText.textContent = 'Unable to load forecast data';
        return;
    }
    
    // Find best and worst hours
    const sortedPrices = [...prices].sort((a, b) => a.priceDKK - b.priceDKK);
    const bestHours = sortedPrices.slice(0, 5);
    const worstHours = sortedPrices.slice(-5).reverse();
    
    // Update best hours display
    elements.bestHoursList.innerHTML = bestHours.map(h => `
        <span class="hour-badge cheap">
            ${h.time.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })} 
            (${h.priceDKK.toFixed(2)})
        </span>
    `).join('');
    
    // Update worst hours display
    elements.worstHoursList.innerHTML = worstHours.map(h => `
        <span class="hour-badge expensive">
            ${h.time.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
            (${h.priceDKK.toFixed(2)})
        </span>
    `).join('');
    
    // Generate forecast message
    const now = new Date();
    const upcomingPrices = prices.filter(p => p.time > now).slice(0, 8);
    
    if (upcomingPrices.length < 2) {
        elements.forecastText.textContent = 'Waiting for tomorrow\'s prices...';
        elements.forecastAlert.className = 'forecast-alert';
        return;
    }
    
    const currentPrice = state.currentPrices?.electricity || 0;
    const nextPrices = upcomingPrices.map(p => p.priceDKK);
    const avgNext = nextPrices.reduce((a, b) => a + b, 0) / nextPrices.length;
    
    const trend = avgNext > currentPrice * 1.1 ? 'rising' : 
                  avgNext < currentPrice * 0.9 ? 'falling' : 'stable';
    
    let message = '';
    if (trend === 'rising') {
        message = `⚠️ Prices are expected to INCREASE in the next few hours. Current: ${currentPrice.toFixed(2)} DKK → Average upcoming: ${avgNext.toFixed(2)} DKK. Consider running high-consumption appliances now!`;
        elements.forecastAlert.className = 'forecast-alert rising';
    } else if (trend === 'falling') {
        message = `✅ Good news! Prices are expected to DECREASE. Current: ${currentPrice.toFixed(2)} DKK → Average upcoming: ${avgNext.toFixed(2)} DKK. Wait a bit for lower prices!`;
        elements.forecastAlert.className = 'forecast-alert falling';
    } else {
        message = `ℹ️ Prices are stable. Current: ${currentPrice.toFixed(2)} DKK → Average upcoming: ${avgNext.toFixed(2)} DKK.`;
        elements.forecastAlert.className = 'forecast-alert';
    }
    
    elements.forecastText.textContent = message;
}

function updateLastUpdatedText() {
    if (state.lastUpdated) {
        const timeStr = state.lastUpdated.toLocaleTimeString('da-DK', {
            hour: '2-digit',
            minute: '2-digit'
        });
        elements.lastUpdatedText.textContent = `Updated: ${timeStr}`;
    }
}

function showLoading(show) {
    if (show) {
        elements.loadingOverlay.classList.remove('hidden');
    } else {
        elements.loadingOverlay.classList.add('hidden');
    }
}

// Cache management
function saveToCache() {
    const cacheData = {
        state: {
            region: state.region,
            currentPrices: state.currentPrices,
            todayPrices: state.todayPrices,
            tomorrowPrices: state.tomorrowPrices,
            historicalPrices: state.historicalPrices,
        },
        timestamp: Date.now(),
    };
    localStorage.setItem('energyPricesCache', JSON.stringify(cacheData));
}

function loadFromCache() {
    try {
        const cached = localStorage.getItem('energyPricesCache');
        if (cached) {
            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;
            
            if (age < CONFIG.CACHE_DURATION) {
                state.region = cacheData.state.region || 'DK2';
                state.currentPrices = cacheData.state.currentPrices;
                state.todayPrices = (cacheData.state.todayPrices || []).map(p => ({
                    ...p,
                    time: new Date(p.time)
                }));
                state.tomorrowPrices = (cacheData.state.tomorrowPrices || []).map(p => ({
                    ...p,
                    time: new Date(p.time)
                }));
                state.historicalPrices = (cacheData.state.historicalPrices || []).map(p => ({
                    ...p,
                    time: new Date(p.time)
                }));
                
                updateAllDisplays();
            }
        }
        
        // Load preferred region or default to DK2
        const preferredRegion = localStorage.getItem('preferredRegion') || 'DK2';
        state.region = preferredRegion;
        elements.dk1Btn.classList.toggle('active', preferredRegion === 'DK1');
        elements.dk2Btn.classList.toggle('active', preferredRegion === 'DK2');
    } catch (error) {
        console.error('Failed to load from cache:', error);
    }
}

// Service Worker Registration
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
});

function showInstallBanner() {
    const banner = document.createElement('div');
    banner.className = 'install-banner visible';
    banner.innerHTML = `
        <p>📱 Install as app</p>
        <button class="install-btn" id="install-btn">Install</button>
        <button class="dismiss-btn" id="dismiss-btn">✕</button>
    `;
    document.body.appendChild(banner);
    
    document.getElementById('install-btn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('PWA installed');
            }
            deferredPrompt = null;
        }
        banner.remove();
    });
    
    document.getElementById('dismiss-btn').addEventListener('click', () => {
        banner.remove();
    });
}
