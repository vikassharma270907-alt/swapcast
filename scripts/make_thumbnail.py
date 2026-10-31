import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(ROOT, "Swapcast_Thumbnail.png")

# Load fonts
try:
    FONT_HERO = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 96)
    FONT_SUBHERO = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 38)
    FONT_BADGE = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 24)
    FONT_CARD_TITLE = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 28)
    FONT_BODY = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 22)
    FONT_BODY_BOLD = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 22)
    FONT_SMALL = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 18)
    FONT_MONO = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 24)
    FONT_STAT = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 64)
except Exception:
    FONT_HERO = ImageFont.load_default()
    FONT_SUBHERO = ImageFont.load_default()
    FONT_BADGE = ImageFont.load_default()
    FONT_CARD_TITLE = ImageFont.load_default()
    FONT_BODY = ImageFont.load_default()
    FONT_BODY_BOLD = ImageFont.load_default()
    FONT_SMALL = ImageFont.load_default()
    FONT_MONO = ImageFont.load_default()
    FONT_STAT = ImageFont.load_default()

# Colors
BG_DARK = (10, 15, 29)
CARD_BG = (17, 24, 39)
CARD_BORDER = (55, 65, 81)
CYAN_ACCENT = (6, 182, 212)
EMERALD_ACCENT = (16, 185, 129)
ROSE_ACCENT = (244, 63, 94)
PURPLE_ACCENT = (139, 92, 246)
TEXT_WHITE = (248, 250, 252)
TEXT_MUTED = (148, 163, 184)
NAV_BG = (15, 23, 42)

img = Image.new("RGB", (1920, 1080), BG_DARK)
draw = ImageDraw.Draw(img)

# Background subtle gradient / grid effect
for y in range(0, 1080, 40):
    draw.line([(0, y), (1920, y)], fill=(15, 22, 38), width=1)
for x in range(0, 1920, 40):
    draw.line([(x, 0), (x, 1080)], fill=(15, 22, 38), width=1)

# Outer decorative border
draw.rectangle([20, 20, 1900, 1060], outline=CYAN_ACCENT, width=3)

# Top Bar / Category Tag
draw.rounded_rectangle([80, 60, 460, 115], radius=10, fill=(30, 41, 59), outline=CYAN_ACCENT, width=2)
draw.text((105, 73), "QLOO HACKATHON 2026", fill=CYAN_ACCENT, font=FONT_BADGE)

draw.rounded_rectangle([480, 60, 840, 115], radius=10, fill=(16, 185, 129), outline=EMERALD_ACCENT, width=2)
draw.text((505, 73), "OFFICIAL DEMO VIDEO", fill=BG_DARK, font=FONT_BADGE)

# Main Hero Branding Left Side
draw.text((80, 150), "SWAPCAST", fill=TEXT_WHITE, font=FONT_HERO)

# Cyan underline bar under title
draw.rectangle([80, 260, 720, 270], fill=CYAN_ACCENT)

# Subtitle hook
draw.text((80, 290), "Find the Podcasts That Should Be Promoting Yours", fill=TEXT_WHITE, font=FONT_SUBHERO)
draw.text((80, 350), "Powered by Qloo's Cultural Taste Graph", fill=CYAN_ACCENT, font=FONT_CARD_TITLE)

# 3 Feature Pills on Left
pills = [
    ("✓ Popularity-Banded Peers", "Reachable shows your exact size, not unreachable giants", CYAN_ACCENT),
    ("✓ Two-Way Mutual Fit Check", "Algorithmic proof their audience loves you back", EMERALD_ACCENT),
    ("✓ Automated Pitch & Sponsors", "Outreach with Qloo evidence + brand monetization leads", PURPLE_ACCENT)
]

y_pill = 430
for title, sub, col in pills:
    draw.rounded_rectangle([80, y_pill, 880, y_pill + 100], radius=14, fill=CARD_BG, outline=col, width=2)
    draw.text((110, y_pill + 18), title, fill=col, font=FONT_CARD_TITLE)
    draw.text((110, y_pill + 58), sub, fill=TEXT_MUTED, font=FONT_BODY)
    y_pill += 120

