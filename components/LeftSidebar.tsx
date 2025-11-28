import React from "react";

interface LeftSidebarProps {
    energies: number[];
}

const CHAKRAS = [
    { name: "Root", color: "#FF0000" },
    { name: "Sacral", color: "#FF8C00" },
    { name: "Solar", color: "#FFFF00" },
    { name: "Heart", color: "#00FF00" },
    { name: "Throat", color: "#0000FF" },
    { name: "Third", color: "#4B0082" }, // Indigo
    { name: "Crown", color: "#8B00FF" }, // Violet
];

export default function LeftSidebar({ energies }: LeftSidebarProps) {
    return (
        <div className="absolute top-16 bottom-16 left-0 w-[80px] flex flex-col justify-between gap-2 pl-2 pointer-events-none z-10">
            {CHAKRAS.map((c, i) => {
                const energy = energies[i] ?? 0.0;
                const height = energy * 100; // Percentage height

                return (
                    <div key={c.name} className="flex-1 flex flex-col items-center justify-center min-h-0">
                        <div className="w-4 flex-1 bg-gray-700/50 border border-gray-500 relative rounded-sm overflow-hidden min-h-[40px]">
                            <div
                                className="absolute bottom-0 w-full transition-all duration-500"
                                style={{
                                    height: `${height}%`,
                                    backgroundColor: c.color
                                }}
                            />
                        </div>
                        <span className="text-[10px] text-white/80 font-mono mt-1">{Math.round(energy * 100)}%</span>
                        <span className="text-[8px] text-white/60 uppercase">{c.name}</span>
                    </div>
                );
            })}
        </div>
    );
}
