import cv2
import mediapipe as mp
import numpy as np
import time
import math
import pygame
import os
import random
import speech_recognition as sr
import pyttsx3
import ai_explainer

# ============================================================
#   AI CHAKRAFLOW — FULL VERSION (MUSIC + VOICE + SUMMARY)
#   BILINGUAL (Hindi + English)
# ============================================================

CAM_INDEX = 0
# Slightly larger 16:9 frame; still modest to keep lag low.
FRAME_WIDTH = 1120
FRAME_HEIGHT = 630

# ---- Path to your Adiyogi music ----
MUSIC_PATH = r"C:\Users\ASUS\OneDrive\Desktop\Yoga_AI\Adiyogi The Source of Yog-320kbps.mp3"

# Chakra definitions (bottom to top)
CHAKRA_NAMES = [
    "Root", "Sacral", "Solar Plexus", "Heart",
    "Throat", "Third Eye", "Crown"
]

CHAKRA_COLORS = [
    (0,   0, 255),   # Root    - Red
    (0, 140, 255),   # Sacral  - Orange
    (0, 255, 255),   # Solar   - Yellow
    (0, 255,   0),   # Heart   - Green
    (255, 0,   0),   # Throat  - Blue (BGR)
    (255, 0, 255),   # Third   - Violet
    (255, 255, 255)  # Crown   - White
]

# Short scripture-like snippets per chakra for AI explainer (safe, brief)
CHAKRA_SCRIPTURES = [
    {
        "id": "root_balance",
        "source": "Yoga wisdom",
        "sanskrit": "Sthiram sukham asanam",
        "hinglish": "Stay steady like a mountain",
        "meaning": "Ground yourself and find steadiness."
    },
    {
        "id": "sacral_flow",
        "source": "Yoga wisdom",
        "sanskrit": "Jala tattva",
        "hinglish": "Gentle flow, soft breath",
        "meaning": "Let movement be smooth and creative."
    },
    {
        "id": "solar_fire",
        "source": "Yoga wisdom",
        "sanskrit": "Tejas",
        "hinglish": "Inner fire with calm mind",
        "meaning": "Strength with kindness—no force."
    },
    {
        "id": "heart_compassion",
        "source": "Yoga wisdom",
        "sanskrit": "Anahata",
        "hinglish": "Open heart, light shoulders",
        "meaning": "Balance effort with softness and care."
    },
    {
        "id": "throat_truth",
        "source": "Yoga wisdom",
        "sanskrit": "Satya",
        "hinglish": "Speak softly, breathe freely",
        "meaning": "Align breath and voice with honesty."
    },
    {
        "id": "third_eye_focus",
        "source": "Yoga wisdom",
        "sanskrit": "Dhyana",
        "hinglish": "Drishti shant rakho",
        "meaning": "Calm gaze, clear mind, steady breath."
    },
    {
        "id": "crown_stillness",
        "source": "Yoga wisdom",
        "sanskrit": "Shanti",
        "hinglish": "Sukoon se baitho",
        "meaning": "Sit in quiet awareness; no hurry, no pressure."
    },
]
# Thresholds
EYE_CLOSED_THRESHOLD = 0.022 # Slightly increased to make detection easier
EYE_CLOSED_FRAMES_REQUIRED = 15 # ~0.5-1 sec.5s

AI_REFRESH_SECS = 6  # refresh AI tip every few seconds

# ---------------- Pygame audio init -----------------
pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=512)

# ---------------- TTS (Indian-ish female voice) -----------------
tts = pyttsx3.init()
voices = tts.getProperty('voices')
for v in voices:
    name_lower = v.name.lower()
    if "female" in name_lower or "zira" in name_lower or "hindi" in v.id.lower():
        tts.setProperty('voice', v.id)
        break
tts.setProperty('rate', 178)
tts.setProperty('volume', 1.0)

# ---------------- Mediapipe -----------------
mp_hands = mp.solutions.hands
mp_face = mp.solutions.face_mesh
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles


# ===================== HELPERS =======================

def draw_text_with_bg(frame, text, x, y, font_scale=0.6, color=(255, 255, 255), thickness=1, bg_color=(0, 0, 0), bg_alpha=0.6):
    (text_w, text_h), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
    overlay = frame.copy()
    # Draw background rectangle
    cv2.rectangle(overlay, (x - 5, y - text_h - 5), (x + text_w + 5, y + 5), bg_color, -1)
    cv2.addWeighted(overlay, bg_alpha, frame, 1 - bg_alpha, 0, frame)
    cv2.putText(frame, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, thickness, cv2.LINE_AA)

def get_finger_states(hand_landmarks, image_width, image_height):
    lm = hand_landmarks.landmark

    def to_pixel(idx):
        return int(lm[idx].x * image_width), int(lm[idx].y * image_height)

    tips = [4, 8, 12, 16, 20]
    pips = [3, 6, 10, 14, 18]

    states = {}

    thumb_tip_x, thumb_tip_y = to_pixel(4)
    thumb_pip_x, thumb_pip_y = to_pixel(3)
    states["thumb"] = thumb_tip_x > thumb_pip_x

    finger_names = ["index", "middle", "ring", "pinky"]
    for name, tip_idx, pip_idx in zip(finger_names, tips[1:], pips[1:]):
        tip_x, tip_y = to_pixel(tip_idx)
        pip_x, pip_y = to_pixel(pip_idx)
        states[name] = tip_y < pip_y

    return states


