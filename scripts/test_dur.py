import asyncio
import edge_tts
import subprocess
import os

VOICE = "en-US-ChristopherNeural"

async def test():
    text = "Welcome to Swapcast. In this demo video, we present our complete AI-powered podcast growth platform grounded in Qloo cultural taste graph."
    comm = edge_tts.Communicate(text, VOICE)
    await comm.save("test_dur.mp3")

asyncio.run(test())

# Check duration using ffprobe
cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", "test_dur.mp3"]
res = subprocess.run(cmd, capture_output=True, text=True)
print("Duration:", res.stdout.strip())
if os.path.exists("test_dur.mp3"):
    os.remove("test_dur.mp3")

