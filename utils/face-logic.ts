import { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Helper to calculate Euclidean distance
function dist(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

// Calculate Eye Aspect Ratio (EAR)
function getEyeAspectRatio(eyeLandmarks: NormalizedLandmark[]): number {
    // Vertical distances
    const A = dist(eyeLandmarks[1], eyeLandmarks[5]);
    const B = dist(eyeLandmarks[2], eyeLandmarks[4]);
    // Horizontal distance
    const C = dist(eyeLandmarks[0], eyeLandmarks[3]);

    return (A + B) / (2.0 * C);
}

// Analyze face for eyes closed
// Returns { eyeOpen: number, isEyesClosed: boolean }
export function analyzeFace(landmarks: NormalizedLandmark[]) {
    // MediaPipe Face Mesh Indices
    // Left Eye: 33, 160, 158, 133, 153, 144
    // Right Eye: 362, 385, 387, 263, 373, 380

    const leftEyeIndices = [33, 160, 158, 133, 153, 144];
    const rightEyeIndices = [362, 385, 387, 263, 373, 380];

    const leftEye = leftEyeIndices.map(i => landmarks[i]);
    const rightEye = rightEyeIndices.map(i => landmarks[i]);

    const leftEAR = getEyeAspectRatio(leftEye);
    const rightEAR = getEyeAspectRatio(rightEye);

    const avgEAR = (leftEAR + rightEAR) / 2.0;

    // Threshold for closed eyes (tuned for webcam distance)
    const EAR_THRESHOLD = 0.30; // Increased from 0.25 to catch "looking down" or "half-closed"

    const isEyesClosed = avgEAR < EAR_THRESHOLD;

    return { avgEAR, isEyesClosed };
}
