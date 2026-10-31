<#
  Swapcast -> Vercel deploy helper
  --------------------------------
  Run in your OWN PowerShell (not inside Kiro's sandbox), from d:\qloo hackathon:

      .\deploy.ps1

  It installs the Vercel CLI if needed, logs you in (browser), links the
  project, sets the env vars, deploys to production, and smoke-tests the result.

  Your API key is read from .env.local and piped straight to Vercel. It is
  never printed, never written to disk, and never committed.
#>

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Step($n, $msg) { Write-Host "`n=== [$n] $msg ===" -ForegroundColor Cyan }

# --- Read the key from .env.local (no echo) ---
if (-not (Test-Path ".env.local")) { throw ".env.local not found. Create it with QLOO_API_KEY=... first." }
$envLines = Get-Content ".env.local"
$keyLine = $envLines | Where-Object { $_ -match '^\s*QLOO_API_KEY\s*=' } | Select-Object -First 1
$QLOO_KEY = ($keyLine -replace '^\s*QLOO_API_KEY\s*=\s*', '').Trim().Trim('"').Trim("'")
if (-not $QLOO_KEY) { throw "QLOO_API_KEY is empty in .env.local." }
$asciiOk = $QLOO_KEY -cmatch '^[\x21-\x7E]+$'
if (-not $asciiOk) { throw "QLOO_API_KEY has non-ASCII or whitespace characters. Re-paste it cleanly into .env.local." }
$keyLen = $QLOO_KEY.Length
Write-Host "QLOO_API_KEY loaded from .env.local ($keyLen chars)." -ForegroundColor Green

# Optional LLM key (enables qloo+llm mode) - only if present and uncommented.
$llmLine = $envLines | Where-Object { $_ -match '^\s*(OPENAI_API_KEY|LLM_API_KEY)\s*=' -and $_ -notmatch '^\s*#' } | Select-Object -First 1
$LLM_KEY = if ($llmLine) { ($llmLine -replace '^\s*(OPENAI_API_KEY|LLM_API_KEY)\s*=\s*', '').Trim().Trim('"').Trim("'") } else { "" }

$BASE_URL = "https://hackathon.api.qloo.com"

# --- 0. Vercel CLI ---
Step 0 "Checking Vercel CLI"
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Vercel CLI not found. Installing globally (npm i -g vercel)..."
    npm i -g vercel
}
vercel --version

# --- 1. Login (browser) ---
Step 1 "Logging in to Vercel (a browser window will open)"
try { vercel whoami 2>$null | Out-Null; $loggedIn = $LASTEXITCODE -eq 0 } catch { $loggedIn = $false }
if (-not $loggedIn) { vercel login } else { Write-Host "Already logged in as: $(vercel whoami)" -ForegroundColor Green }

# --- 2. Link the project ---
Step 2 "Linking this folder to a Vercel project"
if (Test-Path ".vercel\project.json") {
    Write-Host "Already linked (.vercel/project.json exists)." -ForegroundColor Green
} else {
    vercel link
}

# --- 3. Set env vars ---
# Helper: remove an existing var (ignore errors) then add the new value.
# Note: current Vercel CLI dropped the `--type` flag; env vars are plain and
# the value is piped on stdin.
function Set-VercelEnv($name, $value, $target) {
    try { vercel env rm $name $target --yes 2>$null | Out-Null } catch {}
    $value | vercel env add $name $target
}

Step 3 "Setting environment variables"
foreach ($t in @("production", "preview")) {
    Set-VercelEnv "QLOO_API_KEY" $QLOO_KEY $t
    Set-VercelEnv "QLOO_BASE_URL" $BASE_URL $t
    if ($LLM_KEY) { Set-VercelEnv "OPENAI_API_KEY" $LLM_KEY $t }
}
if ($LLM_KEY) { Write-Host "LLM key set -> qloo+llm mode enabled." -ForegroundColor Green }
else { Write-Host "No LLM key found -> qloo-only mode (template pitches). That is fine." -ForegroundColor Yellow }

# --- 4. Deploy to production ---
Step 4 "Deploying to production"
$deployOut = vercel --prod 2>&1 | Tee-Object -Variable _o
$prodUrl = ($deployOut | Select-String -Pattern 'https://\S+\.vercel\.app' | Select-Object -Last 1).Matches.Value
if (-not $prodUrl) { $prodUrl = Read-Host "Could not parse the URL. Paste your production URL" }
Write-Host "`nProduction URL: $prodUrl" -ForegroundColor Green

# --- 5. Smoke test (confirms live mode without reading logs) ---
Step 5 "Smoke-testing the live deployment"
try {
    $body = '{"hostId":"demo:twist"}'
    $resp = Invoke-WebRequest "$prodUrl/api/plan" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 60 -UseBasicParsing
    $planLine = ($resp.Content -split "`n" | Where-Object { $_ -match '"kind":"plan"' } | Select-Object -First 1)
    if ($planLine -match '"mode":"(qloo\+llm|qloo-only)"') {
        Write-Host "LIVE OK  mode = $($Matches[1])" -ForegroundColor Green
    } elseif ($planLine -match '"mode":"demo"') {
        Write-Host "STILL DEMO - the key is not active. Re-check the Vercel env var and that the deploy finished." -ForegroundColor Red
    } else {
        Write-Host "Got a response but could not read the mode. Open $prodUrl in a private window and check the badge." -ForegroundColor Yellow
        Write-Host ($resp.Content.Substring(0, [Math]::Min(400, $resp.Content.Length)))
    }
} catch {
    Write-Host "Smoke test request failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Open $prodUrl in a private window and run an example chip manually." -ForegroundColor Yellow
}

# --- Cleanup ---
Remove-Variable QLOO_KEY, LLM_KEY -ErrorAction SilentlyContinue
Write-Host "`nDone. Open $prodUrl in a PRIVATE window and run each example chip." -ForegroundColor Cyan
Write-Host "Expect the trace to show '/entities 200' and '/search 200', and the badge to read 'Live Qloo'." -ForegroundColor Cyan
