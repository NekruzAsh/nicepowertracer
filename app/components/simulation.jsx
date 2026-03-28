"use client";

import { useState, useCallback, useRef } from "react";
import {
  COMPONENT_SPECS,
  calculateAmps,
  validateVoltageMatch,
  getComponentColor,
  getComponentIcon,
  getComponentLabel,
} from "../utils/powerCalculations";

export default function Simulation({ onLogsUpdate }) {
  const [components, setComponents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDrawingWire, setIsDrawingWire] = useState(false);
  const [wireStart, setWireStart] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [safetyIssues, setSafetyIssues] = useState({});
  const canvasRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData("componentType");
    if (!type) return; // Ignore if no component type

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate position accounting for scroll and viewport offset
    const x = e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0);
    const y = e.clientY - rect.top + (canvasRef.current?.scrollTop || 0);

    const newComponent = {
      id: `${type}-${Date.now()}`,
      type,
      x,
      y,
      isSafe: true,
    };

    setComponents((prev) => [...prev, newComponent]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const deleteComponent = (id) => {
    setComponents(components.filter((c) => c.id !== id));
    setConnections(
      connections.filter((conn) => conn.from !== id && conn.to !== id),
    );
  };

  const startWire = (e, fromId) => {
    e.stopPropagation();
    setIsDrawingWire(true);
    setWireStart(fromId);
  };

  const handleMouseMove = (e) => {
    if (!isDrawingWire || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const finishWire = (e, toId) => {
    e.stopPropagation();
    if (!isDrawingWire || !wireStart || wireStart === toId) {
      setIsDrawingWire(false);
      setWireStart(null);
      return;
    }

    // Check if connection already exists
    const exists = connections.some(
      (c) =>
        (c.from === wireStart && c.to === toId) ||
        (c.from === toId && c.to === wireStart),
    );

    if (!exists) {
      setConnections([
        ...connections,
        { from: wireStart, to: toId, id: `${wireStart}-${toId}` },
      ]);
    }

    setIsDrawingWire(false);
    setWireStart(null);
  };

  const validateCircuit = () => {
    const issues = {};

    // Check for voltage mismatches
    connections.forEach((conn) => {
      const sourceComp = components.find((c) => c.id === conn.from);
      const targetComp = components.find((c) => c.id === conn.to);

      if (sourceComp && targetComp) {
        const sourceSpec = COMPONENT_SPECS[sourceComp.type];
        const targetSpec = COMPONENT_SPECS[targetComp.type];

        // Check if it's a device being connected to an outlet
        if (
          (targetComp.type === "tv" ||
            targetComp.type === "xbox" ||
            targetComp.type === "lamp" ||
            targetComp.type === "heater") &&
          (sourceComp.type === "outlet120" || sourceComp.type === "outlet240")
        ) {
          if (sourceSpec.voltage !== targetSpec.voltage) {
            issues[targetComp.id] =
              `Voltage mismatch! Needs ${targetSpec.voltage}V, outlet provides ${sourceSpec.voltage}V`;
          }
        }
      }
    });

    setSafetyIssues(issues);
    return Object.keys(issues).length === 0;
  };

  const handleRunSimulation = () => {
    if (!validateCircuit()) {
      onLogsUpdate?.([
        {
          type: "error",
          message: "Circuit has voltage mismatches. Fix them before running.",
        },
      ]);
      return;
    }

    setIsRunning(true);
    const logs = [];

    logs.push({ type: "info", message: "🚀 Simulation started..." });
    logs.push({
      type: "info",
      message: `📊 Total components: ${components.length}`,
    });
    logs.push({
      type: "info",
      message: `🔗 Total connections: ${connections.length}`,
    });

    // Calculate total load
    let totalWatts = 0;
    let totalAmps = 0;

    components.forEach((comp) => {
      const spec = COMPONENT_SPECS[comp.type];
      if (spec.power) {
        totalWatts += spec.power;
        totalAmps += calculateAmps(spec.power, spec.voltage || 120);
        logs.push({
          type: "info",
          message: `  • ${getComponentLabel(comp.type)}: ${spec.power}W`,
        });
      }
    });

    logs.push({ type: "info", message: `⚡ Total load: ${totalWatts}W` });
    logs.push({
      type: "info",
      message: `🔌 Total amps: ${totalAmps.toFixed(2)}A`,
    });

    // Check breaker threshold
    const breakers = components.filter((c) => c.type === "breaker");
    if (breakers.length > 0) {
      const breaker = breakers[0];
      const breaker15A = calculateAmps(totalWatts, 120) > 15;
      const breaker20A = calculateAmps(totalWatts, 120) > 20;

      if (breaker15A) {
        logs.push({ type: "warning", message: "⚠️  Breaker 15A would trip!" });
      } else {
        logs.push({ type: "success", message: "✅ Breaker OK (under 15A)" });
      }
    } else if (totalAmps > 0) {
      logs.push({ type: "warning", message: "⚠️  No breaker in circuit!" });
    } else {
      logs.push({ type: "info", message: "ℹ️  No load components connected" });
    }

    if (Object.keys(safetyIssues).length === 0) {
      logs.push({
        type: "success",
        message: "✅ All voltage connections are safe!",
      });
    }

    logs.push({ type: "success", message: "✓ Simulation complete" });

    onLogsUpdate?.(logs);
    setIsRunning(false);
  };

  return (
    <div
      ref={canvasRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onMouseMove={handleMouseMove}
      className="flex-1 min-h-0 bg-gradient-to-b from-gray-800 to-gray-900 relative overflow-auto border border-gray-700"
    >
      {/* Control Bar */}
      <div className="absolute top-4 left-4 right-4 bg-gray-900 border border-gray-700 rounded p-3 z-20 flex gap-3 items-center">
        <button
          onClick={handleRunSimulation}
          disabled={isRunning}
          className={`px-4 py-2 rounded font-semibold transition-colors ${
            isRunning
              ? "bg-yellow-600 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {isRunning ? "Running..." : "Run Simulation"}
        </button>
        <div className="text-sm text-gray-300">
          Components: <span className="font-bold">{components.length}</span>
        </div>
        <div className="text-sm text-gray-300">
          Connections: <span className="font-bold">{connections.length}</span>
        </div>
        <div className="ml-auto text-xs text-gray-400">
          Drag components to place • Click ports to wire
        </div>
      </div>

      {/* SVG for wires */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1, width: "100%", height: "100%" }}
      >
        {/* Existing connections */}
        {connections.map((conn) => {
          const from = components.find((c) => c.id === conn.from);
          const to = components.find((c) => c.id === conn.to);
          if (!from || !to) return null;

          const fromX = from.x + 45;
          const fromY = from.y + 45;
          const toX = to.x + 15;
          const toY = to.y + 45;

          return (
            <line
              key={conn.id}
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke="#facc15"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          );
        })}

        {/* Current wire being drawn */}
        {isDrawingWire && wireStart && (
          <line
            x1={(components.find((c) => c.id === wireStart)?.x || 0) + 45}
            y1={(components.find((c) => c.id === wireStart)?.y || 0) + 45}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="#22c55e"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Components */}
      {components.map((comp) => {
        const spec = COMPONENT_SPECS[comp.type];
        const hasError = safetyIssues[comp.id];

        return (
          <div
            key={comp.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("componentId", comp.id);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.stopPropagation();
              // Update position
              const rect = canvasRef.current.getBoundingClientRect();
              const newX = e.clientX - rect.left;
              const newY = e.clientY - rect.top;
              setComponents(
                components.map((c) =>
                  c.id === comp.id ? { ...c, x: newX, y: newY } : c,
                ),
              );
            }}
            className={`absolute w-32 rounded transition-all cursor-move group ${
              hasError
                ? "bg-red-900 border-2 border-red-500 shadow-lg shadow-red-500"
                : "bg-gray-800 border-2 border-gray-700 hover:border-gray-500"
            }`}
            style={{
              left: `${comp.x}px`,
              top: `${comp.y}px`,
              zIndex: 2,
            }}
          >
            {/* Header */}
            <div
              className="p-3 font-semibold text-white text-sm flex items-center gap-2"
              style={{
                backgroundColor: spec.color + "40",
                borderBottom: `1px solid ${spec.color}`,
              }}
            >
              <span className="text-lg">{getComponentIcon(comp.type)}</span>
              <span>{getComponentLabel(comp.type).substring(0, 12)}</span>
            </div>

            {/* Body */}
            <div className="p-2 text-xs text-gray-200 space-y-1">
              {spec.voltage && <div>⚡ {spec.voltage}V</div>}
              {spec.power && <div>💡 {spec.power}W</div>}
              {spec.ampRating && (
                <div className="text-yellow-300">🔌 {spec.ampRating}A</div>
              )}
            </div>

            {/* Error message */}
            {hasError && (
              <div className="px-2 pb-2 text-xs text-red-200 bg-red-950 rounded">
                ⚠️ {hasError}
              </div>
            )}

            {/* Ports */}
            <div className="flex justify-between px-2 py-2">
              <button
                onClick={(e) => finishWire(e, comp.id)}
                onMouseDown={(e) => startWire(e, comp.id)}
                className="w-3 h-3 bg-blue-400 rounded-full hover:bg-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Input port"
              />
              <button
                onClick={(e) => deleteComponent(comp.id)}
                className="text-red-400 hover:text-red-200 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2"
                title="Delete component"
              >
                ✕
              </button>
              <button
                onMouseDown={(e) => startWire(e, comp.id)}
                className="w-3 h-3 bg-yellow-400 rounded-full hover:bg-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Output port"
              />
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {components.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">📦</div>
            <div className="text-lg">Drag components from the left panel</div>
            <div className="text-sm mt-2">to build your circuit</div>
          </div>
        </div>
      )}
    </div>
  );
}
