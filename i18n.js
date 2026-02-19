/**
 * Internationalization (i18n) module for Danish Energy Prices
 * Supports Danish (da) and English (en) based on browser language
 */

const I18N = {
    // Detected language: 'da' or 'en'
    currentLang: 'en',

    translations: {
        en: {
            // Header
            'app.title': '🇩🇰 Energy Prices',
            'region.dk1': 'DK1 (West)',
            'region.dk2': 'DK2 (East)',
            'loading': 'Loading...',
            'refresh': 'Refresh',

            // Electricity card
            'electricity': 'Electricity',
            'electricity.subtitle': 'Spot price + Grid costs (incl. nettarif)',
            'today.min': 'Today Min',
            'today.max': 'Today Max',
            'avg': 'Avg',

            // Fuel cards
            'benzin95': 'Benzin 95',
            'diesel': 'Diesel',
            'natural.gas': 'Natural Gas',
            'water': 'Water',
            'fjernvarme': 'Fjernvarme',

            // Chart
            'chart.title': '24h Electricity Prices',
            'chart.today': 'Today',
            'chart.tomorrow': 'Tomorrow',
            'chart.week': 'Week',
            'chart.cheap': 'Cheap (<1.5 DKK)',
            'chart.moderate': 'Moderate (1.5-3 DKK)',
            'chart.expensive': 'Expensive (>3 DKK)',
            'chart.spotPrice': 'Spot Price',
            'chart.gridCost': 'Grid Cost (Net)',

            // Forecast
            'forecast.title': '🔮 Price Forecast',
            'forecast.loading': 'Loading forecast...',
            'forecast.bestHours': 'Best Hours to Use Electricity',
            'forecast.worstHours': 'Avoid These Hours (Highest Prices)',
            'forecast.waiting': "Waiting for tomorrow's prices...",
            'forecast.unable': 'Unable to load forecast data',
            'forecast.rising': '⚠️ Prices are expected to INCREASE in the next few hours. Current: {current} DKK → Average upcoming: {avg} DKK. Consider running high-consumption appliances now!',
            'forecast.falling': '✅ Good news! Prices are expected to DECREASE. Current: {current} DKK → Average upcoming: {avg} DKK. Wait a bit for lower prices!',
            'forecast.stable': 'ℹ️ Prices are stable. Current: {current} DKK → Average upcoming: {avg} DKK.',

            // History
            'history.title': '📈 Historical Trends',
            'history.average': 'Average',
            'history.min': 'Min',
            'history.max': 'Max',

            // Footer
            'footer.data': 'Data from',
            'footer.author': 'by Dima Bors',
            'footer.github': 'Source on GitHub',

            // Loading
            'loading.prices': 'Loading prices...',

            // Last updated
            'updated': 'Updated: {time}',

            // Install banner
            'install.message': '📱 Install as app',
            'install.button': 'Install',

            // Notifications
            'notification.highPrice.title': '⚡ High Electricity Price!',
            'notification.highPrice.body': 'Current price is {price} DKK/kWh — above 5 DKK. Consider reducing consumption.',
            'notification.lowPrice.title': '✅ Electricity Price Dropped!',
            'notification.lowPrice.body': 'Price is now {price} DKK/kWh — below 3 DKK. Good time to use electricity!',
        },

        da: {
            // Header
            'app.title': '🇩🇰 Energipriser',
            'region.dk1': 'DK1 (Vest)',
            'region.dk2': 'DK2 (Øst)',
            'loading': 'Indlæser...',
            'refresh': 'Opdater',

            // Electricity card
            'electricity': 'Elektricitet',
            'electricity.subtitle': 'Spotpris + Nettarif (inkl. afgifter)',
            'today.min': 'I dag Min',
            'today.max': 'I dag Maks',
            'avg': 'Gns',

            // Fuel cards
            'benzin95': 'Benzin 95',
            'diesel': 'Diesel',
            'natural.gas': 'Naturgas',
            'water': 'Vand',
            'fjernvarme': 'Fjernvarme',

            // Chart
            'chart.title': '24t Elpriser',
            'chart.today': 'I dag',
            'chart.tomorrow': 'I morgen',
            'chart.week': 'Uge',
            'chart.cheap': 'Billig (<1,5 DKK)',
            'chart.moderate': 'Moderat (1,5-3 DKK)',
            'chart.expensive': 'Dyr (>3 DKK)',
            'chart.spotPrice': 'Spotpris',
            'chart.gridCost': 'Nettarif',

            // Forecast
            'forecast.title': '🔮 Prisprognose',
            'forecast.loading': 'Indlæser prognose...',
            'forecast.bestHours': 'Bedste timer til elforbrug',
            'forecast.worstHours': 'Undgå disse timer (højeste priser)',
            'forecast.waiting': 'Venter på morgendagens priser...',
            'forecast.unable': 'Kan ikke indlæse prognosedata',
            'forecast.rising': '⚠️ Priserne forventes at STIGE i de næste par timer. Nuværende: {current} DKK → Gennemsnitlig kommende: {avg} DKK. Overvej at køre højtforbrugende apparater nu!',
            'forecast.falling': '✅ Godt nyt! Priserne forventes at FALDE. Nuværende: {current} DKK → Gennemsnitlig kommende: {avg} DKK. Vent lidt for lavere priser!',
            'forecast.stable': 'ℹ️ Priserne er stabile. Nuværende: {current} DKK → Gennemsnitlig kommende: {avg} DKK.',

            // History
            'history.title': '📈 Historiske tendenser',
            'history.average': 'Gennemsnit',
            'history.min': 'Min',
            'history.max': 'Maks',

            // Footer
            'footer.data': 'Data fra',
            'footer.author': 'af Dima Bors',
            'footer.github': 'Kildekode på GitHub',

            // Loading
            'loading.prices': 'Indlæser priser...',

            // Last updated
            'updated': 'Opdateret: {time}',

            // Install banner
            'install.message': '📱 Installér som app',
            'install.button': 'Installér',

            // Notifications
            'notification.highPrice.title': '⚡ Høj elpris!',
            'notification.highPrice.body': 'Nuværende pris er {price} DKK/kWh — over 5 DKK. Overvej at reducere forbruget.',
            'notification.lowPrice.title': '✅ Elprisen er faldet!',
            'notification.lowPrice.body': 'Prisen er nu {price} DKK/kWh — under 3 DKK. Godt tidspunkt at bruge strøm!',
        }
    },

    /**
     * Detect browser language and set currentLang
     */
    detectLanguage() {
        const browserLang = navigator.language || navigator.userLanguage || 'en';
        this.currentLang = browserLang.toLowerCase().startsWith('da') ? 'da' : 'en';

        // Allow override via localStorage
        const savedLang = localStorage.getItem('preferredLanguage');
        if (savedLang && (savedLang === 'da' || savedLang === 'en')) {
            this.currentLang = savedLang;
        }

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang === 'da' ? 'da' : 'en';

        return this.currentLang;
    },

    /**
     * Get translated string by key, with optional placeholder substitution
     * @param {string} key - Translation key
     * @param {Object} [params] - Placeholder values, e.g. { price: '5.23' }
     * @returns {string} Translated string
     */
    t(key, params) {
        const lang = this.currentLang;
        let str = this.translations[lang]?.[key] || this.translations['en']?.[key] || key;

        if (params) {
            Object.keys(params).forEach(k => {
                str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
            });
        }
        return str;
    },

    /**
     * Apply translations to all elements with [data-i18n] attributes
     */
    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translated = this.t(key);
            el.textContent = translated;
        });

        // Also handle elements with data-i18n-title (for title attributes)
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });

        // Handle data-i18n-placeholder for inputs
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });
    },

    /**
     * Set language and re-apply translations
     * @param {string} lang - 'da' or 'en'
     */
    setLanguage(lang) {
        if (lang === 'da' || lang === 'en') {
            this.currentLang = lang;
            localStorage.setItem('preferredLanguage', lang);
            document.documentElement.lang = lang === 'da' ? 'da' : 'en';
            this.applyTranslations();
        }
    }
};
