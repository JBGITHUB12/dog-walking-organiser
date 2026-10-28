import os
import struct
import zlib

def create_png_icon(size, filename, bg_color=(249, 115, 22), icon_color=(255, 255, 255)):
    # Generate an orange icon with dog paw shape
    width = size
    height = size
    raw_data = bytearray()

    cx, cy = width // 2, height // 2
    r_main = width // 3.5

    # Paw pad center
    pad_cx, pad_cy = cx, cy + int(size * 0.08)
    pad_rx, pad_ry = int(size * 0.20), int(size * 0.16)

    # 4 Toe pads
    toes = [
        (cx - int(size * 0.22), cy - int(size * 0.14), int(size * 0.08)),
        (cx - int(size * 0.08), cy - int(size * 0.25), int(size * 0.09)),
        (cx + int(size * 0.08), cy - int(size * 0.25), int(size * 0.09)),
        (cx + int(size * 0.22), cy - int(size * 0.14), int(size * 0.08))
    ]

    for y in range(height):
        raw_data.append(0) # Filter byte
        for x in range(width):
            # Check if inside main rounded rect / circle
            # Background
            in_paw = False

            # Check main pad (ellipse)
            dx = (x - pad_cx) / pad_rx
            dy = (y - pad_cy) / pad_ry
            if dx*dx + dy*dy <= 1.0:
                in_paw = True
            
            # Check toes
            if not in_paw:
                for tx, ty, tr in toes:
                    if (x - tx)**2 + (y - ty)**2 <= tr**2:
                        in_paw = True
                        break

            # Rounded square background
            corner_r = int(size * 0.22)
            in_card = True
            if x < corner_r and y < corner_r and (x - corner_r)**2 + (y - corner_r)**2 > corner_r**2:
                in_card = False
            elif x > width - corner_r and y < corner_r and (x - (width - corner_r))**2 + (y - corner_r)**2 > corner_r**2:
                in_card = False
            elif x < corner_r and y > height - corner_r and (x - corner_r)**2 + (y - (height - corner_r))**2 > corner_r**2:
                in_card = False
            elif x > width - corner_r and y > height - corner_r and (x - (width - corner_r))**2 + (y - (height - corner_r))**2 > corner_r**2:
                in_card = False

            if not in_card:
                # Transparent
                raw_data.extend([0, 0, 0, 0])
            elif in_paw:
                # White paw
                raw_data.extend([icon_color[0], icon_color[1], icon_color[2], 255])
            else:
                # Orange background
                raw_data.extend([bg_color[0], bg_color[1], bg_color[2], 255])

    # Write PNG
    def png_chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)

    png = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png += png_chunk(b"IHDR", ihdr)
    idat = zlib.compress(bytes(raw_data))
    png += png_chunk(b"IDAT", idat)
    png += png_chunk(b"IEND", b"")

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, "wb") as f:
        f.write(png)

if __name__ == "__main__":
    icon_dir = os.path.join(os.path.dirname(__file__), "icons")
    os.makedirs(icon_dir, exist_ok=True)
    create_png_icon(192, os.path.join(icon_dir, "icon-192.png"))
    create_png_icon(512, os.path.join(icon_dir, "icon-512.png"))
    print("PWA icons generated successfully!")
