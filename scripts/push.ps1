# 一键推送更新：提交全部改动并推送到 GitHub（Netlify 会自动重新部署）
# 用法：powershell -File scripts\push.ps1 "更新说明"
param([string]$Message = "update")

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

git add -A
git commit -m $Message
git push

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ 已推送到 GitHub，Netlify 将自动部署"
} else {
  Write-Host "❌ 推送失败，请检查网络或 GitHub 登录"
}
