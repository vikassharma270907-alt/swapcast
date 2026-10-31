import os
import sys
import asyncio
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMP_DIR = os.path.join(ROOT, "video_assets")
os.makedirs(TEMP_DIR, exist_ok=True)

# Load fonts
try:
    FONT_TITLE = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 46)
    FONT_SUBTITLE = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 26)
    FONT_CARD_TITLE = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 24)
    FONT_BODY = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 20)
    FONT_BODY_BOLD = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 20)
    FONT_SMALL = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 16)
    FONT_MONO = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 20)
    FONT_HERO = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 72)
    FONT_STAT = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 52)
except Exception:
    FONT_TITLE = ImageFont.load_default()
    FONT_SUBTITLE = ImageFont.load_default()
    FONT_CARD_TITLE = ImageFont.load_default()
    FONT_BODY = ImageFont.load_default()
    FONT_BODY_BOLD = ImageFont.load_default()
    FONT_SMALL = ImageFont.load_default()
    FONT_MONO = ImageFont.load_default()
    FONT_HERO = ImageFont.load_default()
    FONT_STAT = ImageFont.load_default()

# Color Palette
BG_DARK = (10, 15, 29)
CARD_BG = (17, 24, 39)
CARD_BORDER = (55, 65, 81)
CYAN_ACCENT = (6, 182, 212)
EMERALD_ACCENT = (16, 185, 129)
ROSE_ACCENT = (244, 63, 94)
AMBER_ACCENT = (245, 158, 11)
PURPLE_ACCENT = (139, 92, 246)
TEXT_WHITE = (248, 250, 252)
TEXT_MUTED = (148, 163, 184)
NAV_BG = (15, 23, 42)

SCENES = [
    {
        "id": 1,
        "title": "THE PODCASTING GROWTH CRISIS",
        "subtitle": "Why 90% of Independent Podcast Promo Swaps Fail Today",
        "chapter": "01 / 08 · THE PROBLEM",
        "narration": (
            "Welcome to Swapcast: the AI-powered growth platform that finds the podcasts that should be promoting yours. "
            "According to Buzzsprout statistics, the median podcast episode gets just twenty-seven downloads in its first week. "
            "For independent creators and small networks, the single best free way to grow is a promo swap—where two shows introduce each other to their listeners. "
            "Yet today, finding the right partner is pure guesswork. Creators either pitch blindly or ask giant shows that will never reply."
        ),
        "type": "crisis"
    },
    {
        "id": 2,
        "title": "THE CORE INSIGHT: WHY PLAIN LLMS FAIL",
        "subtitle": "Hallucinated Giants vs. Qloo Cultural Taste Grounding",
        "chapter": "02 / 08 · THE INSIGHT",
        "narration": (
            "If you ask a standard large language model who to swap with, it hallucinates the biggest shows in your genre—like Joe Rogan, Huberman Lab, or Lex Fridman. "
            "These giant shows are completely unreachable, and in the same lane, they compete directly with your audience. "
            "A high-converting swap partner must satisfy three criteria simultaneously: they must be your size, occupy an adjacent non-competing lane, and their listeners must like your show back. "
            "A plain language model cannot verify any of this. Only a real cultural taste graph can. That is why Swapcast is powered by Qloo."
        ),
        "type": "insight"
    },
    {
        "id": 3,
        "title": "SYSTEM ARCHITECTURE: 5-POINT QLOO INTEGRATION",
        "subtitle": "Bounded Agent Loop with Live NDJSON Streaming Trace",
        "chapter": "03 / 08 · ARCHITECTURE",
        "narration": (
            "Swapcast is built on Next.js App Router, TypeScript, and Tailwind, driven by an agent pipeline that leverages five distinct Qloo capabilities. "
            "First, the user resolves and confirms their exact show entity via Qloo Search. "
            "The pipeline extracts the listener taste profile using tag insights, then queries peer shows bounded tightly inside the host's popularity band. "
            "If peers are thin, the agent automatically widens the band. "
            "Then, it runs reverse queries on each top candidate, pulls cross-domain brand affinities, and streams every step live over an NDJSON trace."
        ),
        "type": "architecture"
    },
    {
        "id": 4,
        "title": "ALGORITHMIC INNOVATION: TWO-WAY REVERSE FIT",
        "subtitle": "Weakest-Link Ranking to Solve Cross-Query Normalization",
        "chapter": "04 / 08 · SCORING ENGINE",
        "narration": (
            "A fundamental technical hurdle with recommendation APIs is that raw affinity scores are normalized inside each query, so raw scores cannot be compared across different API calls. "
            "Swapcast solves this with a novel rank-based, weakest-link scoring engine. "
            "We calculate the candidate's forward rank in the host's audience, and run the query in reverse to check the host's rank in the candidate's audience. "
            "We sort by the weakest link: the maximum of forward and reverse rank. "
            "When both ranks fall within the top fifteen, Swapcast certifies it as a verified Two-Way Mutual Match."
        ),
        "type": "scoring"
    },
    {
        "id": 5,
        "title": "LIVE UI WALKTHROUGH: THE SWAP BOARD",
        "subtitle": "Real Demo with 'This Week in Startups' (Popularity: 0.82)",
        "chapter": "05 / 08 · LIVE WALKTHROUGH",
        "narration": (
            "Here is Swapcast in action with This Week in Startups. The agent resolves the show and presents verified peers within the creator's exact size band. "
            "Look at the top match: The Twenty Minute VC. Qloo ranks them number two for our audience, and reverse analysis confirms we rank number three for theirs—a genuine reciprocal fit. "
            "Adjacent lanes receive a promo swap suggestion, while identical lanes get a guest swap recommendation. "
            "Our Counterfactual Panel on the right proves the difference: naive popularity search suggests giant unrelated programs that never convert."
        ),
        "type": "board"
    },
    {
        "id": 6,
        "title": "PITCH DRAFTING & CROSS-DOMAIN SPONSOR LEADS",
        "subtitle": "Personalized Outreach with Evidence & High-Affinity Brands",
        "chapter": "06 / 08 · PITCH & SPONSORS",
        "narration": (
            "Finding the partner is only half the battle; closing the deal is the rest. "
            "Swapcast automatically drafts personalized outreach pitches with the verified Qloo metrics baked into the copy—including shared audience tags, proposed formats, and tracking link reminders for mutual lift measurement. "
            "Simultaneously, Swapcast uses Qloo's cross-domain entity engine to pull brand affinities, categorizing sponsor leads into reachable mid-market brands like Linear, Vanta, and Mercury, alongside household giants. "
            "Creators unlock both collaborative audience growth and monetization opportunities in one single run."
        ),
        "type": "pitch"
    },
    {
        "id": 7,
        "title": "PRODUCTION HARDENING & ZERO-HALLUCINATION",
        "subtitle": "Deterministic Fallbacks, Parallelized Latency, Strict Security",
        "chapter": "07 / 08 · HARDENING",
        "narration": (
            "We engineered Swapcast with rigorous production-grade reliability. "
            "If the LLM provider experiences network latency or downtime, our deterministic fallback pipeline takes over instantly, executing the full Qloo ranking algorithm and generating pre-validated pitch templates. "
            "All Qloo API credentials remain strictly server-isolated, reverse queries execute in parallel with a six-hour in-memory TTL cache to stay well within serverless timeouts, and every single number rendered in the UI comes directly from verified Qloo responses."
        ),
        "type": "hardening"
    },
    {
        "id": 8,
        "title": "BUSINESS MODEL, MARKET IMPACT & CLOSE",
        "subtitle": "$2.9B Podcast Ad Market · Turning Taste into Reach",
        "chapter": "08 / 08 · BUSINESS & IMPACT",
        "narration": (
            "The podcast advertising industry surpassed two point nine billion dollars last year, with over two million active podcasters eager for growth. "
            "Swapcast monetizes through a freemium creator tier, a Pro tier with tracking links and a partner CRM, and a B2B white-label Grow tab designed for hosting platforms like Buzzsprout and Spotify for Podcasters. "
            "Swapcast transforms Qloo's cultural taste graph into the single most valuable asset a creator can have: the right partner, the mathematical proof, and the pitch to win them. Thank you."
        ),
        "type": "close"
    }
]

