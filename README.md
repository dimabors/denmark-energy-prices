# 🇩🇰 Danish Energy Prices Widget

A Progressive Web App (PWA) that displays real-time energy prices in Denmark, including electricity, fuel (benzin/diesel), gas, water, and district heating (fjernvarme) prices. Optimized for use as a mobile widget on Android and iOS devices.

## Features

- **⚡ Real-time Electricity Prices**: Fetches day-ahead prices from [Energi Data Service](https://www.energidataservice.dk) (supports both `DayAheadPrices` and legacy `Elspotprices` datasets)
- **🔮 Price Forecasts**: Shows when prices will rise or fall with trend indicators
- **📊 Interactive Charts**: 24-hour, daily, and weekly price visualizations with stacked spot + grid cost bars
- **🎯 Best/Worst Hours**: Identifies the 5 cheapest and most expensive hours to use electricity
- **⛽ Fuel Prices**: Live benzin 95 and diesel prices from [OK](https://mobility-prices.ok.dk) (station 27)
- **🔥 Natural Gas**: Gas prices from Evida
- **💧 Water**: Water prices from Novafos
- **🏠 District Heating (Fjernvarme)**: Egedal Fjernvarme variable energy price (auto-updated from PDF)
- **🌍 Region Support**: Switch between DK1 (West Denmark) and DK2 (East Denmark)
- **💰 Full Price Breakdown**: Spot price + distribution tariff + transmission + system + elafgift + VAT
- **📱 Mobile-First**: Designed as a widget for Android and iOS
- **🖥️ Compact Widget**: Dedicated widget page for home screen display
- **🌐 PWA**: Install as a standalone app on any device
- **🔄 Offline Support**: Works offline with cached data via Service Worker
- **🇩🇰 Danish/English Language Support**: Auto-detects browser language; shows Danish for `da` locale, English otherwise
- **🔔 Price Notifications**: Push notifications when electricity exceeds 5 DKK/kWh or drops below 3 DKK/kWh (active 09:00–22:00)
- **🤖 Android TWA**: Trusted Web Activity wrapper for Google Play Store distribution
- **⚙️ Auto-Updated Prices**: GitHub Actions workflow fetches fjernvarme prices from PDF weekly
- **📦 GitHub Releases**: Automated releases with versioned artifacts via GitHub Actions

## Screenshots

<details>
<summary>View Screenshots</summary>

The app displays:
- Current electricity price with trend indicator (↑↓→)
- Spot price + Grid cost breakdown
- Today's min/max/average prices
- Fuel (benzin/diesel), gas, water, and fjernvarme prices
- 24-hour price chart with color-coded stacked bars
- Price forecast alerts with actionable advice
- Best and worst hours to use electricity
- 7-day historical trends

</details>

## Data Sources

| Data | Source | Update Frequency |
|------|--------|------------------|
| Electricity (Day-Ahead) | [Energi Data Service API](https://api.energidataservice.dk) (`DayAheadPrices` / `Elspotprices`) | Every 5 minutes |
| Fuel Prices (Benzin/Diesel) | [OK Fuel Prices API](https://mobility-prices.ok.dk/api/v1/fuel-prices) | Every 5 minutes |
| Natural Gas | [Evida](https://www.evida.dk) via config/prices.json | Weekly (GitHub Actions) |
| Water | [Novafos](https://www.novafos.dk) via config/prices.json | Weekly (GitHub Actions) |
| District Heating | [Egedal Fjernvarme PDF](https://www.egedalfjernvarme.dk/priser/) | Weekly (GitHub Actions) |

## Electricity Price Components

The total electricity price includes all components with 25% VAT:

| Component | Description | Source |
|-----------|-------------|--------|
| Spot Price | Day-ahead market price | Energi Data Service |
| Distribution Tariff | Time-of-use grid tariff (low/medium/high) | DSO (Radius/N1) |
| Transmission Tariff | 0.049 DKK/kWh | Energinet |
| System Tariff | 0.054 DKK/kWh | Energinet |
| Electricity Tax (Elafgift) | 0.00872 DKK/kWh | Danish state |
| VAT | 25% | Danish state |

### Grid Tariff Time Periods

| Period | Hours | DK1 (N1) | DK2 (Radius) |
|--------|-------|-----------|---------------|
| Low | 00:00–06:00 | 0.1536 | 0.1863 |
| Medium | 06:00–17:00, 21:00–00:00 | 0.4098 | 0.5477 |
| High (Peak) | 17:00–21:00 | 0.9821 | 1.3520 |

## Installation

### As a PWA (Recommended)

1. Visit the deployed site: `https://dimabors.github.io/denmark-energy-prices/`
2. On Android: Tap the "Add to Home Screen" prompt or menu option
3. On iOS: Tap Share → "Add to Home Screen"

### From GitHub Releases

1. Go to the [Releases](https://github.com/dimabors/denmark-energy-prices/releases) page
2. Download the latest `denmark-energy-prices-vX.Y.Z.zip` artifact
3. Extract and serve with any static web server

### Android App (TWA)

See `android-twa/README.md` for building and installing the Android Trusted Web Activity wrapper.

### Local Development

```bash
# Clone the repository
git clone https://github.com/dimabors/denmark-energy-prices.git
cd denmark-energy-prices

# Serve locally (any static server works)
npx serve .
# or
python -m http.server 8080
```

## Deployment

This project uses GitHub Actions to automatically deploy to GitHub Pages.

### Setup GitHub Pages

1. Go to your repository Settings → Pages
2. Under "Build and deployment", select "GitHub Actions"
3. Push to the `main` branch to trigger deployment

### GitHub Actions Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| Deploy | `.github/workflows/deploy.yml` | Push to `main` | Build & deploy to GitHub Pages |
| Deploy Dev | `.github/workflows/deploy-dev.yml` | Push to `development` | Build & deploy to dev-gh-pages environment |
| Update Prices | `.github/workflows/update-prices.yml` | Weekly / Monthly / Manual | Fetch fjernvarme PDF & update config |
| Release | `.github/workflows/release.yml` | Tag `v*` / Manual | Create GitHub Release with artifacts |

### Creating a Release

Releases are created automatically when you push a version tag:

```bash
# Tag a new release
git tag v1.2.0
git push origin v1.2.0
```

Or manually from the GitHub Actions tab → **Release** → **Run workflow** and provide a version (e.g. `v1.2.0`).

The release workflow will:
1. Package the web app into a versioned `.zip` artifact
2. Generate a changelog from commits since the last tag
3. Create a GitHub Release with the artifact attached
4. Mark it as the latest release

### Manual Deployment

The site is a static HTML/CSS/JS application and can be deployed to any static hosting:
- GitHub Pages (automated via Actions)
- Netlify
- Vercel
- Cloudflare Pages
- Any web server

## Project Structure

```
denmark-energy-prices/
├── index.html              # Main app page
├── styles.css              # Mobile-first CSS styles
├── app.js                  # Main application logic & API integration
├── i18n.js                 # Internationalization (Danish/English translations)
├── sw.js                   # Service Worker for offline support & notifications
├── manifest.json           # PWA manifest
├── widget.html             # Compact widget page for home screen
├── widget.js               # Widget-specific logic
├── electricity.html        # Standalone electricity page (region toggle)
├── electricity-dk1.html    # DK1 West electricity standalone page
├── electricity-dk2.html    # DK2 East electricity standalone page
├── benzin.html             # Standalone benzin price page
├── diesel.html             # Standalone diesel price page
├── gas.html                # Standalone gas price page
├── water.html              # Standalone water price page
├── fjernvarme.html         # Standalone fjernvarme price page
├── 404.html                # Redirect to home
├── config/
│   └── prices.json         # Auto-updated utility prices (gas, water, fjernvarme)
├── scripts/
│   └── update-prices.py    # Python script to fetch fjernvarme PDF prices
├── icons/
│   ├── icon-*.png          # Generated PNG icons (72–512px)
│   └── generate-icons.html # Browser-based icon generator
├── android-twa/            # Android Trusted Web Activity wrapper
│   ├── app/                # Android app source
│   ├── build.gradle        # Root Gradle build
│   └── README.md           # Android build instructions
├── .github/
│   └── workflows/
│       ├── deploy.yml      # GitHub Pages deployment
│       ├── release.yml     # GitHub Releases with artifacts
│       └── update-prices.yml # Auto-update utility prices
└── README.md
```

## Standalone Pages

Each energy type has a standalone page that can be used independently or embedded:

| Page | URL | Description |
|------|-----|-------------|
| electricity.html | `/electricity.html` | Electricity with DK1/DK2 toggle |
| electricity-dk1.html | `/electricity-dk1.html` | DK1 West only |
| electricity-dk2.html | `/electricity-dk2.html` | DK2 East only |
| benzin.html | `/benzin.html` | Benzin 95 price |
| diesel.html | `/diesel.html` | Diesel price |
| gas.html | `/gas.html` | Natural gas price |
| water.html | `/water.html` | Water price |
| fjernvarme.html | `/fjernvarme.html` | District heating price |
| widget.html | `/widget.html` | Compact widget with chart |

## API Reference

### Electricity Prices

The app uses the Energi Data Service API with automatic fallback:

**Primary (Oct 2025+):**
```
GET https://api.energidataservice.dk/dataset/DayAheadPrices
    ?start={date}
    &end={date}
    &filter={"PriceArea":["DK2"]}
    &sort=TimeDK asc
    &limit=0
```

**Fallback (Legacy):**
```
GET https://api.energidataservice.dk/dataset/Elspotprices
    ?start={date}
    &end={date}
    &filter={"PriceArea":"DK2"}
    &sort=HourDK asc
```

**Price Areas:**
- `DK1` - West Denmark (Jutland & Funen)
- `DK2` - East Denmark (Zealand / Copenhagen)

**Response fields:**
- `TimeUTC` / `TimeDK` - Timestamp
- `DayAheadPriceEUR` / `PriceEUR` - Price in EUR/MWh
- `DayAheadPriceDKK` / `SpotPriceDKK` - Price in DKK/MWh

### Fuel Prices

```
GET https://mobility-prices.ok.dk/api/v1/fuel-prices
```

Filtered by `facility_number: 27`. Products: `Blyfri 95`, `Svovlfri Diesel`.

## Configuration

### Main App (app.js)

```javascript
const CONFIG = {
    CACHE_DURATION: 5 * 60 * 1000,    // 5 minutes
    REFRESH_INTERVAL: 5 * 60 * 1000,  // 5 minutes
    MWH_TO_KWH: 1000,                 // Conversion factor
    VAT: 1.25,                         // 25% Danish VAT
    OK_FACILITY_NUMBER: 27,            // OK fuel station
};
```

### Static Prices (config/prices.json)

Auto-updated via GitHub Actions. Fallback values defined in `CONFIG.STATIC_PRICES`:
- Water (Novafos): 56.25 DKK/m³
- Gas (Evida): 8.95 DKK/m³
- Fjernvarme (Egedal): 485 DKK/MWh

## Language Support

The app automatically detects the browser language:
- **Danish (`da`)**: All UI text, chart labels, forecast messages, and notifications are shown in Danish
- **English (default)**: Used for all other browser languages

You can also override the language via `localStorage`:
```javascript
localStorage.setItem('preferredLanguage', 'da'); // Force Danish
localStorage.setItem('preferredLanguage', 'en'); // Force English
```

Translations are managed in `i18n.js` with `data-i18n` attributes on HTML elements.

## Price Notifications

The app sends browser notifications for electricity price changes:

| Alert | Trigger | Message |
|-------|---------|---------|
| ⚡ High Price | Price > 5 DKK/kWh | Warning to reduce consumption |
| ✅ Price Drop | Price < 3 DKK/kWh (after being above) | Good time to use electricity |

**Conditions:**
- Only active between **09:00–22:00** local time (no overnight alerts)
- **1-hour cooldown** between repeated alerts of the same type
- Requires browser notification permission (requested on first visit)
- Works in background via Service Worker

## Price Thresholds

The app uses color coding for electricity prices:

| Price Range | Color | Class |
|-------------|-------|-------|
| < 1.5 DKK/kWh | 🟢 Green | Cheap |
| 1.5–3 DKK/kWh | 🟡 Yellow | Moderate |
| > 3 DKK/kWh | 🔴 Red | Expensive |

## Releases

Published releases with downloadable artifacts are available on the [Releases page](https://github.com/dimabors/denmark-energy-prices/releases).

Each release includes:
- **`denmark-energy-prices-vX.Y.Z.zip`** — Full web app ready to deploy
- **Changelog** — Auto-generated from commits since the previous tag

### Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** — Breaking changes to configuration or data format
- **MINOR** — New features (new energy types, pages, charts)
- **PATCH** — Bug fixes, price updates, styling tweaks

## Browser Support

- Chrome / Edge (Android, Desktop) ✅
- Safari (iOS 11.3+) ✅
- Firefox ✅
- Samsung Internet ✅

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a Pull Request

## TODO / Roadmap

- [ ] Add widget variants for native Android home screen widgets
- [ ] Historical data export (CSV)
- [ ] CO2 emissions data integration
- [x] ~~Push notifications for price alerts~~ (high/low price notifications added)
- [x] ~~Multi-language support (Danish/English)~~ (i18n with browser detection)
- [x] ~~Integrate real fuel price API~~ (OK API integrated)
- [x] ~~Add tariffs and taxes to total price calculation~~ (full breakdown included)
- [x] ~~Automated GitHub Releases~~ (release workflow added)

## License

MIT License - see LICENSE file for details.

## Acknowledgements

- [Energi Data Service](https://www.energidataservice.dk) for providing free electricity price data
- [OK](https://www.ok.dk) for fuel price API
- [Egedal Fjernvarme](https://www.egedalfjernvarme.dk) for district heating prices
- [Chart.js](https://www.chartjs.org/) for charting library
