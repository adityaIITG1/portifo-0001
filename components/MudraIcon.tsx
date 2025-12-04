import React from "react";

interface MudraIconProps {
    name: string;
    className?: string;
}

export default function MudraIcon({ name, className = "" }: MudraIconProps) {
    // Scale factor for SVG coordinates
    const s = 20;
    const cx = 50;
    const cy = 50;

    // Base points (Right Hand Open Palm)
    // Coordinates relative to center (cx, cy)
    // y is inverted in SVG compared to OpenCV if we don't flip, but let's just map logic directly
    // In OpenCV: -y is up. In SVG: -y is up relative to origin? No, SVG y increases downwards.
    // So -s*1.5 in OpenCV (up) means y = cy - s*1.5 in SVG.

    const pts: Record<string, [number, number]> = {
        wrist: [0, 1.5],
        thumb_base: [-0.6, 0.8],
        thumb_tip: [-1.2, -0.2],
        index_base: [-0.3, -0.5],
        index_tip: [-0.4, -1.8],
        mid_base: [0, -0.6],
        mid_tip: [0, -2.0],
        ring_base: [0.3, -0.5],
        ring_tip: [0.4, -1.8],
        pinky_base: [0.5, -0.3],
        pinky_tip: [0.7, -1.4],
    };

    // Modify based on Mudra (Logic from main1.py)
    if (name === "Gyan") {
        pts.index_tip = [-0.8, -0.5];
        pts.thumb_tip = [-0.8, -0.5];
    } else if (name === "Prana") {
        pts.ring_tip = [-0.5, 0.2];
        pts.pinky_tip = [-0.5, 0.2];
        pts.thumb_tip = [-0.5, 0.2];
    } else if (name === "Apana") {
        pts.mid_tip = [-0.5, 0.2];
        pts.ring_tip = [-0.5, 0.2];
        pts.thumb_tip = [-0.5, 0.2];
    } else if (name === "Surya") {
        pts.ring_tip = pts.thumb_base;
        pts.thumb_tip = pts.thumb_base;
    } else if (name === "Varun") {
        pts.pinky_tip = [-0.6, 0];
        pts.thumb_tip = [-0.6, 0];
    } else if (name === "Anjali") {
        // Simplified prayer hands (just show vertical fingers together)
        pts.thumb_tip = [-0.2, -0.5];
        pts.index_tip = [0, -1.8];
        pts.mid_tip = [0.1, -1.9];
        pts.ring_tip = [0.2, -1.8];
        pts.pinky_tip = [0.3, -1.6];
    }

    // Convert to absolute SVG coordinates
    const getPt = (pName: string): string => {
        const [dx, dy] = pts[pName];
        // In OpenCV -y is up. In SVG y increases down.
        // So if OpenCV y is -1.5 (up), SVG y should be cy - 1.5*s
        const x = cx + dx * s;
        const y = cy + dy * s;
        return `${x},${y}`;
    };

    // Colors
    const colors = {
        thumb: "#FF0000", // Red
        index: "#00FF00", // Green
        mid: "#00FFFF", // Yellow (Cyan in code but Yellow in comment? Code says (0, 255, 255) which is Yellow in BGR... wait.
        // OpenCV uses BGR. (0, 255, 255) is Yellow.
        // SVG uses RGB. Yellow is #FFFF00.
        // Let's stick to the comment names:
        // Thumb (Red), Index (Green), Middle (Yellow), Ring (Orange), Pinky (Magenta)
        ring: "#FF8C00", // Orange
        pinky: "#FF00FF", // Magenta
        wrist: "#FFFFFF",
    };

    return (
        <svg
            viewBox="0 0 100 100"
            className={`w-12 h-12 ${className}`}
            style={{ overflow: "visible" }}
        >
            {/* Wrist Lines */}
            <line
                x1={getPt("wrist").split(",")[0]}
                y1={getPt("wrist").split(",")[1]}
                x2={getPt("thumb_base").split(",")[0]}
                y2={getPt("thumb_base").split(",")[1]}
                stroke={colors.wrist}
                strokeWidth="2"
            />
            <line
                x1={getPt("wrist").split(",")[0]}
                y1={getPt("wrist").split(",")[1]}
                x2={getPt("index_base").split(",")[0]}
                y2={getPt("index_base").split(",")[1]}
                stroke={colors.wrist}
                strokeWidth="2"
            />
            <line
                x1={getPt("wrist").split(",")[0]}
                y1={getPt("wrist").split(",")[1]}
                x2={getPt("mid_base").split(",")[0]}
                y2={getPt("mid_base").split(",")[1]}
                stroke={colors.wrist}
                strokeWidth="2"
            />
            <line
                x1={getPt("wrist").split(",")[0]}
                y1={getPt("wrist").split(",")[1]}
                x2={getPt("ring_base").split(",")[0]}
                y2={getPt("ring_base").split(",")[1]}
                stroke={colors.wrist}
                strokeWidth="2"
            />
            <line
                x1={getPt("wrist").split(",")[0]}
                y1={getPt("wrist").split(",")[1]}
                x2={getPt("pinky_base").split(",")[0]}
                y2={getPt("pinky_base").split(",")[1]}
                stroke={colors.wrist}
                strokeWidth="2"
            />

            {/* Fingers */}
            {/* Thumb */}
            <line
                x1={getPt("thumb_base").split(",")[0]}
                y1={getPt("thumb_base").split(",")[1]}
                x2={getPt("thumb_tip").split(",")[0]}
                y2={getPt("thumb_tip").split(",")[1]}
                stroke={colors.thumb}
                strokeWidth="2"
            />
            <circle cx={getPt("thumb_tip").split(",")[0]} cy={getPt("thumb_tip").split(",")[1]} r="2" fill={colors.thumb} />

            {/* Index */}
            <line
                x1={getPt("index_base").split(",")[0]}
                y1={getPt("index_base").split(",")[1]}
                x2={getPt("index_tip").split(",")[0]}
                y2={getPt("index_tip").split(",")[1]}
                stroke={colors.index}
                strokeWidth="2"
            />
            <circle cx={getPt("index_tip").split(",")[0]} cy={getPt("index_tip").split(",")[1]} r="2" fill={colors.index} />

            {/* Middle */}
            <line
                x1={getPt("mid_base").split(",")[0]}
                y1={getPt("mid_base").split(",")[1]}
                x2={getPt("mid_tip").split(",")[0]}
                y2={getPt("mid_tip").split(",")[1]}
                stroke="#FFFF00" // Yellow
                strokeWidth="2"
            />
            <circle cx={getPt("mid_tip").split(",")[0]} cy={getPt("mid_tip").split(",")[1]} r="2" fill="#FFFF00" />

            {/* Ring */}
            <line
                x1={getPt("ring_base").split(",")[0]}
                y1={getPt("ring_base").split(",")[1]}
                x2={getPt("ring_tip").split(",")[0]}
                y2={getPt("ring_tip").split(",")[1]}
                stroke={colors.ring}
                strokeWidth="2"
            />
            <circle cx={getPt("ring_tip").split(",")[0]} cy={getPt("ring_tip").split(",")[1]} r="2" fill={colors.ring} />

            {/* Pinky */}
            <line
                x1={getPt("pinky_base").split(",")[0]}
                y1={getPt("pinky_base").split(",")[1]}
                x2={getPt("pinky_tip").split(",")[0]}
                y2={getPt("pinky_tip").split(",")[1]}
                stroke={colors.pinky}
                strokeWidth="2"
            />
            <circle cx={getPt("pinky_tip").split(",")[0]} cy={getPt("pinky_tip").split(",")[1]} r="2" fill={colors.pinky} />
        </svg>
    );
}
