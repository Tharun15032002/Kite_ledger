Add-Type -AssemblyName System.Drawing

$assetsDir = Join-Path $PSScriptRoot "assets"
if (!(Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir | Out-Null
}

function Draw-ExactKiteLogo {
    param (
        [int]$Width,
        [int]$Height,
        [string]$OutputPath,
        [bool]$IsAdaptiveForeground = $false
    )

    $bmp = New-Object System.Drawing.Bitmap -ArgumentList $Width, $Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # 1. Background
    if ($IsAdaptiveForeground) {
        $g.Clear([System.Drawing.Color]::Transparent)
    } else {
        $bgBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.ColorTranslator]::FromHtml("#071912"))
        $g.FillRectangle($bgBrush, 0, 0, $Width, $Height)
        $bgBrush.Dispose()
    }

    $scale = [float]($Width / 1024.0)
    # Adaptive foreground scales inside safe zone (70%), full icon at 82%
    $innerScale = if ($IsAdaptiveForeground) { $scale * 0.70 } else { $scale * 0.82 }
    $cx = [float]($Width / 2.0)
    $cy = [float]($Height / 2.0)

    # 2. Pen Configuration: Crisp white outline with rounded joins & caps
    $penStroke = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::White), ([float](44.0 * $innerScale))
    $penStroke.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penStroke.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penStroke.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    # 3. Exact Geometry: Sharp Nose at Top-Right, Swept Wings, Inward Center Crease
    $pTip    = New-Object System.Drawing.PointF -ArgumentList ($cx + (220.0 * $innerScale)), ($cy - (220.0 * $innerScale))  # Sharp Top-Right Nose
    $pLeft   = New-Object System.Drawing.PointF -ArgumentList ($cx - (230.0 * $innerScale)), ($cy - (60.0 * $innerScale))   # Left Wing Tip
    $pBottom = New-Object System.Drawing.PointF -ArgumentList ($cx + (60.0 * $innerScale)), ($cy + (230.0 * $innerScale))   # Bottom Wing Tip
    $pFold   = New-Object System.Drawing.PointF -ArgumentList ($cx - (15.0 * $innerScale)), ($cy + (15.0 * $innerScale))    # Inner Center Inset Point

    # Outer perimeter outline
    [System.Drawing.PointF[]]$outerPlane = @($pTip, $pLeft, $pFold, $pBottom)
    $g.DrawPolygon($penStroke, $outerPlane)

    # Center crease line from the sharp tip straight to inner fold
    $g.DrawLine($penStroke, $pTip, $pFold)

    # Clean up
    $penStroke.Dispose()
    $g.Dispose()

    # Save output
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

Write-Host "Generating pixel-exact Kite Ledger icon assets..." -ForegroundColor Cyan

# 1. Full Main Icon (1024x1024)
Draw-ExactKiteLogo -Width 1024 -Height 1024 -OutputPath (Join-Path $assetsDir "icon.png") -IsAdaptiveForeground $false

# 2. Android Adaptive Foreground (1024x1024, Transparent)
Draw-ExactKiteLogo -Width 1024 -Height 1024 -OutputPath (Join-Path $assetsDir "adaptive-icon.png") -IsAdaptiveForeground $true

# 3. Splash Screen (1242x2436)
Draw-ExactKiteLogo -Width 1242 -Height 2436 -OutputPath (Join-Path $assetsDir "splash.png") -IsAdaptiveForeground $false

# 4. Web Favicon (48x48)
Draw-ExactKiteLogo -Width 48 -Height 48 -OutputPath (Join-Path $assetsDir "favicon.png") -IsAdaptiveForeground $false

Write-Host "All assets successfully generated!" -ForegroundColor Green