import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRT_PATH = os.path.join(ROOT, "Swapcast_Subtitles.srt")
VTT_PATH = os.path.join(ROOT, "Swapcast_Subtitles.vtt")

SUBTITLES = [
    # Scene 1 (0:00 - 0:25.67)
    (0.0, 5.8, "Welcome to Swapcast: the AI-powered growth platform that finds the podcasts that should be promoting yours."),
    (5.8, 12.1, "According to Buzzsprout statistics, the median podcast episode gets just 27 downloads in its first week."),
    (12.1, 19.4, "For independent creators and small networks, the single best free way to grow is a promo swap--where two shows introduce each other to their listeners."),
    (19.4, 25.4, "Yet today, finding the right partner is pure guesswork. Creators either pitch blindly or ask giant shows that will never reply."),

    # Scene 2 (0:25.67 - 0:55.70)
    (25.7, 33.5, "If you ask a standard large language model who to swap with, it hallucinates the biggest shows in your genre--like Joe Rogan, Huberman Lab, or Lex Fridman."),
    (33.5, 39.8, "These giant shows are completely unreachable, and in the same lane, they compete directly with your audience."),
    (39.8, 48.5, "A high-converting swap partner must satisfy three criteria simultaneously: they must be your size, occupy an adjacent non-competing lane, and their listeners must like your show back."),
    (48.5, 55.4, "A plain language model cannot verify any of this. Only a real cultural taste graph can. That is why Swapcast is powered by Qloo."),

    # Scene 3 (0:55.70 - 1:26.07)
    (55.7, 63.2, "Swapcast is built on Next.js App Router, TypeScript, and Tailwind, driven by an agent pipeline that leverages five distinct Qloo capabilities."),
    (63.2, 68.1, "First, the user resolves and confirms their exact show entity via Qloo Search."),
    (68.1, 75.3, "The pipeline extracts the listener taste profile using tag insights, then queries peer shows bounded tightly inside the host's popularity band."),
    (75.3, 78.5, "If peers are thin, the agent automatically widens the band."),
    (78.5, 85.8, "Then, it runs reverse queries on each top candidate, pulls cross-domain brand affinities, and streams every step live over an NDJSON trace."),

    # Scene 4 (1:26.07 - 1:54.52)
    (86.1, 94.8, "A fundamental technical hurdle with recommendation APIs is that raw affinity scores are normalized inside each query, so raw scores cannot be compared across different API calls."),
    (94.8, 99.2, "Swapcast solves this with a novel rank-based, weakest-link scoring engine."),
    (99.2, 106.8, "We calculate the candidate's forward rank in the host's audience, and run the query in reverse to check the host's rank in the candidate's audience."),
    (106.8, 110.8, "We sort by the weakest link: the maximum of forward and reverse rank."),
    (110.8, 114.3, "When both ranks fall within the top fifteen, Swapcast certifies it as a verified Two-Way Mutual Match."),

    # Scene 5 (1:54.52 - 1:23.74)
    (114.5, 117.8, "Here is Swapcast in action with This Week in Startups."),
    (117.8, 122.9, "The agent resolves the show and presents verified peers within the creator's exact size band."),
    (122.9, 132.8, "Look at the top match: The Twenty Minute VC. Qloo ranks them number two for our audience, and reverse analysis confirms we rank number three for theirs--a genuine reciprocal fit."),
    (132.8, 138.2, "Adjacent lanes receive a promo swap suggestion, while identical lanes get a guest swap recommendation."),
    (138.2, 143.5, "Our Counterfactual Panel on the right proves the difference: naive popularity search suggests giant unrelated programs that never convert."),

    # Scene 6 (2:23.74 - 2:53.97)
    (143.7, 147.8, "Finding the partner is only half the battle; closing the deal is the rest."),
    (147.8, 159.2, "Swapcast automatically drafts personalized outreach pitches with the verified Qloo metrics baked into the copy--including shared audience tags, proposed formats, and tracking link reminders for mutual lift measurement."),
    (159.2, 169.8, "Simultaneously, Swapcast uses Qloo's cross-domain entity engine to pull brand affinities, categorizing sponsor leads into reachable mid-market brands like Linear, Vanta, and Mercury, alongside household giants."),
    (169.8, 173.7, "Creators unlock both collaborative audience growth and monetization opportunities in one single run."),

    # Scene 7 (2:53.97 - 3:19.95)
    (174.0, 178.1, "We engineered Swapcast with rigorous production-grade reliability."),
    (178.1, 188.4, "If the LLM provider experiences network latency or downtime, our deterministic fallback pipeline takes over instantly, executing the full Qloo ranking algorithm and generating pre-validated pitch templates."),
    (188.4, 199.7, "All Qloo API credentials remain strictly server-isolated, reverse queries execute in parallel with a six-hour in-memory TTL cache to stay well within serverless timeouts, and every single metric rendered in the UI comes directly from verified Qloo responses."),

    # Scene 8 (3:19.95 - 3:46.96)
    (200.0, 207.8, "The podcast advertising industry surpassed 2.9 billion dollars last year, with over two million active podcasters eager for growth."),
    (207.8, 218.4, "Swapcast monetizes through a freemium creator tier, a Pro tier with tracking links and a partner CRM, and a B2B white-label Grow tab designed for hosting platforms like Buzzsprout and Spotify for Podcasters."),
    (218.4, 224.5, "Swapcast transforms Qloo's cultural taste graph into the single most valuable asset a creator can have: the right partner, the mathematical proof, and the pitch to win them."),
    (224.5, 226.5, "Thank you.")
]

def format_srt_time(seconds):
    millis = int(round((seconds - int(seconds)) * 1000))
    s = int(seconds)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d},{millis:03d}"

def format_vtt_time(seconds):
    millis = int(round((seconds - int(seconds)) * 1000))
    s = int(seconds)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}.{millis:03d}"

# Build SRT
with open(SRT_PATH, "w", encoding="utf-8") as f:
    for idx, (start, end, text) in enumerate(SUBTITLES, 1):
        # Sanitize any stray brackets
        clean_text = text.replace("<", "(").replace(">", ")")
        f.write(f"{idx}\n")
        f.write(f"{format_srt_time(start)} --> {format_srt_time(end)}\n")
        f.write(f"{clean_text}\n\n")

# Build VTT
with open(VTT_PATH, "w", encoding="utf-8") as f:
    f.write("WEBVTT\n\n")
    for idx, (start, end, text) in enumerate(SUBTITLES, 1):
        clean_text = text.replace("<", "(").replace(">", ")")
        f.write(f"{format_vtt_time(start)} --> {format_vtt_time(end)}\n")
        f.write(f"{clean_text}\n\n")

print(f"Generated {SRT_PATH}")
print(f"Generated {VTT_PATH}")