def detect_gyan_mudra(hand_landmarks, frame=None, width=0, height=0):
    lm = hand_landmarks.landmark
    thumb_tip = lm[4]
    index_tip = lm[8]
    wrist = lm[0]
    mid_tip = lm[12]
    
    # Normalize by hand size (wrist to middle fingertip) for scale tolerance
    hand_scale = math.sqrt((wrist.x - mid_tip.x) ** 2 + (wrist.y - mid_tip.y) ** 2) + 1e-6
    d = math.sqrt((thumb_tip.x - index_tip.x) ** 2 + (thumb_tip.y - index_tip.y) ** 2) / hand_scale
    
    # Visual Debugging (Draw line between thumb and index)
    if frame is not None:
        tx, ty = int(thumb_tip.x * width), int(thumb_tip.y * height)
        ix, iy = int(index_tip.x * width), int(index_tip.y * height)
        
        # Color code: Green=Active, Yellow=Close, Red=Far
        # Debug info
        cv2.putText(frame, f"Gyan Dist: {d:.2f}", (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        if d < 0.28: # Further relaxed from 0.22
            col = (0, 255, 0)
            cv2.circle(frame, (ix, iy), 8, (0, 255, 0), -1) 
        elif d < 0.35:
            col = (0, 255, 255)
        else:
            col = (0, 0, 255)
            
        cv2.line(frame, (tx, ty), (ix, iy), col, 2)

    return d < 0.28 # Further relaxed threshold

def detect_prana_mudra(hand_landmarks):
    # Ring and Pinky tips touch Thumb tip. Index and Middle straight.
    lm = hand_landmarks.landmark
    thumb_tip = lm[4]
    ring_tip = lm[16]
    pinky_tip = lm[20]
    wrist = lm[0]
    mid_tip = lm[12]
    
    hand_scale = math.sqrt((wrist.x - mid_tip.x) ** 2 + (wrist.y - mid_tip.y) ** 2) + 1e-6
    
    d_ring = math.sqrt((thumb_tip.x - ring_tip.x)**2 + (thumb_tip.y - ring_tip.y)**2) / hand_scale
    d_pinky = math.sqrt((thumb_tip.x - pinky_tip.x)**2 + (thumb_tip.y - pinky_tip.y)**2) / hand_scale
    
    # Check if index and middle are extended (tip further from wrist than pip)
    # Using simple y check might fail if hand is rotated, better to check distance from wrist
    def dist_sq(p1, p2): return (p1.x-p2.x)**2 + (p1.y-p2.y)**2
    
    index_ext = dist_sq(lm[8], wrist) > dist_sq(lm[6], wrist)
    middle_ext = dist_sq(lm[12], wrist) > dist_sq(lm[10], wrist)

    index_ext = dist_sq(lm[8], wrist) > dist_sq(lm[6], wrist)
    middle_ext = dist_sq(lm[12], wrist) > dist_sq(lm[10], wrist)

    return d_ring < 0.28 and d_pinky < 0.28 and index_ext and middle_ext

def detect_apana_mudra(hand_landmarks):
    # Middle and Ring tips touch Thumb tip. Index and Pinky straight.
    lm = hand_landmarks.landmark
    thumb_tip = lm[4]
    mid_tip = lm[12]
    ring_tip = lm[16]
    wrist = lm[0]
    
    hand_scale = math.sqrt((wrist.x - mid_tip.x) ** 2 + (wrist.y - mid_tip.y) ** 2) + 1e-6
    
    d_mid = math.sqrt((thumb_tip.x - mid_tip.x)**2 + (thumb_tip.y - mid_tip.y)**2) / hand_scale
    d_ring = math.sqrt((thumb_tip.x - ring_tip.x)**2 + (thumb_tip.y - ring_tip.y)**2) / hand_scale
    
    def dist_sq(p1, p2): return (p1.x-p2.x)**2 + (p1.y-p2.y)**2
    index_ext = dist_sq(lm[8], wrist) > dist_sq(lm[6], wrist)
    pinky_ext = dist_sq(lm[20], wrist) > dist_sq(lm[18], wrist)
    
    index_ext = dist_sq(lm[8], wrist) > dist_sq(lm[6], wrist)
    pinky_ext = dist_sq(lm[20], wrist) > dist_sq(lm[18], wrist)
    
    return d_mid < 0.28 and d_ring < 0.28 and index_ext and pinky_ext

def detect_surya_mudra(hand_landmarks):
    # Ring finger bent, thumb pressing it.
    # This is hard to detect perfectly. Approximation: Ring tip close to thumb base (CMC or MCP), Thumb tip close to Ring PIP.
    lm = hand_landmarks.landmark
    thumb_tip = lm[4]
    ring_tip = lm[16]
    ring_pip = lm[14]
    wrist = lm[0]
    mid_tip = lm[12]
    
    hand_scale = math.sqrt((wrist.x - mid_tip.x) ** 2 + (wrist.y - mid_tip.y) ** 2) + 1e-6
    
    # Check if ring finger is folded
    ring_folded = dist_sq(ring_tip, wrist) < dist_sq(ring_pip, wrist)
    
    # Check if thumb is over ring finger (distance between thumb tip and ring pip/dip)
    d_thumb_ring = math.sqrt((thumb_tip.x - ring_pip.x)**2 + (thumb_tip.y - ring_pip.y)**2) / hand_scale
    
    # Check if thumb is over ring finger (distance between thumb tip and ring pip/dip)
    d_thumb_ring = math.sqrt((thumb_tip.x - ring_pip.x)**2 + (thumb_tip.y - ring_pip.y)**2) / hand_scale
    
    return ring_folded and d_thumb_ring < 0.30 # Further relaxed from 0.25

def detect_varun_mudra(hand_landmarks):
    # Pinky tip touches Thumb tip. Others straight.
    lm = hand_landmarks.landmark
    thumb_tip = lm[4]
    pinky_tip = lm[20]
    wrist = lm[0]
    mid_tip = lm[12]
    
    hand_scale = math.sqrt((wrist.x - mid_tip.x) ** 2 + (wrist.y - mid_tip.y) ** 2) + 1e-6
    
    d_pinky = math.sqrt((thumb_tip.x - pinky_tip.x)**2 + (thumb_tip.y - pinky_tip.y)**2) / hand_scale
    
    def dist_sq(p1, p2): return (p1.x-p2.x)**2 + (p1.y-p2.y)**2
    index_ext = dist_sq(lm[8], wrist) > dist_sq(lm[6], wrist)
    mid_ext = dist_sq(lm[12], wrist) > dist_sq(lm[10], wrist)
    ring_ext = dist_sq(lm[16], wrist) > dist_sq(lm[14], wrist)
    
    mid_ext = dist_sq(lm[12], wrist) > dist_sq(lm[10], wrist)
    ring_ext = dist_sq(lm[16], wrist) > dist_sq(lm[14], wrist)
    
    return d_pinky < 0.28 and index_ext and mid_ext and ring_ext

def dist_sq(p1, p2):
    return (p1.x-p2.x)**2 + (p1.y-p2.y)**2

def detect_open_palm(finger_states):
    return all(finger_states.values())


def detect_fist(finger_states):
    return not any(finger_states.values())


def detect_peace(hand_landmarks):
    # Index/middle extended, ring/pinky folded
    lm = hand_landmarks.landmark
    states = get_finger_states(hand_landmarks, 1, 1)
    return states["index"] and states["middle"] and not states["ring"] and not states["pinky"]


def classify_chakra_gesture(finger_states, hand_landmarks=None):
    # Enhanced classification using specific mudra functions
    if hand_landmarks:
        if detect_gyan_mudra(hand_landmarks): return "Gyan Mudra"
        if detect_prana_mudra(hand_landmarks): return "Prana Mudra"
        if detect_apana_mudra(hand_landmarks): return "Apana Mudra"
        if detect_surya_mudra(hand_landmarks): return "Surya Mudra"
        if detect_varun_mudra(hand_landmarks): return "Varun Mudra"
    
    # Fallback to finger states for basic chakra mapping if needed, or return None
    t = finger_states["thumb"]
    i = finger_states["index"]
    m = finger_states["middle"]
    r = finger_states["ring"]
    p = finger_states["pinky"]

    if not t and not i and not m and not r and not p:
        return "Root (Fist)"
    
    return None


def wrap_text(text, max_chars=60):
    words = text.split()
    lines = []
    line = ""
    for w in words:
        if len(line) + len(w) + 1 <= max_chars:
            line += (" " if line else "") + w
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def analyze_face(face_landmarks, img_w, img_h):
    if not face_landmarks:
        return (255, 255, 255), "No face", 0.02, 0.02

    lm = face_landmarks.landmark
    upper_lip = lm[13]
    lower_lip = lm[14]
    left_eye_top = lm[159]
    left_eye_bottom = lm[145]

    def dist(a, b):
        return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

    mouth_open = dist(upper_lip, lower_lip)
    eye_open = dist(left_eye_top, left_eye_bottom)

    if mouth_open > 0.035:
        aura_color = (0, 255, 255)
        mood = "Expressive / Happy"
    elif eye_open < EYE_CLOSED_THRESHOLD:
        aura_color = (255, 128, 0)
        mood = "Calm / Meditative"
    else:
        aura_color = (255, 255, 255)
        mood = "Neutral"

    return aura_color, mood, eye_open, mouth_open


class BreathingTracker:
    def __init__(self, smoothing=0.9):
        self.prev_y = None
        self.smoothed = 0.0
        self.smoothing = smoothing
        self.last_time = time.time()
        self.breath_phase = 0.0

    def update(self, nose_y):
        if self.prev_y is None:
            self.prev_y = nose_y
            return
        dy = nose_y - self.prev_y
        self.prev_y = nose_y
        self.smoothed = self.smoothing * self.smoothed + (1 - self.smoothing) * dy
        dt = max(1e-3, time.time() - self.last_time)
        self.last_time = time.time()
        self.breath_phase += self.smoothed * 50
        if self.breath_phase > 2 * math.pi:
            self.breath_phase -= 2 * math.pi
        if self.breath_phase < 0:
            self.breath_phase += 2 * math.pi

    def get_breath_factor(self):
        return 1.0 + 0.3 * math.sin(self.breath_phase)


def draw_universe(frame, t):
    h, w, _ = frame.shape
    cx = int(w * 0.15) # Moved to Left side
    cy = int(h * 0.5)

    overlay = frame.copy()
    cv2.circle(overlay, (cx, cy), 140, (40, 0, 60), -1)
    cv2.circle(overlay, (cx, cy), 90, (80, 0, 120), -1)
    cv2.addWeighted(overlay, 0.25, frame, 0.75, 0, frame)

    cv2.circle(frame, (cx, cy), 26, (0, 255, 255), -1)

    orbit_radii = [55, 90, 125]
    speeds = [0.9, 0.6, 0.35]
    colors = [(255, 200, 0), (255, 255, 255), (0, 215, 255)]

    for r, spd, col in zip(orbit_radii, speeds, colors):
        angle = t * spd
        px = int(cx + r * math.cos(angle))
        py = int(cy + r * math.sin(angle))
        cv2.circle(frame, (px, py), 10, col, -1)
        cv2.ellipse(frame, (cx, cy), (r, r), 0, 0, 360, (90, 90, 120), 1)


def draw_chakras(frame, center_x, top_y, bottom_y,
                 active_index, energies, aura_color,
                 breath_factor, t):
    num_chakras = 7
    ys = np.linspace(bottom_y, top_y, num_chakras)

    music_pulse = 0.8 + 0.35 * math.sin(2.0 * t)

    for i in range(num_chakras):
        chakra_name = CHAKRA_NAMES[i]
        base_color = CHAKRA_COLORS[i]
        energy = energies[i]

        wobble = 8 * math.sin(t * 1.4 + i * 0.9)
        cy = int(ys[i] + wobble)

        base_radius = 18 + int(energy * 22)
        
        radius = int(base_radius * breath_factor * music_pulse)

        center = (center_x, cy)

        aura_radius = int(radius * (1.5 + 0.3 * music_pulse))
        aura_alpha = min(0.9, 0.25 + 0.5 * energy * music_pulse)

        overlay = frame.copy()
        cv2.circle(overlay, center, aura_radius, aura_color, -1)
        cv2.addWeighted(overlay, aura_alpha, frame, 1 - aura_alpha, 0, frame)

        cv2.circle(frame, center, radius, base_color, -1)

        orbit_r = int(radius * 1.6)
        dot_angle = t * 2.5 + i # Use t here too
        dot_x = int(center[0] + orbit_r * math.cos(dot_angle))
        dot_y = int(center[1] + orbit_r * math.sin(dot_angle))
        cv2.circle(frame, (dot_x, dot_y), 4, (255, 255, 255), -1)

        if i == active_index:
            cv2.circle(frame, center, radius + 6, (255, 255, 255), 2)

        cv2.putText(frame, chakra_name, (center[0] + 30, center[1] + 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)


def draw_chakra_meter(frame, energies):
    bar_w = 20
    bar_h = 90
    gap = 8
    x0 = 40
    y0 = 60
    for i, energy in enumerate(energies):
        y_top = y0 + i * (bar_h + gap)
        color = CHAKRA_COLORS[i]
        cv2.rectangle(frame, (x0, y_top), (x0 + bar_w, y_top + bar_h),
                      (60, 60, 60), 1)
        filled_h = int(bar_h * energy)
        y_fill = y_top + (bar_h - filled_h)
        cv2.rectangle(frame, (x0, y_fill), (x0 + bar_w, y_top + bar_h),
                      color, -1)
        cv2.putText(frame, f"{int(energy * 100)}%", (x0 + 30, y_top + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1, cv2.LINE_AA)
        cv2.putText(frame, CHAKRA_NAMES[i].split()[0], (x0 + 30, y_top + 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1, cv2.LINE_AA)


def generate_smart_coach_message(energies, mood_label, alignment_mode, gyan_active):
    if gyan_active:
        return "Gyan Mudra detected — Deep Meditation Mode."
    weakest_idx = int(np.argmin(energies))
    strongest_idx = int(np.argmax(energies))
    weakest_name = CHAKRA_NAMES[weakest_idx]
    strongest_name = CHAKRA_NAMES[strongest_idx]
    if alignment_mode:
        return "✨ Alignment Mode: All chakras are being gently balanced..."
    if energies[weakest_idx] < 0.3:
        return f"Tip: {weakest_name} is low. Try its gesture to recharge. ({mood_label})"
    if all(e > 0.7 for e in energies):
        return f"Beautiful! Your energy looks balanced. Stay with your breath. ({mood_label})"
    return f"Focus on breath. {strongest_name} is strong, {weakest_name} needs love. ({mood_label})"


def draw_gyan_sparkles(frame, center_x, center_y, radius):
    overlay = frame.copy()
    for _ in range(35):
        angle = random.uniform(0, 2 * math.pi)
        r = random.uniform(radius * 0.6, radius * 1.1)
        x = int(center_x + r * math.cos(angle))
        y = int(center_y + r * math.sin(angle))
        cv2.circle(overlay, (x, y), random.randint(2, 4), (0, 215, 255), -1)
    cv2.addWeighted(overlay, 0.8, frame, 0.2, 0, frame)


def draw_revolving_aura(frame, center_x, center_y, radius, t):
    """
    Draws a golden revolving aura around the head.
    """
    golden_color = (0, 215, 255) # BGR: Gold/Orange-ish
    
    # Draw main glowing halo
    overlay = frame.copy()
    cv2.circle(overlay, (center_x, center_y), radius, golden_color, -1)
    cv2.addWeighted(overlay, 0.2, frame, 0.8, 0, frame)
    
    # Revolving particles
    num_particles = 8
    for i in range(num_particles):
        angle = t * 2.0 + (i * (2 * math.pi / num_particles))
        # Elliptical orbit to look like it's "over head"
        orbit_rx = radius * 1.2
        orbit_ry = radius * 0.4
        
        px = int(center_x + orbit_rx * math.cos(angle))
        py = int(center_y + orbit_ry * math.sin(angle) - radius * 0.5) # Shifted up slightly
        
        cv2.circle(frame, (px, py), 6, (255, 255, 255), -1) # White core
        cv2.circle(frame, (px, py), 10, golden_color, 2) # Golden rim


class PostureAnalyzer:
    def __init__(self):
        self.last_label = "Unknown"

    def assess(self, pose_landmarks):
        if not pose_landmarks:
            self.last_label = "No body"
            return 0.0, self.last_label

        lm = pose_landmarks.landmark
        ls, rs = lm[11], lm[12]
        lh, rh = lm[23], lm[24]

        mid_shoulders = ((ls.x + rs.x) * 0.5, (ls.y + rs.y) * 0.5)
        mid_hips = ((lh.x + rh.x) * 0.5, (lh.y + rh.y) * 0.5)

        dx = mid_shoulders[0] - mid_hips[0]
        dy = mid_shoulders[1] - mid_hips[1] + 1e-6
        spine_angle = abs(math.degrees(math.atan2(dx, dy)))  # 0 is vertical

        shoulder_level = abs(ls.y - rs.y)
        hips_level = abs(lh.y - rh.y)

        score = 1.0
        if spine_angle > 10:
            score -= min(0.5, (spine_angle - 10) / 40)
        if shoulder_level > 0.03:
            score -= min(0.3, (shoulder_level - 0.03) / 0.1)
        if hips_level > 0.03:
            score -= min(0.2, (hips_level - 0.03) / 0.1)

        score = max(0.0, min(1.0, score))
        if score > 0.8:
            label = "Aligned"
        elif score > 0.6:
            label = "Slight tilt"
        elif score > 0.4:
            label = "Adjust spine/shoulders"
        else:
            label = "Poor posture"
        self.last_label = label
        return score, label


def draw_smart_tracking(frame, hand_results, face_results, yoga_mode=False):
    """
    Draws 'smart' tracking overlays:
    - 21 hand points with connections
    - Face mesh (contours)
    - Dynamic style based on yoga_mode
    """
    if not yoga_mode:
        # Subtle mode
        hand_style = mp_drawing.DrawingSpec(color=(0, 255, 255), thickness=1, circle_radius=1)
        face_style = mp_drawing.DrawingSpec(color=(255, 255, 255), thickness=1, circle_radius=1)
        conn_style = mp_drawing.DrawingSpec(color=(255, 255, 255), thickness=1)
    else:
        # "Extra Smart" Yoga Mode - Glowing/High-tech look
        hand_style = mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=3)
        face_style = mp_drawing.DrawingSpec(color=(0, 255, 255), thickness=1, circle_radius=1)
        conn_style = mp_drawing.DrawingSpec(color=(50, 205, 50), thickness=2)

    # Draw Hands
    if hand_results.multi_hand_landmarks:
        for hand_landmarks in hand_results.multi_hand_landmarks:
            mp_drawing.draw_landmarks(
                frame,
                hand_landmarks,
                mp_hands.HAND_CONNECTIONS,
                hand_style,
                conn_style
            )

    # Draw Face Mesh
    # Draw Face Mesh (Hidden for cleaner visuals, but tracking remains active)
    # if face_results.multi_face_landmarks:
    #     for face_landmarks in face_results.multi_face_landmarks:
    #         mp_drawing.draw_landmarks(
    #             frame,
    #             face_landmarks,
    #             mp_face.FACEMESH_TESSELATION,
    #             landmark_drawing_spec=None,
    #             connection_drawing_spec=mp_drawing.DrawingSpec(color=(100, 100, 100), thickness=1, circle_radius=1)
    #         )
    #         mp_drawing.draw_landmarks(
    #             frame,
    #             face_landmarks,
    #             mp_face.FACEMESH_CONTOURS,
    #             landmark_drawing_spec=None,
    #             connection_drawing_spec=face_style
    #         )

def detect_namaste(hand_results):
    """
    Detects if two hands are present and close together (Namaste/Anjali gesture).
    """
    if not hand_results.multi_hand_landmarks or len(hand_results.multi_hand_landmarks) < 2:
        return False
    
    # Simple check: distance between wrist points
    h1 = hand_results.multi_hand_landmarks[0].landmark[0]
    h2 = hand_results.multi_hand_landmarks[1].landmark[0]
    
    dist = math.sqrt((h1.x - h2.x)**2 + (h1.y - h2.y)**2)
    return dist < 0.20  # Relaxed threshold

def draw_mini_hand(frame, cx, cy, mudra_name, scale=1.0):
    """
    Draws a stylized colorful hand skeleton representing the mudra.
    cx, cy: Center of the visualization
    """
    # Colors for fingers (Thumb, Index, Middle, Ring, Pinky)
    # High Visibility Rainbow Theme
    colors = [
        (0, 0, 255),    # Thumb (Red)
        (0, 255, 0),    # Index (Green)
        (0, 255, 255),  # Middle (Yellow)
        (0, 140, 255),  # Ring (Orange)
        (255, 0, 255)   # Pinky (Magenta)
    ]
    wrist_color = (255, 255, 255)
    
    # Base offsets for an open right hand (relative to cx, cy)
    # Coordinates: (x, y) where -y is up
    # Scale factor
    s = 25 * scale
    
    # Default Open Palm positions
    # Wrist, ThumbCMC, ThumbMCP, ThumbIP, ThumbTip
    # IndexMCP, IndexPIP, IndexDIP, IndexTip ...
    
    # Simplified: Wrist -> MCP -> Tip
    pts = {
        'wrist': (0, s*1.5),
        'thumb_base': (-s*0.6, s*0.8), 'thumb_tip': (-s*1.2, -s*0.2),
        'index_base': (-s*0.3, -s*0.5), 'index_tip': (-s*0.4, -s*1.8),
        'mid_base': (0, -s*0.6),      'mid_tip': (0, -s*2.0),
        'ring_base': (s*0.3, -s*0.5),   'ring_tip': (s*0.4, -s*1.8),
        'pinky_base': (s*0.5, -s*0.3),  'pinky_tip': (s*0.7, -s*1.4)
    }
    
    # Modify positions based on Mudra
    if mudra_name == "Gyan":
        # Index tip touches Thumb tip
        pts['index_tip'] = (-s*0.8, -s*0.5)
        pts['thumb_tip'] = (-s*0.8, -s*0.5)
        
    elif mudra_name == "Prana":
        # Ring & Pinky touch Thumb
        pts['ring_tip'] = (-s*0.5, s*0.2)
        pts['pinky_tip'] = (-s*0.5, s*0.2)
        pts['thumb_tip'] = (-s*0.5, s*0.2)
        
    elif mudra_name == "Apana":
        # Middle & Ring touch Thumb
        pts['mid_tip'] = (-s*0.5, s*0.2)
        pts['ring_tip'] = (-s*0.5, s*0.2)
        pts['thumb_tip'] = (-s*0.5, s*0.2)
        
    elif mudra_name == "Surya":
        # Ring folded to thumb base, Thumb presses it
        pts['ring_tip'] = pts['thumb_base'] # Ring to thumb base
        pts['thumb_tip'] = pts['thumb_base'] # Thumb presses down
        
    elif mudra_name == "Varun":
        # Pinky touches Thumb
        pts['pinky_tip'] = (-s*0.6, 0)
        pts['thumb_tip'] = (-s*0.6, 0)
        
    elif mudra_name == "Anjali":
        # Draw two hands meeting (Simplified as one vertical hand for icon)
        # Or better: Draw left and right hands meeting
        # For simplicity in this function, we'll just draw the Right hand in "Prayer" half
        # which means vertical, fingers together.
        pts['thumb_tip'] = (-s*0.2, -s*0.5)
        pts['index_tip'] = (0, -s*1.8)
        pts['mid_tip'] = (s*0.1, -s*1.9)
        pts['ring_tip'] = (s*0.2, -s*1.8)
        pts['pinky_tip'] = (s*0.3, -s*1.6)

    # Helper to draw line
    def dline(p1_name, p2_name, color):
        p1 = (int(cx + pts[p1_name][0]), int(cy + pts[p1_name][1]))
        p2 = (int(cx + pts[p2_name][0]), int(cy + pts[p2_name][1]))
        cv2.line(frame, p1, p2, color, 2)
        cv2.circle(frame, p2, 3, color, -1)

    # Draw Connections
    # Thumb
    dline('wrist', 'thumb_base', wrist_color)
    dline('thumb_base', 'thumb_tip', colors[0])
    
    # Index
    dline('wrist', 'index_base', wrist_color)
    dline('index_base', 'index_tip', colors[1])
    
    # Middle
    dline('wrist', 'mid_base', wrist_color)
    dline('mid_base', 'mid_tip', colors[2])
    
    # Ring
    dline('wrist', 'ring_base', wrist_color)
    dline('ring_base', 'ring_tip', colors[3])
    
    # Pinky
    dline('wrist', 'pinky_base', wrist_color)
    dline('pinky_base', 'pinky_tip', colors[4])


def draw_mudra_sidebar(frame, active_mudra):
    h, w, _ = frame.shape
    sidebar_w = 280 # Widened for visuals
    # Draw sidebar background
    overlay = frame.copy()
    # Assuming a center for the circular effect within the sidebar area
    # For example, centered vertically and horizontally within the sidebar
    cx_sidebar = w - sidebar_w // 2
    cy_sidebar = h // 2
    cv2.circle(overlay, (cx_sidebar, cy_sidebar), 140, (40, 0, 60), -1)
    cv2.circle(overlay, (cx_sidebar, cy_sidebar), 90, (80, 0, 120), -1)
    cv2.addWeighted(overlay, 0.25, frame, 0.75, 0, frame)
    
    # Title
    cv2.putText(frame, "Mudra Guide", (w - sidebar_w + 20, 40), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    
    mudras = [
        ("Gyan", "Wisdom"),
        ("Prana", "Vitality"),
        ("Apana", "Detox"),
        ("Surya", "Fire/Wt"),
        ("Varun", "Water"),
        ("Anjali", "Prayer")
    ]
    
    y = 90
    for name, desc in mudras:
        color = (180, 180, 180)
        thickness = 1
        bg_col = (30, 30, 30)
        
        if active_mudra and name in active_mudra:
            color = (0, 255, 0)
            thickness = 2
            bg_col = (50, 80, 50)
            
        # Background for item
        cv2.rectangle(frame, (w - sidebar_w + 10, y - 25), (w - 10, y + 45), bg_col, -1)
            
        cv2.putText(frame, f"{name}", (w - sidebar_w + 20, y), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, thickness)
        cv2.putText(frame, f"{desc}", (w - sidebar_w + 20, y + 20), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
        
        # Draw Mini Hand Visual
        mx = w - 60
        my = y + 10
        draw_mini_hand(frame, mx, my, name, scale=0.8)
            
        angle = random.uniform(0, 2 * math.pi)
        r = random.uniform(radius * 0.6, radius * 1.1)
        x = int(center_x + r * math.cos(angle))
        y = int(center_y + r * math.sin(angle))
        cv2.circle(overlay, (x, y), random.randint(2, 4), (0, 215, 255), -1)
    cv2.addWeighted(overlay, 0.8, frame, 0.2, 0, frame)


def draw_revolving_aura(frame, center_x, center_y, radius, t):
    """
    Draws a golden revolving aura around the head.
    """
    golden_color = (0, 215, 255) # BGR: Gold/Orange-ish
    
    # Draw main glowing halo
    overlay = frame.copy()
    cv2.circle(overlay, (center_x, center_y), radius, golden_color, -1)
    cv2.addWeighted(overlay, 0.2, frame, 0.8, 0, frame)
    
    # Revolving particles
    num_particles = 8
    for i in range(num_particles):
        angle = t * 2.0 + (i * (2 * math.pi / num_particles))
        # Elliptical orbit to look like it's "over head"
        orbit_rx = radius * 1.2
        orbit_ry = radius * 0.4
        
        px = int(center_x + orbit_rx * math.cos(angle))
        py = int(center_y + orbit_ry * math.sin(angle) - radius * 0.5) # Shifted up slightly
        
        cv2.circle(frame, (px, py), 6, (255, 255, 255), -1) # White core
        cv2.circle(frame, (px, py), 10, golden_color, 2) # Golden rim


class PostureAnalyzer:
    def __init__(self):
        self.last_label = "Unknown"

    def assess(self, pose_landmarks):
        if not pose_landmarks:
            self.last_label = "No body"
            return 0.0, self.last_label

        lm = pose_landmarks.landmark
        ls, rs = lm[11], lm[12]
        lh, rh = lm[23], lm[24]

        mid_shoulders = ((ls.x + rs.x) * 0.5, (ls.y + rs.y) * 0.5)
        mid_hips = ((lh.x + rh.x) * 0.5, (lh.y + rh.y) * 0.5)

        dx = mid_shoulders[0] - mid_hips[0]
        dy = mid_shoulders[1] - mid_hips[1] + 1e-6
        spine_angle = abs(math.degrees(math.atan2(dx, dy)))  # 0 is vertical

        shoulder_level = abs(ls.y - rs.y)
        hips_level = abs(lh.y - rh.y)

        score = 1.0
        if spine_angle > 10:
            score -= min(0.5, (spine_angle - 10) / 40)
        if shoulder_level > 0.03:
            score -= min(0.3, (shoulder_level - 0.03) / 0.1)
        if hips_level > 0.03:
            score -= min(0.2, (hips_level - 0.03) / 0.1)

        score = max(0.0, min(1.0, score))
        if score > 0.8:
            label = "Aligned"
        elif score > 0.6:
            label = "Slight tilt"
        elif score > 0.4:
            label = "Adjust spine/shoulders"
        else:
            label = "Poor posture"
        self.last_label = label
        return score, label


def draw_smart_tracking(frame, hand_results, face_results, yoga_mode=False):
    """
    Draws 'smart' tracking overlays:
    - 21 hand points with connections
    - Face mesh (contours)
    - Dynamic style based on yoga_mode
    """
    if not yoga_mode:
        # Subtle mode
        hand_style = mp_drawing.DrawingSpec(color=(0, 255, 255), thickness=1, circle_radius=1)
        face_style = mp_drawing.DrawingSpec(color=(255, 255, 255), thickness=1, circle_radius=1)
        conn_style = mp_drawing.DrawingSpec(color=(255, 255, 255), thickness=1)
    else:
        # "Extra Smart" Yoga Mode - Glowing/High-tech look
        hand_style = mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=3)
        face_style = mp_drawing.DrawingSpec(color=(0, 255, 255), thickness=1, circle_radius=1)
        conn_style = mp_drawing.DrawingSpec(color=(50, 205, 50), thickness=2)

    # Draw Hands
    if hand_results.multi_hand_landmarks:
        for hand_landmarks in hand_results.multi_hand_landmarks:
            mp_drawing.draw_landmarks(
                frame,
                hand_landmarks,
                mp_hands.HAND_CONNECTIONS,
                hand_style,
                conn_style
            )

    # Draw Face Mesh
    # Draw Face Mesh (Hidden for cleaner visuals, but tracking remains active)
    # if face_results.multi_face_landmarks:
    #     for face_landmarks in face_results.multi_face_landmarks:
    #         mp_drawing.draw_landmarks(
    #             frame,
    #             face_landmarks,
    #             mp_face.FACEMESH_TESSELATION,
    #             landmark_drawing_spec=None,
    #             connection_drawing_spec=mp_drawing.DrawingSpec(color=(100, 100, 100), thickness=1, circle_radius=1)
    #         )
    #         mp_drawing.draw_landmarks(
    #             frame,
    #             face_landmarks,
    #             mp_face.FACEMESH_CONTOURS,
    #             landmark_drawing_spec=None,
    #             connection_drawing_spec=face_style
    #         )

def detect_namaste(hand_results):
    """
    Detects if two hands are present and close together (Namaste/Anjali gesture).
    """
    if not hand_results.multi_hand_landmarks or len(hand_results.multi_hand_landmarks) < 2:
        return False
    
    # Simple check: distance between wrist points
    h1 = hand_results.multi_hand_landmarks[0].landmark[0]
    h2 = hand_results.multi_hand_landmarks[1].landmark[0]
    
    dist = math.sqrt((h1.x - h2.x)**2 + (h1.y - h2.y)**2)
    return dist < 0.20  # Relaxed threshold

def draw_mini_hand(frame, cx, cy, mudra_name, scale=1.0):
    """
    Draws a stylized colorful hand skeleton representing the mudra.
    cx, cy: Center of the visualization
    """
    # Colors for fingers (Thumb, Index, Middle, Ring, Pinky)
    # High Visibility Rainbow Theme
    colors = [
        (0, 0, 255),    # Thumb (Red)
        (0, 255, 0),    # Index (Green)
        (0, 255, 255),  # Middle (Yellow)
        (0, 140, 255),  # Ring (Orange)
        (255, 0, 255)   # Pinky (Magenta)
    ]
    wrist_color = (255, 255, 255)
    
    # Base offsets for an open right hand (relative to cx, cy)
    # Coordinates: (x, y) where -y is up
    # Scale factor
    s = 25 * scale
    
    # Default Open Palm positions
    # Wrist, ThumbCMC, ThumbMCP, ThumbIP, ThumbTip
    # IndexMCP, IndexPIP, IndexDIP, IndexTip ...
    
    # Simplified: Wrist -> MCP -> Tip
    pts = {
        'wrist': (0, s*1.5),
        'thumb_base': (-s*0.6, s*0.8), 'thumb_tip': (-s*1.2, -s*0.2),
        'index_base': (-s*0.3, -s*0.5), 'index_tip': (-s*0.4, -s*1.8),
        'mid_base': (0, -s*0.6),      'mid_tip': (0, -s*2.0),
        'ring_base': (s*0.3, -s*0.5),   'ring_tip': (s*0.4, -s*1.8),
        'pinky_base': (s*0.5, -s*0.3),  'pinky_tip': (s*0.7, -s*1.4)
    }
    
    # Modify positions based on Mudra
    if mudra_name == "Gyan":
        # Index tip touches Thumb tip
        pts['index_tip'] = (-s*0.8, -s*0.5)
        pts['thumb_tip'] = (-s*0.8, -s*0.5)
        
    elif mudra_name == "Prana":
        # Ring & Pinky touch Thumb
        pts['ring_tip'] = (-s*0.5, s*0.2)
        pts['pinky_tip'] = (-s*0.5, s*0.2)
        pts['thumb_tip'] = (-s*0.5, s*0.2)
        
    elif mudra_name == "Apana":
        # Middle & Ring touch Thumb
        pts['mid_tip'] = (-s*0.5, s*0.2)
        pts['ring_tip'] = (-s*0.5, s*0.2)
        pts['thumb_tip'] = (-s*0.5, s*0.2)
        
    elif mudra_name == "Surya":
        # Ring folded to thumb base, Thumb presses it
        pts['ring_tip'] = pts['thumb_base'] # Ring to thumb base
        pts['thumb_tip'] = pts['thumb_base'] # Thumb presses down
        
    elif mudra_name == "Varun":
        # Pinky touches Thumb
        pts['pinky_tip'] = (-s*0.6, 0)
        pts['thumb_tip'] = (-s*0.6, 0)
        
    elif mudra_name == "Anjali":
        # Draw two hands meeting (Simplified as one vertical hand for icon)
        # Or better: Draw left and right hands meeting
        # For simplicity in this function, we'll just draw the Right hand in "Prayer" half
        # which means vertical, fingers together.
        pts['thumb_tip'] = (-s*0.2, -s*0.5)
        pts['index_tip'] = (0, -s*1.8)
        pts['mid_tip'] = (s*0.1, -s*1.9)
        pts['ring_tip'] = (s*0.2, -s*1.8)
        pts['pinky_tip'] = (s*0.3, -s*1.6)

    # Helper to draw line - REFINED
    def dline(p1_name, p2_name, color):
        p1 = (int(cx + pts[p1_name][0]), int(cy + pts[p1_name][1]))
        p2 = (int(cx + pts[p2_name][0]), int(cy + pts[p2_name][1]))
        # Thinner, crisp lines
        cv2.line(frame, p1, p2, color, 1, cv2.LINE_AA)
        # Glowing joints (small white center, colored rim)
        cv2.circle(frame, p2, 2, color, -1, cv2.LINE_AA)
        cv2.circle(frame, p2, 1, (255, 255, 255), -1, cv2.LINE_AA)

    # Draw Connections
    # Thumb
    dline('wrist', 'thumb_base', wrist_color)
    dline('thumb_base', 'thumb_tip', colors[0])
    
    # Index
    dline('wrist', 'index_base', wrist_color)
    dline('index_base', 'index_tip', colors[1])
    
    # Middle
    dline('wrist', 'mid_base', wrist_color)
    dline('mid_base', 'mid_tip', colors[2])
    
    # Ring
    dline('wrist', 'ring_base', wrist_color)
    dline('ring_base', 'ring_tip', colors[3])
    
    # Pinky
    dline('wrist', 'pinky_base', wrist_color)
    dline('pinky_base', 'pinky_tip', colors[4])


def draw_mudra_sidebar(frame, active_mudra):
    h, w, _ = frame.shape
    sidebar_w = 280 
    
    # Glassmorphism Background - HIGH VISIBILITY
    overlay = frame.copy()
    # Much lighter background (Dark Grey/Blue) for contrast
    cv2.rectangle(overlay, (w - sidebar_w, 0), (w, h), (60, 70, 80), -1)
    # High alpha (0.85) to block out background noise
    cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)
    
    # Vertical Accent Line (Left Edge)
    cv2.line(frame, (w - sidebar_w, 0), (w - sidebar_w, h), (100, 255, 100), 2, cv2.LINE_AA)
    
    # Title
    cv2.putText(frame, "Mudra Guide", (w - sidebar_w + 20, 40), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
    
    mudras = [
        ("Gyan", "Wisdom"),
        ("Prana", "Vitality"),
        ("Apana", "Detox"),
        ("Surya", "Fire/Wt"),
        ("Varun", "Water"),
        ("Anjali", "Prayer")
    ]
    
    y = 90
    for name, desc in mudras:
        is_active = (active_mudra and name in active_mudra)
        
        # Item Background
        # Default: visible but subtle
        bg_col = (255, 255, 255)
        bg_alpha = 0.15
        text_col = (255, 255, 255) # Pure White
        desc_col = (220, 220, 220) # Light Grey
        
        if is_active:
            # Active: Bright Green Highlight
            bg_col = (50, 200, 50) # Green
            bg_alpha = 0.6 # Stronger highlight
            text_col = (255, 255, 255)
            desc_col = (255, 255, 255)
            
            # Glowing Left Border for active item - GREEN
            cv2.line(frame, (w - sidebar_w, y - 25), (w - sidebar_w, y + 45), (0, 255, 0), 5, cv2.LINE_AA)
            
        # Draw Item Background
        overlay_item = frame.copy()
        cv2.rectangle(overlay_item, (w - sidebar_w + 2, y - 25), (w, y + 45), bg_col, -1)
        cv2.addWeighted(overlay_item, bg_alpha, frame, 1 - bg_alpha, 0, frame)
            
        # Text
        cv2.putText(frame, f"{name}", (w - sidebar_w + 20, y), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, text_col, 1, cv2.LINE_AA)
        cv2.putText(frame, f"{desc}", (w - sidebar_w + 20, y + 20), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, desc_col, 1, cv2.LINE_AA)
        
        # Draw Mini Hand Visual
        mx = w - 60
        my = y + 10
        draw_mini_hand(frame, mx, my, name, scale=0.8)
            
        y += 80

    # Draw Info Panel
    # If active mudra, show its info. Else show Default Guide.
    shown_mudra = None
    if active_mudra:
        for m in active_mudra:
            shown_mudra = m
            break
            
    draw_mudra_info_panel(frame, shown_mudra)

# Detailed Benefits Dictionary
MUDRA_INFO = {
    "Gyan": [
        "GYAN MUDRA (Wisdom)",
        "Benefits:",
        "- Improves concentration & memory",
        "- Sharpens brain power",
        "- Reduces stress & anxiety",
        "- Promotes spiritual growth"
    ],
    "Prana": [
        "PRANA MUDRA (Vitality)",
        "Benefits:",
        "- Boosts energy & immunity",
        "- Reduces fatigue",
        "- Improves vision",
        "- Activates root chakra"
    ],
    "Apana": [
        "APANA MUDRA (Detox)",
        "Benefits:",
        "- Detoxifies the body",
        "- Improves digestion",
        "- Strengthens excretion system",
        "- Promotes inner balance"
    ],
    "Surya": [
        "SURYA MUDRA (Fire)",
        "Benefits:",
        "- Boosts metabolism",
        "- Helps in weight loss",
        "- Generates body heat",
        "- Improves digestion"
    ],
    "Varun": [
        "VARUN MUDRA (Water)",
        "Benefits:",
        "- Balances water content",
        "- Hydrates skin & body",
        "- Cures skin diseases",
        "- Improves blood circulation"
    ],
    "Anjali": [
        "ANJALI MUDRA (Prayer)",
        "Benefits:",
        "- Promotes inner peace",
        "- Connects left & right brain",
        "- Expresses respect & gratitude",
        "- Calms the mind"
    ]
}

def draw_mudra_info_panel(frame, mudra_name=None):
    """
    Draws a stylish info panel vertically stacked BELOW the Anjali mudra in the sidebar.
    """
    h, w, _ = frame.shape
    sidebar_w = 280
    
    # Panel Size - Fit within sidebar width
    panel_w = sidebar_w - 20 # 260
    panel_h = 140 # Compact height to fit 720p screens
    
    # Position: Inside Sidebar Column, Below Anjali
    # Anjali is at y=490, ends at ~535. Next slot is y=570.
    x = w - sidebar_w + 10
    y = 570 
    
    # Background
    overlay = frame.copy()
    cv2.rectangle(overlay, (x, y), (x + panel_w, y + panel_h), (40, 50, 60), -1)
    cv2.addWeighted(overlay, 0.9, frame, 0.1, 0, frame)
    
    # Border
    cv2.rectangle(frame, (x, y), (x + panel_w, y + panel_h), (0, 255, 0), 2)
    
    lines = []
    title_color = (0, 255, 0)
    
    if mudra_name and mudra_name in MUDRA_INFO:
        # Specific Mudra Info
        lines = MUDRA_INFO[mudra_name]
    else:
        # Default Guide
        lines = [
            "CHAKRA AI FLOW",
            "Guide:",
            "- Sit in **Lotus Pose**",
            "- Show **Hand Mudras**",
            "- Close **Eyes**",
            "- Focus on **Breath**"
        ]
        title_color = (0, 255, 255) # Cyan for general guide
    
    # Title (First line)
    cv2.putText(frame, lines[0], (x + 15, y + 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, title_color, 2, cv2.LINE_AA)
    
    # Body
    py = y + 60
    for line in lines[1:]:
        col = (255, 255, 255)
        scale = 0.45 # Smaller font
        thick = 1
        
        if line.startswith("Benefits:") or line.startswith("Guide:"):
            col = (200, 255, 200)
            scale = 0.5
            thick = 1
            cv2.putText(frame, line, (x + 15, py), 
                        cv2.FONT_HERSHEY_SIMPLEX, scale, col, thick, cv2.LINE_AA)
        else:
            # Keyword Highlighting Logic
            parts = line.split('**')
            px = x + 15
            
            for i, part in enumerate(parts):
                curr_col = col
                curr_thick = thick
                
                if i % 2 == 1: # Highlighted
                    curr_col = (0, 255, 255) 
                    curr_thick = 1 # Thinner for smaller text
                
                cv2.putText(frame, part, (px, py), 
                            cv2.FONT_HERSHEY_SIMPLEX, scale, curr_col, curr_thick, cv2.LINE_AA)
                
                (txt_w, _), _ = cv2.getTextSize(part, cv2.FONT_HERSHEY_SIMPLEX, scale, curr_thick)
                px += txt_w
                
        py += 25 # Tighter spacing


class AnalyticsTracker:
    def __init__(self):
        self.mudra_counts = {"Gyan": 0, "Fist": 0, "OpenPalm": 0, "Peace": 0}
        self.posture_alerts = 0
        self.posture_samples = []
        self.chakra_time = [0.0] * 7
        self.last_chakra_idx = None
        self.last_chakra_time = time.time()

    def record_chakra(self, idx):
        now = time.time()
        if self.last_chakra_idx is not None:
            self.chakra_time[self.last_chakra_idx] += now - self.last_chakra_time
        self.last_chakra_idx = idx
        self.last_chakra_time = now

    def record_mudra(self, name):
        if name in self.mudra_counts:
            self.mudra_counts[name] += 1

    def record_posture(self, score):
        self.posture_samples.append(score)
        if score < 0.5:
            self.posture_alerts += 1

    def summary(self):
        avg_posture = sum(self.posture_samples) / len(self.posture_samples) if self.posture_samples else 0.0
        return {
            "chakra_time": self.chakra_time,
            "mudras": self.mudra_counts,
            "posture_alerts": self.posture_alerts,
            "avg_posture": avg_posture,
        }


class MeditationTracker:
    def __init__(self):
        self.stage = "Dharana (Concentration)"
        self.concentration_level = 0.0
        self.start_time = 0
        self.in_dhyana = False
        
    def update(self, eye_open, breath_stable, body_still):
        # Logic: Eyes closed + stable breath = Dhyana
        if eye_open < 0.018: # Eyes closed
            if not self.in_dhyana:
                self.in_dhyana = True
                self.start_time = time.time()
                self.stage = "Dhyana (Meditation)"
            
            # Increase concentration over time
            duration = time.time() - self.start_time
            self.concentration_level = min(100.0, duration * 2.5) # Max in ~40s
            
            if duration > 30 and breath_stable:
                self.stage = "Samadhi (Absorption)"
        else:
            self.in_dhyana = False
            self.concentration_level = max(0.0, self.concentration_level - 2.0)
            self.stage = "Dharana (Concentration)"
            
        return self.stage, self.concentration_level

# 🔊 Bilingual (Hindi + English) voice summary
def speak_summary(chakra_energies, total_gyan_count, alignment_count, duration_min):
    strongest_idx = int(np.argmax(chakra_energies))
    weakest_idx = int(np.argmin(chakra_energies))

    strongest = CHAKRA_NAMES[strongest_idx]
    weakest = CHAKRA_NAMES[weakest_idx]

    msg = (
        f"Namaste Aditya. Aapka Yoga session ka chhota sa summary ready hai. "
        f"Total session time approximately {duration_min:.1f} minutes raha. "
        f"Is dauraan sabse zyaada active aur powerful chakra tha {strongest}. "
        f"Jo chakra thoda weak side par tha, woh tha {weakest}. "
        f"Aapne Gyaan Mudra total {total_gyan_count} baar kiya. "
        f"Alignment Mode {alignment_count} times activate hua, jab aapki saanse "
        f"aur body dono ekdum shaant state mein aa gayi. "
        f"Keep breathing deeply, dil halka rakhiye, aur apni energy balanced rakhiye. "
        f"Hari Om."
    )

    tts.say(msg)
    tts.runAndWait()


def create_summary_image(chakra_energies, duration_min, total_gyan_count, alignment_count):
    img = np.zeros((600, 800, 3), dtype=np.uint8)
    img[:] = (15, 15, 15)
    cv2.putText(img, "AI ChakraFlow Summary", (170, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 3)
    y = 150
    for i, energy in enumerate(chakra_energies):
        cv2.putText(img, f"{CHAKRA_NAMES[i]}: {int(energy*100)}%",
                    (80, y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, CHAKRA_COLORS[i], 2)
        y += 45
    cv2.putText(img, f"Session Time: {duration_min:.1f} min", (80, 420),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 255), 2)
    cv2.putText(img, f"Gyan Mudra: {total_gyan_count}", (80, 470),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 255, 200), 2)
    cv2.putText(img, f"Alignment Mode: {alignment_count}", (80, 520),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 215, 150), 2)
    cv2.imwrite("summary_output.png", img)
    return img


def show_chakra_bar_graph(chakra_energies):
    graph = np.zeros((500, 800, 3), dtype=np.uint8)
    for i, energy in enumerate(chakra_energies):
        bar_h = int(energy * 400)
        x1 = 80 + i * 100
        y1 = 450 - bar_h
        x2 = x1 + 70
        y2 = 450
        cv2.rectangle(graph, (x1, y1), (x2, y2), CHAKRA_COLORS[i], -1)
        cv2.putText(graph, CHAKRA_NAMES[i].split()[0], (x1, 470),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    cv2.imshow("Chakra Energy Bar Graph", graph)
    cv2.imwrite("chakra_graph.png", graph)


def show_final_report(session_start, chakra_energies, total_gyan_count, alignment_count):
    end_time = time.time()
    duration_min = (end_time - session_start) / 60.0
    strongest_idx = int(np.argmax(chakra_energies))
    weakest_idx = int(np.argmin(chakra_energies))
    strongest = CHAKRA_NAMES[strongest_idx]
    weakest = CHAKRA_NAMES[weakest_idx]
    calmness_score = int((chakra_energies[3] + chakra_energies[6]) / 2 * 100)

    print("\n=========================")
    print("     FINAL YOGA REPORT")
    print("=========================\n")
    print(f"🧘 Session Duration: {duration_min:.2f} minutes")
    print(f"✨ Strongest Chakra: {strongest}")
    print(f"⚪ Weakest Chakra: {weakest}")
    print(f"\n🔱 Gyan Mudra Activations: {total_gyan_count} times")
    print(f"🟣 Alignment Mode Entered: {alignment_count} times")
    print("\n📊 Final Chakra Energy Levels:")
    for i, energy in enumerate(chakra_energies):
        print(f"   {CHAKRA_NAMES[i]}: {int(energy*100)}%")
    print(f"\n🌬️ Breath Calmness Score: {calmness_score}/100")
    print("\n🙏 Thank you for practicing with AI ChakraFlow.")
    print("   Keep breathing. Stay mindful. Namaste.\n")


# ======================== MAIN ===========================

def main():
    cap = cv2.VideoCapture(CAM_INDEX)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
    if not cap.isOpened():
        print("[ERROR] Could not open camera.")
        return

    # Background music
    if os.path.exists(MUSIC_PATH):
        try:
            pygame.mixer.music.load(MUSIC_PATH)
            pygame.mixer.music.set_volume(0.8)
            pygame.mixer.music.play(-1)
            print("[INFO] Playing background music: Adiyogi")
        except Exception as e:
            print("[WARN] Could not play background music:", e)
    else:
        print("[WARN] Music file not found:", MUSIC_PATH)

    hands = mp_hands.Hands(
        max_num_hands=2,
        min_detection_confidence=0.5, # Lowered for faster/easier detection
        min_tracking_confidence=0.5
    )
    face_mesh = mp_face.FaceMesh(
        max_num_faces=1,
        refine_landmarks=False,  # turn off iris refinement to save CPU
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    pose = mp_pose.Pose(
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        model_complexity=0  # lightweight model to reduce lag
    )

    chakra_energies = [0.4] * 7
    last_chakra_index = None
    last_activation_time = time.time()
    breathing = BreathingTracker()

    session_start = time.time()
    eye_closed_frames = 0
    alignment_mode = False
    alignment_start_time = 0.0
    alignment_progress = 0.0
    gyan_active = False
    total_gyan_count = 0
    alignment_count = 0
    alignment_count = 0
    last_gyan_state = False
    
    # Smart Yoga Mode State
    yoga_mode_active = False
    namaste_hold_start = 0
    namaste_triggered = False
    
    # Awakening Sequence State
    was_eyes_closed = False
    eyes_closed_start = 0
    awakening_active = False
    awakening_start = 0
    
    # Animation Time Tracking
    anim_time = 0.0
    last_frame_time = time.time()

    # AI explainer state
    ai_text = "Breathe easy. Hold a gesture to get a short tip."
    last_ai_chakra = None
    last_ai_time = 0

    posture_analyzer = PostureAnalyzer()
    analytics = AnalyticsTracker()
    meditation_tracker = MeditationTracker()

    # Voice recognizer (heavy) can be disabled if laggy
    ENABLE_VOICE = False
    if ENABLE_VOICE:
        r = sr.Recognizer()
        mic = sr.Microphone()
    last_voice_check = 0

    # Frame throttling for pose to reduce lag
    pose_every_n = 2
    frame_count = 0
    last_pose_landmarks = None

    print("[INFO] AI ChakraFlow FULL started. Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        hand_res = hands.process(rgb)
        face_res = face_mesh.process(rgb)
        frame_count += 1
        if frame_count % pose_every_n == 0:
            pose_res = pose.process(rgb)
            last_pose_landmarks = pose_res.pose_landmarks if pose_res else None
        else:
            pose_res = None

        center_x = w // 2
        top_y = int(h * 0.25)
        bottom_y = int(h * 0.85)

        active_chakra_idx = None
        aura_color = (255, 255, 255)
        mood_label = "..."
        posture_score = 0.0
        posture_label = "No body"

        active_chakra_idx = None
        aura_color = (255, 255, 255)
        mood_label = "..."
        posture_score = 0.0
        posture_label = "No body"

        if face_res.multi_face_landmarks:
            face_landmarks = face_res.multi_face_landmarks[0]
            aura_color, mood_label, eye_open, mouth_open = analyze_face(face_landmarks, w, h)
            nose = face_landmarks.landmark[1]
            nose_y = nose.y
            breathing.update(nose_y)
            center_x = int(nose.x * w)

            # --- Awakening Trigger Logic ---
            is_eyes_closed = (eye_open < EYE_CLOSED_THRESHOLD)
            
            if is_eyes_closed:
                if not was_eyes_closed:
                    eyes_closed_start = time.time()
                was_eyes_closed = True
                eye_closed_frames += 1
                try:
                    draw_text_with_bg(frame, "Meditation Detector: Eyes Closed", center_x - 120, center_y - 50, color=(255, 255, 0))
                except Exception:
                    pass
            else:
                if was_eyes_closed:
                    duration_closed = time.time() - eyes_closed_start
                    if duration_closed > 4.0:
                        awakening_active = True
                        awakening_start = time.time()
                        print("[INFO] Chakra Awakening Sequence Started!")
                was_eyes_closed = False
                eye_closed_frames = 0

            if eye_closed_frames > EYE_CLOSED_FRAMES_REQUIRED and not alignment_mode:
                alignment_mode = True
                alignment_count += 1
                alignment_start_time = time.time()
                alignment_progress = 0.0
                print("[INFO] Alignment Mode activated.")
        else:
            breathing.update(0.5)
            eye_closed_frames = 0
            was_eyes_closed = False

        # ALIGNMENT (Updated to allow rising)
        if alignment_mode:
            alignment_progress = min(1.0, alignment_progress + 0.01)
            # Instead of clamping, we just ensure a minimum baseline that rises
            # This allows the meditation boost (later in code) to add on top!
            target_base = 1.0 * alignment_progress # Target 100%
            for i in range(len(chakra_energies)):
                # Only pull up if below target, don't pull down if already high
                # Use max to ensure we never drag it down
                chakra_energies[i] = max(chakra_energies[i], target_base)
            
            aura_color = (0, 215, 255)
            if time.time() - alignment_start_time > 8:
                alignment_mode = False
                print("[INFO] Alignment Mode ended.")

        # POSE (throttled)
        pose_landmarks = pose_res.pose_landmarks if pose_res and pose_res.pose_landmarks else last_pose_landmarks
        if pose_landmarks:
            posture_score, posture_label = posture_analyzer.assess(pose_landmarks)
            analytics.record_posture(posture_score)
        else:
            posture_score, posture_label = 0.0, "No body"

        breath_factor = breathing.get_breath_factor()

        # --- Hand Analysis & Mudra Detection ---
        detected_mudra = None
        detected_mudra_name = None
        gyan_active = False
        
        if hand_res.multi_hand_landmarks:
            # Debug info
            cv2.putText(frame, f"Hands: {len(hand_res.multi_hand_landmarks)}", (10, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Check for Namaste (Anjali) first
            if detect_namaste(hand_res):
                detected_mudra_name = "Anjali Mudra"
                detected_mudra = 4 
            else:
                for hand_landmarks in hand_res.multi_hand_landmarks:
                    finger_states = get_finger_states(hand_landmarks, w, h)
                    
                    # Check specific mudras
                    if detect_gyan_mudra(hand_landmarks, frame, w, h):
                        detected_mudra_name = "Gyan Mudra"
                        detected_mudra = 6 
                    elif detect_prana_mudra(hand_landmarks):
                        detected_mudra_name = "Prana Mudra"
                        detected_mudra = 0 
                    elif detect_apana_mudra(hand_landmarks):
                        detected_mudra_name = "Apana Mudra"
                        detected_mudra = 1 
                    elif detect_surya_mudra(hand_landmarks):
                        detected_mudra_name = "Surya Mudra"
                        detected_mudra = 2 
                    elif detect_varun_mudra(hand_landmarks):
                        detected_mudra_name = "Varun Mudra"
                        detected_mudra = 1 
                    
                    if detected_mudra_name:
                        break 

            # Record analytics
            if detected_mudra_name:
                 analytics.record_mudra(detected_mudra_name)
                 if detected_mudra_name == "Gyan Mudra":
                     total_gyan_count += 1 
                     gyan_active = True

            # Update Energies
            if detected_mudra is not None:
                active_chakra_idx = detected_mudra
                last_activation_time = time.time()
                for i in range(len(chakra_energies)):
                    if i == detected_mudra:
                        chakra_energies[i] = min(1.0, chakra_energies[i] + 0.02)
                    else:
                        chakra_energies[i] = max(0.1, chakra_energies[i] - 0.004)
                analytics.record_chakra(detected_mudra)
            else:
                # Pose detected but no specific mudra -> Passive Increase
                # "As I start yoga chakras should increase"
                target_passive_level = 0.5
                for i in range(len(chakra_energies)):
                    if chakra_energies[i] < target_passive_level:
                        chakra_energies[i] = min(target_passive_level, chakra_energies[i] + 0.002)
                    else:
                        # If above passive level (from previous boost), slowly decay back to it
                        chakra_energies[i] = max(target_passive_level, chakra_energies[i] - 0.005) # Faster decay to passive

        elif not alignment_mode:
            # No Pose / No Hands -> Decay
            # "As I stop yoga energy should come down"
            # Reduced decay rate from 0.08 to 0.015 for smoother experience
            for i in range(len(chakra_energies)):
                chakra_energies[i] = max(0.05, chakra_energies[i] - 0.015)

        # Draw Sidebar
        draw_mudra_sidebar(frame, detected_mudra_name)
        
        if detected_mudra_name:
             draw_text_with_bg(frame, f"Detected: {detected_mudra_name}", 20, 100, font_scale=0.8, color=(0, 255, 0))

        # Time Delta Calculation
        now = time.time()
        dt = now - last_frame_time
        last_frame_time = now
        
        # Golden Aura Logic
        is_yoga_active = (posture_score > 0.1) or gyan_active
        
        # Dynamic Speed - SLOWER & CALMER
        speed_multiplier = 1.0
        if is_yoga_active:
            speed_multiplier = 2.0 # Reduced from 4.0
            
        if alignment_mode:
             speed_multiplier = 3.0 # Reduced from 12.0 for smoother feel 
            
        anim_time += dt * speed_multiplier

        # Draw Universe Background
        draw_universe(frame, anim_time)

        # Draw Background Aura
        # center_x is already defined in main loop
        center_y_aura = int(h * 0.55)
        aura_radius = int(min(w, h) * 0.4)
        
        if is_yoga_active and not alignment_mode:
            aura_color = (0, 215, 255) # Golden
        elif not alignment_mode:
            aura_color = (255, 255, 255) # White default

        overlay_bg = frame.copy()
        cv2.circle(overlay_bg, (center_x, center_y_aura), aura_radius, aura_color, -1)
        cv2.addWeighted(overlay_bg, 0.15, frame, 0.85, 0, frame)
        
        if is_yoga_active and not alignment_mode:
             head_y = int(nose.y * h) if 'nose' in locals() else center_y_aura - 100
             head_x = int(nose.x * w) if 'nose' in locals() else center_x
             draw_revolving_aura(frame, head_x, head_y, 120, anim_time)
             
        if gyan_active and not alignment_mode:
            draw_gyan_sparkles(frame, center_x, center_y_aura, aura_radius)
        
        # Breath factor
        breath_factor = breathing.get_breath_factor()
        
        # Draw Chakras
        if not yoga_mode_active:
            draw_chakras(frame, center_x, top_y, bottom_y, detected_mudra, chakra_energies, aura_color, breath_factor, anim_time)
            draw_chakra_meter(frame, chakra_energies)
        else:
            # Yoga Mode UI
            # Draw Chakras (so they are visible during Awakening/Meditation)
            draw_chakras(frame, center_x, top_y, bottom_y,
                        active_chakra_idx if active_chakra_idx is not None else -1,
                        chakra_energies, aura_color, breath_factor, anim_time)
            
            draw_text_with_bg(frame, "YOGA MODE ACTIVE", int(w*0.05), int(h*0.1), font_scale=1, color=(0, 255, 0))
            
            # Show more technical stats
            draw_text_with_bg(frame, f"Breath Phase: {breathing.breath_phase:.2f}", int(w*0.05), int(h*0.15), color=(200, 255, 200))
            draw_text_with_bg(frame, f"Posture: {posture_label} ({posture_score:.2f})", int(w*0.05), int(h*0.19), color=(200, 255, 200))
            
            # Meditation Stats
            med_stage, med_level = meditation_tracker.update(eye_open, True, posture_score > 0.6)
            
            stage_color = (255, 200, 100)
            if "Dhyana" in med_stage: stage_color = (100, 255, 255)
            if "Samadhi" in med_stage: stage_color = (255, 100, 255)
            
            draw_text_with_bg(frame, f"Stage: {med_stage}", int(w*0.05), int(h*0.23), font_scale=0.7, color=stage_color)
            draw_text_with_bg(frame, f"Concentration: {med_level:.1f}%", int(w*0.05), int(h*0.27))
            
            # If in Dhyana/Samadhi, boost all chakras significantly
            if "Dhyana" in med_stage or "Samadhi" in med_stage:
                 for i in range(len(chakra_energies)):
                    # Faster increase for visibility ("Jump high")
                    chakra_energies[i] = min(1.0, chakra_energies[i] + 0.15)

        # Draw Smart Tracking
        draw_smart_tracking(frame, hand_res, face_res, yoga_mode=yoga_mode_active)

        # Namaste Detection for Mode Toggle
        if detect_namaste(hand_res):
            if namaste_hold_start == 0:
                namaste_hold_start = time.time()
            elif time.time() - namaste_hold_start > 2.0: # Hold for 2 seconds
                if not namaste_triggered:
                    yoga_mode_active = not yoga_mode_active
                    namaste_triggered = True
                    print(f"[INFO] Yoga Mode {'Activated' if yoga_mode_active else 'Deactivated'}")
                    cv2.putText(frame, "Mode Switched!", (center_x - 100, center_y_aura), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 0), 3)
        else:
            namaste_hold_start = 0
            namaste_triggered = False

        # COACH TEXT
        coach_msg = generate_smart_coach_message(chakra_energies, mood_label, alignment_mode, gyan_active)
        draw_text_with_bg(frame, coach_msg, 30, h - 50, bg_alpha=0.5)

        if gyan_active and not alignment_mode:
            draw_text_with_bg(frame, "Gyan Mudra — Crown Chakra Awakening", int(w * 0.18), int(h * 0.12), font_scale=0.8)

        idle_time = time.time() - last_activation_time
        if idle_time > 10 and not alignment_mode and not gyan_active:
            draw_text_with_bg(frame, "Hint: Fist (Root), open palm (Solar) or Gyan Mudra for Crown.", 30, h - 20)
        else:
            draw_text_with_bg(frame, "Press 'q' to quit", 30, h - 20)


        elapsed_min = (time.time() - session_start) / 60.0
        top_text = f"AI ChakraFlow  |  Session: {elapsed_min:.1f} min  |  Mood: {mood_label}  |  Posture: {posture_label}"
        draw_text_with_bg(frame, top_text, 30, 30, font_scale=0.7, thickness=2)

        cv2.imshow("AI ChakraFlow — Full Experience", frame)

        # Voice trigger disabled to avoid lag; set ENABLE_VOICE=True to re-enable.
        if False:
            if time.time() - last_voice_check > 4:
                last_voice_check = time.time()
                try:
                    with mic as source:
                        r.adjust_for_ambient_noise(source, duration=0.2)
                        audio = r.listen(source, timeout=0.6, phrase_time_limit=1.2)
                    try:
                        cmd = r.recognize_google(audio, language="hi-IN").lower()
                        if "hari om" in cmd or ("hari" in cmd and "om" in cmd):
                            duration_min_now = (time.time() - session_start) / 60.0
                            show_chakra_bar_graph(chakra_energies)
                            summary_img = create_summary_image(chakra_energies, duration_min_now,
                                                               total_gyan_count, alignment_count)
                            cv2.imshow("Summary Image", summary_img)
                            speak_summary(chakra_energies, total_gyan_count,
                                          alignment_count, duration_min_now)
                    except Exception:
                        pass
                except Exception:
                    pass

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    pygame.mixer.quit()

    show_final_report(session_start, chakra_energies, total_gyan_count, alignment_count)
    summary = analytics.summary()
    print("\n--- Analytics ---")
    print("Mudra counts:", summary["mudras"])
    print("Avg posture score:", f"{summary['avg_posture']:.2f}")
    print("Posture alerts (score<0.5):", summary["posture_alerts"])
    print("Time per chakra (s):", [round(t, 1) for t in summary["chakra_time"]])
    print("[INFO] Exited cleanly.")


if __name__ == "__main__":
    main()
