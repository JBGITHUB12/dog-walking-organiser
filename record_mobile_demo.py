"""
Mobile Phone App (PWA) Mode Video Recording of Dog Walking Organiser
Emulates iPhone / Android mobile device viewport (393x852) with touch events,
mobile bottom navigation bar, mobile layout cards, and PWA workflows.
"""

import os
import sys
import time
import shutil
from playwright.sync_api import sync_playwright
import cv2

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

APP_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML = os.path.join(APP_DIR, "index.html")
RECORDINGS_DIR = os.path.join(APP_DIR, "temp_mobile_rec")
OUTPUT_MP4 = os.path.join(APP_DIR, "dog_walker_mobile_demo.mp4")
OUTPUT_WEBM = os.path.join(APP_DIR, "dog_walker_mobile_demo.webm")

ARTIFACT_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACT_MP4 = os.path.join(ARTIFACT_DIR, "dog_walker_mobile_demo.mp4")
ARTIFACT_WEBM = os.path.join(ARTIFACT_DIR, "dog_walker_mobile_demo.webm")

def record_mobile_session():
    if os.path.exists(RECORDINGS_DIR):
        shutil.rmtree(RECORDINGS_DIR, ignore_errors=True)
    os.makedirs(RECORDINGS_DIR, exist_ok=True)

    print("[1/3] Launching Playwright Mobile Device Emulation (iPhone 14 Pro 393x852)...")
    with sync_playwright() as p:
        # iPhone 14 Pro profile
        device = p.devices["iPhone 14 Pro"]
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-web-security", "--allow-file-access-from-files"]
        )
        context = browser.new_context(
            **device,
            record_video_dir=RECORDINGS_DIR,
            record_video_size={"width": 393, "height": 852}
        )

        page = context.new_page()
        file_url = f"file:///{INDEX_HTML.replace('\\', '/')}"
        page.goto(file_url)
        page.wait_for_load_state("networkidle")
        time.sleep(1.0)

        # -------------------------------------------------------------
        # STEP 1: MOBILE LOGIN
        # -------------------------------------------------------------
        print("  -> Mobile Step 1: Login on touch device...")
        page.fill("#loginUsername", "admin")
        time.sleep(0.5)
        page.fill("#loginPassword", "admin123")
        time.sleep(0.5)
        page.tap("#loginSubmitBtn")
        time.sleep(1.5)

        # -------------------------------------------------------------
        # STEP 2: MOBILE MENU HUB & "WHAT DOES TODAY LOOK LIKE"
        # -------------------------------------------------------------
        print("  -> Mobile Step 2: Mobile Menu Hub & Today's Live Agenda...")
        page.evaluate("window.scrollTo(0, 150)")
        time.sleep(1.0)

        # Toggle walk status on mobile
        status_btns = page.query_selector_all(".today-status-btn")
        if len(status_btns) >= 3:
            status_btns[1].tap() # On Walk
            time.sleep(1.0)
            status_btns[2].tap() # Completed
            time.sleep(1.0)
            status_btns[0].tap() # Scheduled
            time.sleep(0.8)

        # Scroll down to view mobile menu launcher cards
        page.evaluate("window.scrollTo(0, 450)")
        time.sleep(1.5)

        # -------------------------------------------------------------
        # STEP 3: MOBILE BOTTOM NAV -> SCHEDULE & CONFLICT ENGINE
        # -------------------------------------------------------------
        print("  -> Mobile Step 3: Tapping bottom nav -> Schedule Planner...")
        page.evaluate("window.scrollTo(0, 0)")
        page.tap("div.md\\:hidden button[data-tab='tab-schedule']")
        time.sleep(1.2)

        # Tap sample conflict button
        page.tap("#loadSampleConflictBtn")
        time.sleep(1.5)

        # Scroll down to inspect the conflict card on mobile
        page.evaluate("window.scrollTo(0, 300)")
        time.sleep(1.2)

        # Resolve conflict by tapping "Change to Solo Walk"
        solo_btn = page.query_selector(".make-solo-btn")
        if solo_btn:
            solo_btn.tap()
            time.sleep(1.2)

        # Scroll down to WhatsApp/Instagram reply buttons
        page.evaluate("window.scrollTo(0, 600)")
        time.sleep(1.2)

        # -------------------------------------------------------------
        # STEP 4: MOBILE BOTTOM NAV -> PHOTO MONTAGE STUDIO
        # -------------------------------------------------------------
        print("  -> Mobile Step 4: Tapping bottom nav -> Photo Montage Studio...")
        page.evaluate("window.scrollTo(0, 0)")
        page.tap("div.md\\:hidden button[data-tab='tab-montage']")
        time.sleep(1.0)

        # Load photos
        page.tap("#loadSamplePhotosBtn")
        time.sleep(1.5)

        # Scroll to canvas preview
        page.evaluate("window.scrollTo(0, 250)")
        time.sleep(1.0)

        # Switch to Instagram Story 9:16 style
        style_btns = page.query_selector_all(".montage-style-btn")
        if len(style_btns) >= 3:
            style_btns[2].tap() # IG Story
            time.sleep(1.8)
            style_btns[1].tap() # Polaroid
            time.sleep(1.5)
            style_btns[0].tap() # Clean Grid
            time.sleep(1.2)

        # Scroll to WhatsApp/IG share buttons
        page.evaluate("window.scrollTo(0, 650)")
        time.sleep(1.5)

        # -------------------------------------------------------------
        # STEP 5: MOBILE BOTTOM NAV -> PROFILES & EXCEL/PRINT
        # -------------------------------------------------------------
        print("  -> Mobile Step 5: Tapping bottom nav -> Profiles & Menu Hub...")
        page.evaluate("window.scrollTo(0, 0)")
        page.tap("div.md\\:hidden button[data-tab='tab-contacts']")
        time.sleep(1.5)

        # Return to Home Menu Hub
        page.tap("div.md\\:hidden button[data-tab='tab-menu']")
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(1.5)

        context.close()
        browser.close()

    print("[2/3] Processing captured mobile recording...")
    recorded_files = [os.path.join(RECORDINGS_DIR, f) for f in os.listdir(RECORDINGS_DIR) if f.endswith(".webm")]
    if not recorded_files:
        print("Error: No mobile recorded webm file found.")
        return False

    raw_webm = recorded_files[0]
    shutil.copyfile(raw_webm, OUTPUT_WEBM)
    shutil.copyfile(raw_webm, ARTIFACT_WEBM)
    print(f"  -> Saved Mobile WebM: {OUTPUT_WEBM} ({os.path.getsize(OUTPUT_WEBM)/1024:.1f} KB)")

    print("[3/3] Transcoding Mobile WebM to standard MP4 with OpenCV...")
    cap = cv2.VideoCapture(raw_webm)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 393
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 852
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 600

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(OUTPUT_MP4, fourcc, fps, (width, height))

    count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        out.write(frame)
        count += 1

    cap.release()
    out.release()

    shutil.copyfile(OUTPUT_MP4, ARTIFACT_MP4)
    print(f"  -> Saved Mobile MP4: {OUTPUT_MP4} ({os.path.getsize(OUTPUT_MP4)/1024:.1f} KB)")
    print(f"  -> Saved Mobile MP4 to artifact dir: {ARTIFACT_MP4}")

    shutil.rmtree(RECORDINGS_DIR, ignore_errors=True)
    print("🎉 MOBILE APP MODE VIDEO RECORDING COMPLETE!")
    return True

if __name__ == "__main__":
    record_mobile_session()
