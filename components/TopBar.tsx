import React from "react";

export default function TopBar() {
    return (
        <div className="absolute top-0 left-0 w-full h-8 bg-[#282828] flex items-center px-4 text-white font-bold text-sm border-b border-gray-600 z-10">
            <span className="mr-4">AI ChakraFlow</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="mx-2">Session: 0.2 min</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="mx-2">Mood: ...</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="mx-2">Posture: Adjust spine/shoulders</span>
        </div>
    );
}
