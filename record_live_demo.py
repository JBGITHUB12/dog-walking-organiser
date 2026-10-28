"""
Real Browser Video Recording of Dog Walking Organiser using Playwright & FFmpeg.
Captures actual live UI interactions, simulated mouse movements, typing, and tab transitions.
Converts output to high-compatibility H.264 MP4.
"""

import os
import sys
import time
import shutil
import subprocess
from playwright.sync_api import sync_playwright

FFMPEG_PATH = "ffmpeg"
APP_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML = os.path.join(APP_DIR, "index.html")
RECORDINGS_DIR = os.path.join(APP_DIR, "temp_video_rec")
OUTPUT_MP4 = os.path.join(APP_DIR, "dog_walker_app_demo.mp4")
OUTPUT_WEBM = os.path.join(APP_DIR, "dog_walker_app_demo.webm")
ARTIFACT_MP4 = os.path.dirname(os.path.abspath(__file__))

def record_live_session():
    if os.path.exists(RECORDINGS_DIR):
        shutil.rmtree(RECORDINGS_DIR, ignore_errors=True)
    os.makedirs(RECORDINGS_DIR, exist_ok=True)

    print("[1/3] Launching Playwright Chromium & Video Recorder...")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-web-security", "--allow-file-access-from-files"]
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=RECORDINGS_DIR,
            record_video_size={"width": 1280, "height": 720}
        )

        page = context.new_page()
        file_url = f"file:///{INDEX_HTML.replace('\\', '/')}"
        page.goto(file_url)
        page.wait_for_load_state("networkidle")
        time.sleep(1.0)

        # -------------------------------------------------------------
        # STEP 1: AUTHENTICATION & LOGIN (Admin)
        # -------------------------------------------------------------
        print("  -> Step 1: Logging in as Admin...")
        page.fill("#loginUsername", "admin")
        time.sleep(0.6)
        page.fill("#loginPassword", "admin123")
        time.sleep(0.6)
        page.click("#loginSubmitBtn")
        time.sleep(1.5)

        # -------------------------------------------------------------
        # STEP 2: MENU HUB & "WHAT DOES TODAY LOOK LIKE"
        # -------------------------------------------------------------
        print("  -> Step 2: Exploring Menu Hub & Today's Agenda...")
        page.hover("#tab-menu")
        time.sleep(1.0)
        
        # Toggle Today's Walk status
        status_btns = page.query_selector_all(".today-status-btn")
        if len(status_btns) >= 3:
            status_btns[1].click() # On Walk
            time.sleep(1.0)
            status_btns[2].click() # Completed
            time.sleep(1.2)
            status_btns[0].click() # Scheduled
            time.sleep(0.8)

        # -------------------------------------------------------------
        # STEP 3: SCHEDULE PLANNER & CONFLICT ENGINE
        # -------------------------------------------------------------
        print("  -> Step 3: Testing Schedule Parser & Dog Incompatibility Alert...")
        page.click("button[data-tab='tab-schedule']")
        time.sleep(1.0)

        # Click Test Conflict sample
        page.click("#loadSampleConflictBtn")
        time.sleep(2.0)

        # Click "Change to Solo Walk" on the conflicted card
        solo_btn = page.query_selector(".make-solo-btn")
        if solo_btn:
            solo_btn.click()
            time.sleep(1.5)

        # Check confirmation text preview
        page.hover("#replyMessagePreview")
        time.sleep(1.0)

        # -------------------------------------------------------------
        # STEP 4: PHOTO MONTAGE STUDIO
        # -------------------------------------------------------------
        print("  -> Step 4: Building Photo Montages...")
        page.click("button[data-tab='tab-montage']")
        time.sleep(1.0)

        # Load sample action photos
        page.click("#loadSamplePhotosBtn")
        time.sleep(1.5)

        # Switch Montage styles: Grid -> Polaroid -> Story
        style_btns = page.query_selector_all(".montage-style-btn")
        if len(style_btns) >= 3:
            style_btns[1].click() # Polaroid
            time.sleep(1.8)
            style_btns[2].click() # IG Story 9:16
            time.sleep(1.8)
            style_btns[0].click() # Clean Grid 1:1
            time.sleep(1.5)

        # -------------------------------------------------------------
        # STEP 5: GO TO PAPER (PRINT RUN-SHEET)
        # -------------------------------------------------------------
        print("  -> Step 5: Testing 'Go to Paper' Printable Sheet...")
        page.click("button[data-tab='tab-menu']")
        time.sleep(0.8)
        page.click("#menuGoToPaperTile")
        time.sleep(1.8)
        page.click("#printScopeWeekBtn")
        time.sleep(1.5)
        page.click("#closePaperPrintModalBtn")
        time.sleep(0.8)

        # -------------------------------------------------------------
        # STEP 6: EXPORT TO EXCEL
        # -------------------------------------------------------------
        print("  -> Step 6: Testing 'Export to Excel'...")
        page.click("#quickExcelExportBtn")
        time.sleep(1.2)

        # -------------------------------------------------------------
        # STEP 7: PROFILES & USER MANAGEMENT
        # -------------------------------------------------------------
        print("  -> Step 7: Checking Dogs, Walker Contacts & User Management...")
        page.click("button[data-tab='tab-contacts']")
        time.sleep(2.0)

        # Return to Menu Hub for clean finish
        page.click("button[data-tab='tab-menu']")
        time.sleep(2.0)

        context.close()
        browser.close()

    print("[2/3] Locating recorded video file...")
    recorded_files = [os.path.join(RECORDINGS_DIR, f) for f in os.listdir(RECORDINGS_DIR) if f.endswith(".webm")]
    if not recorded_files:
        print("Error: No recorded webm file found.")
        return False

    raw_webm = recorded_files[0]
    shutil.copyfile(raw_webm, OUTPUT_WEBM)
    print(f"  -> Captured raw WebM video: {raw_webm} ({os.path.getsize(raw_webm) / 1024:.1f} KB)")

    # -------------------------------------------------------------
    # STEP 8: CONVERT TO H.264 MP4 VIA FFMPEG
    # -------------------------------------------------------------
    print("[3/3] Encoding to standard H.264 MP4 with FFmpeg...")
    cmd = [
        FFMPEG_PATH,
        "-y",
        "-i", raw_webm,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        OUTPUT_MP4
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("FFmpeg encoding error:", res.stderr)
        # fallback copy
        shutil.copyfile(raw_webm, OUTPUT_MP4)
    else:
        print(f"✓ Successfully encoded H.264 MP4: {OUTPUT_MP4} ({os.path.getsize(OUTPUT_MP4) / 1024:.1f} KB)")

    # Copy to artifact folder for markdown embedding
    shutil.copyfile(OUTPUT_MP4, ARTIFACT_MP4)
    print(f"✓ Copied to artifact directory: {ARTIFACT_MP4}")

    # Clean up temp
    shutil.rmtree(RECORDINGS_DIR, ignore_errors=True)
    print("🎉 REAL BROWSER VIDEO RECORDING COMPLETE!")
    return True

if __name__ == "__main__":
    record_live_session()
