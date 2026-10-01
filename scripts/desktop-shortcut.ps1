# Puts a "doing" shortcut with the app icon on the Windows desktop.
#   powershell -ExecutionPolicy Bypass -File scripts\desktop-shortcut.ps1
$ErrorActionPreference = 'Stop'

if (-not (Get-Command doing -ErrorAction SilentlyContinue)) {
  Write-Host 'doing is not installed yet — run "npm install -g https://github.com/xkudcobi/doing/archive/refs/heads/main.tar.gz" (or "npm link" in this repo) first.'
  exit 1
}

# keep the icon somewhere stable, so the shortcut survives moving the repo
$home_dir = Join-Path $env:USERPROFILE '.doing'
New-Item -ItemType Directory -Force $home_dir | Out-Null
$icon = Join-Path $home_dir 'doing.ico'
Copy-Item (Join-Path $PSScriptRoot '..\assets\icon.ico') $icon -Force

# Windows Terminal renders the block-letter UI best; plain cmd works too
$wt = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\wt.exe'
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'doing.lnk'))
if (Test-Path $wt) {
  $link.TargetPath = $wt
  $link.Arguments = "--title doing --suppressApplicationTitle -d `"$env:USERPROFILE`" cmd /c doing"
} else {
  $link.TargetPath = Join-Path $env:SystemRoot 'System32\cmd.exe'
  $link.Arguments = '/c doing'
}
$link.WorkingDirectory = $env:USERPROFILE
$link.IconLocation = "$icon,0"
$link.Description = 'doing — indir. dönüştür. temizle.'
$link.Save()
Write-Host "shortcut created: $($link.FullName)"
