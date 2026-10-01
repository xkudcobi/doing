# doing installer — irm https://raw.githubusercontent.com/xkudcobi/doing/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'doing needs Node.js 18+ — install it from https://nodejs.org and run this again.'
  return
}

$major = [int](node -p 'process.versions.node.split(".")[0]')
if ($major -lt 18) {
  Write-Host "doing needs Node.js 18+ (found $(node -v)). Update Node and run this again."
  return
}

Write-Host 'installing doing…'
npm install -g https://github.com/xkudcobi/doing/archive/refs/heads/main.tar.gz
Write-Host ''
Write-Host 'done — run: doing'
