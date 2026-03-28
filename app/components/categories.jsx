"use client";

import React from "react";
import { COMPONENT_SPECS } from "../utils/powerCalculations";

export default function Categories() {
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

  const handleDragStart = (e, type) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("componentType", type);
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

       
      </div>
    </div>
  );
}
