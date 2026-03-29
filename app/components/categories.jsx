"use client";

import {
  COMPONENT_SPECS,
  getComponentLabel,
  getComponentIcon,
} from "../utils/powerCalculations";

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
    <aside className="w-72 h-full bg-gray-950 border-r border-gray-700 p-4 overflow-y-auto">
      <h2 className="font-bold text-lg text-white mb-4">Components</h2>
      <div className="space-y-3">
        {componentTypes.map((type) => {
          const spec = COMPONENT_SPECS[type];
          return (
            <div
              key={type}
              draggable
              onDragStart={(event) => handleDragStart(event, type)}
              className="flex items-center gap-3 p-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 cursor-grab"
            >
              {typeof spec.icon === "string" && spec.icon.startsWith("/") ? (
                <img
                  src={spec.icon}
                  alt={spec.label}
                  className="w-12 h-12 object-contain"
                />
              ) : (
                <span className="text-2xl">{getComponentIcon(type)}</span>
              )}
              <div className="text-white">
                <div className="font-semibold">{getComponentLabel(type)}</div>
                {spec.voltage && (
                  <div className="text-xs text-gray-300">{spec.voltage}V</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connected Devices */}
      {devices.length > 0 && (
        <>
          <h3 className="font-bold text-md text-white mt-6 mb-2">Connected Devices</h3>
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                draggable
                onDragStart={(e) => handleDragStart(e, null, true, { id: device.id, current: device.getCurrent() })}
                className="flex items-center gap-3 p-2 rounded-lg border border-blue-700 bg-blue-900 hover:bg-blue-800 cursor-grab"
              >
                <span className="text-2xl">📡</span>
                <div className="text-white">
                  <div className="font-semibold">{device.id}</div>
                  <div className="text-xs text-gray-300">{device.getCurrent()}A • {device.getPower()}W</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