# Stat callout at bottom left
draw.rounded_rectangle([80, 810, 880, 1000], radius=14, fill=(24, 15, 25), outline=ROSE_ACCENT, width=2)
draw.text((110, 835), "Median Podcast: 27 Downloads In Week 1", fill=ROSE_ACCENT, font=FONT_CARD_TITLE)
draw.text((110, 880), "Swapcast turns guesswork into guaranteed mutual taste matches.", fill=TEXT_WHITE, font=FONT_BODY)
draw.text((110, 925), "Freemium · Pro CRM · B2B White-Label 'Grow' Tab", fill=TEXT_MUTED, font=FONT_BODY_BOLD)

# Right Side: Visual Mockup Showcase (The Swap Board Hero Card)
draw.rounded_rectangle([940, 150, 1840, 1000], radius=20, fill=CARD_BG, outline=CARD_BORDER, width=3)

# Mockup Header
draw.rectangle([940, 150, 1840, 240], fill=NAV_BG)
draw.line([940, 240, 1840, 240], fill=CARD_BORDER, width=2)
draw.text((980, 175), "SWAP BOARD DEMO: This Week in Startups (0.82)", fill=TEXT_WHITE, font=FONT_CARD_TITLE)
draw.text((1600, 178), "Live Trace", fill=EMERALD_ACCENT, font=FONT_BADGE)

# Featured Card 1 (Top Mutual Match)
draw.rounded_rectangle([980, 270, 1800, 480], radius=16, fill=(12, 35, 30), outline=EMERALD_ACCENT, width=3)
draw.rounded_rectangle([1010, 295, 1260, 340], radius=8, fill=EMERALD_ACCENT)
draw.text((1025, 305), "TWO-WAY MATCH", fill=BG_DARK, font=FONT_BADGE)
draw.text((1300, 305), "Weakest-Link Rank: #3", fill=CYAN_ACCENT, font=FONT_CARD_TITLE)

draw.text((1010, 360), "The Twenty Minute VC (20VC)", fill=TEXT_WHITE, font=FONT_HERO)
draw.text((1010, 425), "• Rank #2 in TWiST listeners  ·  Rank #3 in 20VC listeners", fill=CYAN_ACCENT, font=FONT_BODY_BOLD)

# Featured Card 2 (Acquired)
draw.rounded_rectangle([980, 510, 1800, 680], radius=16, fill=(15, 23, 42), outline=CYAN_ACCENT, width=2)
draw.rounded_rectangle([1010, 530, 1220, 570], radius=8, fill=CYAN_ACCENT)
draw.text((1030, 538), "GUEST SWAP", fill=BG_DARK, font=FONT_BADGE)
draw.text((1010, 590), "Acquired", fill=TEXT_WHITE, font=FONT_CARD_TITLE)
draw.text((1010, 630), "• 88% Tag Overlap (Technology, Startups, VC) · Weakest Rank: #9", fill=TEXT_MUTED, font=FONT_BODY)

# Featured Card 3 (Pitch preview & Brand leads)
draw.rounded_rectangle([980, 710, 1800, 960], radius=16, fill=(15, 23, 42), outline=PURPLE_ACCENT, width=2)
draw.text((1010, 730), "VERIFIED QLOO PROMO PITCH & SPONSOR LEADS", fill=PURPLE_ACCENT, font=FONT_CARD_TITLE)
draw.text((1010, 775), "Pitch Subject: Promo Swap Idea: TWiST x 20VC (Evidence Baked In)", fill=TEXT_WHITE, font=FONT_BODY)
draw.text((1010, 815), "Tracking Link: swapcast.co/tr/twist-20vc (Attribution Measurement)", fill=CYAN_ACCENT, font=FONT_MONO)
draw.line([1010, 860, 1770, 860], fill=CARD_BORDER, width=1)
draw.text((1010, 880), "High-Affinity Sponsors:", fill=TEXT_MUTED, font=FONT_BODY_BOLD)
draw.text((1270, 880), "Linear · Vanta · Mercury · Ramp (Mid-Market) | Stripe · Notion (Household)", fill=TEXT_WHITE, font=FONT_BODY)

img.save(OUTPUT_PATH, "PNG")
print(f"Thumbnail created at {OUTPUT_PATH}")

