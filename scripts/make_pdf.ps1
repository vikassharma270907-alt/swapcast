# Zero-dependency PDF generator in PowerShell (.NET inline).
# Builds Swapcast_Devpost_Submission.pdf from DEVPOST_SUBMISSION.md with correct xref offsets.

param(
  [string[]]$Sources = @("DEVPOST_SUBMISSION.md"),
  [string]$Out = "Swapcast_Devpost_Submission.pdf"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outPath = Join-Path $root $Out

$enc = [System.Text.Encoding]::GetEncoding(28591) # Latin1 / ISO-8859-1
$parts = @()
foreach ($f in $Sources) {
  $p = Join-Path $root $f
  $parts += (Get-Content -Raw -LiteralPath $p)
}
# Separate files with a horizontal rule so each starts cleanly.
$src = $parts -join "`n`n---`n`n"

# ---- layout ----
$PAGE_W = 612; $PAGE_H = 792
$MARGIN_X = 54; $MARGIN_TOP = 54; $MARGIN_BOTTOM = 54
$MAX_W = $PAGE_W - 2*$MARGIN_X

function CharWidth([char]$ch, [bool]$bold) {
  $narrow = "iljtfI.,:;'| "
  $wide = "mwMW@"
  if ($narrow.IndexOf($ch) -ge 0) { if ($bold) { return 320 } else { return 280 } }
  if ($wide.IndexOf($ch) -ge 0)   { if ($bold) { return 900 } else { return 860 } }
  if ($ch -ge 'A' -and $ch -le 'Z') { if ($bold) { return 720 } else { return 680 } }
  if ($bold) { return 560 } else { return 520 }
}
function TextWidth([string]$s, [double]$size, [bool]$bold) {
  $w = 0.0
  foreach ($c in $s.ToCharArray()) { $w += (CharWidth $c $bold) }
  return ($w / 1000.0) * $size
}
function Sanitize([string]$s) {
  $s = $s -replace "[\u2018\u2019]", "'"
  $s = $s -replace "[\u201C\u201D]", '"'
  $s = $s -replace "[\u2013\u2014]", "-"
  $s = $s -replace "\u2192", "->"
  $s = $s -replace "\u2265", ">="
  $s = $s -replace "\u2264", "<="
  $s = $s -replace "\u2022", "-"
  $sb = New-Object System.Text.StringBuilder
  foreach ($c in $s.ToCharArray()) {
    $code = [int]$c
    if ($code -eq 9 -or $code -eq 10 -or $code -eq 13 -or ($code -ge 32 -and $code -le 126) -or ($code -ge 160 -and $code -le 255)) {
      [void]$sb.Append($c)
    }
  }
  return $sb.ToString()
}
function EscapePdf([string]$s) {
  $s = $s -replace "\\", "\\"
  $s = $s -replace "\(", "\("
  $s = $s -replace "\)", "\)"
  return $s
}
function CleanInline([string]$s) {
  $star = [char]42
  $bt = [char]96
  $us = [char]95
  $s = [regex]::Replace($s, ('\{0}\{0}(.+?)\{0}\{0}' -f $star), '$1')
  $s = [regex]::Replace($s, ('{0}(.+?){0}' -f $bt), '$1')
  $s = [regex]::Replace($s, ('{0}(.+?){0}' -f $us), '$1')
  return $s
}
function Wrap([string]$text, [double]$size, [bool]$bold, [double]$maxW) {
  $words = $text -split "\s+" | Where-Object { $_ -ne "" }
  $lines = New-Object System.Collections.Generic.List[string]
  $cur = ""
  foreach ($word in $words) {
    if ($cur -eq "") { $trial = $word } else { $trial = "$cur $word" }
    if ((TextWidth $trial $size $bold) -gt $maxW -and $cur -ne "") {
      $lines.Add($cur); $cur = $word
    } else { $cur = $trial }
  }
  if ($cur -ne "") { $lines.Add($cur) }
  if ($lines.Count -eq 0) { $lines.Add("") }
  return $lines
}

$src = Sanitize $src
$rawLines = $src -split "`r?`n"

# Build blocks
$blocks = New-Object System.Collections.Generic.List[hashtable]
foreach ($line in $rawLines) {
  $t = $line.Trim()
  if ($t -eq "") { $blocks.Add(@{ type="space"; h=6 }); continue }
  if ($t -eq "---") { $blocks.Add(@{ type="rule" }); continue }
  if ($t.StartsWith("### ")) { $blocks.Add(@{ type="h3"; text=$t.Substring(4); size=12; bold=$true; gapBefore=8; gapAfter=3 }); continue }
  if ($t.StartsWith("## "))  { $blocks.Add(@{ type="h2"; text=$t.Substring(3); size=15; bold=$true; gapBefore=12; gapAfter=4 }); continue }
  if ($t.StartsWith("# "))   { $blocks.Add(@{ type="h1"; text=$t.Substring(2); size=20; bold=$true; gapBefore=4; gapAfter=8 }); continue }
  if ($t -match "^[-*] \[[ x]\] ") { $blocks.Add(@{ type="li"; text=("[ ] " + ($t -replace "^[-*] \[[ x]\] ", "")); size=10.5; indent=16 }); continue }
  if ($t -match "^[-*] ")    { $blocks.Add(@{ type="li"; text=($t -replace "^[-*] ", ""); size=10.5; indent=16 }); continue }
  if ($t -match "^\d+\. ")   { $blocks.Add(@{ type="li"; text=$t; size=10.5; indent=16 }); continue }
  $blocks.Add(@{ type="p"; text=$t; size=10.5 })
}

# Lay out into pages
$pages = New-Object System.Collections.Generic.List[System.Collections.Generic.List[hashtable]]
$ops = New-Object System.Collections.Generic.List[hashtable]
$y = $PAGE_H - $MARGIN_TOP
function NewPage {
  if ($script:ops.Count -gt 0) { $script:pages.Add($script:ops) }
  $script:ops = New-Object System.Collections.Generic.List[hashtable]
  $script:y = $PAGE_H - $MARGIN_TOP
}

foreach ($b in $blocks) {
  switch ($b.type) {
    "space" { $y -= $b.h; continue }
    "rule" {
      if ($y - 10 -lt $MARGIN_BOTTOM) { NewPage }
      $ops.Add(@{ rule=$true; y=($y-4) }); $y -= 10; continue
    }
    default {
      $size = [double]$b.size
      $bold = [bool]$b.bold
      $indent = 0; if ($b.ContainsKey("indent")) { $indent = $b.indent }
      $leading = $size * 1.35
      if ($b.ContainsKey("gapBefore")) { $y -= $b.gapBefore }
      $text = CleanInline $b.text
      $prefix = ""; if ($b.type -eq "li") { $prefix = "- " }
      $lines = Wrap ($prefix + $text) $size $bold ($MAX_W - $indent)
      for ($k=0; $k -lt $lines.Count; $k++) {
        if ($y - $leading -lt $MARGIN_BOTTOM) { NewPage }
        $xoff = 0.0
        if ($k -gt 0 -and $b.type -eq "li") { $xoff = (TextWidth "- " $size $bold) }
        $txt = $lines[$k]
        if ($k -gt 0 -and $b.type -eq "li") { $txt = $txt -replace "^- ", "" }
        $ops.Add(@{ x=($MARGIN_X + $indent + $xoff); y=$y; size=$size; bold=$bold; text=$txt })
        $y -= $leading
      }
      $gapAfter = 2; if ($b.ContainsKey("gapAfter")) { $gapAfter = $b.gapAfter }
      $y -= $gapAfter
    }
  }
}
NewPage

# Object numbering: 1 catalog, 2 pages, 3 F1, 4 F2, then per page content+page
$catalogNum=1; $pagesNum=2; $f1Num=3; $f2Num=4
$next=5
$contentNums=@(); $pageNums=@(); $streams=@()
foreach ($pageOps in $pages) {
  $sb = New-Object System.Text.StringBuilder
  foreach ($op in $pageOps) {
    if ($op.ContainsKey("rule")) {
      [void]$sb.Append(("{0} {1:F2} m {2:F2} {1:F2} l 0.6 w 0.6 0.6 0.6 RG S`n" -f $MARGIN_X, [double]$op.y, ($PAGE_W-$MARGIN_X)))
      continue
    }
    $font = "F1"; if ($op.bold) { $font = "F2" }
    $esc = EscapePdf $op.text
    [void]$sb.Append(("BT /{0} {1} Tf 0.1 0.12 0.16 rg {2:F2} {3:F2} Td ({4}) Tj ET`n" -f $font, [double]$op.size, [double]$op.x, [double]$op.y, $esc))
  }
  $contentNum=$next; $next++
  $pageNum=$next; $next++
  $contentNums += $contentNum; $pageNums += $pageNum
  $streams += @{ contentNum=$contentNum; pageNum=$pageNum; stream=$sb.ToString() }
}
$totalObjs = $next - 1

$OO = '<<'
$CC = '>>'
$bodies = @{}
$bodies[$catalogNum] = ('{0} /Type /Catalog /Pages {1} 0 R {2}' -f $OO, $pagesNum, $CC)
$kids = ($pageNums | ForEach-Object { "$_ 0 R" }) -join " "
$bodies[$pagesNum] = ('{0} /Type /Pages /Kids [{1}] /Count {2} {3}' -f $OO, $kids, $pageNums.Count, $CC)
$bodies[$f1Num] = ('{0} /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding {1}' -f $OO, $CC)
$bodies[$f2Num] = ('{0} /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding {1}' -f $OO, $CC)
foreach ($cs in $streams) {
  $len = $enc.GetByteCount($cs.stream)
  $bodies[$cs.contentNum] = ("{0} /Length {1} {2}`nstream`n{3}endstream" -f $OO, $len, $CC, $cs.stream)
  $bodies[$cs.pageNum] = ('{0} /Type /Page /Parent {1} 0 R /MediaBox [0 0 {2} {3}] /Resources {0} /Font {0} /F1 {4} 0 R /F2 {5} 0 R {6} {6} /Contents {7} 0 R {6}' -f $OO, $pagesNum, $PAGE_W, $PAGE_H, $f1Num, $f2Num, $CC, $cs.contentNum)
}

# Serialize
$ms = New-Object System.IO.MemoryStream
function WriteStr([string]$s) { $b = $enc.GetBytes($s); $ms.Write($b, 0, $b.Length) }

WriteStr "%PDF-1.4`n%$([char]0xE2)$([char]0xE3)$([char]0xCF)$([char]0xD3)`n"
$offsets = New-Object 'long[]' ($totalObjs + 1)
for ($n=1; $n -le $totalObjs; $n++) {
  $offsets[$n] = $ms.Length
  WriteStr "$n 0 obj`n$($bodies[$n])`nendobj`n"
}
$xrefStart = $ms.Length
WriteStr "xref`n0 $($totalObjs + 1)`n"
WriteStr "0000000000 65535 f `n"
for ($n=1; $n -le $totalObjs; $n++) {
  WriteStr ("{0:D10} 00000 n `n" -f $offsets[$n])
}
WriteStr "trailer`n<< /Size $($totalObjs + 1) /Root $catalogNum 0 R >>`nstartxref`n$xrefStart`n%%EOF"

[System.IO.File]::WriteAllBytes($outPath, $ms.ToArray())
Write-Output ("Wrote {0} ({1} pages, {2} objects, {3} bytes)." -f $outPath, $pages.Count, $totalObjs, $ms.Length)
