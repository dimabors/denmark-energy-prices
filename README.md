# 🇩🇰 Danish Energy Prices Widget

A Progressive Web App (PWA) that displays real-time energy prices in Denmark, including electricity, fuel (benzin/diesel), gas, and water prices. Optimized for use as a mobile widget on Android and iOS devices.

## Features

- **⚡ Real-time Electricity Prices**: Fetches day-ahead prices from [Energi Data Service](https://www.energidataservice.dk)
- **🔮 Price Forecasts**: Shows when prices will rise or fall
- **📊 Interactive Charts**: 24-hour, daily, and weekly price visualizations
- **🎯 Best/Worst Hours**: Identifies the cheapest and most expensive hours to use electricity
- **⛽ Fuel Prices**: Displays benzin 95 and diesel prices
- **🔥 Gas & Water**: Natural gas and water utility prices
- **📱 Mobile-First**: Designed as a widget for Android and iOS
- **🌐 PWA**: Install as a standalone app on any device
- **🔄 Offline Support**: Works offline with cached data

## Screenshots

<details>
<summary>View Screenshots</summary>

The app displays:
- Current electricity price with trend indicator
- Today's min/max/average prices
- Fuel, gas, and water prices
- 24-hour price chart with color-coded bars
- Price forecast alerts
- Best and worst hours to use electricity
- 7-day historical trends

</details>

## Data Sources

| Data | Source | Update Frequency |
|------|--------|------------------|
| Electricity (Day-Ahead) | [Energi Data Service API](https://api.energidataservice.dk) | Daily |
| Historical Electricity | [Energi Data Service API](https://api.energidataservice.dk) | Daily |
| Fuel Prices | Sample data (API integration pending) | Manual |
| Gas/Water | Sample data | Manual |

## Installation

### As a PWA (Recommended)

1. Visit the deployed site: `https://[your-username].github.io/denmark-energy-prices`
2. On Android: Tap the "Add to Home Screen" prompt or menu option
3. On iOS: Tap Share → "Add to Home Screen"

### Local Development

```bash
# Clone the repository
git clone https://github.com/[your-username]/denmark-energy-prices.git
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
├── index.html          # Main HTML page
├── styles.css          # Mobile-first CSS styles
├── app.js              # Application logic & API integration
├── sw.js               # Service Worker for offline support
├── manifest.json       # PWA manifest
├── icons/
│   ├── icon.svg        # Source SVG icon
│   ├── icon-*.png      # Generated PNG icons
│   └── generate-icons.html  # Browser-based icon generator
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Actions deployment
└── README.md
```

## API Reference

### Electricity Prices

The app uses the Energi Data Service API:

```
GET https://api.energidataservice.dk/dataset/DayAheadPrices
    ?start={date}
    &end={date}
    &filter={"PriceArea":["DK1"]}
    &sort=TimeUTC asc
```

**Price Areas:**
- `DK1` - West Denmark (Jutland & Funen)
- `DK2` - East Denmark (Zealand)

**Response fields:**
- `TimeUTC` / `TimeDK` - Timestamp
- `DayAheadPriceEUR` - Price in EUR/MWh
- `DayAheadPriceDKK` - Price in DKK/MWh

## Configuration

Edit `app.js` to customize:

```javascript
const CONFIG = {
    CACHE_DURATION: 5 * 60 * 1000,    // 5 minutes
    REFRESH_INTERVAL: 5 * 60 * 1000,  // 5 minutes
    MWH_TO_KWH: 1000,                 // Conversion factor
};
```

## Price Thresholds

The app uses color coding for prices:

| Price Range | Color | Class |
|-------------|-------|-------|
| < 1.5 DKK/kWh | 🟢 Green | Cheap |
| 1.5-3 DKK/kWh | 🟡 Yellow | Moderate |
| > 3 DKK/kWh | 🔴 Red | Expensive |

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

- [ ] Integrate real fuel price API (benzinpriser.io or alternative)
- [ ] Add push notifications for price alerts
- [ ] Add widget variants for home screen widgets (Android)
- [ ] Historical data export (CSV)
- [ ] Multi-language support (Danish/English)
- [ ] Add tariffs and taxes to total price calculation
- [ ] CO2 emissions data integration

## License

MIT License - see LICENSE file for details.

## Acknowledgements

- [Energi Data Service](https://www.energidataservice.dk) for providing free electricity price data
- [Chart.js](https://www.chartjs.org/) for charting library
