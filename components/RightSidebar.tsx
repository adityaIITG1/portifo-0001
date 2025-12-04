import React from "react";
import MudraIcon from "./MudraIcon";

interface RightSidebarProps {
    activeGesture: string | null;
}

const MUDRAS = [
    { name: "Gyan", desc: "Wisdom & Focus" },
    { name: "Prana", desc: "Vitality & Life" },
    { name: "Apana", desc: "Detox & Grounding" },
    { name: "Surya", desc: "Metabolism & Heat" },
    { name: "Varun", desc: "Hydration & Clarity" },
    { name: "Anjali", desc: "Balance & Prayer" },
];

export default function RightSidebar({ activeGesture }: RightSidebarProps) {
    return (
        <div className="absolute top-4 bottom-32 right-6 w-[250px] flex flex-col gap-2 z-20 pointer-events-none">

            {/* Touch Nose Indicator (Premium & Popping) */}
            <div className="relative group overflow-hidden rounded-xl p-0.5 animate-pulse-slow">
                {/* Animated Gradient Border */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-gradient-x"></div>

                <div className="relative bg-black/40 backdrop-blur-md rounded-[10px] p-2 flex flex-col items-center text-center gap-0.5 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                    <div className="absolute top-0 right-0 p-1">
                        <span className="flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500"></span>
                        </span>
                    </div>

                    <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 font-black text-[10px] uppercase tracking-widest drop-shadow-sm">
                        Touch Nose
                    </h3>
                    <div className="text-[9px] text-white font-bold tracking-wide">
                        To Enable Breathing
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-2 shadow-sm">
                <h2 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Mudra Guide
                </h2>
            </div>

            {/* Mudra List */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0 pr-1 scrollbar-hide pointer-events-auto">
                {MUDRAS.map((m) => {
                    const isActive = activeGesture && activeGesture.includes(m.name);

                    return (
                        <div
                            key={m.name}
                            className={`
                                relative flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-500
                                ${isActive
                                    ? "bg-green-900/60 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.2)] scale-105 z-10 translate-x-[-2px]"
                                    : "bg-black/20 border-white/5 opacity-80 hover:bg-black/40 hover:border-white/20"
                                }
                                backdrop-blur-sm
                            `}
                        >
                            {/* Active Glow Line */}
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-400 rounded-l-lg shadow-[0_0_5px_#4ade80]"></div>
                            )}

                            <div className="flex flex-col pl-1">
                                <span className={`text-sm font-bold tracking-wide ${isActive ? "text-white" : "text-gray-300"}`}>
                                    {m.name}
                                </span>
                                <span className={`text-[10px] uppercase tracking-wider font-medium ${isActive ? "text-green-200" : "text-gray-500"}`}>
                                    {m.desc}
                                </span>
                            </div>

                            <div className={`
                                p-1 rounded-md transition-all duration-300
                                ${isActive ? "bg-green-400/20" : "bg-white/5"}
                            `}>
                                <MudraIcon name={m.name} className={`w-6 h-6 ${isActive ? "text-green-300" : "text-gray-500"}`} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Info Panel (HUD Style) */}
            <div className="bg-black/40 backdrop-blur-md border-t border-green-500/50 rounded-xl p-3 shadow-lg pointer-events-auto">
                <h3 className="text-green-400 font-bold text-[10px] uppercase tracking-widest mb-2 flex justify-between items-center border-b border-white/5 pb-1">
                    AI Coach
                    <span className="text-[8px] bg-green-500/20 border border-green-500/30 px-1.5 py-0.5 rounded text-green-300">ONLINE</span>
                </h3>
                <div className="text-xs text-gray-300 space-y-1.5 font-light">
                    <div className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5 text-[10px]">▶</span>
                        <span>Sit in <span className="text-white font-semibold">Lotus Pose</span></span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5 text-[10px]">▶</span>
                        <span>Form <span className="text-white font-semibold">Mudras</span> clearly</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5 text-[10px]">▶</span>
                        <span>Close eyes for <span className="text-white font-semibold">Meditation</span></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
