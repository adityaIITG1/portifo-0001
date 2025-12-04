import React, { useEffect, useRef } from 'react';

interface BioAnalyticsPanelProps {
    heartRate: number;
    spo2: number;
    beatDetected: boolean;
    energyLevel: number;
    stressLevel: number;
    focusScore: number;
    isConnected: boolean;
    hrvIndex: number;
    doshas: { vata: number; pitta: number; kapha: number; };
    insightText: string;
    finding: string;
}

export default function BioAnalyticsPanel({
    heartRate,
    spo2,
    beatDetected,
    energyLevel,
    stressLevel,
    focusScore,
    isConnected,
    hrvIndex,
    doshas,
    insightText,
    finding
}: BioAnalyticsPanelProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Data Refs (for performance)
    const heartRateRef = useRef(heartRate);
    const spo2Ref = useRef(spo2);
    const beatDetectedRef = useRef(beatDetected);
    const energyLevelRef = useRef(energyLevel);
    const stressLevelRef = useRef(stressLevel);
    const focusScoreRef = useRef(focusScore);
    const hrvIndexRef = useRef(hrvIndex);
    const doshasRef = useRef(doshas);
    const insightTextRef = useRef(insightText);
    const findingRef = useRef(finding);

    // Update refs when props change
    useEffect(() => {
        heartRateRef.current = heartRate;
        spo2Ref.current = spo2;
        beatDetectedRef.current = beatDetected;
        energyLevelRef.current = energyLevel;
        stressLevelRef.current = stressLevel;
        focusScoreRef.current = focusScore;
        hrvIndexRef.current = hrvIndex;
        doshasRef.current = doshas;
        insightTextRef.current = insightText;
        findingRef.current = finding;
    }, [heartRate, spo2, beatDetected, energyLevel, stressLevel, focusScore, hrvIndex, doshas, insightText, finding]);

    // Animation Refs
    const pulseDataRef = useRef<number[]>(new Array(100).fill(0));
    const hrvDataRef = useRef<number[]>(new Array(50).fill(0));
    const pranaDataRef = useRef<number[]>(new Array(100).fill(0));
    const focusDataRef = useRef<number[]>(new Array(100).fill(0.5));
    const hrvIndexDataRef = useRef<number[]>(new Array(100).fill(0.5));

    // Dosha History Refs
    const vataHistoryRef = useRef<number[]>([]);
    const pittaHistoryRef = useRef<number[]>([]);
    const kaphaHistoryRef = useRef<number[]>([]);

    const phaseRef = useRef(0);
    const animationFrameRef = useRef<number>(0);

    // Bot Animation Refs
    const botBlinkTimerRef = useRef(0);
    const botLookCycleRef = useRef(0);
    const typingCharCountRef = useRef(0);
    const lastInsightTextRef = useRef("");

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const animate = () => {
            phaseRef.current += 0.1;
            const w = canvas.width;
            const h = canvas.height;

            // Clear
            ctx.clearRect(0, 0, w, h);

            // --- UPDATE DATA ---

            // 1. Pulse (ECG)
            if (beatDetectedRef.current) {
                pulseDataRef.current.push(-0.5, 1.0, -0.2); // Beat spike
            } else {
                pulseDataRef.current.push(Math.random() * 0.05 - 0.025); // Noise
            }
            while (pulseDataRef.current.length > 100) pulseDataRef.current.shift();

            // 2. HRV (Stress Bars)
            const stressNoise = Math.random() * stressLevelRef.current;
            hrvDataRef.current.push(stressNoise);
            while (hrvDataRef.current.length > 50) hrvDataRef.current.shift();

            // 3. Prana (Energy Wave)
            const breath = Math.sin(phaseRef.current * 0.2) * 0.1;
            pranaDataRef.current.push(energyLevelRef.current + breath);
            while (pranaDataRef.current.length > 100) pranaDataRef.current.shift();

            // 4. Focus (Beam)
            const wobble = (1.0 - focusScoreRef.current) * 0.2;
            const focusVal = 0.5 + Math.sin(phaseRef.current * 0.5) * wobble + (Math.random() - 0.5) * wobble;
            focusDataRef.current.push(focusVal);
            while (focusDataRef.current.length > 100) focusDataRef.current.shift();

            // 5. HRV Index
            hrvIndexDataRef.current.push(Math.min(1, Math.max(0, (hrvIndexRef.current - 20) / 80)));
            while (hrvIndexDataRef.current.length > 100) hrvIndexDataRef.current.shift();

            // 6. Dosha History
            if (doshasRef.current) {
                vataHistoryRef.current.push(doshasRef.current.vata);
                pittaHistoryRef.current.push(doshasRef.current.pitta);
                kaphaHistoryRef.current.push(doshasRef.current.kapha);
                if (vataHistoryRef.current.length > 20) vataHistoryRef.current.shift();
                if (pittaHistoryRef.current.length > 20) pittaHistoryRef.current.shift();
                if (kaphaHistoryRef.current.length > 20) kaphaHistoryRef.current.shift();
            }

            // --- DRAWING ---

            // Helper to draw graph in a box
            const drawGraph = (
                label: string,
                data: number[],
                x: number, y: number, width: number, height: number,
                color: string,
                style: 'line' | 'bars' | 'fill' | 'beam' | 'area'
            ) => {
                // Background
                ctx.fillStyle = 'rgba(10, 15, 20, 0.9)';
                ctx.fillRect(x, y, width, height);
                ctx.strokeStyle = 'rgba(50, 50, 50, 1)';
                ctx.strokeRect(x, y, width, height);

                // Label
                ctx.fillStyle = 'rgba(200, 200, 200, 1)';
                ctx.font = '12px sans-serif';
                ctx.fillText(label, x + 5, y + 15);

                if (style === 'bars') {
                    const barW = Math.max(1, width / data.length);
                    data.forEach((val, i) => {
                        const barH = val * height * 0.8;
                        const bx = x + i * barW;
                        const by = y + height - barH;

                        let c = color;
                        if (val > 0.6) c = '#ff0000';
                        else if (val > 0.3) c = '#ffff00';

                        ctx.fillStyle = c;
                        ctx.fillRect(bx, by, barW - 1, barH);
                    });
                } else {
                    ctx.beginPath();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;

                    data.forEach((val, i) => {
                        const px = x + (i / data.length) * width;
                        let py = y + height / 2;

                        if (style === 'line') { // ECG
                            py = y + height / 2 - (val * height * 0.4);
                        } else if (style === 'fill' || style === 'area') {
                            py = y + height - (val * height * 0.9);
                        } else if (style === 'beam') {
                            py = y + height - (val * height);
                        }

                        // Clamp
                        py = Math.max(y, Math.min(y + height, py));

                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    });
                    ctx.stroke();

                    if (style === 'fill' || style === 'area') {
                        ctx.lineTo(x + width, y + height);
                        ctx.lineTo(x, y + height);
                        ctx.fillStyle = color.replace('1)', '0.3)').replace('rgb', 'rgba');
                        ctx.fill();

                        // White line on top
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }

                    if (style === 'beam') {
                        // Outer glow
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = color;
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                        // White core
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            };

            const graphH = 40; // Reduced height
            const gap = 8; // Reduced gap
            const startY = 100; // Moved up
            const panelW = 300; // Reduced width
            const graphW = panelW - 30;
            const graphX = 15;

            drawGraph("HEART RHYTHM", pulseDataRef.current, graphX, startY, graphW, graphH, 'rgb(0, 0, 255)', 'line');

            const stressStatus = hrvDataRef.current[hrvDataRef.current.length - 1] < 0.3 ? "Relaxed" : "High";
            drawGraph(`Stress: ${stressStatus}`, hrvDataRef.current, graphX, startY + graphH + gap, graphW, graphH, 'rgb(255, 0, 255)', 'bars');

            const pranaStatus = energyLevelRef.current > 0.6 ? "High" : "Building";
            drawGraph(`Prana: ${pranaStatus}`, pranaDataRef.current, graphX, startY + (graphH + gap) * 2, graphW, graphH, 'rgb(0, 215, 255)', 'fill');

            const focusStatus = focusScoreRef.current > 0.6 ? "Sharp" : "Drifting";
            drawGraph(`Focus: ${focusStatus}`, focusDataRef.current, graphX, startY + (graphH + gap) * 3, graphW, graphH, 'rgb(255, 200, 0)', 'beam');

            drawGraph(`HRV Index: ${hrvIndexRef.current} ms`, hrvIndexDataRef.current, graphX, startY + (graphH + gap) * 4, graphW, graphH, 'rgb(200, 255, 200)', 'area');

            // --- NADI PARIKSHA (Tiny Graphs) ---
            const tgY = startY + (graphH + gap) * 5 + 15;
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px sans-serif';
            ctx.fillText("Nadi Pariksha (Doshas):", graphX, tgY);

            const drawTinyBar = (label: string, data: number[], x: number, y: number, color: string) => {
                ctx.fillStyle = color;
                ctx.fillText(label, x, y);
                const barH = 10;
                const barW = 50; // Narrower bars
                const bx = x;
                const by = y + 4;

                // Draw bars
                const bw = barW / Math.max(1, data.length);
                data.forEach((val, i) => {
                    const h = val * barH;
                    ctx.fillRect(bx + i * bw, by + barH - h, bw - 1, h);
                });
            };

            // Spread out tiny graphs
            drawTinyBar("Vata", vataHistoryRef.current, graphX, tgY + 15, 'rgb(255, 200, 100)');
            drawTinyBar("Pitta", pittaHistoryRef.current, graphX + 90, tgY + 15, 'rgb(255, 0, 0)');
            drawTinyBar("Kapha", kaphaHistoryRef.current, graphX + 180, tgY + 15, 'rgb(0, 255, 0)');

            ctx.fillStyle = 'rgba(200, 255, 255, 1)';
            ctx.fillText(findingRef.current, graphX, tgY + 45);

            // --- ENERGY COHERENCE RADAR ---
            const guideY = tgY + 55;
            const coherenceY = guideY + 50;
            const coherenceX = panelW / 2;
            const radius = 15 + energyLevelRef.current * 25; // Smaller radius

            // Radar Background
            ctx.strokeStyle = '#333';
            ctx.beginPath(); ctx.arc(coherenceX, coherenceY, 40, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(coherenceX - 40, coherenceY); ctx.lineTo(coherenceX + 40, coherenceY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(coherenceX, coherenceY - 40); ctx.lineTo(coherenceX, coherenceY + 40); ctx.stroke();

            // Dynamic Blob
            ctx.beginPath();
            for (let i = 0; i < 36; i++) {
                const angle = (i * 10 * Math.PI) / 180;
                const pulse = 1.0 + 0.05 * Math.sin(phaseRef.current * 4 + i * 0.5);
                const r = radius * pulse;
                const px = coherenceX + r * Math.cos(angle);
                const py = coherenceY + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();

            let cohColor = 'rgba(0, 215, 255, 0.5)'; // Gold
            if (energyLevelRef.current < 0.3) cohColor = 'rgba(0, 0, 255, 0.5)';
            else if (energyLevelRef.current > 0.7) cohColor = 'rgba(255, 0, 255, 0.5)';

            ctx.fillStyle = cohColor;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            ctx.fillStyle = '#cccccc';
            ctx.fillText(`Energy Coherence: ${Math.round(energyLevelRef.current * 100)}%`, coherenceX - 50, coherenceY + 55);

            // --- DATA ANALYSIS BOT ---
            const botY = coherenceY + radius + 40;
            const botX = 50; // Fixed left position

            // Update Bot State
            const t = Date.now() / 1000;
            botBlinkTimerRef.current = t % 3.0;
            const isBlink = botBlinkTimerRef.current > 2.85;

            botLookCycleRef.current = t % 8.0;
            let eyeDx = 0;
            if (botLookCycleRef.current > 2.0 && botLookCycleRef.current < 3.5) eyeDx = -4;
            else if (botLookCycleRef.current > 5.0 && botLookCycleRef.current < 6.5) eyeDx = 4;

            // Draw Head
            ctx.fillStyle = '#323232';
            ctx.beginPath(); ctx.arc(botX, botY, 20, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Eyes
            if (isBlink) {
                ctx.beginPath(); ctx.moveTo(botX - 10, botY - 3); ctx.lineTo(botX - 3, botY - 3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(botX + 3, botY - 3); ctx.lineTo(botX + 10, botY - 3); ctx.stroke();
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(botX - 6, botY - 3, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(botX + 6, botY - 3, 5, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = '#000000';
                ctx.beginPath(); ctx.arc(botX - 6 + eyeDx, botY - 3, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(botX + 6 + eyeDx, botY - 3, 2, 0, Math.PI * 2); ctx.fill();
            }

            // Smile
            ctx.beginPath();
            ctx.ellipse(botX, botY + 4, 9, 5, 0, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.stroke();

            // Typing Text
            if (insightTextRef.current !== lastInsightTextRef.current) {
                typingCharCountRef.current = 0;
                lastInsightTextRef.current = insightTextRef.current;
            }

            if (typingCharCountRef.current < insightTextRef.current.length) {
                typingCharCountRef.current += 0.5; // Typing speed
            }

            const currentText = insightTextRef.current.substring(0, Math.floor(typingCharCountRef.current));

            // Text Bubble
            ctx.font = '12px sans-serif';
            const textMetrics = ctx.measureText(currentText);
            const tw = textMetrics.width;
            const bx = botX - tw / 2; // Center above bot
            const by = botY - 35;

            // Clamp to canvas
            const finalBx = Math.max(10, Math.min(w - tw - 10, bx));

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(finalBx - 5, by - 12, tw + 10, 16);
            ctx.strokeStyle = '#00ffff';
            ctx.strokeRect(finalBx - 5, by - 12, tw + 10, 16);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(currentText, finalBx, by);

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, []); // Empty dependency array for stable loop

    return (
        <div className="relative w-[300px] h-[600px] bg-black/20 backdrop-blur-md border border-[#00d7ff]/30 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,215,255,0.1)] transition-all duration-300">
            {/* Header */}
            <div className="absolute top-3 left-0 w-full text-center">
                <h3 className="text-[#00ffff] font-sans text-xs font-bold tracking-widest opacity-80">BIO-ANALYTICS</h3>
            </div>

            {/* Numeric Stats */}
            <div className="absolute top-10 left-5 flex items-center gap-3">
                {/* Heart Icon */}
                <div className={`text-2xl ${beatDetected ? 'text-red-600 scale-125' : 'text-red-800'} transition-transform duration-100`}>
                    ♥
                </div>
                <div>
                    <div className="text-2xl font-bold text-white font-mono">{heartRate}</div>
                    <div className="text-[10px] text-cyan-200">BPM</div>
                </div>
                <div className="ml-2">
                    <div className="text-lg font-bold text-blue-400 font-mono">O₂: {spo2}%</div>
                </div>
            </div>

            {/* Canvas Layer */}
            <canvas
                ref={canvasRef}
                width={300}
                height={600}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />

            {/* Connection Status */}
            <div className="absolute top-3 right-3">
                <div className={`w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] ${isConnected ? 'bg-green-500 text-green-500 animate-pulse' : 'bg-red-500 text-red-500'}`}></div>
            </div>
        </div>
    );
}
