import React from "react";

interface BottomOverlayProps {
    feedback: string;
}

export default function BottomOverlay({ feedback }: BottomOverlayProps) {
    return (
        <div className="absolute bottom-4 left-4 max-w-2xl">
            <div className="bg-black/60 text-white px-4 py-2 rounded-sm mb-1 font-mono text-sm border-l-4 border-white">
                {feedback}
            </div>
            <div className="bg-black/60 text-gray-300 px-2 py-1 text-xs inline-block">
                Press 'q' to quit
            </div>
        </div>
    );
}
