// Pure Node, zero-dependency PDF generator for the Devpost submission text.
// Run: node scripts/make_pdf.mjs
// Produces: Swapcast_Devpost_Submission.pdf at the repo root.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = readFileSync(join(root, "DEVPOST_SUBMISSION.md"), "utf8");

// --- layout constants ---
const PAGE_W = 612; // US Letter 8.5in * 72
const PAGE_H = 792; // 11in * 72
const MARGIN_X = 54;
const MARGIN_TOP = 54;
const MARGIN_BOTTOM = 54;
const MAX_W = PAGE_W - MARGIN_X * 2;

const FONTS = {
  regular: "F1", // Helvetica
  bold: "F2", // Helvetica-Bold
  oblique: "F3", // Helvetica-Oblique
  mono: "F4", // Courier
};

// Approx Helvetica char widths (per 1000 units) for common ASCII. Good enough for wrapping.
// We use a conservative average fallback for anything missing.
function charWidth(ch, bold) {
  // rough widths at 1000 units/em
  const narrow = "iljtfI.,:;'| ";
  const wide = "mwMW@";
  if (narrow.includes(ch)) return bold ? 320 : 280;
  if (wide.includes(ch)) return bold ? 900 : 860;
  if (ch >= "A" && ch <= "Z") return bold ? 720 : 680;
  return bold ? 560 : 520;
}

function textWidth(str, size, bold) {
  let w = 0;
  for (const ch of str) w += charWidth(ch, bold);
  return (w / 1000) * size;
}

