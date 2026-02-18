# PowerShell script to set up Android TWA icons from existing PWA icons
# Run this from the project root: .\android-twa\setup-icons.ps1

$androidRes = "android-twa\app\src\main\res"

# Create mipmap directories
$densities = @("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi")
foreach ($density in $densities) {
    $dir = "$androidRes\mipmap-$density"
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Copy icons with appropriate sizes
# mdpi: 48x48 (use 72 and resize)
# hdpi: 72x72
# xhdpi: 96x96
# xxhdpi: 144x144
# xxxhdpi: 192x192

Copy-Item "icons\icon-72.png" "$androidRes\mipmap-hdpi\ic_launcher.png"
Copy-Item "icons\icon-72.png" "$androidRes\mipmap-hdpi\ic_launcher_round.png"
Copy-Item "icons\icon-96.png" "$androidRes\mipmap-xhdpi\ic_launcher.png"
Copy-Item "icons\icon-96.png" "$androidRes\mipmap-xhdpi\ic_launcher_round.png"
Copy-Item "icons\icon-144.png" "$androidRes\mipmap-xxhdpi\ic_launcher.png"
Copy-Item "icons\icon-144.png" "$androidRes\mipmap-xxhdpi\ic_launcher_round.png"
Copy-Item "icons\icon-192.png" "$androidRes\mipmap-xxxhdpi\ic_launcher.png"
Copy-Item "icons\icon-192.png" "$androidRes\mipmap-xxxhdpi\ic_launcher_round.png"

# For mdpi, use the 72px icon (slightly larger but will work)
Copy-Item "icons\icon-72.png" "$androidRes\mipmap-mdpi\ic_launcher.png"
Copy-Item "icons\icon-72.png" "$androidRes\mipmap-mdpi\ic_launcher_round.png"

Write-Host "Icons copied to Android resource directories!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open android-twa folder in Android Studio"
Write-Host "2. Create a signing keystore"
Write-Host "3. Update .well-known/assetlinks.json with your SHA256 fingerprint"
Write-Host "4. Build the signed APK"
