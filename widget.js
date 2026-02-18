/**
 * Danish Energy Prices Widget
 * Compact widget for home screen display
 */

const CONFIG = {
    ELECTRICITY_API_BASE: 'https://api.energidataservice.dk/dataset',
    FUEL_API_BASE: 'https://mobility-prices.ok.dk/api/v1/fuel-prices',
    OK_FACILITY_NUMBER: 27,
    DATASET: 'Elspotprices',
    MWH_TO_KWH: 1000,
    REGION: 'DK2',
    VAT: 1.25,
    // 2025/2026 rates for DK2 (Radius) - DKK/kWh without VAT
    GRID_TARIFFS: { LOW: 0.1863, MEDIUM: 0.5477, HIGH: 1.3520 },
    FIXED_FEES: { transmission: 0.049, system: 0.054, elafgift: 0.00872 },
    REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
};

let chart = null;
let prices = [];

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await fetchAllData();
    setInterval(fetchAllData, CONFIG.REFRESH_INTERVAL);
}

async function fetchAllData() {
    try {
        await Promise.allSettled([
            fetchElectricityPrices(),
            fetchFuelPrices(),
        ]);
        updateLastUpdated();
    } catch (error) {
        console.error('Failed to fetch data:', error);
    }
}

async function fetchElectricityPrices() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(todayStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);
    
    const url = `${CONFIG.ELECTRICITY_API_BASE}/${CONFIG.DATASET}?` +
        `start=${todayStart.toISOString().split('T')[0]}&` +
        `end=${tomorrowEnd.toISOString().split('T')[0]}&` +
        `filter={"PriceArea":["${CONFIG.REGION}"]}&` +
        `sort=TimeUTC asc&limit=0`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('API failed');
    
    const data = await response.json();
    
    if (data.records && data.records.length > 0) {
        processPriceData(data.records);
    }
}

function getDistributionTariff(hour) {
    if (hour >= 0 && hour < 6) return CONFIG.GRID_TARIFFS.LOW;
    if (hour >= 17 && hour < 21) return CONFIG.GRID_TARIFFS.HIGH;
    return CONFIG.GRID_TARIFFS.MEDIUM;
}

function getFeesWithVAT(hour) {
    const distributionTariff = getDistributionTariff(hour);
    const totalFees = distributionTariff + CONFIG.FIXED_FEES.TRANSMISSION + CONFIG.FIXED_FEES.SYSTEM + CONFIG.FIXED_FEES.ELAFGIFT;
    return totalFees * CONFIG.VAT;
}

function calculateTotalPrice(spotBeforeVAT, hour) {
    const distributionTariff = getDistributionTariff(hour);
    const totalBeforeVAT = spotBeforeVAT + distributionTariff + CONFIG.FIXED_FEES.TRANSMISSION + CONFIG.FIXED_FEES.SYSTEM + CONFIG.FIXED_FEES.ELAFGIFT;
    return totalBeforeVAT * CONFIG.VAT;
}

function processPriceData(records) {
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    
    const tomorrowMidnight = new Date(todayMidnight);
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
    
    prices = records.map(record => {
        const time = new Date(record.HourUTC || record.TimeUTC);
        const spotBeforeVAT = (record.SpotPriceDKK ?? record.PriceEUR * 7.45) / CONFIG.MWH_TO_KWH;
        const hour = time.getHours();
        const spotWithVAT = spotBeforeVAT * CONFIG.VAT;
        const feesWithVAT = getFeesWithVAT(hour);
        const totalPrice = calculateTotalPrice(spotBeforeVAT, hour);
        
        return {
            time,
            hour,
            spotPrice: spotWithVAT,
            gridCost: feesWithVAT,
            totalPrice,
        };
    }).filter(p => p.time >= todayMidnight && p.time < tomorrowMidnight);
    
    // Update current price
    const currentPrice = prices.find(p => {
        const pTime = p.time.getTime();
        const nowTime = now.getTime();
        return pTime <= nowTime && (pTime + 60 * 60 * 1000) > nowTime;
    }) || prices[0];
    
    if (currentPrice) {
        updateCurrentPrice(currentPrice.totalPrice);
    }
    
    // Update chart
    updateChart();
}

function updateCurrentPrice(price) {
    const elecPriceEl = document.getElementById('elec-price');
    const badgeEl = document.getElementById('current-badge');
    
    elecPriceEl.textContent = price.toFixed(2);
    badgeEl.textContent = price.toFixed(2) + ' kr';
    
    // Set color class
    let priceClass = 'cheap';
    if (price >= 1.5 && price < 3) priceClass = 'moderate';
    if (price >= 3) priceClass = 'expensive';
    
    elecPriceEl.className = 'price-value ' + priceClass;
    badgeEl.className = 'current-price-badge ' + priceClass;
}

function updateChart() {
    const ctx = document.getElementById('miniChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }
    
    const labels = prices.map(p => p.hour.toString().padStart(2, '0'));
    const spotData = prices.map(p => p.spotPrice);
    const gridData = prices.map(p => p.gridCost);
    
    // Colors based on total price
    const colors = prices.map(p => {
        if (p.totalPrice < 1.5) return '#4ade80';
        if (p.totalPrice < 3) return '#fbbf24';
        return '#f87171';
    });
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Spot',
                    data: spotData,
                    backgroundColor: colors,
                    borderRadius: 2,
                    barPercentage: 0.9,
                    categoryPercentage: 0.95,
                },
                {
                    label: 'Grid',
                    data: gridData,
                    backgroundColor: 'rgba(128, 128, 128, 0.5)',
                    borderRadius: 2,
                    barPercentage: 0.9,
                    categoryPercentage: 0.95,
                }
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
            },
            scales: {
                x: {
                    stacked: true,
                    display: true,
                    grid: { display: false },
                    ticks: {
                        color: '#a0a0b8',
                        font: { size: 8 },
                        maxRotation: 0,
                        callback: (val, idx) => idx % 4 === 0 ? labels[idx] : '',
                    },
                },
                y: {
                    stacked: true,
                    display: false,
                    beginAtZero: true,
                },
            },
            animation: false,
        },
    });
    
    // Highlight current hour
    const now = new Date();
    const currentHour = now.getHours();
    const currentIdx = prices.findIndex(p => p.hour === currentHour);
    
    if (currentIdx >= 0) {
        // Add highlight to current bar
        chart.data.datasets[0].backgroundColor = prices.map((p, i) => {
            const baseColor = p.totalPrice < 1.5 ? '#4ade80' : (p.totalPrice < 3 ? '#fbbf24' : '#f87171');
            return i === currentIdx ? baseColor : baseColor + '80';
        });
        chart.update('none');
    }
}

async function fetchFuelPrices() {
    try {
        const response = await fetch(CONFIG.FUEL_API_BASE);
        if (!response.ok) throw new Error('OK API failed');
        
        const data = await response.json();
        const facility = data.items?.find(f => f.facility_number === CONFIG.OK_FACILITY_NUMBER) 
                       || data.items?.[0];
        
        if (facility && facility.prices) {
            const diesel = facility.prices.find(p => p.product_name === 'Svovlfri Diesel');
            if (diesel) {
                document.getElementById('diesel-price').textContent = diesel.price.toFixed(2);
            }
        }
    } catch (error) {
        console.error('Failed to fetch fuel prices:', error);
        document.getElementById('diesel-price').textContent = '12.69';
    }
}

function updateLastUpdated() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('last-updated').textContent = `Updated ${timeStr}`;
}