function escapePdf(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Replace non-Latin1 chars so the PDF stays valid in WinAnsi.
function sanitize(s) {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/\u2022/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

function wrap(text, size, bold, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const word of words) {
    const trial = cur ? cur + " " + word : word;
    if (textWidth(trial, size, bold) > maxW && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = trial;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

// Parse the markdown into styled blocks.
const rawLines = sanitize(src).split(/\r?\n/);
const blocks = []; // {type, text, font, size, gapBefore, gapAfter, indent}

for (let i = 0; i < rawLines.length; i++) {
  let line = rawLines[i];
  const trimmed = line.trim();
  if (trimmed === "") {
    blocks.push({ type: "space", h: 6 });
    continue;
  }
  if (trimmed === "---") {
    blocks.push({ type: "rule" });
    continue;
  }
  if (trimmed.startsWith("### ")) {
    blocks.push({ type: "h3", text: trimmed.slice(4), size: 12, bold: true, gapBefore: 8, gapAfter: 3 });
  } else if (trimmed.startsWith("## ")) {
    blocks.push({ type: "h2", text: trimmed.slice(3), size: 15, bold: true, gapBefore: 12, gapAfter: 4 });
  } else if (trimmed.startsWith("# ")) {
    blocks.push({ type: "h1", text: trimmed.slice(2), size: 20, bold: true, gapBefore: 4, gapAfter: 8 });
  } else if (/^[-*] \[[ x]\] /.test(trimmed)) {
    blocks.push({ type: "li", text: "[ ] " + trimmed.replace(/^[-*] \[[ x]\] /, ""), size: 10.5, indent: 16 });
  } else if (/^[-*] /.test(trimmed)) {
    blocks.push({ type: "li", text: trimmed.replace(/^[-*] /, ""), size: 10.5, indent: 16 });
  } else if (/^\d+\. /.test(trimmed)) {
    const m = trimmed.match(/^(\d+)\. (.*)$/);
    blocks.push({ type: "li", text: m[1] + ". " + m[2], size: 10.5, indent: 16 });
  } else {
    blocks.push({ type: "p", text: trimmed, size: 10.5 });
  }
}

// Strip inline markdown emphasis markers (keep text).
function cleanInline(s) {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1").replace(/_(.+?)_/g, "$1");
}

// Build pages: each is an array of draw ops {x, y, size, bold, text} plus rules.
const pages = [];
let ops = [];
let y = PAGE_H - MARGIN_TOP;

function newPage() {
  if (ops.length) pages.push(ops);
  ops = [];
  y = PAGE_H - MARGIN_TOP;
}

function ensure(space) {
  if (y - space < MARGIN_BOTTOM) newPage();
}

for (const b of blocks) {
  if (b.type === "space") {
    y -= b.h;
    continue;
  }
  if (b.type === "rule") {
    ensure(10);
    ops.push({ rule: true, y: y - 4 });
    y -= 10;
    continue;
  }
  const size = b.size;
  const bold = !!b.bold;
  const indent = b.indent || 0;
  const leading = size * 1.35;
  y -= b.gapBefore || 0;
  const text = cleanInline(b.text);
  const prefix = b.type === "li" ? "- " : "";
  const lines = wrap(prefix + text, size, bold, MAX_W - indent);
  for (let k = 0; k < lines.length; k++) {
    ensure(leading);
    ops.push({
      x: MARGIN_X + indent + (k > 0 && b.type === "li" ? textWidth("- ", size, bold) : 0),
      y: y,
      size,
      bold,
      text: k > 0 && b.type === "li" ? lines[k].replace(/^- /, "") : lines[k],
    });
    y -= leading;
  }
  y -= b.gapAfter || 2;
}
newPage();

// --- assemble PDF ---
const objects = [];
function addObj(body) {
  objects.push(body);
  return objects.length; // 1-based object number
}

// Reserve: 1 catalog, 2 pages, fonts, then page+content pairs.
// We'll compute numbers after building.
const fontRegular = { n: 0 };
const fontBold = { n: 0 };

// Content streams for each page
const pageContentNums = [];
const pageNums = [];

// Placeholder: we assign object numbers sequentially.
// Order: catalog(1), pages(2), font F1(3), font F2(4), then per page: content, page.
const catalogNum = 1;
const pagesNum = 2;
const f1Num = 3;
const f2Num = 4;
let nextNum = 5;

const contentStreams = [];
for (const pageOps of pages) {
  let stream = "";
  for (const op of pageOps) {
    if (op.rule) {
      stream += `${MARGIN_X} ${op.y.toFixed(2)} m ${(PAGE_W - MARGIN_X).toFixed(2)} ${op.y.toFixed(2)} l 0.6 w 0.6 0.6 0.6 RG S\n`;
      continue;
    }
    const font = op.bold ? FONTS.bold : FONTS.regular;
    stream += `BT /${font} ${op.size} Tf 0.1 0.12 0.16 rg ${op.x.toFixed(2)} ${op.y.toFixed(2)} Td (${escapePdf(op.text)}) Tj ET\n`;
  }
  const contentNum = nextNum++;
  const pageNum = nextNum++;
  contentStreams.push({ contentNum, pageNum, stream });
  pageContentNums.push(contentNum);
  pageNums.push(pageNum);
}

// Build object bodies keyed by number.
const bodies = new Map();
bodies.set(catalogNum, `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`);
bodies.set(
  pagesNum,
  `<< /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageNums.length} >>`
);
bodies.set(f1Num, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
bodies.set(f2Num, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);

for (const cs of contentStreams) {
  const bytes = Buffer.byteLength(cs.stream, "latin1");
  bodies.set(cs.contentNum, `<< /Length ${bytes} >>\nstream\n${cs.stream}endstream`);
  bodies.set(
    cs.pageNum,
    `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 ${f1Num} 0 R /F2 ${f2Num} 0 R >> >> /Contents ${cs.contentNum} 0 R >>`
  );
}

const totalObjs = nextNum - 1;

// Serialize with xref.
let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
const offsets = new Array(totalObjs + 1).fill(0);
for (let n = 1; n <= totalObjs; n++) {
  offsets[n] = Buffer.byteLength(pdf, "latin1");
  pdf += `${n} 0 obj\n${bodies.get(n)}\nendobj\n`;
}
const xrefStart = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${totalObjs + 1}\n`;
pdf += `0000000000 65535 f \n`;
for (let n = 1; n <= totalObjs; n++) {
  pdf += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${totalObjs + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

writeFileSync(join(root, "Swapcast_Devpost_Submission.pdf"), Buffer.from(pdf, "latin1"));
console.log(`Wrote Swapcast_Devpost_Submission.pdf (${pages.length} pages, ${totalObjs} objects).`);
