"use client";

import { useEffect, useRef, useState } from "react";
import { useVisionModels } from "@/hooks/useVisionModels";
import {
    classifyGesture,
    detectNamaste,
} from "@/utils/gesture-recognition";
import { analyzeFace } from "@/utils/face-logic";
import {
    drawUniverse,
    drawChakras,
    drawRevolvingAura,
    drawSmartTracking,
} from "@/utils/drawing";
import { generateSmartCoachMessage } from "@/utils/smart-coach";

import TopBar from "./TopBar";
import RightSidebar from "./RightSidebar";
import LeftSidebar from "./LeftSidebar";
import BottomOverlay from "./BottomOverlay";

export default function YogaCanvas() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { handLandmarker, faceLandmarker, isLoading, error: aiError } = useVisionModels();

    const [gesture, setGesture] = useState<string | null>(null);
    const [feedback, setFeedback] = useState("Tip: Focus on breath. Root is strong...");
    const [logs, setLogs] = useState<string[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);

    // Animation state
    const requestRef = useRef<number>(0);
    const startTimeRef = useRef<number>(Date.now());

    // Refs for Animation Loop State (Fixes Stale Closure)
    const energiesRef = useRef<number[]>([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
    const activeIndexRef = useRef(0);
    const gestureRef = useRef<string | null>(null);
    const auraIntensityRef = useRef(0.0); // 0.0 to 1.0
    const eyesClosedTimeRef = useRef(0);
    const eyesOpenTimeRef = useRef(0); // Track how long eyes have been open/lost
    const isMeditationRef = useRef(false);

    // Debounce Refs
    const pendingGestureRef = useRef<string | null>(null);
    const pendingGestureStartTimeRef = useRef(0);
    const lastSpeechTimeRef = useRef(0);
    const lastSpeechTextRef = useRef("");

    // React State for UI updates (Sidebar)
    const [uiEnergies, setUiEnergies] = useState<number[]>([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);

    const addLog = (msg: string) => setLogs(prev => [...prev.slice(-4), msg]);

    useEffect(() => {
        if (isLoading) addLog("AI: Loading models...");
        if (handLandmarker && faceLandmarker) addLog("AI: Models loaded successfully");
        if (aiError) addLog(`AI Error: ${aiError}`);
    }, [isLoading, handLandmarker, faceLandmarker, aiError]);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const speak = (text: string) => {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            // Try to find an Indian female voice
            const voice = voices.find(v =>
                (v.name.includes("India") || v.name.includes("Hindi") || v.name.includes("Heera")) &&
                v.name.includes("Female")
            ) || voices.find(v => v.name.includes("Google हिन्दी")) || voices.find(v => v.name.includes("Female"));

            if (voice) utterance.voice = voice;
            utterance.rate = 1.1; // Energetic (slightly faster)
            utterance.pitch = 1.2; // Sweet (higher pitch)
            window.speechSynthesis.speak(utterance);
        }
    };

    useEffect(() => {
        audioRef.current = new Audio("/adiyogi.mp3");
        audioRef.current.loop = true;
        audioRef.current.volume = 0.6;
        audioRef.current.preload = "auto";

        const playAudio = async () => {
            try {
                await audioRef.current?.play();
                setIsPlaying(true);
                addLog("Audio: Auto-playing");
            } catch (e) {
                console.warn("Autoplay blocked", e);
                addLog("Audio: Autoplay blocked. Click Start.");
                setIsPlaying(false);
            }
        };
        playAudio();

        const startCamera = async () => {
            if (videoRef.current) {
                addLog("Camera: Requesting access...");
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: 1280,
                            height: 720,
                        },
                    });
                    addLog("Camera: Access granted");
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadeddata = () => addLog("Camera: Data loaded");
                    videoRef.current.play();
                    addLog("Camera: Playing stream");
                } catch (err: any) {
                    console.error("Error accessing webcam:", err);
                    addLog(`Camera Error: ${err.message}`);
                    setFeedback("Camera access denied.");
                }
            }
        };

        startCamera();

        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            addLog("Audio: Paused");
        } else {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
                addLog("Audio: Playing");
            }).catch(e => addLog(`Audio Error: ${e.message}`));
        }
    };

    const animate = () => {
        if (
            !canvasRef.current ||
            !videoRef.current ||
            !handLandmarker ||
            !faceLandmarker ||
            videoRef.current.readyState < 2
        ) {
            requestRef.current = requestAnimationFrame(animate);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const video = videoRef.current;

        if (!ctx) return;

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        const width = canvas.width;
        const height = canvas.height;
        const t = (Date.now() - startTimeRef.current) / 1000;

        // 1. Draw Video
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-width, 0);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();

        // 2. AI Detection
        const now = Date.now();
        const handResults = handLandmarker.detectForVideo(video, now);
        const faceResults = faceLandmarker.detectForVideo(video, now);

        let currentGesture = null;
        let isEyesClosed = false;

        // Hand Logic
        if (handResults.landmarks) {
            for (const landmarks of handResults.landmarks) {
                drawSmartTracking(ctx, landmarks, width, height);
                const g = classifyGesture(landmarks);
                if (g) currentGesture = g;
            }
            if (handResults.landmarks.length >= 2) {
                if (detectNamaste(handResults.landmarks)) {
                    currentGesture = "Namaste / Anjali Mudra";
                }
            }
        }

        // Face Logic
        if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
            const face = faceResults.faceLandmarks[0];
            const analysis = analyzeFace(face);
            isEyesClosed = analysis.isEyesClosed;

            // Debug Eye State occasionally
            if (Math.random() < 0.01) console.log("EAR:", analysis.avgEAR, "Closed:", isEyesClosed);
        }

        // Meditation Logic (Stabilized)
        if (isEyesClosed) {
            eyesOpenTimeRef.current = 0; // Reset open timer
            if (eyesClosedTimeRef.current === 0) eyesClosedTimeRef.current = now;

            // Trigger meditation after 1 second of eyes closed
            if (now - eyesClosedTimeRef.current > 1000) {
                isMeditationRef.current = true;
            }
        } else {
            // Eyes are Open (or lost)
            eyesClosedTimeRef.current = 0; // Reset closed timer

            if (isMeditationRef.current) {
                // If currently meditating, use a SAFER safety buffer (2000ms)
                // This prevents "flickering" off due to camera noise
                if (eyesOpenTimeRef.current === 0) eyesOpenTimeRef.current = now;

                if (now - eyesOpenTimeRef.current > 2000) {
                    isMeditationRef.current = false;

                    // Only announce "Yoga Stopped" if NO gesture is active
                    if (!currentGesture) {
                        const msg = "Yoga band ho gaya hai. Meditation stopped.";
                        setFeedback(msg);
                        speak(msg);
                    } else {
                        setFeedback("Meditation ended. Maintaining Yoga pose.");
                    }
                }
            } else {
                isMeditationRef.current = false;
            }
        }

        // Gesture State Update with Hysteresis (Debounce)
        if (currentGesture) {
            if (pendingGestureRef.current !== currentGesture) {
                // New potential gesture detected, start timer
                pendingGestureRef.current = currentGesture;
                pendingGestureStartTimeRef.current = now;
            } else {
                // Same pending gesture, check duration
                if (now - pendingGestureStartTimeRef.current > 500) { // 500ms stability required
                    if (gestureRef.current !== currentGesture) {
                        // Confirmed new gesture
                        gestureRef.current = currentGesture;
                        setGesture(currentGesture);

                        const isGyan = currentGesture === "Gyan Mudra";
                        const msg = generateSmartCoachMessage(energiesRef.current, "Calm", isMeditationRef.current, isGyan);

                        // Prevent repeating the same message too soon (10s)
                        if (msg !== lastSpeechTextRef.current || now - lastSpeechTimeRef.current > 10000) {
                            setFeedback(msg);
                            speak(msg);
                            lastSpeechTextRef.current = msg;
                            lastSpeechTimeRef.current = now;
                        }
                    }
                }
            }
        } else {
            // No gesture detected, reset pending if it was something
            pendingGestureRef.current = null;
            pendingGestureStartTimeRef.current = 0;
        }

        if (isMeditationRef.current && gestureRef.current !== "Meditation") {
            // Trigger speech for meditation start
            gestureRef.current = "Meditation";
            setGesture("Meditation");
            const msg = "Deep meditation detected. Your energy is rising rapidly.";

            if (msg !== lastSpeechTextRef.current || now - lastSpeechTimeRef.current > 10000) {
                setFeedback(msg);
                speak(msg);
                lastSpeechTextRef.current = msg;
                lastSpeechTimeRef.current = now;
            }
        }

        // 3. Logic: Aura & Energy
        const isYogaMode = !!currentGesture || isMeditationRef.current;

        // Aura Dynamics
        if (isYogaMode) {
            auraIntensityRef.current = Math.min(1.0, auraIntensityRef.current + 0.08); // Faster Rise
        } else {
            auraIntensityRef.current = Math.max(0.0, auraIntensityRef.current - 0.08); // Faster Fade
        }

        // Energy Dynamics
        const energies = energiesRef.current;
        let allBalanced = true;

        if (isMeditationRef.current) {
            // SUPER FAST Rise for ALL chakras (Peaking to 100)
            for (let i = 0; i < 7; i++) {
                energies[i] = Math.min(1.0, energies[i] + 0.02); // ~2% per frame (very fast)
                if (energies[i] < 1.0) allBalanced = false;
            }
        } else if (currentGesture) {
            // If ANY gesture is active, slowly rise ALL energies (so boxes aren't empty)
            for (let i = 0; i < 7; i++) {
                energies[i] = Math.min(1.0, energies[i] + 0.001); // Slow base rise
            }

            if (currentGesture === "Gyan Mudra") {
                // Specific Rise (Faster)
                energies[0] = Math.min(1.0, energies[0] + 0.005); // Root
                energies[6] = Math.min(1.0, energies[6] + 0.005); // Crown
            }
            // Add other mudras here if needed

            allBalanced = false;
        } else if (!isYogaMode) {
            // FAST DECAY when inactive
            for (let i = 0; i < 7; i++) {
                energies[i] = Math.max(0.0, energies[i] - 0.01); // Fast decay
            }
            allBalanced = false;
        } else {
            allBalanced = false;
        }

        // Check for Full Balance Event
        if (allBalanced && gestureRef.current !== "Balanced") {
            gestureRef.current = "Balanced";
            const msg = "All Chakras are perfectly balanced. You are in harmony.";
            setFeedback(msg);
            speak(msg);
        }

        // Sync UI occasionally (every 10 frames)
        if (Math.floor(t * 30) % 10 === 0) {
            setUiEnergies([...energies]);
        }

        // 4. Draw Visuals

        // BACKGROUND SUN AURA (Instead of revolving stars on head)
        if (auraIntensityRef.current > 0.01) {
            ctx.save();
            const cx = width / 2;
            const cy = height / 2;
            const maxRadius = Math.max(width, height) * 0.8;
            const gradient = ctx.createRadialGradient(cx, cy, 100, cx, cy, maxRadius);
            gradient.addColorStop(0, `rgba(255, 215, 0, ${auraIntensityRef.current * 0.3})`); // Gold center
            gradient.addColorStop(0.5, `rgba(255, 140, 0, ${auraIntensityRef.current * 0.1})`); // Orange mid
            gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        // Speed factor depends on yoga mode
        const speedFactor = isYogaMode ? 2.0 : 0.5;

        drawUniverse(ctx, width, height, t, speedFactor);
        const breathFactor = 1.0 + 0.1 * Math.sin(t * 0.8);

        drawChakras(
            ctx,
            width * 0.5,
            height * 0.2,
            height * 0.8,
            activeIndexRef.current,
            energies,
            breathFactor,
            t
        );

        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [handLandmarker, faceLandmarker]);

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col">
            {isLoading && (
                <div className="absolute z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-2xl font-light animate-pulse">
                    Loading AI Models...
                </div>
            )}

            {!isPlaying && (
                <div className="absolute z-50 top-0 left-0 w-full h-full bg-black/80 flex items-center justify-center">
                    <button
                        onClick={toggleAudio}
                        className="px-8 py-4 bg-green-600 text-white text-xl rounded-full hover:bg-green-500 transition-all shadow-[0_0_30px_rgba(0,255,0,0.5)]"
                    >
                        Start Yoga Experience 🕉️
                    </button>
                </div>
            )}

            <TopBar />

            <div className="relative flex-1 w-full h-full overflow-hidden">
                <video
                    ref={videoRef}
                    className="absolute opacity-0 pointer-events-none"
                    playsInline
                    muted
                />

                <canvas
                    ref={canvasRef}
                    className="w-full h-full object-cover"
                />

                <LeftSidebar energies={uiEnergies} />
                <RightSidebar activeGesture={gesture} />
                <BottomOverlay feedback={feedback} />

                {/* Debug Log (Hidden or Subtle) */}
                <div className="absolute bottom-16 left-4 text-[10px] text-green-400/50 font-mono pointer-events-none">
                    {logs.slice(-2).map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                </div>

                {/* DEV DEBUG OVERLAY - MOVED TO TOP CENTER */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs text-yellow-500 font-mono bg-black/50 p-2 rounded pointer-events-none text-center z-50">
                    <div>Meditation: {isMeditationRef.current ? "ON" : "OFF"}</div>
                    <div>Eyes Closed: {eyesClosedTimeRef.current > 0 ? "YES" : "NO"}</div>
                    <div>Energy: {(energiesRef.current[0] * 100).toFixed(0)}%</div>
                </div>
            </div>
        </div>
    );
}
