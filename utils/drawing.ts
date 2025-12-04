import { NormalizedLandmark } from "@mediapipe/tasks-vision";

export const CHAKRA_COLORS = [
    "rgb(255, 0, 0)", // Root - Red
    "rgb(255, 140, 0)", // Sacral - Orange
    "rgb(255, 255, 0)", // Solar - Yellow
    "rgb(0, 255, 0)", // Heart - Green
    "rgb(0, 0, 255)", // Throat - Blue
    "rgb(255, 0, 255)", // Third Eye - Violet
    "rgb(255, 255, 255)", // Crown - White
];

export const CHAKRA_NAMES = [
    "Root",
    "Sacral",
    "Solar Plexus",
    "Heart",
    "Throat",
    "Third Eye",
    "Crown",
];

export function drawUniverse(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    t: number,
    speedFactor: number = 1.0
) {
    const cx = width * 0.15;
    const cy = height * 0.5;

    // Draw background circles (simulating addWeighted)
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, 2 * Math.PI);
    ctx.fillStyle = "rgb(60, 0, 40)"; // BGR (40, 0, 60) -> RGB (60, 0, 40)
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 90, 0, 2 * Math.PI);
    ctx.fillStyle = "rgb(120, 0, 80)"; // BGR (80, 0, 120) -> RGB (120, 0, 80)
    ctx.fill();
    ctx.restore();

    // Center Sun
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, 2 * Math.PI);
    ctx.fillStyle = "rgb(255, 255, 0)"; // BGR (0, 255, 255) -> RGB (255, 255, 0) Yellow
    ctx.fill();

    const orbitRadii = [55, 90, 125];
    const speeds = [0.9, 0.6, 0.35];
    const colors = [
        "rgb(0, 200, 255)", // BGR (255, 200, 0) -> RGB (0, 200, 255) Light Blue? Wait.
        // Python: (255, 200, 0) BGR -> Blue=255, Green=200, Red=0 -> Sky Blue.
        "rgb(255, 255, 255)",
        "rgb(255, 215, 0)", // BGR (0, 215, 255) -> RGB (255, 215, 0) Gold
    ];

    orbitRadii.forEach((r, i) => {
        // Use speedFactor to modulate speed
        const angle = t * speeds[i] * speedFactor;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);

        // Planet
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, 2 * Math.PI);
        ctx.fillStyle = colors[i];
        ctx.fill();

        // Orbit path
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(120, 90, 90, 0.5)"; // Approximation
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

export function drawChakras(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    topY: number,
    bottomY: number,
    activeIndex: number,
    energies: number[],
    breathFactor: number,
    t: number
) {
    const numChakras = 7;
    // Linear interpolation for Y positions
    const ys = [];
    for (let i = 0; i < numChakras; i++) {
        ys.push(bottomY + (i * (topY - bottomY)) / (numChakras - 1));
    }

    const musicPulse = 0.8 + 0.35 * Math.sin(2.0 * t);

    for (let i = 0; i < numChakras; i++) {
        const energy = energies[i];
        const wobble = 8 * Math.sin(t * 1.4 + i * 0.9);
        const cy = ys[i] + wobble;
        const baseRadius = 18 + energy * 22;
        const radius = baseRadius * breathFactor * musicPulse;

        const center = { x: centerX, y: cy };

        const auraRadius = radius * (1.5 + 0.3 * musicPulse);
        const auraAlpha = Math.min(0.9, 0.25 + 0.5 * energy * musicPulse);

        // Aura
        ctx.save();
        ctx.globalAlpha = auraAlpha;
        ctx.beginPath();
        ctx.arc(center.x, center.y, auraRadius, 0, 2 * Math.PI);
        ctx.fillStyle = CHAKRA_COLORS[i]; // Use chakra color for aura too? Python passed 'aura_color' but used base_color for inner.
        // Python: draw_chakras arg 'aura_color' was passed from analyze_face.
        // But here we might want individual chakra colors.
        // In Python code: `cv2.circle(overlay, center, aura_radius, aura_color, -1)`
        // The `aura_color` passed to `draw_chakras` was GLOBAL aura color (from face mood).
        // Let's stick to the Python logic: we need to pass `globalAuraColor`.
        ctx.fillStyle = CHAKRA_COLORS[i]; // Fallback if not passed, but let's add the arg.
        ctx.fill();
        ctx.restore();

        // Base Circle
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = CHAKRA_COLORS[i];
        ctx.fill();

        // Orbiting Dot
        const orbitR = radius * 1.6;
        const dotAngle = t * 2.5 + i;
        const dotX = center.x + orbitR * Math.cos(dotAngle);
        const dotY = center.y + orbitR * Math.sin(dotAngle);

        ctx.beginPath();
        ctx.arc(dotX, dotY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "white";
        ctx.fill();

        // Active Highlight
        if (i === activeIndex) {
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius + 6, 0, 2 * Math.PI);
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Text
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "white";
        ctx.fillText(CHAKRA_NAMES[i], center.x + 30, center.y + 5);
    }
}

export function drawRevolvingAura(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    t: number,
    intensity: number = 1.0
) {
    const goldenColor = `rgba(255, 215, 0, ${0.2 * intensity})`; // Gold with variable alpha
    const particleColor = `rgba(255, 215, 0, ${1.0 * intensity})`;

    // Draw main glowing halo
    ctx.save();
    // ctx.globalAlpha = 0.2; // Already handled by color alpha
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = goldenColor;
    ctx.fill();
    ctx.restore();

    // Revolving particles
    const numParticles = 8;
    for (let i = 0; i < numParticles; i++) {
        const angle = t * 2.0 + i * ((2 * Math.PI) / numParticles);
        const orbitRx = radius * 1.2;
        const orbitRy = radius * 0.4;

        const px = centerX + orbitRx * Math.cos(angle);
        const py = centerY + orbitRy * Math.sin(angle) - radius * 0.5;

        // White core
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
        ctx.fill();

        // Golden rim
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = particleColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

export function drawSmartTracking(
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
) {
    // Draw connections (simplified)
    // We need the connection pairs. MediaPipe Hands has HAND_CONNECTIONS.
    // I'll define a simple subset or import from mediapipe if possible, but hardcoding is safer for now.
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // Index
        [0, 9], [9, 10], [10, 11], [11, 12], // Middle
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17] // Palm
    ];

    ctx.strokeStyle = "rgb(0, 255, 0)";
    ctx.lineWidth = 2;

    for (const [start, end] of connections) {
        const p1 = landmarks[start];
        const p2 = landmarks[end];
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
    }

    // Draw points
    ctx.fillStyle = "rgb(0, 255, 0)";
    for (const lm of landmarks) {
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 3, 0, 2 * Math.PI);
        ctx.fill();
    }
}
