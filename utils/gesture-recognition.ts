import { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Helper to calculate squared distance between two landmarks (2D)
function distSq(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
    return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
}

// Helper to calculate Euclidean distance (2D)
function dist(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
    return Math.sqrt(distSq(p1, p2));
}

// Helper to get hand scale (wrist to middle finger tip)
function getHandScale(landmarks: NormalizedLandmark[]): number {
    const wrist = landmarks[0];
    const midTip = landmarks[12];
    return dist(wrist, midTip) + 1e-6;
}

export function detectGyanMudra(landmarks: NormalizedLandmark[]): boolean {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const wrist = landmarks[0];
    const handScale = getHandScale(landmarks);

    const d = dist(thumbTip, indexTip) / handScale;

    // Check if other fingers are extended to avoid false positives
    const middleExt = distSq(landmarks[12], wrist) > distSq(landmarks[10], wrist);
    const ringExt = distSq(landmarks[16], wrist) > distSq(landmarks[14], wrist);
    const pinkyExt = distSq(landmarks[20], wrist) > distSq(landmarks[18], wrist);

    return d < 0.35 && middleExt && ringExt && pinkyExt;
}

export function detectPranaMudra(landmarks: NormalizedLandmark[]): boolean {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const handScale = getHandScale(landmarks);

    const dRing = dist(thumbTip, ringTip) / handScale;
    const dPinky = dist(thumbTip, pinkyTip) / handScale;

    // Check if index and middle are extended
    // (Tip further from wrist than PIP joint)
    const indexExt = distSq(landmarks[8], wrist) > distSq(landmarks[6], wrist);
    const middleExt = distSq(landmarks[12], wrist) > distSq(landmarks[10], wrist);

    return dRing < 0.35 && dPinky < 0.35 && indexExt && middleExt;
}

export function detectApanaMudra(landmarks: NormalizedLandmark[]): boolean {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const midTip = landmarks[12];
    const ringTip = landmarks[16];
    const handScale = getHandScale(landmarks);

    const dMid = dist(thumbTip, midTip) / handScale;
    const dRing = dist(thumbTip, ringTip) / handScale;

    const indexExt = distSq(landmarks[8], wrist) > distSq(landmarks[6], wrist);
    const pinkyExt = distSq(landmarks[20], wrist) > distSq(landmarks[18], wrist);

    return dMid < 0.35 && dRing < 0.35 && indexExt && pinkyExt;
}

export function detectSuryaMudra(landmarks: NormalizedLandmark[]): boolean {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const handScale = getHandScale(landmarks);

    // Check if ring finger is folded (Tip closer to wrist than PIP)
    const ringFolded = distSq(ringTip, wrist) < distSq(ringPip, wrist);

    // Check if thumb is over ring finger (Thumb tip close to Ring PIP)
    const dThumbRing = dist(thumbTip, ringPip) / handScale;

    return ringFolded && dThumbRing < 0.35;
}

export function detectVarunMudra(landmarks: NormalizedLandmark[]): boolean {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const pinkyTip = landmarks[20];
    const handScale = getHandScale(landmarks);

    const dPinky = dist(thumbTip, pinkyTip) / handScale;

    const indexExt = distSq(landmarks[8], wrist) > distSq(landmarks[6], wrist);
    const midExt = distSq(landmarks[12], wrist) > distSq(landmarks[10], wrist);
    const ringExt = distSq(landmarks[16], wrist) > distSq(landmarks[14], wrist);

    return dPinky < 0.35 && indexExt && midExt && ringExt;
}

export function detectNamaste(landmarksList: NormalizedLandmark[][]): boolean {
    if (landmarksList.length < 2) return false;

    const h1Wrist = landmarksList[0][0];
    const h2Wrist = landmarksList[1][0];

    const d = dist(h1Wrist, h2Wrist);
    return d < 0.20;
}

export function classifyGesture(landmarks: NormalizedLandmark[]): string | null {
    if (detectGyanMudra(landmarks)) return "Gyan Mudra";
    if (detectPranaMudra(landmarks)) return "Prana Mudra";
    if (detectApanaMudra(landmarks)) return "Apana Mudra";
    if (detectSuryaMudra(landmarks)) return "Surya Mudra";
    if (detectVarunMudra(landmarks)) return "Varun Mudra";
    return null;
}
