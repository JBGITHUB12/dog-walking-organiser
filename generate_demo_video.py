"""
Dog Walking Organiser - High Quality Animated Video Demonstration Generator
Generates a 1280x720 30FPS MP4 video demonstrating all app functions:
1. Intro & Security Login
2. Menu Hub & "What Does Today Look Like" Live Agenda
3. Schedule Parser & Dog Compatibility Conflict Engine
4. WhatsApp / Instagram DM Confirmation Replies
5. Calendar Sync (.ICS & Google Calendar)
6. Photo Montage Studio (Grid, Polaroid, Story 9:16)
7. "Go to Paper" Printable Clipboard Run-Sheet
8. "Export to Excel" Multi-Section Spreadsheet
9. Outro & PWA Mobile Installation
"""

import sys
import os
import math
import shutil

# Ensure UTF-8 output on Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "dog_walker_app_demo.mp4")
LOCAL_COPY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dog_walker_app_demo.mp4")

WIDTH, HEIGHT = 1280, 720
FPS = 30

# Try to load clean fonts
try:
    font_title_large = ImageFont.truetype("arialbd.ttf", 46)
    font_title_med = ImageFont.truetype("arialbd.ttf", 30)
    font_body_bold = ImageFont.truetype("arialbd.ttf", 20)
    font_body = ImageFont.truetype("arial.ttf", 18)
    font_small = ImageFont.truetype("arial.ttf", 15)
    font_code = ImageFont.truetype("consola.ttf", 16)
except Exception:
    font_title_large = ImageFont.load_default()
    font_title_med = ImageFont.load_default()
    font_body_bold = ImageFont.load_default()
    font_body = ImageFont.load_default()
    font_small = ImageFont.load_default()
    font_code = ImageFont.load_default()

def create_gradient(w, h, color1, color2):
    """Creates a vertical gradient background."""
    base = Image.new('RGB', (w, h), color1)
    top = Image.new('RGB', (w, h), color2)
    mask = Image.new('L', (w, h))
    mask_data = []
    for y in range(h):
        mask_data.extend([int(255 * (y / h))] * w)
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

def draw_rounded_card(draw, xy, fill, outline=None, width=1, radius=16):
    """Draws a smooth rounded rectangle card."""
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def draw_header_bar(draw, current_section_name, progress_ratio=0.0):
    """Draws top branded header and progress bar."""
    draw_rounded_card(draw, (40, 20, 1240, 75), fill=(255, 255, 255), outline=(226, 232, 240), width=2, radius=14)
    # Brand icon
    draw.ellipse((55, 30, 95, 65), fill=(249, 115, 22))
    draw.text((67, 36), "PAW", font=font_small, fill=(255, 255, 255))
    draw.text((110, 33), "Dog Walking Organiser", font=font_body_bold, fill=(15, 23, 42))
    draw.text((110, 53), "Security Hub • Live Schedules • Montage Studio", font=font_small, fill=(100, 116, 139))
    
    # Current Section Tag
    draw_rounded_card(draw, (920, 32, 1225, 63), fill=(254, 243, 199), outline=(252, 211, 77), width=1, radius=8)
    draw.text((935, 40), f"FEATURE: {current_section_name.upper()}", font=font_small, fill=(146, 64, 14))

    # Top progress line
    prog_w = int(1200 * progress_ratio)
    if prog_w > 0:
        draw.rectangle((40, 74, 40 + prog_w, 77), fill=(249, 115, 22))

def render_frame_to_cv2(pil_img):
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

