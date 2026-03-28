"use client";

import { useState, useCallback } from "react";

export default function Simulation() {
  const [components, setComponents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [totalAmps, setTotalAmps] = useState(0);
  const [breakerTripped, setBreakerTripped] = useState(false);

  const BREAKER_THRESHOLD = 15; // amps

  const handleDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("componentType");
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newComponent = {
      id: `${type}-${Date.now()}`,
      type,
      x,
      y,
      amps: type === "outlet" ? 5 : type === "actuator" ? 8 : 0,
      active: true,
    };

    setComponents([...components, newComponent]);
  };

  const handleRunSimulation = () => {
    if (breakerTripped) {
      setBreakerTripped(false);
      setIsRunning(true);
      return;
    }

    setIsRunning(true);
    simulateLoad();
  };

  const simulateLoad = () => {
    const activeOutlets = components.filter(
      (c) => c.type === "outlet" && c.active,
    );
    const total = activeOutlets.reduce((sum, c) => sum + c.amps, 0);

    setTotalAmps(total);

    if (total > BREAKER_THRESHOLD) {
      setBreakerTripped(true);
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setTotalAmps(0);
  };

  const deleteComponent = (id) => {
    setComponents(components.filter((c) => c.id !== id));
    setConnections(
      connections.filter((conn) => conn.from !== id && conn.to !== id),
    );
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col w-full h-screen bg-gray-50">
      {/* Controls */}
      <div className="p-4 bg-white border-b flex gap-4 items-center">
        <button
          onClick={handleRunSimulation}
          className={`px-4 py-2 rounded font-semibold ${
            isRunning
              ? "bg-yellow-500 text-white"
              : breakerTripped
                ? "bg-red-600 text-white"
                : "bg-green-600 text-white"
          }`}
        >
          {isRunning ? "Running..." : breakerTripped ? "Reset" : "Run"}
        </button>
        {isRunning && (
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-500 text-white rounded font-semibold"
          >
            Stop
          </button>
        )}
        <div className="ml-auto text-lg font-semibold">
          Amps:{" "}
          <span className={breakerTripped ? "text-red-600" : "text-blue-600"}>
            {totalAmps}A
          </span>
          {breakerTripped && (
            <span className="ml-4 text-red-600">⚠️ Breaker Tripped!</span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex-1 bg-white relative overflow-auto border-2 border-dashed border-gray-300"
      >
        {components.map((comp) => (
          <div
            key={comp.id}
            className="absolute w-20 h-20 bg-blue-100 border-2 border-blue-500 rounded cursor-move flex items-center justify-center text-xs font-semibold group hover:bg-blue-200"
            style={{ left: `${comp.x}px`, top: `${comp.y}px` }}
          >
            <span>{comp.type}</span>
            <button
              onClick={() => deleteComponent(comp.id)}
              className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center"
            >
              ×
            </button>
            {comp.type === "outlet" && (
              <span className="text-xs mt-1">{comp.amps}A</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
