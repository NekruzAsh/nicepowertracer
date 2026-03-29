"use client";

import React from "react";
import { COMPONENT_SPECS } from "../utils/powerCalculations";

export default function Categories({ devices = [] }) {
  const componentTypes = [
    "powerSource",
    "breaker",
    "outlet120",
    "outlet240",
    "tv",
    "xbox",
    "lamp",
    "heater",
  ];

  const handleDragStart = (e, type, isDevice = false, deviceData = null) => {
    e.dataTransfer.effectAllowed = "copy";
    if (isDevice) {
      e.dataTransfer.setData("componentType", "device");
      e.dataTransfer.setData("deviceData", JSON.stringify(deviceData));
    } else {
      e.dataTransfer.setData("componentType", type);
    }
  };

  return (
    <div className="w-64 h-full bg-gray-900 border-r border-gray-700 overflow-y-auto flex flex-col">
      <div className="p-4 ">
        <h2 className="text-lg font-bold text-white mb-4">Components</h2>

        <div className="space-y-2">
          {componentTypes.map((type) => {
            const spec = COMPONENT_SPECS[type];
            return (
              <div
                key={type}
                draggable
                onDragStart={(e) => handleDragStart(e, type)}
                className="p-3 rounded bg-gray-800 border border-gray-700 cursor-move hover:bg-gray-700 transition-colors"
                style={{ borderLeftColor: spec.color, borderLeftWidth: "4px" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{spec.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">
                      {spec.label}
                    </div>
                    {spec.voltage && (
                      <div className="text-xs text-gray-400">
                        {spec.voltage}V
                      </div>
                    )}
                    {spec.power && (
                      <div className="text-xs text-gray-400">{spec.power}W</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Connected Devices */}
        {devices.length > 0 && (
          <>
            <h3 className="text-md font-bold text-white mt-6 mb-2">Connected Devices</h3>
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, null, true, { id: device.id, current: device.getCurrent() })}
                  className="p-3 rounded bg-blue-900 border border-blue-700 cursor-move hover:bg-blue-800 transition-colors"
                  style={{ borderLeftColor: "#3b82f6", borderLeftWidth: "4px" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📡</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">
                        {device.id}
                      </div>
                      <div className="text-xs text-gray-400">
                        {device.getCurrent()}A • {device.getPower()}W
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
