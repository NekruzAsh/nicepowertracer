"use client";

import { useState, useRef, useEffect } from "react";
import {
  COMPONENT_SPECS,
  calculateAmps,
  getComponentIcon,
  getComponentLabel,
  Device,
} from "../utils/powerCalculations";

export default function Simulation({ onLogsUpdate, devices = [] }) {
  const [components, setComponents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [draggingWire, setDraggingWire] = useState({
    active: false,
    fromId: null,
    toX: 0,
    toY: 0,
    voltage: null,
  });
  const [safetyIssues, setSafetyIssues] = useState({});
  const [breakerDialog, setBreakerDialog] = useState({
    show: false,
    position: { x: 0, y: 0 },
    type: null,
  });

  const getMaxPorts = (comp, portType) => {
    if (comp.type === "breaker") return comp.fuseCount || 1;
    // Most components: 1 input, 1 output
    return 1;
  };

  const getPortUsage = (comp, portType) => {
    return connections.filter((conn) =>
      portType === "output" ? conn.from === comp.id : conn.to === comp.id,
    ).length;
  };

  const isPortLocked = (comp, portType, index) => {
    const used = getPortUsage(comp, portType);
    const max = getMaxPorts(comp, portType);
    return used >= max;
  };

  const [voltageDialog, setVoltageDialog] = useState({
    show: false,
    fromId: null,
  });
  const [hoveredWireId, setHoveredWireId] = useState(null);
  const [realTimeData, setRealTimeData] = useState({});
  const [wsConnected, setWsConnected] = useState(false);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  const reconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    // The useEffect will automatically reconnect due to the dependency array
    // But we can force a reconnect by updating a state that triggers the effect
    setWsConnected(false);
    setTimeout(() => {
      window.location.reload(); // Simple reconnect - reload the component
    }, 100);
  };

  // Handle dropping NEW components from categories or moving EXISTING components
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0);
    const y = e.clientY - rect.top + (canvasRef.current?.scrollTop || 0);

    // Check if moving existing component
    const componentId = e.dataTransfer.getData("componentId");
    if (componentId) {
      setComponents((prev) =>
        prev.map((c) => (c.id === componentId ? { ...c, x, y } : c)),
      );
      return;
    }

    // Otherwise add new component
    const type = e.dataTransfer.getData("componentType");
    if (!type) return;

    // Special handling for breakers - show fuse count dialog
    if (type === "breaker") {
      setBreakerDialog({
        show: true,
        position: { x, y },
        type,
      });
      return;
    }

    // Special handling for devices
    if (type === "device") {
      const deviceData = JSON.parse(e.dataTransfer.getData("deviceData"));
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
      {
        id: `${type}-${Date.now()}`,
        type,
        x,
        y,
      },
    ]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const createBreaker = (fuseCount) => {
    if (!breakerDialog.show || !breakerDialog.type) return;

    const newComponent = {
      id: `breaker-${Date.now()}`,
      type: breakerDialog.type,
      x: breakerDialog.position.x,
      y: breakerDialog.position.y,
      fuseCount: parseInt(fuseCount),
    };

    setComponents((prev) => [...prev, newComponent]);
    setBreakerDialog({ show: false, position: { x: 0, y: 0 }, type: null });
  };

  const cancelBreakerDialog = () => {
    setBreakerDialog({ show: false, position: { x: 0, y: 0 }, type: null });
  };

  const startWire = (e, fromId) => {
    e.preventDefault();
    e.stopPropagation();

    // Show voltage selection dialog instead of starting wire immediately
    setVoltageDialog({
      show: true,
      fromId,
    });
  };

  const proceedWithWire = (voltage) => {
    if (!voltageDialog.fromId) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggingWire({
      active: true,
      fromId: voltageDialog.fromId,
      toX: 0,
      toY: 0,
      voltage,
    });

    setVoltageDialog({
      show: false,
      fromId: null,
    });
  };

  const cancelVoltageDialog = () => {
    setVoltageDialog({
      show: false,
      fromId: null,
    });
  };

  const handleCanvasMouseMove = (e) => {
    if (!draggingWire.active) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggingWire((prev) => ({
      ...prev,
      toX: e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0),
      toY: e.clientY - rect.top + (canvasRef.current?.scrollTop || 0),
    }));
  };

  const canAddConnection = (comp, portType) => {
    const max = getMaxPorts(comp, portType);
    const used = getPortUsage(comp, portType);
    return used < max;
  };

  const connectWire = (e, toId) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !draggingWire.active ||
      !draggingWire.fromId ||
      draggingWire.fromId === toId
    ) {
      setDraggingWire({
        active: false,
        fromId: null,
        toX: 0,
        toY: 0,
        voltage: null,
      });
      return;
    }

    const source = components.find((c) => c.id === draggingWire.fromId);
    const target = components.find((c) => c.id === toId);
    if (!source || !target) {
      setDraggingWire({
        active: false,
        fromId: null,
        toX: 0,
        toY: 0,
        voltage: null,
      });
      return;
    }

    if (
      !canAddConnection(source, "output") ||
      !canAddConnection(target, "input")
    ) {
      // All ports are full.
      setDraggingWire({
        active: false,
        fromId: null,
        toX: 0,
        toY: 0,
        voltage: null,
      });
      return;
    }

    const exists = connections.some(
      (c) =>
        (c.from === draggingWire.fromId && c.to === toId) ||
        (c.from === toId && c.to === draggingWire.fromId),
    );

    if (!exists) {
      setConnections((prev) => [
        ...prev,
        {
          from: draggingWire.fromId,
          to: toId,
          id: `${draggingWire.fromId}-${toId}`,
          voltage: draggingWire.voltage || 120,
        },
      ]);
    }

    setDraggingWire({
      active: false,
      fromId: null,
      toX: 0,
      toY: 0,
      voltage: null,
    });
  };

  const cancelWire = () => {
    setDraggingWire({
      active: false,
      fromId: null,
      toX: 0,
      toY: 0,
      voltage: null,
    });
  };

  const handleCanvasMouseUp = () => {
    cancelWire();
  };

  const deleteComponent = (id) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
    setConnections((prev) =>
      prev.filter((conn) => conn.from !== id && conn.to !== id),
    );
  };

  const validateCircuit = () => {
    const issues = {};

    // Check breaker connection limits
    components.forEach((comp) => {
      if (comp.type === "breaker" && comp.fuseCount) {
        const breakerConnections = connections.filter(
          (conn) => conn.from === comp.id || conn.to === comp.id,
        );

        if (breakerConnections.length > comp.fuseCount * 2) {
          issues[comp.id] =
            `Breaker overloaded! Max ${comp.fuseCount} fuses (${comp.fuseCount * 2} connections), currently has ${breakerConnections.length}`;
        }
      }
    });

    connections.forEach((conn) => {
      const source = components.find((c) => c.id === conn.from);
      const target = components.find((c) => c.id === conn.to);

      if (source && target) {
        const sourceSpec = COMPONENT_SPECS[source.type];
        const targetSpec = COMPONENT_SPECS[target.type];

        // Check voltage mismatch for devices
        if (
          ["tv", "xbox", "lamp", "heater"].includes(target.type) &&
          ["outlet120", "outlet240"].includes(source.type)
        ) {
          if (sourceSpec.voltage !== targetSpec.voltage) {
            issues[target.id] =
              `Voltage mismatch! Device needs ${targetSpec.voltage}V, got ${sourceSpec.voltage}V`;
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
          message: "❌ Circuit has voltage mismatches!",
        },
      ]);
      return;
    }

    setIsRunning(true);
    const logs = [];

    logs.push({ type: "info", message: "🚀 Simulation started..." });
    logs.push({
      type: "info",
      message: `📊 Components: ${components.length} | Connections: ${connections.length}`,
    });

    let totalWatts = 0;
    let totalAmps = 0;

    components.forEach((comp) => {
      const spec = COMPONENT_SPECS[comp.type];
      let power = spec?.power;
      let amps = spec?.power
        ? calculateAmps(spec.power, spec.voltage || 120)
        : 0;

      if (comp.type === "device") {
        power = comp.current * 120;
        amps = comp.current;
      }

      // Use real-time data if available
      const realTime = realTimeData[comp.id];
      if (realTime && realTime.current) {
        // Calculate power from real-time current: P = I × V
        power = realTime.current * (spec?.voltage || 120);
        amps = realTime.current;
        logs.push({
          type: "info",
          message: `  • ${comp.type === "device" ? `Device ${comp.deviceId}` : getComponentLabel(comp.type)}: ${power.toFixed(1)}W (real-time: ${realTime.current}A)`,
        });
      } else if (power) {
        logs.push({
          type: "info",
          message: `  • ${comp.type === "device" ? `Device ${comp.deviceId}` : getComponentLabel(comp.type)}: ${power.toFixed(1)}W`,
        });
      }

      if (power) {
        totalWatts += power;
        totalAmps += amps;
      }
    });

    logs.push({
      type: "info",
      message: `⚡ Total: ${totalWatts.toFixed(1)}W | ${totalAmps.toFixed(2)}A`,
    });

    const breakers = components.filter((c) => c.type === "breaker");
    if (breakers.length > 0) {
      if (totalAmps > 15) {
        logs.push({
          type: "warning",
          message: "⚠️  Breaker would trip (>15A)!",
        });
      } else {
        logs.push({ type: "success", message: "✅ Breaker OK" });
      }
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
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      className="flex-1 min-h-0 bg-gradient-to-b from-gray-800 to-gray-900 relative overflow-auto border border-gray-700"
    >
      {/* Control Bar */}
      <div className="absolute top-4 left-4 right-4 bg-gray-900 border border-gray-700 rounded p-3 z-20 flex gap-4 items-center">
        <button
          onClick={handleRunSimulation}
          disabled={isRunning}
          className={`px-4 py-2 rounded font-semibold whitespace-nowrap ${
            isRunning
              ? "bg-yellow-600 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {isRunning ? "Running..." : "Run Simulation"}
        </button>
        <div className="text-sm text-gray-300">
          <span className="font-bold">{components.length}</span> components
        </div>
        <div className="text-sm text-gray-300">
          <span className="font-bold">{connections.length}</span> wires
        </div>
        <div className="ml-auto text-xs text-gray-400">
          Drag left sidebar items • Hold yellow dots to connect • Blue dots
          receive
        </div>
      </div>

      {/* Devices Panel */}
      {devices.length > 0 && (
        <div className="absolute top-20 left-4 bg-gray-900 border border-gray-700 rounded p-3 z-20 max-w-xs">
          <h3 className="text-sm font-bold text-white mb-2">
            Connected Devices
          </h3>
          <div className="space-y-1">
            {devices.map((device) => (
              <div
                key={device.id}
                className="text-xs text-gray-300 bg-gray-800 p-2 rounded"
              >
                <div className="font-semibold">{device.id}</div>
                <div>Current: {device.getCurrent()}A</div>
                <div>Power: {device.getPower()}W</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wire SVG */}
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          zIndex: 1,
          width: "100%",
          height: "100%",
        }}
      >
        {/* Existing connections */}
        {connections.map((conn) => {
          const from = components.find((c) => c.id === conn.from);
          const to = components.find((c) => c.id === conn.to);
          if (!from || !to) return null;

          const fromUsed = getPortUsage(from, "output");
          const toUsed = getPortUsage(to, "input");
          const fromMax = getMaxPorts(from, "output");
          const toMax = getMaxPorts(to, "input");
          const locked = fromUsed >= fromMax || toUsed >= toMax;
          const voltage = conn.voltage || 120;

          return (
            <g key={conn.id}>
              {/* Transparent rect for hover detection */}
              <rect
                x={Math.min(from.x + 120, to.x)}
                y={Math.min(from.y + 45, to.y + 45)}
                width={Math.abs(from.x + 120 - to.x) + 1}
                height={Math.abs(from.y + 45 - (to.y + 45)) + 1}
                fill="transparent"
                style={{ pointerEvents: "auto", cursor: "pointer" }}
                onMouseEnter={() => setHoveredWireId(conn.id)}
                onMouseLeave={() => setHoveredWireId(null)}
              />
              <line
                x1={from.x + 120}
                y1={from.y + 45}
                x2={to.x}
                y2={to.y + 45}
                stroke={locked ? "#ef4444" : "#facc15"}
                strokeWidth={locked ? "3" : "2"}
                strokeDasharray={locked ? "" : "4,4"}
              />
              {/* Voltage label - only show on hover */}
              {hoveredWireId === conn.id && (
                <text
                  x={(from.x + 120 + to.x) / 2}
                  y={(from.y + 45 + to.y + 45) / 2 - 8}
                  fill={locked ? "#ef4444" : "#facc15"}
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  pointerEvents="none"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    padding: "2px 4px",
                  }}
                >
                  {voltage}V
                </text>
              )}
            </g>
          );
        })}

        {/* Wire being drawn */}
        {draggingWire.active && draggingWire.fromId && (
          <line
            x1={
              (components.find((c) => c.id === draggingWire.fromId)?.x || 0) +
              120
            }
            y1={
              (components.find((c) => c.id === draggingWire.fromId)?.y || 0) +
              45
            }
            x2={draggingWire.toX}
            y2={draggingWire.toY}
            stroke="#10b981"
            strokeWidth="2"
            opacity="0.7"
          />
        )}
      </svg>

      {/* Components */}
      {components.map((comp) => {
        const spec = COMPONENT_SPECS[comp.type];
        const hasError = safetyIssues[comp.id];
        const isDevice = comp.type === "device";

        return (
          <div
            key={comp.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("componentId", comp.id);
              const rect = e.currentTarget.getBoundingClientRect();
              const canvasRect = canvasRef.current?.getBoundingClientRect();
              if (canvasRect) {
                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;
                e.dataTransfer.setData("offsetX", offsetX);
                e.dataTransfer.setData("offsetY", offsetY);
              }
            }}
            onDragEnd={(e) => {
              // Handle the drop positioning
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;

              // Get the stored offsets
              const offsetX = parseFloat(e.dataTransfer.getData("offsetX"));
              const offsetY = parseFloat(e.dataTransfer.getData("offsetY"));

              // Calculate new position accounting for scroll and offset
              let x = e.clientX - rect.left - (offsetX || 45);
              let y = e.clientY - rect.top - (offsetY || 45);

              // Add scroll position
              x += canvasRef.current?.scrollLeft || 0;
              y += canvasRef.current?.scrollTop || 0;

              // Update component position
              setComponents((prev) =>
                prev.map((c) => (c.id === comp.id ? { ...c, x, y } : c)),
              );
            }}
            onDragOver={(e) => e.preventDefault()}
            className={`absolute w-32 rounded transition-all cursor-move group ${
              hasError
                ? "bg-red-900 border-2 border-red-500 shadow-lg shadow-red-500"
                : isDevice
                  ? "bg-blue-900 border-2 border-blue-700 hover:border-blue-500"
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
              className="p-3 font-semibold text-white text-sm flex items-center justify-center"
              style={{
                backgroundColor: isDevice ? "#3b82f640" : spec.color + "40",
                borderBottom: `1px solid ${isDevice ? "#3b82f6" : spec.color}`,
              }}
            >
              {isDevice ? (
                <span className="text-lg">📡</span>
              ) : (
                (() => {
                  const iconValue = getComponentIcon(comp.type);
                  if (
                    typeof iconValue === "string" &&
                    iconValue.startsWith("/")
                  ) {
                    return (
                      <img
                        src={iconValue}
                        alt={`${spec.label} icon`}
                        className="w-8 h-8 object-contain rounded"
                      />
                    );
                  }
                  return <span className="text-lg">{iconValue}</span>;
                })()
              )}
            </div>

            {/* Body */}
            <div className="p-2 text-xs text-gray-200 space-y-1">
              {isDevice ? (
                <>
                  <div>⚡ {comp.current}A</div>
                  <div>💡 {comp.current * 120}W</div>
                </>
              ) : (
                <>
                  {spec.voltage && <div>⚡ {spec.voltage}V</div>}
                  {(() => {
                    const realTime = realTimeData[comp.id];
                    if (realTime && realTime.current) {
                      const realTimePower =
                        realTime.current * (spec.voltage || 120);
                      return (
                        <>
                          <div className="text-green-300">
                            💡 {realTimePower.toFixed(1)}W (live)
                          </div>
                          <div className="text-blue-300">
                            ⚡ {realTime.current}A (live)
                          </div>
                        </>
                      );
                    } else if (spec.power) {
                      return <div>💡 {spec.power}W</div>;
                    }
                    return null;
                  })()}
                  {spec.ampRating && (
                    <div className="text-yellow-300">🔌 {spec.ampRating}A</div>
                  )}
                  {comp.type === "breaker" && comp.fuseCount && (
                    <div className="text-blue-300">
                      🔥 {comp.fuseCount} fuses
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Error message */}
            {hasError && (
              <div className="px-2 pb-2 text-xs text-red-200 bg-red-950 rounded">
                ⚠️ {hasError}
              </div>
            )}

            {/* Ports */}
            <div className="flex items-center justify-between px-3 py-2 gap-2">
              {/* Input ports - multiple for breakers */}
              <div className="flex flex-col gap-1">
                {comp.type === "breaker" && comp.fuseCount ? (
                  Array.from({ length: comp.fuseCount }, (_, i) => {
                    const locked = isPortLocked(comp, "input", i);
                    return (
                      <button
                        key={`input-${i}`}
                        onMouseUp={(e) => {
                          if (!locked) connectWire(e, comp.id);
                        }}
                        className={`w-3 h-3 rounded-full hover:scale-150 opacity-0 group-hover:opacity-100 transition-all ${locked ? "bg-red-500" : "bg-blue-400"}`}
                        title={
                          locked
                            ? `Input ${i + 1} locked`
                            : `Input ${i + 1} - release wire here`
                        }
                        disabled={locked}
                      />
                    );
                  })
                ) : (
                  <button
                    onMouseUp={(e) => {
                      if (!isPortLocked(comp, "input")) connectWire(e, comp.id);
                    }}
                    className={`w-3 h-3 rounded-full hover:scale-150 opacity-0 group-hover:opacity-100 transition-all ${isPortLocked(comp, "input") ? "bg-red-500" : "bg-blue-400"}`}
                    title={
                      isPortLocked(comp, "input")
                        ? "Input locked"
                        : "Input - release wire here"
                    }
                    disabled={isPortLocked(comp, "input")}
                  />
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteComponent(comp.id);
                }}
                className="text-red-400 hover:text-red-200 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                title="Delete"
              >
                ✕
              </button>

              {/* Output ports - multiple for breakers */}
              <div className="flex flex-col gap-1">
                {comp.type === "breaker" && comp.fuseCount ? (
                  Array.from({ length: comp.fuseCount }, (_, i) => {
                    const locked = isPortLocked(comp, "output", i);
                    return (
                      <button
                        key={`output-${i}`}
                        onMouseDown={(e) => {
                          if (!locked) startWire(e, comp.id);
                        }}
                        onClick={(e) => {
                          if (!locked) startWire(e, comp.id);
                        }}
                        className={`w-3 h-3 rounded-full hover:scale-150 opacity-0 group-hover:opacity-100 transition-all ${locked ? "bg-red-500" : "bg-yellow-400"} cursor-${locked ? "not-allowed" : "grab"}`}
                        title={
                          locked
                            ? `Output ${i + 1} locked`
                            : `Output ${i + 1} - hold to create wire`
                        }
                        disabled={locked}
                      />
                    );
                  })
                ) : (
                  <button
                    onMouseDown={(e) => {
                      if (!isPortLocked(comp, "output")) startWire(e, comp.id);
                    }}
                    onClick={(e) => {
                      if (!isPortLocked(comp, "output")) startWire(e, comp.id);
                    }}
                    className={`w-3 h-3 rounded-full hover:scale-150 opacity-0 group-hover:opacity-100 transition-all ${isPortLocked(comp, "output") ? "bg-red-500" : "bg-yellow-400"} cursor-${isPortLocked(comp, "output") ? "not-allowed" : "grab"}`}
                    title={
                      isPortLocked(comp, "output")
                        ? "Output locked"
                        : "Output - hold to create wire"
                    }
                    disabled={isPortLocked(comp, "output")}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Breaker Fuse Count Dialog */}
      {breakerDialog.show && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Configure Breaker
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Fuses (1-8):
              </label>
              <input
                type="number"
                min="1"
                max="8"
                defaultValue="4"
                id="fuseCountInput"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter fuse count"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const input = document.getElementById("fuseCountInput");
                  const value = input?.value;
                  if (value && parseInt(value) >= 1 && parseInt(value) <= 8) {
                    createBreaker(value);
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
              >
                Create Breaker
              </button>
              <button
                onClick={cancelBreakerDialog}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voltage Selection Dialog */}
      {voltageDialog.show && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Select Wire Voltage
            </h3>
            <div className="text-sm text-gray-300 mb-6">
              Choose the voltage for this wire connection:
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => proceedWithWire(120)}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                120V
              </button>
              <button
                onClick={() => proceedWithWire(240)}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
                240V
              </button>
              <button
                onClick={cancelVoltageDialog}
                className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
