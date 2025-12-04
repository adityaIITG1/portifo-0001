import { useEffect, useState } from "react";
import {
    FilesetResolver,
    HandLandmarker,
    FaceLandmarker
} from "@mediapipe/tasks-vision";

export function useVisionModels() {
    const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
    const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadModels = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );

                const [hand, face] = await Promise.all([
                    HandLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                            delegate: "GPU",
                        },
                        runningMode: "VIDEO",
                        numHands: 2,
                    }),
                    FaceLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                            delegate: "GPU",
                        },
                        runningMode: "VIDEO",
                        numFaces: 1,
                        outputFaceBlendshapes: true,
                    })
                ]);

                setHandLandmarker(hand);
                setFaceLandmarker(face);
                setIsLoading(false);
            } catch (err: unknown) {
                console.error("Error loading models:", err);
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(errorMessage);
                setIsLoading(false);
            }
        };

        loadModels();
    }, []);

    return { handLandmarker, faceLandmarker, isLoading, error };
}
