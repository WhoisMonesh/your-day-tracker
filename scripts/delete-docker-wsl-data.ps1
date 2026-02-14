param()
$admin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { Write-Error "Run this script in an Administrator PowerShell"; exit 1 }
try { wsl --shutdown } catch { }
try { Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue } catch { }
try { net stop com.docker.service | Out-Null } catch { }
$paths = @(
    (Join-Path $env:LOCALAPPDATA "Docker\wsl\disk\docker_data.vhdx"),
    (Join-Path $env:LOCALAPPDATA "Docker\wsl\main\ext4.vhdx")
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        try { Remove-Item -LiteralPath $p -Force } catch { Write-Error $_ }
    }
}
Get-PSDrive C | Select-Object Free, Used, @{N="FreeGB";E={[math]::Round($_.Free/1GB,2)}}, @{N="UsedGB";E={[math]::Round($_.Used/1GB,2)}}
