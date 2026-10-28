import sys
import os
import shutil

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

import cv2

TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_video_rec")
LOCAL_WEBM = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dog_walker_app_demo.webm")
LOCAL_MP4 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dog_walker_app_demo.mp4")

ARTIFACT_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACT_WEBM = os.path.join(ARTIFACT_DIR, "dog_walker_app_demo.webm")
ARTIFACT_MP4 = os.path.join(ARTIFACT_DIR, "dog_walker_app_demo.mp4")

files = [os.path.join(TEMP_DIR, f) for f in os.listdir(TEMP_DIR) if f.endswith(".webm")]
if not files:
    print("No recorded webm found in temp_video_rec.")
    sys.exit(1)

src_webm = files[0]
print(f"[1/3] Copying raw WebM recording from: {src_webm}")
shutil.copyfile(src_webm, LOCAL_WEBM)
shutil.copyfile(src_webm, ARTIFACT_WEBM)
print(f"  -> Saved WebM locally: {LOCAL_WEBM} ({os.path.getsize(LOCAL_WEBM)/1024:.1f} KB)")
print(f"  -> Saved WebM to artifact dir: {ARTIFACT_WEBM}")

print("[2/3] Transcoding WebM frames to standard MP4 with OpenCV...")
cap = cv2.VideoCapture(LOCAL_WEBM)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720
fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 733

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(LOCAL_MP4, fourcc, fps, (width, height))

count = 0
while True:
    ret, frame = cap.read()
    if not ret:
        break
    out.write(frame)
    count += 1
    if count % 100 == 0:
        print(f"  -> Processed {count}/{total_frames} frames ({count/total_frames*100:.1f}%)")

cap.release()
out.release()
print(f"  -> Finished processing {count} frames.")
shutil.copyfile(LOCAL_MP4, ARTIFACT_MP4)
print(f"  -> Saved MP4 locally: {LOCAL_MP4} ({os.path.getsize(LOCAL_MP4)/1024:.1f} KB)")
print(f"  -> Saved MP4 to artifact dir: {ARTIFACT_MP4}")

print("[3/3] Video files successfully generated and ready for playback!")
