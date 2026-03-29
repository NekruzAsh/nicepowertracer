"use client";

import { useState, useRef } from "react";
import {
    getSpecByType,
    COMPONENT_CATEGORIES
} from "./componentRegistry";


// ─── Built-in types not stored in the library registry ──────────────────────
const BUILTIN = {
    breaker: { label: "Circuit Breaker", color: "#f59e0b" },
    device: { label: "IoT Device", color: "#3b82f6" },
};

// Registry first, then built-ins
const getSpec = (type) => getSpecByType(type) ?? BUILTIN[type] ?? null;

// ─── Card geometry ───────────────────────────────────────────────────────────
// Wire endpoints are derived from these so SVG lines always meet the port dots.
const CARD_W = 128; // px — matches w-32
const CARD_H = 88;  // px — fixed height for all non-breaker cards
const BKR_HDR_H = 36;  // px — breaker header height
const BKR_ROW_H = 26;  // px — height per circuit row inside a breaker

const breakerCardH = (fuseCount) => BKR_HDR_H + fuseCount * BKR_ROW_H;

// Absolute canvas position of a component's INPUT port centre (left edge)
const inputCenter = (comp) => ({
    x: comp.x,
    y: comp.y + CARD_H / 2,
});

// Absolute canvas position of a component's OUTPUT port centre (right edge)
const outputCenter = (comp, portIndex = 0) => {
    if (comp.type === "breaker") {
        return {
            x: comp.x + CARD_W,
            y: comp.y + BKR_HDR_H + (portIndex + 0.5) * BKR_ROW_H,
        };
    }
    return { x: comp.x + CARD_W, y: comp.y + CARD_H / 2 };
};