def generate_video():
    print(f"[START] Initializing Video Generator: {WIDTH}x{HEIGHT} @ {FPS}fps...")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out = cv2.VideoWriter(OUTPUT_FILE, fourcc, FPS, (WIDTH, HEIGHT))

    frames_total = 0

    def add_frames(img, count=1):
        nonlocal frames_total
        frame_bgr = render_frame_to_cv2(img)
        for _ in range(count):
            out.write(frame_bgr)
            frames_total += 1

    # =========================================================================
    # SCENE 1: TITLE & INTRO OVERVIEW (0:00 - 0:04) - 120 frames
    # =========================================================================
    print("Rendering Scene 1: Title & Hero...")
    for f in range(120):
        t = f / 120.0
        bg = create_gradient(WIDTH, HEIGHT, (15, 23, 42), (30, 41, 59))
        draw = ImageDraw.Draw(bg)

        # Pulse circle
        scale = 1.0 + 0.05 * math.sin(t * math.pi * 3)
        cx, cy = 640, 240
        r = int(60 * scale)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(249, 115, 22))
        draw.text((cx - 25, cy - 15), "DOG", font=font_title_med, fill=(255, 255, 255))

        draw.text((640, 340), "Dog Walking Organiser", font=font_title_large, fill=(255, 255, 255), anchor="mm")
        draw.text((640, 395), "Full Feature Video Demonstration", font=font_title_med, fill=(251, 146, 60), anchor="mm")
        draw.text((640, 440), "Live Agenda • Dog Compatibility • Photo Montage • Excel & Print", font=font_body, fill=(203, 213, 225), anchor="mm")

        # Feature pills
        badges = ["Admin Security", "Today's Agenda", "Message Parser", "Montage Studio", "Go to Paper", "Excel Export"]
        bx = 140
        for b in badges:
            draw_rounded_card(draw, (bx, 520, bx + 160, 560), fill=(255, 255, 255), outline=(249, 115, 22), width=1, radius=10)
            draw.text((bx + 80, 540), b, font=font_small, fill=(255, 255, 255), anchor="mm")
            bx += 170

        add_frames(bg, 1)

    # =========================================================================
    # SCENE 2: AUTHENTICATION & ADMIN REGISTRATION (0:04 - 0:08) - 120 frames
    # =========================================================================
    print("Rendering Scene 2: Security & Login...")
    for f in range(120):
        t = f / 120.0
        bg = Image.new('RGB', (WIDTH, HEIGHT), (248, 250, 252))
        draw = ImageDraw.Draw(bg)
        draw_header_bar(draw, "1. Admin Security & Login", 0.15)

        # Login Modal Card
        draw_rounded_card(draw, (390, 120, 890, 640), fill=(255, 255, 255), outline=(226, 232, 240), width=2, radius=24)
        draw.ellipse((610, 150, 670, 210), fill=(249, 115, 22))
        draw.text((622, 172), "LOCK", font=font_small, fill=(255, 255, 255))
        
        draw.text((640, 235), "Dog Walking Organiser", font=font_title_med, fill=(15, 23, 42), anchor="mm")
        draw.text((640, 265), "Admin-Controlled User Registration & PBKDF2/SHA-256 Auth", font=font_small, fill=(100, 116, 139), anchor="mm")

        # Inputs
        draw.text((430, 305), "Username", font=font_body_bold, fill=(51, 65, 85))
        draw_rounded_card(draw, (430, 330, 850, 375), fill=(241, 245, 249), outline=(203, 213, 225), width=1, radius=10)
        draw.text((450, 345), "admin" if t > 0.2 else "", font=font_body_bold, fill=(15, 23, 42))

        draw.text((430, 395), "Password (Encrypted PBKDF2)", font=font_body_bold, fill=(51, 65, 85))
        draw_rounded_card(draw, (430, 420, 850, 465), fill=(241, 245, 249), outline=(203, 213, 225), width=1, radius=10)
        draw.text((450, 437), "••••••••••••" if t > 0.4 else "", font=font_body_bold, fill=(15, 23, 42))

        # Sign in button with simulated click
        btn_color = (234, 88, 12) if t > 0.6 else (249, 115, 22)
        draw_rounded_card(draw, (430, 500, 850, 550), fill=btn_color, radius=12)
        draw.text((640, 525), "Secure Sign In (Verified Admin)", font=font_body_bold, fill=(255, 255, 255), anchor="mm")

        # Success toast animation
        if t > 0.7:
            draw_rounded_card(draw, (480, 575, 800, 615), fill=(22, 101, 52), radius=10)
            draw.text((640, 595), "Welcome back, Administrator (ADMIN)!", font=font_small, fill=(255, 255, 255), anchor="mm")

        add_frames(bg, 1)

    # =========================================================================
    # SCENE 3: MENU HUB & "WHAT DOES TODAY LOOK LIKE?" (0:08 - 0:13) - 150 frames
    # =========================================================================
    print("Rendering Scene 3: Menu Hub & Today's Agenda...")
    for f in range(150):
        t = f / 150.0
        bg = Image.new('RGB', (WIDTH, HEIGHT), (248, 250, 252))
        draw = ImageDraw.Draw(bg)
        draw_header_bar(draw, "2. Menu Hub & Today's Live Agenda", 0.30)

        # Hero Banner
        draw_rounded_card(draw, (40, 95, 1240, 240), fill=(15, 23, 42), radius=20)
        draw.text((70, 120), "Good morning, Administrator! 🐾", font=font_title_med, fill=(255, 255, 255))
        draw.text((70, 158), "Manage dogs, schedule weekly slots, track today's live walk status, and export to paper or Excel.", font=font_body, fill=(203, 213, 225))
        
        # Hero Stats
        stats = [
            ("TODAY'S WALK", "On Walk 🐾" if t > 0.5 else "Scheduled", (251, 146, 60)),
            ("WEEK'S WALKS", "5 Walks (5.0 hrs)", (255, 255, 255)),
            ("WEEKLY BILL", "£75.00", (74, 222, 128)),
            ("ACTIVE DOG", "Buddy with Sarah", (253, 224, 71))
        ]
        sx = 70
        for label, val, val_col in stats:
            draw_rounded_card(draw, (sx, 185, sx + 265, 228), fill=(30, 41, 59), radius=8)
            draw.text((sx + 10, 192), label, font=font_small, fill=(148, 163, 184))
            draw.text((sx + 10, 207), val, font=font_body_bold, fill=val_col)
            sx += 280

        # "What Does Today Look Like?" Big Card
        draw_rounded_card(draw, (40, 260, 1240, 520), fill=(255, 255, 255), outline=(253, 186, 116), width=2, radius=20)
        draw.text((70, 280), "☀️ What Does Today Look Like? — Friday's Live Session", font=font_title_med, fill=(15, 23, 42))
        
        # Today walk details card
        draw_rounded_card(draw, (70, 330, 1210, 500), fill=(255, 251, 245), outline=(254, 215, 170), width=1, radius=14)
        draw.ellipse((95, 355, 145, 405), fill=(249, 115, 22))
        draw.text((105, 370), "DOG", font=font_small, fill=(255, 255, 255))
        draw.text((165, 355), "Buddy's Morning Walk Session", font=font_body_bold, fill=(15, 23, 42))
        draw.text((165, 380), "Time: 8:30 AM (60 mins) • Walker: Sarah (@sarah_dogwalks)", font=font_body, fill=(100, 116, 139))
        draw.text((165, 415), "Pack Companions: Bella • Lockbox: Code 1234 (Treat after walk)", font=font_body_bold, fill=(234, 88, 12))

        # Status pills
        draw.text((165, 455), "Live Walk Status:", font=font_body_bold, fill=(51, 65, 85))
        pill_active = 2 if t > 0.7 else (1 if t > 0.3 else 0)
        pills = [("Scheduled", 330), ("Walking Now", 490), ("Completed", 650)]
        for idx, (p_text, px) in enumerate(pills):
            p_fill = (249, 115, 22) if idx == pill_active else (241, 245, 249)
            p_txt_col = (255, 255, 255) if idx == pill_active else (100, 116, 139)
            draw_rounded_card(draw, (px, 450, px + 140, 485), fill=p_fill, radius=8)
            draw.text((px + 70, 467), p_text, font=font_small, fill=p_txt_col, anchor="mm")

        # Bottom Menu Action Tiles Bar
        draw.text((40, 540), "Organiser Menu & Quick Launchers:", font=font_body_bold, fill=(15, 23, 42))
        menu_items = ["Schedule Parser", "Montage Studio", "Dogs & Rules", "Walker Contacts", "Go to Paper", "Excel Export"]
        mx = 40
        for m in menu_items:
            draw_rounded_card(draw, (mx, 570, mx + 185, 680), fill=(255, 255, 255), outline=(226, 232, 240), width=1, radius=12)
            draw.text((mx + 92, 625), m, font=font_body_bold, fill=(15, 23, 42), anchor="mm")
            mx += 202

        add_frames(bg, 1)

    # =========================================================================
    # SCENE 4: SCHEDULE PARSER & DOG COMPATIBILITY ALERT (0:13 - 0:19) - 180 frames
    # =========================================================================
    print("Rendering Scene 4: Schedule Parser & Compatibility Engine...")
    for f in range(180):
        t = f / 180.0
        bg = Image.new('RGB', (WIDTH, HEIGHT), (248, 250, 252))
        draw = ImageDraw.Draw(bg)
        draw_header_bar(draw, "3. Schedule Parser & Dog Incompatibility Rules", 0.50)

        # Left Column: Raw Message Input
        draw_rounded_card(draw, (40, 95, 520, 680), fill=(255, 255, 255), outline=(226, 232, 240), width=2, radius=18)
        draw.text((60, 115), "1. Paste Walker WhatsApp Message", font=font_body_bold, fill=(15, 23, 42))
        
        raw_msg = [
            "Let me know if these times work:",
            "",
            "Monday 7.30 am with Bella",
            "Tuesday 7 am with Buster",
            "Wednesday 8.30 am (solo)",
            "Thursday 7 am with Daisy",
            "Friday 8.30am with Bella"
        ]
        draw_rounded_card(draw, (60, 150, 500, 340), fill=(248, 250, 252), outline=(203, 213, 225), width=1, radius=10)
        for i, line in enumerate(raw_msg):
            draw.text((75, 160 + i * 24), line, font=font_code, fill=(30, 41, 59))

        draw_rounded_card(draw, (60, 360, 500, 410), fill=(234, 88, 12), radius=10)
        draw.text((280, 385), "Parse & Build Schedule", font=font_body_bold, fill=(255, 255, 255), anchor="mm")

        # Financials Card
        draw_rounded_card(draw, (60, 430, 500, 650), fill=(240, 253, 244), outline=(187, 247, 208), width=1, radius=12)
        draw.text((80, 450), "Weekly Summary & Bill:", font=font_body_bold, fill=(22, 101, 52))
        draw.text((80, 485), "Total Walks: 5 Scheduled (5.0 hrs)", font=font_body, fill=(21, 128, 61))
        draw.text((80, 515), "Total Cost: £75.00 (@ £15.00/walk)", font=font_title_med, fill=(22, 101, 52))

        # Right Column: Visual Schedule & Compatibility Alert
        draw_rounded_card(draw, (550, 95, 1240, 680), fill=(255, 255, 255), outline=(226, 232, 240), width=2, radius=18)
        draw.text((580, 115), "Weekly Schedule Cards & Safety Rules", font=font_body_bold, fill=(15, 23, 42))

        # Conflict Banner (Simulated)
        if t < 0.6:
            draw_rounded_card(draw, (580, 150, 1210, 220), fill=(255, 241, 242), outline=(244, 63, 94), width=2, radius=12)
            draw.text((600, 165), "Safety Conflict Alert: Tuesday walk has 'Buster'!", font=font_body_bold, fill=(159, 18, 57))
            draw.text((600, 190), "Buddy's rule: Does NOT walk with Buster. Action required.", font=font_small, fill=(225, 29, 72))
        else:
            draw_rounded_card(draw, (580, 150, 1210, 220), fill=(240, 253, 244), outline=(74, 222, 128), width=2, radius=12)
            draw.text((600, 165), "Conflict Resolved: Tuesday switched to Solo Walk Mode!", font=font_body_bold, fill=(21, 128, 61))
            draw.text((600, 190), "All 5 walks are safe and confirmed for Buddy.", font=font_small, fill=(22, 101, 52))

        # Days list
        days_data = [
            ("Monday", "7:30 AM", "With Bella", False),
            ("Tuesday", "7:00 AM", "Solo Walk" if t >= 0.6 else "With Buster (CONFLICT)", t < 0.6),
            ("Wednesday", "8:30 AM", "Solo Walk", False),
            ("Thursday", "7:00 AM", "With Daisy", False),
            ("Friday", "8:30 AM", "With Bella", False)
        ]
        dy = 240
        for dname, dtime, dpack, is_conflict in days_data:
            c_fill = (255, 241, 242) if is_conflict else (255, 251, 245)
            c_out = (244, 63, 94) if is_conflict else (254, 215, 170)
            draw_rounded_card(draw, (580, dy, 1210, dy + 70), fill=c_fill, outline=c_out, width=1, radius=10)
            draw.text((600, dy + 15), dname, font=font_body_bold, fill=(15, 23, 42))
            draw.text((720, dy + 15), f"{dtime} (60m)", font=font_body_bold, fill=(234, 88, 12))
            draw.text((900, dy + 15), f"Pack: {dpack}", font=font_body_bold, fill=(225, 29, 72) if is_conflict else (71, 85, 105))
            
            if is_conflict:
                draw_rounded_card(draw, (1080, dy + 15, 1195, dy + 55), fill=(225, 29, 72), radius=6)
                draw.text((1137, dy + 35), "Make Solo", font=font_small, fill=(255, 255, 255), anchor="mm")
            else:
                draw.text((1110, dy + 25), "OK", font=font_body_bold, fill=(22, 101, 52))

            dy += 82

        add_frames(bg, 1)

    # =========================================================================
    # SCENE 5: PHOTO MONTAGE STUDIO & SOCIAL SHARING (0:19 - 0:26) - 210 frames
    # =========================================================================
    print("Rendering Scene 5: Photo Montage Studio...")
    for f in range(210):
        t = f / 210.0
        bg = Image.new('RGB', (WIDTH, HEIGHT), (248, 250, 252))
        draw = ImageDraw.Draw(bg)
        draw_header_bar(draw, "4. Photo Montage Studio & WhatsApp/IG Sharing", 0.70)

        # Left Column: Montage Controls
        draw_rounded_card(draw, (40, 95, 500, 680), fill=(255, 255, 255), outline=(226, 232, 240), width=2, radius=18)
        draw.text((60, 115), "Montage Studio Controls", font=font_body_bold, fill=(15, 23, 42))

        draw.text((60, 155), "Tagged Dog: Buddy | Walker: Sarah", font=font_body_bold, fill=(234, 88, 12))
        draw.text((60, 185), "Title: Morning Park Adventures", font=font_body, fill=(51, 65, 85))
        draw.text((60, 215), "Highlights: Splashing in the stream & muddy paws!", font=font_small, fill=(100, 116, 139))

        # Template buttons
        draw.text((60, 255), "Choose Style:", font=font_body_bold, fill=(15, 23, 42))
        styles = [("Clean Grid (1:1)", 0), ("Polaroid", 1), ("IG Story (9:16)", 2)]
        active_style = 2 if t > 0.65 else (1 if t > 0.35 else 0)
        bx = 60
        for sname, sidx in styles:
            s_fill = (254, 243, 199) if sidx == active_style else (241, 245, 249)
            s_out = (249, 115, 22) if sidx == active_style else (203, 213, 225)
            draw_rounded_card(draw, (bx, 285, bx + 130, 335), fill=s_fill, outline=s_out, width=2 if sidx == active_style else 1, radius=8)
            draw.text((bx + 65, 310), sname, font=font_small, fill=(15, 23, 42), anchor="mm")
            bx += 140

        # Social Post Action Buttons
        draw.text((60, 370), "Post Montage Directly To:", font=font_body_bold, fill=(15, 23, 42))
        draw_rounded_card(draw, (60, 400, 480, 450), fill=(22, 163, 74), radius=10)
        draw.text((270, 425), "Send to Walker on WhatsApp", font=font_body_bold, fill=(255, 255, 255), anchor="mm")

        draw_rounded_card(draw, (60, 465, 480, 515), fill=(219, 39, 119), radius=10)
        draw.text((270, 490), "Post to Instagram DM (@sarah_dogwalks)", font=font_body_bold, fill=(255, 255, 255), anchor="mm")

        draw_rounded_card(draw, (60, 530, 480, 580), fill=(15, 23, 42), radius=10)
        draw.text((270, 555), "Download High-Res PNG Montage", font=font_body_bold, fill=(255, 255, 255), anchor="mm")

        # Right Column: Live High-Res Canvas Simulation
        draw_rounded_card(draw, (530, 95, 1240, 680), fill=(241, 245, 249), outline=(226, 232, 240), width=2, radius=18)
        draw.text((550, 115), "Live Canvas Rendering Preview:", font=font_body_bold, fill=(15, 23, 42))

        if active_style == 0:
            # Grid 1:1
            draw_rounded_card(draw, (640, 150, 1130, 640), fill=(255, 237, 213), outline=(249, 115, 22), width=2, radius=16)
            draw_rounded_card(draw, (670, 180, 1100, 240), fill=(255, 255, 255), radius=10)
            draw.text((690, 205), "Buddy's Morning Park Adventures", font=font_body_bold, fill=(15, 23, 42))

            # 4 Photo blocks
            draw_rounded_card(draw, (670, 260, 875, 430), fill=(251, 191, 36), radius=10)
            draw.text((772, 345), "Fetch Action", font=font_body_bold, fill=(255, 255, 255), anchor="mm")

            draw_rounded_card(draw, (895, 260, 1100, 430), fill=(56, 189, 248), radius=10)
            draw.text((997, 345), "River Splash", font=font_body_bold, fill=(255, 255, 255), anchor="mm")

            draw_rounded_card(draw, (670, 445, 875, 575), fill=(74, 222, 128), radius=10)
            draw.text((772, 510), "Trail Walk", font=font_body_bold, fill=(255, 255, 255), anchor="mm")

            draw_rounded_card(draw, (895, 445, 1100, 575), fill=(192, 132, 252), radius=10)
            draw.text((997, 510), "Happy Nap", font=font_body_bold, fill=(255, 255, 255), anchor="mm")

            draw_rounded_card(draw, (670, 590, 1100, 625), fill=(255, 255, 255), radius=8)
            draw.text((690, 602), "Muddy paws & big smiles! • @sarah_dogwalks", font=font_small, fill=(234, 88, 12))

        elif active_style == 1:
            # Polaroid Scrapbook
            draw_rounded_card(draw, (640, 150, 1130, 640), fill=(241, 245, 249), outline=(203, 213, 225), width=2, radius=16)
            draw.text((885, 180), "Buddy's Polaroid Scrapbook", font=font_title_med, fill=(30, 41, 59), anchor="mm")

            # 2 Big Polaroids
            draw_rounded_card(draw, (680, 220, 880, 540), fill=(255, 255, 255), outline=(203, 213, 225), width=2, radius=8)
            draw_rounded_card(draw, (700, 240, 860, 440), fill=(251, 191, 36), radius=4)
            draw.text((780, 340), "Best walk!", font=font_body_bold, fill=(255, 255, 255), anchor="mm")
            draw.text((780, 480), "Splashing in mud", font=font_body, fill=(15, 23, 42), anchor="mm")

            draw_rounded_card(draw, (900, 250, 1100, 570), fill=(255, 255, 255), outline=(203, 213, 225), width=2, radius=8)
            draw_rounded_card(draw, (920, 270, 1080, 470), fill=(56, 189, 248), radius=4)
            draw.text((1000, 370), "Tennis ball champion", font=font_body_bold, fill=(255, 255, 255), anchor="mm")
            draw.text((1000, 510), "Tired puppy", font=font_body, fill=(15, 23, 42), anchor="mm")

        else:
            # Instagram Story 9:16
            draw_rounded_card(draw, (740, 150, 1030, 650), fill=(15, 23, 42), outline=(236, 72, 153), width=3, radius=20)
            draw.text((770, 180), "Buddy's Walk Story", font=font_body_bold, fill=(255, 255, 255))
            draw.text((770, 205), "with @sarah_dogwalks", font=font_small, fill=(251, 146, 60))
            
            draw_rounded_card(draw, (765, 235, 1005, 480), fill=(251, 191, 36), radius=12)
            draw.text((885, 350), "High Energy Park Run!", font=font_body_bold, fill=(255, 255, 255), anchor="mm")

            draw_rounded_card(draw, (765, 500, 1005, 620), fill=(255, 255, 255), radius=12)
            draw.text((785, 525), "Morning Park Adventures", font=font_body_bold, fill=(15, 23, 42))
            draw.text((785, 555), "Safe & Sound with Sarah • 100% Happy Pup", font=font_small, fill=(100, 116, 139))

        add_frames(bg, 1)

    # =========================================================================
    # SCENE 6: "GO TO PAPER" & "EXPORT TO EXCEL" (0:26 - 0:33) - 210 frames
    # =========================================================================
    print("Rendering Scene 6: Paper Printing & Excel Export...")
    for f in range(210):
        t = f / 210.0
        bg = Image.new('RGB', (WIDTH, HEIGHT), (248, 250, 252))
        draw = ImageDraw.Draw(bg)
        draw_header_bar(draw, "5. 'Go to Paper' & Excel Spreadsheet Export", 0.90)

        # Left Column: "Go to Paper" Printable Run-Sheet
        draw_rounded_card(draw, (40, 95, 620, 680), fill=(255, 255, 255), outline=(203, 213, 225), width=2, radius=18)
        draw.text((60, 115), "'Go to Paper' (Print Clipboard Sheet)", font=font_body_bold, fill=(15, 23, 42))

        # Paper Preview Sheet (High contrast B&W)
        draw_rounded_card(draw, (60, 150, 600, 620), fill=(255, 255, 255), outline=(0, 0, 0), width=2, radius=8)
        draw.text((80, 170), "Dog Walking Run-Sheet — Friday", font=font_body_bold, fill=(0, 0, 0))
        draw.text((80, 195), "Walker: Sarah | Phone: +447123456789 | Dog: Buddy", font=font_small, fill=(0, 0, 0))

        # Table rows with checkboxes
        table_rows = [
            ("[X]", "Mon 7:30 AM", "Buddy (Golden)", "Bella", "Done"),
            ("[X]", "Tue 7:00 AM", "Buddy (Solo Walk)", "None", "Done"),
            ("[X]", "Wed 8:30 AM", "Buddy (Solo Walk)", "None", "Done"),
            ("[ ]", "Thu 7:00 AM", "Buddy (Golden)", "Daisy", "Upcoming"),
            ("[ ]", "Fri 8:30 AM", "Buddy (Golden)", "Bella", "Upcoming")
        ]
        ty = 230
        draw.rectangle((80, ty, 580, ty + 25), fill=(241, 245, 249), outline=(0, 0, 0))
        draw.text((85, ty + 5), "Done  |  Day & Time  |  Dog & Breed  |  Pack", font=font_small, fill=(0, 0, 0))
        ty += 25

        for done, dt, dog_str, p_str, status in table_rows:
            draw.rectangle((80, ty, 580, ty + 35), fill=(255, 255, 255), outline=(0, 0, 0))
            draw.text((90, ty + 8), done, font=font_body_bold, fill=(0, 0, 0))
            draw.text((130, ty + 8), dt, font=font_small, fill=(0, 0, 0))
            draw.text((260, ty + 8), dog_str, font=font_small, fill=(0, 0, 0))
            draw.text((430, ty + 8), p_str, font=font_small, fill=(0, 0, 0))
            ty += 35

        draw.text((80, 460), "Key Code: Lockbox 1234 | Allergic to chicken", font=font_small, fill=(0, 0, 0))
        draw.text((80, 520), "Total Bill Due: £75.00", font=font_body_bold, fill=(0, 0, 0))
        draw.line((350, 535, 570, 535), fill=(0, 0, 0), width=1)
        draw.text((380, 545), "Walker Signature / Date", font=font_small, fill=(100, 116, 139))

        draw_rounded_card(draw, (60, 630, 600, 665), fill=(15, 23, 42), radius=8)
        draw.text((330, 647), "1-Click Print (A4 / Letter Ready)", font=font_body_bold, fill=(255, 255, 255), anchor="mm")

        # Right Column: "Export to Excel" (.CSV)
        draw_rounded_card(draw, (660, 95, 1240, 680), fill=(255, 255, 255), outline=(226, 232, 240), width=2, radius=18)
        draw.text((680, 115), "'Export All to Excel' (.CSV Spreadsheet)", font=font_body_bold, fill=(15, 23, 42))

        # Excel Spreadsheet UI mockup
        draw_rounded_card(draw, (680, 150, 1220, 620), fill=(240, 253, 244), outline=(74, 222, 128), width=2, radius=8)
        draw.rectangle((680, 150, 1220, 195), fill=(22, 101, 52))
        draw.text((700, 165), "dog_walking_schedule_export.csv — Microsoft Excel", font=font_body_bold, fill=(255, 255, 255))

        csv_lines = [
            "A1: Day       | B1: Date       | C1: Time   | D1: Dog    | E1: Rate | F1: Status",
            "A2: Monday    | B2: 2026-08-24 | C2: 7:30AM | D2: Buddy  | E2: £15  | F2: DONE",
            "A3: Tuesday   | B3: 2026-08-25 | C3: 7:00AM | D3: Buddy  | E3: £15  | F3: DONE",
            "A4: Wednesday | B4: 2026-08-26 | C4: 8:30AM | D4: Buddy  | E4: £15  | F4: DONE",
            "A5: Thursday  | B5: 2026-08-27 | C5: 7:00AM | D5: Buddy  | E5: £15  | F5: SCHED",
            "A6: Friday    | B6: 2026-08-28 | C6: 8:30AM | D6: Buddy  | E6: £15  | F5: SCHED",
            "",
            "--- SECTION 2: DOG DIRECTORY & SAFETY RULES ---",
            "Buddy | Golden Retriever | 3 yrs | SELECTIVE | Incompatible: Buster, Bruno",
            "Luna  | French Bulldog   | 2 yrs | SOLO ONLY | Incompatible: All Dogs",
            "",
            "--- FINANCIAL TOTALS: 5 Walks • 5.0 Hours • £75.00 Total Bill ---"
        ]

        cy = 210
        for cline in csv_lines:
            draw.text((700, cy), cline, font=font_code, fill=(20, 83, 45))
            cy += 28

        draw_rounded_card(draw, (680, 630, 1220, 665), fill=(22, 163, 74), radius=8)
        draw.text((950, 647), "1-Click Export Complete Excel Spreadsheet (.CSV)", font=font_body_bold, fill=(255, 255, 255), anchor="mm")

        add_frames(bg, 1)

    # =========================================================================
    # SCENE 7: SUMMARY & OUTRO (0:33 - 0:38) - 150 frames
    # =========================================================================
    print("Rendering Scene 7: Outro & Installation Summary...")
    for f in range(150):
        t = f / 150.0
        bg = create_gradient(WIDTH, HEIGHT, (15, 23, 42), (30, 41, 59))
        draw = ImageDraw.Draw(bg)

        draw.ellipse((600, 140, 680, 220), fill=(249, 115, 22))
        draw.text((615, 165), "PAW", font=font_title_med, fill=(255, 255, 255))

        draw.text((640, 260), "Ready to Organise Your Dog Walks!", font=font_title_large, fill=(255, 255, 255), anchor="mm")
        draw.text((640, 310), "Desktop & Mobile Phone App (PWA) • 100% Offline Capable", font=font_title_med, fill=(251, 146, 60), anchor="mm")

        # Summary Grid
        summary_items = [
            ("Security & RBAC", "Admin-only account creation & PBKDF2 cryptography"),
            ("Today's Agenda", "Live status tracker with lockbox & companion details"),
            ("Schedule Parser", "WhatsApp text parser with dog incompatibility alerts"),
            ("Montage Studio", "Grid, Polaroid, Story 9:16 collages for WhatsApp/IG"),
            ("Go to Paper", "High-contrast printable run-sheets for clipboards"),
            ("Excel Export", "Full multi-section .CSV spreadsheet downloads")
        ]

        sy = 360
        for i, (stitle, sdesc) in enumerate(summary_items):
            col = i % 2
            row = i // 2
            card_x = 160 + col * 490
            card_y = sy + row * 90
            draw_rounded_card(draw, (card_x, card_y, card_x + 470, card_y + 75), fill=(30, 41, 59), outline=(249, 115, 22), width=1, radius=12)
            draw.text((card_x + 20, card_y + 15), stitle, font=font_body_bold, fill=(255, 255, 255))
            draw.text((card_x + 20, card_y + 42), sdesc, font=font_small, fill=(203, 213, 225))

        draw.text((640, 660), "Double-click start_app.bat or index.html to launch!", font=font_body_bold, fill=(253, 224, 71), anchor="mm")

        add_frames(bg, 1)

    out.release()
    print(f"[COMPLETE] Demo Video Generation Complete! Rendered {frames_total} frames ({frames_total / FPS:.1f} seconds).")
    print(f"Saved to: {OUTPUT_FILE}")

    try:
        shutil.copyfile(OUTPUT_FILE, LOCAL_COPY)
        print(f"Saved local copy to: {LOCAL_COPY}")
    except Exception as e:
        print(f"Local copy note: {e}")

if __name__ == "__main__":
    generate_video()
