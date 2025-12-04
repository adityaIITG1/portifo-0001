import React from "react";

interface LeftSidebarProps {
    energies: number[];
}

const CHAKRAS = [
    { name: "Root", color: "#FF0000", label: "Muladhara" },
    { name: "Sacral", color: "#FF8C00", label: "Svadhishthana" },
    { name: "Solar", color: "#FFFF00", label: "Manipura" },
    { name: "Heart", color: "#00FF00", label: "Anahata" },
    { name: "Throat", color: "#0000FF", label: "Vishuddha" },
    { name: "Third", color: "#4B0082", label: "Ajna" },
    { name: "Crown", color: "#8B00FF", label: "Sahasrara" },
];

export default function LeftSidebar({ energies }: LeftSidebarProps) {
    return (
        <div className="absolute top-20 bottom-20 left-8 w-[180px] flex flex-col justify-between gap-6 pointer-events-none z-20">
            {CHAKRAS.map((c, i) => {
                const energy = energies[i] ?? 0.0;
                const height = Math.max(10, energy * 100); // Min height 10%
                const isActive = energy > 0.1;

                return (
                    <div key={c.name} className="flex-1 flex flex-row items-center gap-5 group">
                        {/* Energy Bar Container */}
                        <div className="h-full w-10 bg-gray-900/80 rounded-full relative overflow-hidden backdrop-blur-xl border border-white/10 shadow-[inset_0_0_15px_rgba(0,0,0,0.9)] transition-all duration-300 group-hover:w-11 group-hover:border-white/40 group-hover:shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]">
                            {/* Glowing Fill */}
                            <div
                                className="absolute bottom-0 w-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                    height: `${height}%`,
                                    background: `linear-gradient(to top, ${c.color}, white)`,
                                    boxShadow: isActive ? `0 0 25px ${c.color}, 0 0 50px ${c.color}` : 'none',
                                    opacity: isActive ? 1 : 0.5
                                }}
                            />

                            {/* Shine Effect */}
                            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>

                            {/* Glass Reflection Line */}
                            <div className="absolute top-0 left-2 w-1 h-full bg-white/10 blur-[1px]"></div>
                        </div>

                        {/* Label */}
                        <div className="flex flex-col justify-center">
                            <span
                                className="text-sm font-bold uppercase tracking-widest transition-all duration-300 drop-shadow-md"
                                style={{
                                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)',
                                    textShadow: isActive ? `0 0 15px ${c.color}` : 'none',
                                    transform: isActive ? 'scale(1.1) translateX(5px)' : 'scale(1.0)'
                                }}
                            >
                                {c.name}
                            </span>
                            <span className="text-[10px] text-white/60 font-light tracking-wide group-hover:text-white/90 transition-colors">
                                {c.label}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="h-1.5 w-1.5 rounded-full animate-pulse shadow-[0_0_5px_currentColor]" style={{ backgroundColor: isActive ? c.color : '#333', color: c.color }}></div>
                                <span className="text-xs font-mono font-bold" style={{ color: isActive ? c.color : '#666' }}>
                                    {Math.round(energy * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
