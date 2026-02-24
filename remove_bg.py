import sys
try:
    from PIL import Image
except ImportError:
    print("Warning: PIL not installed. Trying to install...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

def remove_white_bg(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    
    datas = img.getdata()
    
    newData = []
    # threshold for considering a pixel "white"
    threshold = 240
    
    for item in datas:
        # Check if the pixel is white-ish
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            # Change all white-ish (also including alpha) to transparent
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to {output_path}")

remove_white_bg("logo/81481159904.png", "logo/logo-transparent.png")
