export const CHAKRA_SCRIPTURES = [
    {
        id: "root_balance",
        source: "Yoga wisdom",
        sanskrit: "Sthiram sukham asanam",
        hinglish: "Stay steady like a mountain",
        meaning: "Ground yourself and find steadiness.",
    },
    {
        id: "sacral_flow",
        source: "Yoga wisdom",
        sanskrit: "Jala tattva",
        hinglish: "Gentle flow, soft breath",
        meaning: "Let movement be smooth and creative.",
    },
    {
        id: "solar_fire",
        source: "Yoga wisdom",
        sanskrit: "Tejas",
        hinglish: "Inner fire with calm mind",
        meaning: "Strength with kindness—no force.",
    },
    {
        id: "heart_compassion",
        source: "Yoga wisdom",
        sanskrit: "Anahata",
        hinglish: "Open heart, light shoulders",
        meaning: "Balance effort with softness and care.",
    },
    {
        id: "throat_truth",
        source: "Yoga wisdom",
        sanskrit: "Satya",
        hinglish: "Speak softly, breathe freely",
        meaning: "Align breath and voice with honesty.",
    },
    {
        id: "third_eye_focus",
        source: "Yoga wisdom",
        sanskrit: "Dhyana",
        hinglish: "Drishti shant rakho",
        meaning: "Calm gaze, clear mind, steady breath.",
    },
    {
        id: "crown_stillness",
        source: "Yoga wisdom",
        sanskrit: "Shanti",
        hinglish: "Sukoon se baitho",
        meaning: "Sit in quiet awareness; no hurry, no pressure.",
    },
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

export function generateSmartCoachMessage(
    energies: number[],
    moodLabel: string = "Neutral",
    alignmentMode: boolean = false,
    gyanActive: boolean = false
): string {
    if (gyanActive) {
        return "Gyan Mudra detected — Deep Meditation Mode.";
    }

    // Find min/max energy indices
    let weakestIdx = 0;
    let strongestIdx = 0;
    let minVal = 1.0;
    let maxVal = 0.0;

    energies.forEach((e, i) => {
        if (e < minVal) {
            minVal = e;
            weakestIdx = i;
        }
        if (e > maxVal) {
            maxVal = e;
            strongestIdx = i;
        }
    });

    const weakestName = CHAKRA_NAMES[weakestIdx];
    const strongestName = CHAKRA_NAMES[strongestIdx];

    if (alignmentMode) {
        return "✨ Alignment Mode: All chakras are being gently balanced...";
    }

    if (energies[weakestIdx] < 0.3) {
        return `Tip: ${weakestName} is low. Try its gesture to recharge. (${moodLabel})`;
    }

    if (energies.every((e) => e > 0.7)) {
        return `Beautiful! Your energy looks balanced. Stay with your breath. (${moodLabel})`;
    }

    return `Focus on breath. ${strongestName} is strong, ${weakestName} needs love. (${moodLabel})`;
}
