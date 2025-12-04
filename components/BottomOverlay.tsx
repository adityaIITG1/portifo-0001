import React from "react";

interface BottomOverlayProps {
    feedback: string;
    gesture?: string | null;
    logs?: string[];
}

export default function BottomOverlay({ feedback, gesture, logs }: BottomOverlayProps) {
    return (
        <div className="absolute bottom-6 left-0 w-full flex flex-col items-center justify-end gap-2 z-30 pointer-events-none px-4">

            {/* Gesture Notification */}
            {gesture && (
                <div className="animate-bounce-short">
                    <div className="bg-green-500 text-black px-4 py-1.5 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.5)] flex items-center gap-2">
                        <span className="text-lg">🕉️</span>
                        {gesture}
                    </div>
                </div>
            )}

            {/* Main Feedback Pill */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-xl shadow-lg max-w-xl text-center">
                <p className="text-sm font-medium tracking-wide leading-relaxed text-gray-100">
                    {feedback}
                </p>
            </div>

            {/* Logs (Subtle) */}
            {logs && logs.length > 0 && (
                <div className="flex flex-col items-center gap-0.5 opacity-50">
                    {logs.slice(-2).map((log, i) => (
                        <div key={i} className="text-[10px] font-mono text-green-300 bg-black/30 px-2 py-0.5 rounded">
                            {log}
                        </div>
                    ))}
                </div>
            )}

            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
                Press &apos;Q&apos; to Quit Session
            </div>
        </div>
    );
}