// ─── SVG cubic-bezier path ───────────────────────────────────────────────────
const bezier = (x1, y1, x2, y2) => {
    const cx = Math.max(60, Math.abs(x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + cx} ${y1} ${x2 - cx} ${y2} ${x2} ${y2}`;
};

// ─── Power / current helpers ─────────────────────────────────────────────────
const compWatts = (comp) => {
    if (comp.type === "device") return (comp.current ?? 0) * 120;
    if (comp.type === "customDevice") return (comp.voltage ?? 120) * (comp.current ?? 0);
    const s = getSpec(comp.type);
    if (!s) return 0;
    if (typeof s.getPower === "function") return s.getPower();
    return s.power ?? (s.voltage && s.current ? s.voltage * s.current : 0);
};

const compAmps = (comp) => {
    if (comp.type === "device") return comp.current ?? 0;
    if (comp.type === "customDevice") return comp.current ?? 0;
    const s = getSpec(comp.type);
    if (!s) return 0;
    if (typeof s.getCurrent === "function") return s.getCurrent();
    return s.current ?? (s.power && s.voltage ? s.power / s.voltage : 0);
};

const SINK_CATEGORIES = new Set(["Appliances", "Entertainment", "Lighting"]);

const isSinkNode = (comp) => {
    if (comp.type === "customDevice") return true;
    for (const [catName, specs] of Object.entries(COMPONENT_CATEGORIES)) {
        if (SINK_CATEGORIES.has(catName) && specs[comp.type]) return true;
    }
    return false;
};

// ─── Simulation component ────────────────────────────────────────────────────
export default function Simulation({ onLogsUpdate, devices = [] }) {
    const [components, setComponents] = useState([]);
    const [connections, setConnections] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [safetyIssues, setSafetyIssues] = useState({});
    const [fuseRatings, setFuseRatings] = useState(Array(4).fill(15));

    // Wire currently being drawn (pure mouse events, NOT HTML5 drag)
    const [activeWire, setActiveWire] = useState(null);
    // shape: { fromId, portIndex, x1, y1, x2, y2, voltage }

    // Component currently being repositioned (pure mouse events)
    const [dragging, setDragging] = useState(null);
    // shape: { id, offsetX, offsetY }

    // Dialogs
    const [breakerDialog, setBreakerDialog] = useState(null); // { x, y } | null
    const [fuseCount, setFuseCount] = useState(4);
    const [voltageDialog, setVoltageDialog] = useState(null);
    // shape: { fromId, portIndex, x1, y1 } | null

    const [customDeviceDialog, setCustomDeviceDialog] = useState(null); // { x, y } | null
    const [customName, setCustomName] = useState("");
    const [customVoltage, setCustomVoltage] = useState(120);
    const [customCurrent, setCustomCurrent] = useState(1);

    const [hoveredWireId, setHoveredWireId] = useState(null);
    
    const [editingFuse, setEditingFuse] = useState(null);

    const canvasRef = useRef(null);

    const mousePosRef = useRef({ x: 0, y: 0 });



    

    const outputPortCount = (comp) =>
        comp.type === "breaker" ? (comp.fuseCount ?? 1) : 1;

    // ─── Canvas coordinate helper (accounts for scroll offset) ────────────────
    const toCanvas = (e) => {
        const r = canvasRef.current?.getBoundingClientRect();
        if (!r) return { x: 0, y: 0 };
        return {
            x: e.clientX - r.left + (canvasRef.current?.scrollLeft ?? 0),
            y: e.clientY - r.top + (canvasRef.current?.scrollTop ?? 0),
        };
    };

    // ─── Drop from sidebar (HTML5 drag) → place new component ─────────────────
    const handleDrop = (e) => {
        e.preventDefault();
        const { x, y } = toCanvas(e);
        const type = e.dataTransfer.getData("componentType");
        if (!type) return;

        if (type === "breaker") {
            setBreakerDialog({ x , y });
            return;
        }

        if (type === "device") {
            const raw = e.dataTransfer.getData("deviceData");
            const deviceData = raw ? JSON.parse(raw) : null;
            if (!deviceData) return;
            setComponents((prev) => [
                ...prev,
                {
                    id: `device-${deviceData.id}-${Date.now()}`,
                    type: "device",
                    x,
                    y,
                    deviceId: deviceData.id,
                    current: deviceData.current,
                },
            ]);
            return;
        }

        setComponents((prev) => [
            ...prev,
            { id: `${type}-${Date.now()}`, type, x, y },
        ]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    // ─── Canvas mouse events ───────────────────────────────────────────────────
    // Handles both ongoing wire drawing and ongoing component repositioning.
    // Port and card handlers call stopPropagation where needed, so this is
    // only reached when neither is terminating the interaction.

    const handleCanvasMouseMove = (e) => {
        const { x, y } = toCanvas(e);
        mousePosRef.current = { x, y };   // ← ADD this line


        if (activeWire) {
            setActiveWire((prev) => ({ ...prev, x2: x, y2: y }));
        }

        if (dragging) {
            setComponents((prev) =>
                prev.map((c) =>
                    c.id === dragging.id
                        ? { ...c, x: x - dragging.offsetX, y: y - dragging.offsetY }
                        : c,
                ),
            );
        }
    };

    const handleCanvasMouseUp = () => {
        if (activeWire) setActiveWire(null); // released on empty canvas → cancel
        setDragging(null);
    };

    // ─── Card header: start repositioning ─────────────────────────────────────
    const handleCardMouseDown = (e, comp) => {
        if (activeWire) return; // don't interrupt wire drawing
        e.stopPropagation();
        const { x, y } = toCanvas(e);
        setDragging({ id: comp.id, offsetX: x - comp.x, offsetY: y - comp.y });
    };

    // ─── Output port: open voltage chooser, then start wire ───────────────────
    const handleOutputMouseDown = (e, comp, portIndex) => {
        if (isSinkNode(comp)) return; // ← add this line
        e.preventDefault();
        e.stopPropagation();
        const { x: x1, y: y1 } = outputCenter(comp, portIndex);
        setVoltageDialog({ fromId: comp.id, portIndex, x1, y1 });
    };

    const confirmVoltage = (voltage) => {
        if (!voltageDialog) return;
        const { fromId, portIndex, x1, y1 } = voltageDialog;
        const {x: x2, y: y2} = mousePosRef.current;
        setActiveWire({ fromId, portIndex, x1, y1, x2: x1, y2: y1, voltage });
        setVoltageDialog(null);
    };

    // ─── Input port: complete wire ─────────────────────────────────────────────
    const handleInputMouseUp = (e, comp) => {
        e.preventDefault();
        e.stopPropagation();

        if (!activeWire || activeWire.fromId === comp.id) {
            setActiveWire(null);
            return;
        }
        
        const alreadyHasInput = connections.some((c) => c.to === comp.id);
        const duplicate = connections.some(
            (c) => c.from === activeWire.fromId && c.to === comp.id,
        );
        if (!duplicate && !alreadyHasInput) {
            setConnections((prev) => [
                ...prev,
                {
                    id: `${activeWire.fromId}:${activeWire.portIndex}->${comp.id}`,
                    from: activeWire.fromId,
                    fromPort: activeWire.portIndex,
                    to: comp.id,
                    voltage: activeWire.voltage ?? 120,
                },
            ]);
        }
        setActiveWire(null);
    };

    // ─── Delete ────────────────────────────────────────────────────────────────
    const deleteComponent = (id) => {
        setComponents((prev) => prev.filter((c) => c.id !== id));
        setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
        setSafetyIssues((prev) => { const n = { ...prev }; delete n[id]; return n; });
    };

    const deleteWire = (connId) => {
        setConnections((prev) => prev.filter((c) => c.id !== connId));
    };

    const updateFuseRating = (breakerId, portIndex, value) => {
      const clamped = Math.min(200, Math.max(1, Number(value)));
      setComponents((prev) =>
          prev.map((c) => {
              if (c.id !== breakerId) return c;
              const next = [...(c.fuseRatings ?? Array(c.fuseCount).fill(15))];
              next[portIndex] = clamped;
              return { ...c, fuseRatings: next };
          })
      );
  };

    // ─── Breaker dialog confirm ────────────────────────────────────────────────
    const confirmBreaker = () => {
        if (!breakerDialog) return;
        setComponents((prev) => [
            ...prev,
            {
                id: `breaker-${Date.now()}`,
                type: "breaker",
                x: breakerDialog.x + 450,
                y: breakerDialog.y + 200,
                fuseCount: fuseCount,
                fuseRatings: Array.from({ length: fuseCount }, (_, i) => fuseRatings[i] ?? 15),
            },
        ]);
        setBreakerDialog(null);
        setFuseCount(4);
        setFuseRatings(15); // ← reset
    };

    // ─── Custom device dialog confirm ────────────────────────────────────────────────
    const confirmCustomDevice = () => {
        if (!customDeviceDialog) return;
        setComponents((prev) => [
            ...prev,
            {
                id: `custom-${Date.now()}`,
                type: "customDevice",
                x: customDeviceDialog.x,
                y: customDeviceDialog.y,
                customName: customName || "Custom Device",
                voltage: customVoltage,
                current: customCurrent,
            },
        ]);
        setCustomDeviceDialog(null);
        setCustomName("");
        setCustomVoltage(120);
        setCustomCurrent(1);
    };

    // ─── Run simulation ────────────────────────────────────────────────────────
    const runSimulation = () => {
        setIsRunning(true);
        const logs = [];
        const issues = {};

        logs.push({ type: "info", message: "🚀 Simulation started…" });
        logs.push({
            type: "info",
            message: `📊 ${components.length} component${components.length !== 1 ? "s" : ""} · ${connections.length} wire${connections.length !== 1 ? "s" : ""}`,
        });

        let totalW = 0;
        let totalA = 0;

        // Analyse each load (skip breakers — they are sources/pass-through)
        components.forEach((comp) => {
            if (comp.type === "breaker") return;
            const spec = getSpec(comp.type);
            const watts = compWatts(comp);
            const amps = compAmps(comp);
            const label = comp.type === "device"
                ? `Device [${comp.deviceId ?? "?"}]`
                : comp.type === "customDevice"
                ? (comp.customName ?? "Custom Device")
                : (spec?.label ?? comp.type);

            if (watts > 0) {
                logs.push({
                    type: "info",
                    message: `  • ${label}: ${watts.toFixed(0)} W  /  ${amps.toFixed(2)} A`,
                });
                totalW += watts;
                totalA += amps;
            }

            // Voltage mismatch: wire voltage vs device rated voltage
            connections
                .filter((c) => c.to === comp.id)
                .forEach((conn) => {
                    const wireV = conn.voltage ?? 120;
                    const devV = spec?.voltage ?? 120;
                    if (wireV !== devV) {
                        issues[comp.id] =
                            `Voltage mismatch — device needs ${devV} V, wire is ${wireV} V`;
                    }
                });
        });

        // Breaker overload check (15 A per circuit)
        components
        .filter((c) => c.type === "breaker")
        .forEach((breaker) => {
            let bkrTotalA = 0;
            let bkrRatingTotal = 0;

            Array.from({ length: breaker.fuseCount ?? 1 }, (_, portIndex) => {
                const circuitRating = breaker.fuseRatings?.[portIndex] ?? 15;
                bkrRatingTotal += circuitRating;

                const circuitA = connections
                    .filter((c) => c.from === breaker.id && c.fromPort === portIndex)
                    .reduce((sum, conn) => {
                        const tgt = components.find((c) => c.id === conn.to);
                        return sum + (tgt ? compAmps(tgt) : 0);
                    }, 0);

                bkrTotalA += circuitA;

                const isWired = connections.some(
                    (c) => c.from === breaker.id && c.fromPort === portIndex
                );

                if (circuitA > circuitRating) {
                    const msg = `Circuit ${portIndex + 1} overloaded — ${circuitA.toFixed(1)} A exceeds ${circuitRating} A`;
                    issues[`${breaker.id}-c${portIndex}`] = msg;
                    issues[breaker.id] = issues[breaker.id]
                        ? issues[breaker.id] + `; C${portIndex + 1} over`
                        : msg;
                    logs.push({
                        type: "error",
                        message: `  ❌ C${portIndex + 1}: ${circuitA.toFixed(1)} A / ${circuitRating} A — OVERLOADED`,
                    });
                } else if (isWired) {
                    logs.push({
                        type: "success",
                        message: `  ✅ C${portIndex + 1}: ${circuitA.toFixed(1)} A / ${circuitRating} A`,
                    });
                } else {
                    logs.push({
                        type: "info",
                        message: `  ○  C${portIndex + 1}: unused (${circuitRating} A rated)`,
                    });
                }
            });

            logs.push({
                type: issues[breaker.id] ? "error" : "info",
                message: `  ${issues[breaker.id] ? "⚠" : "📋"} Breaker total — ${bkrTotalA.toFixed(1)} A / ${bkrRatingTotal} A capacity`,
            });
        });


        if (Object.keys(issues).length > 0) {
            logs.push({
                type: "error",
                message: `❌ ${Object.keys(issues).length} issue${Object.keys(issues).length !== 1 ? "s" : ""} found`,
            });
        } else {
            logs.push({ type: "success", message: "✅ No issues detected" });
        }

        setSafetyIssues(issues);
        onLogsUpdate?.(logs);
        setIsRunning(false);
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            ref={canvasRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`flex-1 h-screen overflow-auto select-none bg-gray-900 ${activeWire ? "cursor-crosshair" : "cursor-default"
                }`}
            style={{
                backgroundImage: "radial-gradient(circle, #374151 1px, transparent 1px)",
                backgroundSize: "24px 24px",
            }}
        >

            {/* ── Control bar ── */}
            <div className="sticky top-0 z-30 flex items-center gap-2 px-4 py-2 bg-gray-950/95 backdrop-blur border-b border-gray-700">
                <button
                    onClick={runSimulation}
                    disabled={isRunning || components.length === 0}
                    className="px-4 py-1.5 rounded font-semibold text-sm bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors"
                >
                    {isRunning ? "Running…" : "▶ Run Simulation"}
                </button>

                <button
                    onClick={() => setBreakerDialog({ x: 80, y: 80 })}
                    className="px-3 py-1.5 rounded text-sm font-medium bg-amber-700 hover:bg-amber-600 text-white transition-colors"
                    title="Add a circuit breaker panel"
                >
                    + Breaker
                </button>

                <button
                    onClick={() => setCustomDeviceDialog({ x: 200, y: 80 })}
                    className="px-3 py-1.5 rounded text-sm font-medium bg-purple-700 hover:bg-purple-600 text-white transition-colors"
                    title="Add a custom device"
                >
                    + Custom Device
                </button>

                <button
                    onClick={() => {
                        setComponents([]);
                        setConnections([]);
                        setSafetyIssues({});
                        setActiveWire(null);
                        setDragging(null);
                    }}
                    disabled={components.length === 0}
                    className="px-3 py-1.5 rounded text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white transition-colors"
                >
                    Clear
                </button>

                <span className="ml-2 text-xs text-gray-400">
                    {components.length} component{components.length !== 1 ? "s" : ""}
                    &nbsp;·&nbsp;
                    {connections.length} wire{connections.length !== 1 ? "s" : ""}
                </span>

                <span className="ml-auto text-xs text-gray-600 hidden lg:block">
                    Drag from sidebar&nbsp;·&nbsp;
                    🟡 draw wire out&nbsp;·&nbsp;
                    🔵 receive wire&nbsp;·&nbsp;
                    hover wire to delete
                </span>
            </div>

            {/* ── SVG wire layer (below component cards) ── */}
            <svg
                className="absolute top-0 left-0 pointer-events-none"
                style={{ width: "100%", height: "100%", zIndex: 1 }}
            >
                {connections.map((conn) => {
                    const src = components.find((c) => c.id === conn.from);
                    const tgt = components.find((c) => c.id === conn.to);
                    if (!src || !tgt) return null;

                    const { x: x1, y: y1 } = outputCenter(src, conn.fromPort ?? 0);
                    const { x: x2, y: y2 } = inputCenter(tgt);
                    const isHovered = hoveredWireId === conn.id;
                    const wireColor = conn.voltage === 240 ? "#f87171" : "#fbbf24";

                    return (
                        <g key={conn.id} style={{ pointerEvents: "auto" }}>
                            {/* Wide invisible hit area */}
                            <path
                                d={bezier(x1, y1, x2, y2)}
                                stroke="transparent"
                                strokeWidth="14"
                                fill="none"
                                style={{ cursor: "pointer" }}
                                onMouseEnter={() => setHoveredWireId(conn.id)}
                                onMouseLeave={() => setHoveredWireId(null)}
                                onClick={() => deleteWire(conn.id)}
                            />
                            {/* Visible wire */}
                            <path
                                d={bezier(x1, y1, x2, y2)}
                                stroke={wireColor}
                                strokeWidth={isHovered ? 2.5 : 1.5}
                                strokeDasharray="6 4"
                                fill="none"
                                opacity={isHovered ? 1 : 0.6}
                                style={{ pointerEvents: "none" }}
                            />
                            {/* Voltage badge + delete hint on hover */}
                            {isHovered && (
                                <>
                                    <rect
                                        x={(x1 + x2) / 2 - 16}
                                        y={(y1 + y2) / 2 - 20}
                                        width="32"
                                        height="15"
                                        rx="3"
                                        fill="#111827"
                                        style={{ pointerEvents: "none" }}
                                    />
                                    <text
                                        x={(x1 + x2) / 2}
                                        y={(y1 + y2) / 2 - 9}
                                        fill={wireColor}
                                        fontSize="10"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                        style={{ pointerEvents: "none" }}
                                    >
                                        {conn.voltage ?? 120} V
                                    </text>
                                    <text
                                        x={(x1 + x2) / 2}
                                        y={(y1 + y2) / 2 + 8}
                                        fill="#6b7280"
                                        fontSize="9"
                                        textAnchor="middle"
                                        style={{ pointerEvents: "none" }}
                                    >
                                        click to delete
                                    </text>
                                </>
                            )}
                        </g>
                    );
                })}

                {/* Wire being drawn */}
                {activeWire && (
                    <path
                        d={bezier(activeWire.x1, activeWire.y1, activeWire.x2, activeWire.y2)}
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                        fill="none"
                        opacity="0.85"
                        style={{ pointerEvents: "none" }}
                    />
                )}
            </svg>

            {/* ── Component cards ── */}
            {components.map((comp) => {
                const spec = getSpec(comp.type);
                const isDevice = comp.type === "device";
                const isCustomDevice = comp.type === "customDevice";
                const isBreaker = comp.type === "breaker";
                const hasError = !!safetyIssues[comp.id];
                const accent = isDevice || isCustomDevice ? "#8b5cf6" : (spec?.color ?? "#6b7280");
                const label = isDevice
                    ? (comp.deviceId ?? "Device")
                    : isCustomDevice
                    ? (comp.customName ?? "Custom Device")
                    : (spec?.label ?? comp.type);
                const watts = compWatts(comp);
                const amps = compAmps(comp);
                const numOut = outputPortCount(comp);
                const cardH = isBreaker ? breakerCardH(comp.fuseCount ?? 1) : CARD_H;

                return (
                    <div
                        key={comp.id}
                        className="absolute group"
                        style={{
                            left: comp.x,
                            top: comp.y,
                            width: CARD_W,
                            height: cardH,
                            zIndex: dragging?.id === comp.id ? 20 : 2,
                        }}
                    >
                        {/* ── Input port (blue, left edge, mid-height) ── */}
                        {!isBreaker && (
                            <div
                                className={`
                  absolute w-3.5 h-3.5 rounded-full border-2 border-gray-900 z-10
                  transition-transform group-hover:scale-125
                  bg-blue-400 cursor-crosshair hover:bg-blue-300

                `}
                                style={{ left: -7, top: cardH / 2 - 7 }}
                                title="Release wire here"
                                onMouseUp={(e) => handleInputMouseUp(e, comp)}
                            />
                        )}

                        {/* ── Card ── */}
                        <div
                            className={`
                w-full h-full rounded-lg overflow-hidden border
                transition-shadow cursor-move
                ${hasError ? "shadow-lg shadow-red-900/50" : "hover:shadow-lg"}
              `}
                            style={{
                                borderColor: hasError ? "#ef4444" : accent + "55",
                                background: "#111827",
                                boxShadow: hasError
                                    ? "0 0 0 2px #ef4444"
                                    : `0 0 16px ${accent}12`,
                            }}
                            onMouseDown={(e) => handleCardMouseDown(e, comp)}
                        >
                            {/* Header */}
                            <div
                                className="flex items-center gap-1.5 px-2 py-2 flex-shrink-0"
                                style={{
                                    background: accent + "22",
                                    borderBottom: `1px solid ${accent}35`,
                                    height: isBreaker ? BKR_HDR_H : undefined,
                                }}
                            >
                                <span className="text-white text-xs font-semibold truncate flex-1 min-w-0">
                                    {label}
                                </span>
                                <button
                                    className="flex-shrink-0 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
                                    title="Delete"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); deleteComponent(comp.id); }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Body */}
                            {isBreaker ? (
                                <div className="px-2">
                                    {Array.from({ length: comp.fuseCount ?? 1 }, (_, i) => {
                                      const isEditing =
                                          editingFuse?.breakerId === comp.id && editingFuse?.portIndex === i;
                                      const rating = comp.fuseRatings?.[i] ?? 15;
                                      const isLive = connections.some(
                                          (c) => c.from === comp.id && c.fromPort === i
                                      );
                                      return (
                                          <div
                                              key={i}
                                              className="flex items-center gap-1.5 text-xs"
                                              style={{ height: BKR_ROW_H }}
                                          >
                                              <span
                                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                  style={{ background: isLive ? "#f59e0b" : "#374151" }}
                                              />
                                              <span className="text-gray-500 flex-shrink-0">C{i + 1}</span>
                                              {isEditing ? (
                                                  <input
                                                      autoFocus
                                                      type="number"
                                                      min={1}
                                                      max={200}
                                                      defaultValue={rating}
                                                      className="w-12 px-1 py-0 bg-gray-700 border border-amber-500 rounded text-white text-xs focus:outline-none"
                                                      onMouseDown={(e) => e.stopPropagation()}
                                                      onClick={(e) => e.stopPropagation()}
                                                      onBlur={(e) => {
                                                          updateFuseRating(comp.id, i, e.target.value);
                                                          setEditingFuse(null);
                                                      }}
                                                      onKeyDown={(e) => {
                                                          if (e.key === "Enter") {
                                                              updateFuseRating(comp.id, i, e.target.value);
                                                              setEditingFuse(null);
                                                          }
                                                          if (e.key === "Escape") setEditingFuse(null);
                                                          e.stopPropagation();
                                                      }}
                                                  />
                                              ) : (
                                                  <span
                                                      className="text-amber-400 cursor-text hover:text-amber-300 hover:underline decoration-dotted"
                                                      title="Click to edit ampere rating"
                                                      onMouseDown={(e) => e.stopPropagation()}
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          setEditingFuse({ breakerId: comp.id, portIndex: i });
                                                      }}
                                                  >
                                                      {rating} A
                                                  </span>
                                              )}
                                          </div>
                                      );
                                  })}
                                </div>
                            ) : (
                                <div className="px-2 py-1.5 space-y-0.5 text-xs">
                                    {comp.type === "customDevice" ? (
                                        <>
                                            {comp.customName && (
                                                <div className="text-gray-300 font-medium truncate">
                                                    {comp.customName}
                                                </div>
                                            )}
                                            <div className="text-gray-400">
                                                {comp.voltage ?? 120} V · {comp.current ?? 0} A
                                            </div>
                                            {watts > 0 && (
                                                <div className="text-yellow-400 font-medium">
                                                    {watts >= 1000
                                                        ? `${(watts / 1000).toFixed(1)} kW`
                                                        : `${watts.toFixed(0)} W`}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {spec?.voltage && (
                                                <div className="text-gray-400">{spec.voltage} V</div>
                                            )}
                                            {watts > 0 && (
                                                <div className="text-yellow-400 font-medium">
                                                    {watts >= 1000
                                                        ? `${(watts / 1000).toFixed(1)} kW`
                                                        : `${watts.toFixed(0)} W`}
                                                    &nbsp;·&nbsp;{amps.toFixed(1)} A
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {hasError && (
                                        <div className="text-red-400 leading-tight pt-0.5">
                                            ⚠&nbsp;{safetyIssues[comp.id]}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Output port(s) (yellow, right edge) ── */}
                          {!isSinkNode(comp) && Array.from({ length: numOut }, (_, i) => {
                              const absY = outputCenter(comp, i).y;
                              const dotTop = absY - comp.y - 7;

                              return (
                                  <div
                                      key={i}
                                      className={`
                                          absolute w-3.5 h-3.5 rounded-full border-2 border-gray-900 z-10
                                          transition-transform group-hover:scale-125
                                          bg-yellow-400 cursor-crosshair hover:bg-yellow-300
                                      `}
                                      style={{ right: -7, top: dotTop }}
                                      title={`Draw wire from output ${i + 1}`}
                                      onMouseDown={(e) => handleOutputMouseDown(e, comp, i)}
                                  />
                              );
                          })}
                    </div>
                );
            })}

            {/* ── Breaker configuration dialog ── */}
            {breakerDialog && (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60">
                    <div className="bg-gray-800 border border-gray-600 rounded-2xl p-6 w-80 shadow-2xl">
                        <h3 className="text-white font-semibold text-base mb-1">
                            Configure Breaker Panel
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Each circuit is a separate output port.
                        </p>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Number of circuits (1 – 8)
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={8}
                            value={fuseCount}
                            onChange={(e) => {
                              const n = Math.min(8, Math.max(1, Number(e.target.value)));
                              setFuseCount(n);
                              setFuseRatings((prev) =>
                                  Array.from({ length: n }, (_, i) => prev[i] ?? 15)
                              );
                          }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            autoFocus
                        />
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Amps per circuit (1 – 200)
                        </label>
                        <div className="space-y-2 mb-5 max-h-48 overflow-y-auto pr-1">
                          {Array.from({ length: fuseCount }, (_, i) => (
                              <div key={i} className="flex items-center gap-2">
                                  <span className="text-gray-400 text-xs w-16 flex-shrink-0">
                                      Circuit {i + 1}
                                  </span>
                                  <input
                                      type="number"
                                      min={1}
                                      max={200}
                                      value={fuseRatings[i] ?? 15}
                                      onChange={(e) =>
                                          setFuseRatings((prev) => {
                                              const next = [...prev];
                                              next[i] = Math.min(200, Math.max(1, Number(e.target.value)));
                                              return next;
                                          })
                                      }
                                      className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                  <span className="text-gray-500 text-xs">A</span>
                              </div>
                          ))}
                      </div>

                       
                        <div className="flex gap-2">
                            <button
                                onClick={confirmBreaker}
                                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-sm transition-colors"
                            >
                                Add Breaker
                            </button>
                            <button
                                onClick={() => setBreakerDialog(null)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Custom device configuration dialog ── */}
            {customDeviceDialog && (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60">
                    <div className="bg-gray-800 border border-gray-600 rounded-2xl p-6 w-80 shadow-2xl">
                        <h3 className="text-white font-semibold text-base mb-1">
                            Configure Custom Device
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Create a custom electrical device with your own specifications.
                        </p>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Device Name
                        </label>
                        <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder="e.g., My Laptop"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            autoFocus
                        />
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Voltage (V)
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={1000}
                            value={customVoltage}
                            onChange={(e) => setCustomVoltage(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Current (A)
                        </label>
                        <input
                            type="number"
                            min={0.01}
                            max={100}
                            step={0.01}
                            value={customCurrent}
                            onChange={(e) => setCustomCurrent(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={confirmCustomDevice}
                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-sm transition-colors"
                            >
                                Add Device
                            </button>
                            <button
                                onClick={() => setCustomDeviceDialog(null)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Voltage selection dialog ── */}
            {voltageDialog && (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60">
                    <div className="bg-gray-800 border border-gray-600 rounded-2xl p-6 w-72 shadow-2xl">
                        <h3 className="text-white font-semibold text-base mb-1">
                            Wire Voltage
                        </h3>
                        <p className="text-gray-400 text-sm mb-5">
                            Select the supply voltage for this connection.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => confirmVoltage(120)}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors"
                            >
                                120 V
                            </button>
                            <button
                                onClick={() => confirmVoltage(240)}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-colors"
                            >
                                240 V
                            </button>
                            <button
                                onClick={() => setVoltageDialog(null)}
                                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Empty state ── */}
            {components.length === 0 && (
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ top: 48 }}
                >
                    <div className="text-center">
                        <div className="text-5xl mb-3 opacity-20">⚡</div>
                        <div className="text-gray-500 font-medium">
                            Drag components from the sidebar
                        </div>
                        <div className="text-gray-600 text-sm mt-1">
                            or click{" "}
                            <span className="text-amber-500/70">+ Breaker</span> to start
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}