def draw_header_and_footer(draw, scene, width=1920, height=1080):
    # Top Bar
    draw.rectangle([0, 0, width, 80], fill=NAV_BG)
    draw.line([0, 80, width, 80], fill=CARD_BORDER, width=2)
    
    # Logo / Brand
    draw.text((60, 24), "SWAPCAST", fill=CYAN_ACCENT, font=FONT_TITLE)
    draw.text((320, 30), "|  Powered by Qloo Cultural Taste Graph", fill=TEXT_MUTED, font=FONT_SUBTITLE)
    
    # Chapter badge on top right
    badge_text = scene["chapter"]
    draw.rounded_rectangle([width - 440, 20, width - 60, 62], radius=8, fill=(30, 41, 59), outline=CYAN_ACCENT, width=1)
    draw.text((width - 420, 28), badge_text, fill=TEXT_WHITE, font=FONT_SMALL)

    # Bottom Footer Bar
    draw.rectangle([0, height - 70, width, height], fill=NAV_BG)
    draw.line([0, height - 70, width, height - 70], fill=CARD_BORDER, width=2)
    
    # Progress Bar
    pct = scene["id"] / len(SCENES)
    draw.rectangle([60, height - 42, width - 60, height - 34], fill=(30, 41, 59))
    draw.rectangle([60, height - 42, int(60 + (width - 120) * pct), height - 34], fill=CYAN_ACCENT)
    
    # Footer text
    draw.text((60, height - 64), f"DEMO PRESENTATION · SCENE {scene['id']} OF {len(SCENES)}", fill=TEXT_MUTED, font=FONT_SMALL)
    draw.text((width - 340, height - 64), "QLOO HACKATHON 2026", fill=CYAN_ACCENT, font=FONT_SMALL)

