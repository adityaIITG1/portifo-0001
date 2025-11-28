import React from "react";
import MudraIcon from "./MudraIcon";

interface RightSidebarProps {
    activeGesture: string | null;
}

const MUDRAS = [
    { name: "Gyan", desc: "Wisdom" },
    { name: "Prana", desc: "Vitality" },
    { name: "Apana", desc: "Detox" },
    { name: "Surya", desc: "Fire/Wt" },
    { name: "Varun", desc: "Water" },
    { name: "Anjali", desc: "Prayer" },
];

export default function RightSidebar({ activeGesture }: RightSidebarProps) {
    return (
        <div className="absolute top-0 right-0 h-full w-[280px] bg-[#3C4650]/85 border-l-2 border-[#64FF64] flex flex-col text-white font-sans z-20">
            <h2 className="text-xl font-bold mt-4 mb-2 ml-5 shrink-0">Mudra Guide</h2>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0">
                {MUDRAS.map((m) => {
                    // Check if active (flexible matching)
                    const isActive = activeGesture && activeGesture.includes(m.name);

                    return (
                        <div
                            key={m.name}
                            className={`relative flex items-center justify-between px-5 py-2 transition-all duration-300 shrink-0 ${isActive ? "bg-[#32C832]/60" : "bg-white/10"
                                }`}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-[#00FF00]" />
                            )}

                            <div>
                                <div className="text-lg font-semibold">{m.name}</div>
                                <div className="text-xs text-gray-300">{m.desc}</div>
                            </div>

                            <MudraIcon name={m.name} className="w-10 h-10" />
                        </div>
                    );
                })}
            </div>

            {/* Info Panel at Bottom */}
            <div className="mt-2 mb-4 mx-2 p-4 bg-[#28323C]/90 border-2 border-green-500 rounded-sm shrink-0">
                <h3 className="text-green-400 font-bold mb-2 text-sm">CHAKRA AI FLOW</h3>
                <div className="text-[10px] text-gray-200 leading-relaxed">
                    <p className="text-green-200">Guide:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Sit in <span className="text-yellow-400">Lotus Pose</span></li>
                        <li>Show <span className="text-yellow-400">Hand Mudras</span></li>
                        <li>Close <span className="text-yellow-400">Eyes</span></li>
                        <li>Focus on <span className="text-yellow-400">Breath</span></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
