/**
 * Danish Energy Prices Widget
 * Fetches electricity prices from Energi Data Service API
 * and displays fuel, gas, and water prices
 */

// Configuration
const CONFIG = {
    ELECTRICITY_API_BASE: 'https://api.energidataservice.dk/dataset',
    DATASET_NEW: 'DayAheadPrices', // For data after 2025-10-01
    DATASET_OLD: 'Elspotprices',   // For historical data before 2025-10-01
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
    MWH_TO_KWH: 1000, // Convert MWh to kWh
};

// State
let state = {
    region: 'DK1',
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
    elecMin: document.getElementById('elec-min'),
    elecMax: document.getElementById('elec-max'),
    elecAvg: document.getElementById('elec-avg'),
    elecTrend: document.getElementById('elec-trend'),
    benzinPrice: document.getElementById('benzin-price'),
    dieselPrice: document.getElementById('diesel-price'),
    gasPrice: document.getElementById('gas-price'),
    waterPrice: document.getElementById('water-price'),
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
        await Promise.all([
            fetchElectricityPrices(),
            fetchFuelPrices(),
        ]);
        
        updateAllDisplays();
        saveToCache();
        
        state.lastUpdated = new Date();
        updateLastUpdatedText();
    } catch (error) {
        console.error('Failed to refresh data:', error);
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
    const url = `${CONFIG.ELECTRICITY_API_BASE}/${CONFIG.DATASET_NEW}?` +
        `start=${formatDateParam(todayStart)}&` +
        `end=${formatDateParam(tomorrowEnd)}&` +
        `filter={"PriceArea":["${state.region}"]}&` +
        `sort=TimeUTC asc&` +
        `limit=0`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.json();
        
        if (data.records && data.records.length > 0) {
            processPriceData(data.records);
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
            state.historicalPrices = data.records.map(record => ({
                time: new Date(record.TimeUTC || record.TimeDK),
                priceDKK: record.DayAheadPriceDKK / CONFIG.MWH_TO_KWH,
                priceEUR: record.DayAheadPriceEUR / CONFIG.MWH_TO_KWH,
            }));
        }
    } catch (error) {
        console.error('Failed to fetch historical prices:', error);
    }
}

function processPriceData(records) {
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    
    const tomorrowMidnight = new Date(todayMidnight);
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
    
    const allPrices = records.map(record => ({
        time: new Date(record.TimeUTC || record.TimeDK),
        priceDKK: record.DayAheadPriceDKK / CONFIG.MWH_TO_KWH, // Convert to DKK/kWh
        priceEUR: record.DayAheadPriceEUR / CONFIG.MWH_TO_KWH,
    }));
    
    state.todayPrices = allPrices.filter(p => p.time >= todayMidnight && p.time < tomorrowMidnight);
    state.tomorrowPrices = allPrices.filter(p => p.time >= tomorrowMidnight);
    
    // Get current price (closest to now)
    const currentPriceEntry = allPrices.find(p => {
        const pTime = p.time.getTime();
        const nowTime = now.getTime();
        return pTime <= nowTime && (pTime + 15 * 60 * 1000) > nowTime;
    }) || allPrices[0];
    
    if (currentPriceEntry) {
        state.currentPrices = {
            electricity: currentPriceEntry.priceDKK,
            electricityEUR: currentPriceEntry.priceEUR,
        };
    }
}

function processPriceDataLegacy(records) {
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    
    const tomorrowMidnight = new Date(todayMidnight);
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
    
    const allPrices = records.map(record => ({
        time: new Date(record.HourUTC || record.HourDK),
        priceDKK: record.SpotPriceDKK / CONFIG.MWH_TO_KWH,
        priceEUR: record.SpotPriceEUR / CONFIG.MWH_TO_KWH,
    }));
    
    state.todayPrices = allPrices.filter(p => p.time >= todayMidnight && p.time < tomorrowMidnight);
    state.tomorrowPrices = allPrices.filter(p => p.time >= tomorrowMidnight);
    
    const currentPriceEntry = allPrices.find(p => {
        const pTime = p.time.getTime();
        const nowTime = now.getTime();
        return pTime <= nowTime && (pTime + 60 * 60 * 1000) > nowTime;
    }) || allPrices[0];
    
    if (currentPriceEntry) {
        state.currentPrices = {
            electricity: currentPriceEntry.priceDKK,
            electricityEUR: currentPriceEntry.priceEUR,
        };
    }
}

/**
 * Fetch fuel prices
 * Note: Using sample data as the benzinpriser.io API requires authentication
 * In production, this would connect to a real fuel price API
 */
async function fetchFuelPrices() {
    // Sample fuel prices for Denmark (based on typical 2024-2026 prices)
    // These should be replaced with actual API calls when available
    state.currentPrices = {
        ...state.currentPrices,
        benzin: 14.29,  // DKK per liter (Benzin 95)
        diesel: 12.49,  // DKK per liter
        gas: 8.50,      // DKK per m³ (natural gas)
        water: 45.00,   // DKK per m³ (including taxes)
    };
    
    // Try to fetch from alternative sources
    try {
        // You can add actual API calls here when APIs become available
        // const fuelData = await fetchFromFuelAPI();
    } catch (error) {
        console.log('Using fallback fuel prices');
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
    elements.elecPrice.textContent = price.toFixed(2);
    elements.elecPrice.className = 'price-value ' + getPriceClass(price);
    
    // Calculate min, max, avg for today
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
    const prices = chartData.map(p => p.priceDKK);
    const colors = prices.map(p => getPriceColor(p));
    
    if (state.chart) {
        state.chart.destroy();
    }
    
    state.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price (DKK/kWh)',
                data: prices,
                backgroundColor: colors,
                borderRadius: 4,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(2)} DKK/kWh`;
                        }
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
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: period === 'week' ? 7 : 12,
                    }
                },
                y: {
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
                state.region = cacheData.state.region || 'DK1';
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
        
        // Load preferred region
        const preferredRegion = localStorage.getItem('preferredRegion');
        if (preferredRegion) {
            state.region = preferredRegion;
            elements.dk1Btn.classList.toggle('active', preferredRegion === 'DK1');
            elements.dk2Btn.classList.toggle('active', preferredRegion === 'DK2');
        }
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