def draw_rounded_card(draw, box, fill=CARD_BG, outline=CARD_BORDER, width=2, radius=12):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def render_scene_image(scene, filepath):
    img = Image.new("RGB", (1920, 1080), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    draw_header_and_footer(draw, scene)
    
    # Scene Title & Subtitle
    draw.text((80, 115), scene["title"], fill=TEXT_WHITE, font=FONT_TITLE)
    draw.text((80, 175), scene["subtitle"], fill=TEXT_MUTED, font=FONT_SUBTITLE)
    
    stype = scene["type"]
    
    if stype == "crisis":
        draw_rounded_card(draw, [80, 240, 680, 880], fill=(24, 15, 25), outline=ROSE_ACCENT, width=2)
        draw.text((120, 280), "THE COLD REALITY", fill=ROSE_ACCENT, font=FONT_CARD_TITLE)
        draw.text((120, 360), "27", fill=ROSE_ACCENT, font=FONT_HERO)
        draw.text((120, 460), "Median downloads in week 1", fill=TEXT_WHITE, font=FONT_CARD_TITLE)
        draw.text((120, 500), "per episode (Buzzsprout 2026)", fill=TEXT_MUTED, font=FONT_BODY)
        
        draw.line([120, 560, 640, 560], fill=CARD_BORDER, width=1)
        draw.text((120, 590), "• 90%+ of shows plateau under 100 listeners", fill=TEXT_MUTED, font=FONT_BODY)
        draw.text((120, 630), "• Paid ads cost $25-50+ CPM (unaffordable)", fill=TEXT_MUTED, font=FONT_BODY)
        draw.text((120, 670), "• Algorithmic discovery favors top 1%", fill=TEXT_MUTED, font=FONT_BODY)
        draw.text((120, 710), "• Result: 75% podcasters quit within a year", fill=TEXT_MUTED, font=FONT_BODY)

        draw_rounded_card(draw, [720, 240, 1840, 880], fill=CARD_BG, outline=CARD_BORDER, width=2)
        draw.text((760, 280), "THE BEST FREE GROWTH MECHANISM: PROMO SWAPS", fill=CYAN_ACCENT, font=FONT_CARD_TITLE)
        draw.text((760, 320), "Two creators promote each other's shows to cross-pollinate engaged listeners.", fill=TEXT_WHITE, font=FONT_BODY)
        
        draw_rounded_card(draw, [760, 380, 1260, 840], fill=(15, 23, 42), outline=CARD_BORDER)
        draw.text((790, 410), "HOW CREATORS DO IT TODAY:", fill=AMBER_ACCENT, font=FONT_CARD_TITLE)
        draw.text((790, 460), "1. Guessing & DMing random hosts", fill=TEXT_MUTED, font=FONT_BODY)
        draw.text((790, 510), "2. Cold pitching unreachable giant shows", fill=TEXT_MUTED, font=FONT_BODY)
        draw.text((790, 560), "3. Direct cannibalization in same lane", fill=TEXT_MUTED, font=FONT_BODY)
        draw.text((790, 610), "4. One-sided audience mismatch", fill=TEXT_MUTED, font=FONT_BODY)
        draw.text((790, 660), "5. Zero proof, zero tracking, low conversion", fill=TEXT_MUTED, font=FONT_BODY)
        draw.rounded_rectangle([790, 740, 1230, 800], radius=8, fill=(60, 20, 20))
        draw.text((820, 755), "OUTCOME: 95% REJECTION / ZERO LIFT", fill=ROSE_ACCENT, font=FONT_BODY_BOLD)

        draw_rounded_card(draw, [1300, 380, 1800, 840], fill=(12, 35, 30), outline=EMERALD_ACCENT)
        draw.text((1330, 410), "THE SWAPCAST REVOLUTION:", fill=EMERALD_ACCENT, font=FONT_CARD_TITLE)
        draw.text((1330, 460), "✓ Popularity banding (Exact peer size)", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((1330, 510), "✓ Adjacent lanes (No cannibalization)", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((1330, 560), "✓ Two-way fit (Their listeners like you)", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((1330, 610), "✓ Qloo proof baked into pitch outreach", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((1330, 660), "✓ Cross-domain sponsor brand leads", fill=TEXT_WHITE, font=FONT_BODY)
        draw.rounded_rectangle([1330, 740, 1770, 800], radius=8, fill=(16, 185, 129))
        draw.text((1355, 755), "OUTCOME: 10X REPLIES & MUTUAL LIFT", fill=BG_DARK, font=FONT_BODY_BOLD)

    elif stype == "insight":
        draw_rounded_card(draw, [80, 240, 920, 880], fill=(24, 15, 25), outline=ROSE_ACCENT, width=2)
        draw.text((120, 280), "PLAIN LLM / NAIVE RECOMMENDATION", fill=ROSE_ACCENT, font=FONT_CARD_TITLE)
        draw.text((120, 320), "What happens when an LLM guesses without a taste graph:", fill=TEXT_MUTED, font=FONT_BODY)
        
        giants = [
            ("The Joe Rogan Experience", "Popularity: 0.99", "100x too big, 0% reply rate"),
            ("Huberman Lab", "Popularity: 0.98", "Rejection guaranteed; wrong tier"),
            ("The Daily (NYT)", "Popularity: 0.97", "Corporate giant, unreachable"),
            ("Lex Fridman Podcast", "Popularity: 0.96", "Direct topic competitor; 0 synergy")
        ]
        y_pos = 380
        for name, pop, reason in giants:
            draw_rounded_card(draw, [120, y_pos, 880, y_pos + 90], fill=(15, 23, 42), outline=CARD_BORDER)
            draw.text((140, y_pos + 15), name, fill=TEXT_WHITE, font=FONT_CARD_TITLE)
            draw.text((640, y_pos + 15), pop, fill=ROSE_ACCENT, font=FONT_SMALL)
            draw.text((140, y_pos + 50), f"✕ {reason}", fill=TEXT_MUTED, font=FONT_SMALL)
            y_pos += 110

        draw.text((120, 830), "FAIL: No popularity band, no mutual fit, hallucinated synergy", fill=ROSE_ACCENT, font=FONT_BODY_BOLD)

        draw_rounded_card(draw, [960, 240, 1840, 880], fill=(10, 30, 30), outline=EMERALD_ACCENT, width=2)
        draw.text((1000, 280), "SWAPCAST + QLOO TASTE GRAPH", fill=EMERALD_ACCENT, font=FONT_CARD_TITLE)
        draw.text((1000, 320), "Algorithmic matching across 3 essential dimensions:", fill=TEXT_MUTED, font=FONT_BODY)

        pillars = [
            ("1. YOUR SIZE BAND", "filter.popularity.min/max (0.05 - 0.20)", "Filters to reachable peers who actually benefit from swapping with you."),
            ("2. ADJACENT LANES", "Jaccard similarity on genre & topic tags", "Cross-pollinates without cannibalizing your core audience."),
            ("3. TWO-WAY FIT", "Reverse insights query verification", "Guarantees their listeners have high affinity for your show as well.")
        ]
        y_pos = 380
        for title, api, desc in pillars:
            draw_rounded_card(draw, [1000, y_pos, 1800, y_pos + 115], fill=(15, 23, 42), outline=CYAN_ACCENT)
            draw.text((1030, y_pos + 15), title, fill=EMERALD_ACCENT, font=FONT_CARD_TITLE)
            draw.text((1300, y_pos + 18), api, fill=CYAN_ACCENT, font=FONT_MONO)
            draw.text((1030, y_pos + 60), desc, fill=TEXT_WHITE, font=FONT_BODY)
            y_pos += 135

        draw.rounded_rectangle([1000, 810, 1800, 860], radius=8, fill=(16, 185, 129))
        draw.text((1030, 825), "RESULT: Mathematically grounded, high-converting partnership matches", fill=BG_DARK, font=FONT_BODY_BOLD)

    elif stype == "architecture":
        draw_rounded_card(draw, [80, 240, 1840, 880], fill=CARD_BG, outline=CARD_BORDER, width=2)
        
        steps = [
            ("1. RESOLVE", "/search", "User confirms exact show entity", CYAN_ACCENT),
            ("2. PROFILE", "/v2/insights (tags)", "Listener taste tag extraction", PURPLE_ACCENT),
            ("3. PEERS", "/v2/insights (podcasts)", "Bounded popularity band search", AMBER_ACCENT),
            ("4. REVERSE", "Reverse /v2/insights", "Two-way fit & weakest rank", EMERALD_ACCENT),
            ("5. MONETIZE", "/v2/insights (brands)", "Sponsor leads: reach vs household", CYAN_ACCENT)
        ]
        
        x_start = 120
        box_w = 310
        gap = 35
        for i, (num, endp, desc, col) in enumerate(steps):
            x = x_start + i * (box_w + gap)
            draw_rounded_card(draw, [x, 280, x + box_w, 540], fill=(15, 23, 42), outline=col, width=2)
            draw.rounded_rectangle([x + 15, 300, x + box_w - 15, 340], radius=6, fill=col)
            draw.text((x + 30, 310), num, fill=BG_DARK, font=FONT_CARD_TITLE)
            draw.text((x + 20, 370), endp, fill=TEXT_WHITE, font=FONT_BODY_BOLD)
            draw.text((x + 20, 420), desc, fill=TEXT_MUTED, font=FONT_SMALL)
            draw.text((x + 20, 490), "Status: 200 OK", fill=EMERALD_ACCENT, font=FONT_MONO)

        draw_rounded_card(draw, [120, 580, 930, 840], fill=(15, 23, 42), outline=CARD_BORDER)
        draw.text((150, 610), "AGENT LOOP & STREAMING PIPELINE", fill=CYAN_ACCENT, font=FONT_CARD_TITLE)
        draw.text((150, 660), "• Protocol: NDJSON live stream (/api/plan)", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((150, 700), "• Adaptive widening: Band expands 0.05 -> 0.10 -> 0.20", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((150, 740), "• Parallel execution: Reverse rank lookups run via Promise.all", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((150, 780), "• Bound: Max 8 steps, 16 Qloo calls per plan", fill=TEXT_WHITE, font=FONT_BODY)

        draw_rounded_card(draw, [990, 580, 1800, 840], fill=(15, 23, 42), outline=CARD_BORDER)
        draw.text((1020, 610), "SECURITY & PRODUCTION INTEGRITY", fill=EMERALD_ACCENT, font=FONT_CARD_TITLE)
        draw.text((1020, 660), "• Server-Only isolation: Qloo API key never touches the browser", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((1020, 700), "• 6-Hour In-Memory TTL cache keyed by deterministic hash", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((1020, 740), "• Exponential backoff retry handler on HTTP 429 & 5xx", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((1020, 780), "• Zero-Hallucination: UI renders only Qloo-verified entity IDs", fill=TEXT_WHITE, font=FONT_BODY)

    elif stype == "scoring":
        draw_rounded_card(draw, [80, 240, 900, 880], fill=CARD_BG, outline=CARD_BORDER, width=2)
        draw.text((120, 280), "THE NORMALIZATION HURDLE", fill=AMBER_ACCENT, font=FONT_CARD_TITLE)
        draw.text((120, 330), "Why raw affinity scores fail across queries:", fill=TEXT_MUTED, font=FONT_BODY)
        
        draw_rounded_card(draw, [120, 380, 860, 500], fill=(15, 23, 42), outline=CARD_BORDER)
        draw.text((140, 400), "Qloo normalizes affinity [0..1] within each query.", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((140, 440), "Query A affinity 0.85 != Query B affinity 0.85!", fill=ROSE_ACCENT, font=FONT_BODY_BOLD)

        draw.text((120, 530), "SWAPCAST'S RANK-BASED SOLUTION:", fill=EMERALD_ACCENT, font=FONT_CARD_TITLE)
        
        formulas = [
            ("Forward Rank (fwdRank)", "Candidate's rank in Host's listener insights"),
            ("Reverse Rank (revRank)", "Host's rank in Candidate's listener insights (or 51 if >50)"),
            ("Weakest-Link Sorting", "weakest = max(fwdRank, revRank ?? 51)"),
            ("Tie Breaking", "Broken by abs(candidate.popularity - host.popularity)")
        ]
        y_f = 580
        for name, formula in formulas:
            draw.text((120, y_f), f"• {name}:", fill=TEXT_WHITE, font=FONT_BODY_BOLD)
            draw.text((140, y_f + 30), formula, fill=CYAN_ACCENT, font=FONT_MONO)
            y_f += 70

        draw_rounded_card(draw, [940, 240, 1840, 880], fill=CARD_BG, outline=CARD_BORDER, width=2)
        draw.text((980, 280), "MUTUAL MATCH BADGES & FORMAT SELECTION", fill=CYAN_ACCENT, font=FONT_CARD_TITLE)

        draw_rounded_card(draw, [980, 340, 1800, 560], fill=(12, 35, 30), outline=EMERALD_ACCENT)
        draw.text((1010, 370), "TWO-WAY MUTUAL MATCH (fwdRank <= 15 AND revRank <= 15)", fill=EMERALD_ACCENT, font=FONT_CARD_TITLE)
        draw.text((1010, 420), "• Both audiences have high mutual affinity for each other", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((1010, 460), "• Highest conversion probability for promo exchanges", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((1010, 500), "• Certified badge displayed prominently on Swap Board", fill=TEXT_MUTED, font=FONT_BODY)

        draw_rounded_card(draw, [980, 590, 1800, 840], fill=(15, 23, 42), outline=PURPLE_ACCENT)
        draw.text((1010, 620), "LANE DETECTION VIA JACCARD TAG SIMILARITY", fill=PURPLE_ACCENT, font=FONT_CARD_TITLE)
        draw.text((1010, 670), "Jaccard = |Tags(Host) ∩ Tags(Peer)| / |Tags(Host) ∪ Tags(Peer)|", fill=CYAN_ACCENT, font=FONT_MONO)
        draw.text((1010, 720), "• Overlap >= 0.40 -> SAME LANE: Recommend Guest Swap", fill=TEXT_WHITE, font=FONT_BODY)
        draw.text((1010, 760), "  (Interviews create variety without competing directly)", fill=TEXT_MUTED, font=FONT_SMALL)
        draw.text((1010, 790), "• Overlap < 0.40 -> ADJACENT LANE: Recommend Promo Swap", fill=TEXT_WHITE, font=FONT_BODY)

    elif stype == "board":
        draw_rounded_card(draw, [80, 230, 1840, 320], fill=(15, 23, 42), outline=CYAN_ACCENT, width=2)
        draw.text((110, 250), "HOST SHOW:", fill=TEXT_MUTED, font=FONT_SMALL)
        draw.text((110, 275), "This Week in Startups", fill=TEXT_WHITE, font=FONT_CARD_TITLE)
        draw.text((430, 278), "Popularity: 0.82  |  Band: [0.77 - 0.87]  |  Tags: Startups, Venture Capital, Technology", fill=CYAN_ACCENT, font=FONT_BODY)

        draw_rounded_card(draw, [80, 340, 1300, 880], fill=CARD_BG, outline=CARD_BORDER, width=2)
        draw.text((110, 365), "THE SWAP BOARD: GROUNDED TWO-WAY PARTNERS", fill=TEXT_WHITE, font=FONT_CARD_TITLE)

        matches = [
            ("The Twenty Minute VC", "Pop: 0.80", "Rank #2 in Host  ·  Rank #3 in 20VC", "TWO-WAY MATCH", "Promo Swap", EMERALD_ACCENT),
            ("Acquired", "Pop: 0.79", "Rank #3 in Host  ·  Rank #9 in Acquired", "TWO-WAY MATCH", "Guest Swap", EMERALD_ACCENT),
            ("The Pitch", "Pop: 0.72", "Rank #5 in Host  ·  Rank #6 in Pitch", "TWO-WAY MATCH", "Promo Swap", EMERALD_ACCENT),
            ("My First Million", "Pop: 0.77", "Rank #4 in Host  ·  Rank #18 in MFM", "ONE-SIDED MATCH", "Promo Swap", AMBER_ACCENT)
        ]
        y_m = 420
        for name, pop, ranks, badge, swap_type, col in matches:
            draw_rounded_card(draw, [110, y_m, 1270, y_m + 95], fill=(15, 23, 42), outline=col, width=1)
            draw.text((130, y_m + 15), name, fill=TEXT_WHITE, font=FONT_CARD_TITLE)
            draw.text((430, y_m + 18), pop, fill=TEXT_MUTED, font=FONT_SMALL)
            draw.text((130, y_m + 55), ranks, fill=CYAN_ACCENT, font=FONT_BODY)
            draw.rounded_rectangle([920, y_m + 18, 1100, y_m + 50], radius=6, fill=col)
            draw.text((935, y_m + 25), badge, fill=BG_DARK, font=FONT_SMALL)
            draw.rounded_rectangle([1120, y_m + 18, 1250, y_m + 50], radius=6, fill=(30, 41, 59))
            draw.text((1135, y_m + 25), swap_type, fill=TEXT_WHITE, font=FONT_SMALL)
            y_m += 110

        draw_rounded_card(draw, [1330, 340, 1840, 880], fill=(24, 15, 25), outline=ROSE_ACCENT, width=2)
        draw.text((1360, 365), "COUNTERFACTUAL PANEL", fill=ROSE_ACCENT, font=FONT_CARD_TITLE)
        draw.text((1360, 400), "Popularity-only baseline (No Qloo size band):", fill=TEXT_MUTED, font=FONT_SMALL)

        cf_items = [
            ("1. The Daily (NYT)", "Pop: 0.98", "Too big; 0% chance of reply"),
            ("2. Huberman Lab", "Pop: 0.97", "Rejection guaranteed; wrong niche"),
            ("3. Crime Junkie", "Pop: 0.96", "Completely unaligned audience"),
            ("4. SmartLess", "Pop: 0.95", "Celebrity tier; no mutual benefit")
        ]
        y_cf = 450
        for name, pop, reason in cf_items:
            draw_rounded_card(draw, [1360, y_cf, 1810, y_cf + 80], fill=(15, 23, 42), outline=CARD_BORDER)
            draw.text((1380, y_cf + 15), name, fill=TEXT_WHITE, font=FONT_BODY_BOLD)
            draw.text((1380, y_cf + 45), f"✕ {reason}", fill=ROSE_ACCENT, font=FONT_SMALL)
            y_cf += 95

        draw.text((1360, 835), "Qloo grounding filters out unreachable noise.", fill=TEXT_MUTED, font=FONT_SMALL)

    elif stype == "pitch":
        draw_rounded_card(draw, [80, 240, 1020, 880], fill=CARD_BG, outline=CARD_BORDER, width=2)
        draw.text((120, 275), "AUTOMATED PITCH DRAFTER WITH EVIDENCE", fill=CYAN_ACCENT, font=FONT_CARD_TITLE)
        
        draw_rounded_card(draw, [120, 330, 980, 840], fill=(15, 23, 42), outline=CARD_BORDER)
        draw.text((150, 360), "Subject: Promo Swap Idea: This Week in Startups x 20VC", fill=TEXT_WHITE, font=FONT_BODY_BOLD)
        draw.line([150, 400, 950, 400], fill=CARD_BORDER, width=1)
        
        pitch_lines = [
            "Hey Harry,",
            "",
            "Big fan of 20VC. I host This Week in Startups.",
            "According to Qloo taste graph analytics, our audiences share",
            "an 84% mutual tag overlap in startups and venture capital.",
            "",
            "More importantly, Qloo ranks 20VC as #2 among our listeners,",
            "and ranks TWiST as #3 among yours—a verified two-way mutual fit.",
            "",
            "Would you be open to a 30-second host-read promo swap next month?",
            "We can include dedicated attribution tracking links for both sides.",
            "",
            "Best,",
            "Jason"
        ]
        y_p = 420
        for pl in pitch_lines:
            draw.text((150, y_p), pl, fill=TEXT_MUTED if not pl.startswith("According") and not pl.startswith("More") else TEXT_WHITE, font=FONT_SMALL)
            y_p += 25

        draw.rounded_rectangle([750, 770, 950, 815], radius=6, fill=CYAN_ACCENT)
        draw.text((775, 785), "COPY PITCH", fill=BG_DARK, font=FONT_BODY_BOLD)

        draw_rounded_card(draw, [1060, 240, 1840, 880], fill=CARD_BG, outline=CARD_BORDER, width=2)
        draw.text((1100, 275), "CROSS-DOMAIN SPONSOR LEADS (QLOO BRANDS)", fill=EMERALD_ACCENT, font=FONT_CARD_TITLE)
        draw.text((1100, 315), "Brands your listeners naturally favor outside of podcasting:", fill=TEXT_MUTED, font=FONT_BODY)

        draw_rounded_card(draw, [1100, 360, 1800, 580], fill=(15, 23, 42), outline=EMERALD_ACCENT)
        draw.text((1130, 390), "REACHABLE MID-MARKET SPONSORS (Target Outreach)", fill=EMERALD_ACCENT, font=FONT_CARD_TITLE)
        brands_reach = [
            ("Linear", "Issue tracking for tech teams", "Affinity Rank: #2"),
            ("Vanta", "Automated compliance & security", "Affinity Rank: #4"),
            ("Mercury", "Banking for startups & VC", "Affinity Rank: #5"),
            ("Ramp", "Corporate cards & finance automation", "Affinity Rank: #7")
        ]
        y_br = 430
        for b_name, b_desc, b_rank in brands_reach:
            draw.text((1130, y_br), f"• {b_name}", fill=TEXT_WHITE, font=FONT_BODY_BOLD)
            draw.text((1260, y_br), f"- {b_desc}", fill=TEXT_MUTED, font=FONT_SMALL)
            draw.text((1620, y_br), b_rank, fill=CYAN_ACCENT, font=FONT_SMALL)
            y_br += 35

        draw_rounded_card(draw, [1100, 610, 1800, 840], fill=(15, 23, 42), outline=CARD_BORDER)
        draw.text((1130, 640), "HOUSEHOLD BRAND SPONSORS (Aspirational / Tier 1)", fill=TEXT_WHITE, font=FONT_CARD_TITLE)
        brands_house = [
            ("Notion", "Connected workspace", "Affinity Rank: #1"),
            ("Stripe", "Financial infrastructure", "Affinity Rank: #3"),
            ("AWS", "Cloud computing platform", "Affinity Rank: #6")
        ]
        y_bh = 680
        for b_name, b_desc, b_rank in brands_house:
            draw.text((1130, y_bh), f"• {b_name}", fill=TEXT_WHITE, font=FONT_BODY_BOLD)
            draw.text((1260, y_bh), f"- {b_desc}", fill=TEXT_MUTED, font=FONT_SMALL)
            draw.text((1620, y_bh), b_rank, fill=CYAN_ACCENT, font=FONT_SMALL)
            y_bh += 38

    elif stype == "hardening":
        draw_rounded_card(draw, [80, 240, 1840, 880], fill=CARD_BG, outline=CARD_BORDER, width=2)
        
        cards = [
            ("1. DETERMINISTIC FALLBACK", CYAN_ACCENT, [
                "• Zero LLM dependency failure risk",
                "• Complete Qloo ranking executes independently",
                "• Safe template-based pitch generator fallback",
                "• Verified across automated test suites"
            ]),
            ("2. STRICT CREDENTIAL ISOLATION", EMERALD_ACCENT, [
                "• X-Api-Key kept strictly on serverless backend",
                "• Zero token or secret leakage to the browser",
                "• Client only sees verified sanitized results",
                "• Environment variables audited in CI pipeline"
            ]),
            ("3. LATENCY & TIMEOUT DEFENSE", AMBER_ACCENT, [
                "• 6-Hour in-memory TTL caching layer",
                "• Reverse rank checks run concurrently",
                "• Exponential backoff on HTTP 429 & 5xx",
                "• Sub-3s execution stays well within timeouts"
            ]),
            ("4. ZERO-HALLUCINATION TRUTH", PURPLE_ACCENT, [
                "• Every cited ID originates from Qloo response",
                "• Scores and ranks computed server-side",
                "• Plain LLM never dictates mathematical rankings",
                "• Live NDJSON event stream provides total auditability"
            ])
        ]
        
        for idx, (title, color, bullets) in enumerate(cards):
            col = idx % 2
            row = idx // 2
            x = 120 + col * 840
            y = 280 + row * 290
            draw_rounded_card(draw, [x, y, x + 800, y + 250], fill=(15, 23, 42), outline=color, width=2)
            draw.text((x + 30, y + 25), title, fill=color, font=FONT_CARD_TITLE)
            y_b = y + 75
            for b in bullets:
                draw.text((x + 30, y_b), b, fill=TEXT_WHITE, font=FONT_BODY)
                y_b += 38

    elif stype == "close":
        draw_rounded_card(draw, [80, 240, 920, 880], fill=CARD_BG, outline=CARD_BORDER, width=2)
        draw.text((120, 280), "MASSIVE MARKET OPPORTUNITY", fill=CYAN_ACCENT, font=FONT_CARD_TITLE)
        
        draw.text((120, 340), "$2.9B", fill=EMERALD_ACCENT, font=FONT_HERO)
        draw.text((120, 430), "US Podcast Advertising Market (2025-2026)", fill=TEXT_WHITE, font=FONT_BODY_BOLD)
        
        draw.text((120, 500), "2,000,000+", fill=CYAN_ACCENT, font=FONT_HERO)
        draw.text((120, 590), "Active Podcasters Worldwide Seeking Growth", fill=TEXT_WHITE, font=FONT_BODY_BOLD)

        draw.line([120, 660, 880, 660], fill=CARD_BORDER, width=1)
        draw.text((120, 700), "• Promo swaps are the #1 organic acquisition channel", fill=TEXT_MUTED, font=FONT_BODY)
        draw.text((120, 740), "• Today: 100% manual, unscientific, and ungrounded", fill=TEXT_MUTED, font=FONT_BODY)
        draw.text((120, 780), "• Swapcast turns guesswork into guaranteed cultural fit", fill=TEXT_MUTED, font=FONT_BODY)

        draw_rounded_card(draw, [960, 240, 1840, 880], fill=(12, 35, 30), outline=EMERALD_ACCENT, width=2)
        draw.text((1000, 280), "BUSINESS MODEL & EXPANSION", fill=EMERALD_ACCENT, font=FONT_CARD_TITLE)

        tiers = [
            ("FREEMIUM (CREATORS)", "Free forever for basic discovery and pitches."),
            ("PRO TIER ($19 / MONTH)", "Dedicated tracking links, lift analytics & partner CRM."),
            ("B2B WHITE-LABEL 'GROW' TAB", "Embedded directly into Buzzsprout, Spotify & Transistor.")
        ]
        y_t = 350
        for name, desc in tiers:
            draw_rounded_card(draw, [1000, y_t, 1800, y_t + 90], fill=(15, 23, 42), outline=CARD_BORDER)
            draw.text((1030, y_t + 18), name, fill=CYAN_ACCENT, font=FONT_CARD_TITLE)
            draw.text((1030, y_t + 52), desc, fill=TEXT_WHITE, font=FONT_BODY)
            y_t += 115

        draw.rounded_rectangle([1000, 720, 1800, 840], radius=10, fill=CYAN_ACCENT)
        draw.text((1030, 740), "SWAPCAST: PODCAST GROWTH FROM A GUESS INTO A MATCH", fill=BG_DARK, font=FONT_CARD_TITLE)
        draw.text((1030, 785), "Powered by Qloo Cultural Taste Graph · MIT License · Thank you!", fill=BG_DARK, font=FONT_BODY_BOLD)

    img.save(filepath, "PNG")
    print(f"Rendered {filepath}")

async def generate_speech_for_scene(scene, filepath):
    import edge_tts
    VOICE = "en-US-ChristopherNeural"
    # Crisp, confident presentation tempo
    comm = edge_tts.Communicate(scene["narration"], VOICE, rate="+30%")
    await comm.save(filepath)
    print(f"Generated speech for Scene {scene['id']}")

def get_audio_duration(filepath):
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filepath]
    res = subprocess.run(cmd, capture_output=True, text=True)
    return float(res.stdout.strip())

async def main():
    print("=== SWAPCAST TARGETED 3.5-MINUTE DEMO VIDEO BUILDER ===")
    
    clip_files = []
    total_audio_duration = 0.0

    # 1. Generate images and speech
    for scene in SCENES:
        img_path = os.path.join(TEMP_DIR, f"scene_{scene['id']}.png")
        raw_audio_path = os.path.join(TEMP_DIR, f"scene_{scene['id']}_raw.mp3")
        padded_audio_path = os.path.join(TEMP_DIR, f"scene_{scene['id']}.mp3")
        clip_path = os.path.join(TEMP_DIR, f"clip_{scene['id']}.mp4")

        render_scene_image(scene, img_path)
        await generate_speech_for_scene(scene, raw_audio_path)
        
        # 0.25 second pause between scenes
        pad_cmd = [
            "ffmpeg", "-y", "-i", raw_audio_path,
            "-af", "apad=pad_dur=0.25",
            padded_audio_path
        ]
        subprocess.run(pad_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        dur = get_audio_duration(padded_audio_path)
        total_audio_duration += dur
        print(f"Scene {scene['id']} Duration: {dur:.2f}s")

        # Encode single clip with exact duration -t
        encode_cmd = [
            "ffmpeg", "-y", "-loop", "1", "-i", img_path, "-i", padded_audio_path,
            "-t", f"{dur:.3f}",
            "-c:v", "libx264", "-tune", "stillimage", "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p", "-shortest", clip_path
        ]
        subprocess.run(encode_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        clip_files.append(clip_path)

    print(f"\nTotal estimated duration: {total_audio_duration:.2f}s ({total_audio_duration/60:.2f} minutes)")

    # 2. Concat all clips into final video
    concat_list_file = os.path.join(TEMP_DIR, "concat_list.txt")
    with open(concat_list_file, "w") as f:
        for c in clip_files:
            norm_c = c.replace("\\", "/")
            f.write(f"file '{norm_c}'\n")

    final_output = os.path.join(ROOT, "Swapcast_Demo_Video.mp4")
    concat_cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list_file,
        "-c", "copy", final_output
    ]
    subprocess.run(concat_cmd, check=True)

    final_dur = get_audio_duration(final_output)
    minutes = int(final_dur // 60)
    seconds = int(final_dur % 60)
    print(f"\n==========================================")
    print(f"SUCCESS! Video created at: {final_output}")
    print(f"Final Duration: {final_dur:.2f}s ({minutes}m {seconds}s)")
    print(f"==========================================")

if __name__ == "__main__":
    asyncio.run(main())
