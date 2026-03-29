import { useState, useMemo } from "react";
import {
    COMPONENT_CATEGORIES,
} from "./componentRegistry";

export default function Categories({ devices = [] }) {
    const [openCategories, setOpenCategories] = useState(() => {
        const initial = {};
        Object.keys(COMPONENT_CATEGORIES).forEach((key) => {
            initial[key] = true; // all open by default
        });
        return initial;
    });

    const toggleCategory = (category) => {
        setOpenCategories((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    };

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

            {/* Categories */}
            <div className="space-y-4">
                {Object.entries(COMPONENT_CATEGORIES).map(
                    ([categoryName, components]) => {
                        const isOpen = openCategories[categoryName];

                        return (
                            <div key={categoryName}>
                                {/* Header */}
                                <div
                                    onClick={() => toggleCategory(categoryName)}
                                    className="flex items-center justify-between cursor-pointer select-none mb-2"
                                >
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase">
                                        {categoryName}
                                    </h3>

                                    <span
                                        className={`text-gray-400 text-xs transition-transform ${isOpen ? "rotate-90" : ""
                                            }`}
                                    >
                                        ▶
                                    </span>
                                </div>

                                {/* Items */}
                                {isOpen && (
                                    <div className="space-y-3">
                                        {Object.entries(components).map(([type, spec]) => {
                                            if (!spec) return null;

                                            const voltage = spec.voltage ?? spec.outputVoltage ?? null;
                                            const current = spec.current ?? 0;

                                            return (
                                                <div
                                                    key={type}
                                                    draggable
                                                    onDragStart={(event) =>
                                                        handleDragStart(event, type)
                                                    }
                                                    className="flex items-center gap-3 p-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 cursor-grab active:cursor-grabbing"
                                                >
                                                    {/* Improved Icon Rendering */}
                                                    {typeof spec.icon === "string" ? (
                                                        spec.icon.startsWith("/") ? (
                                                            <img
                                                                src={spec.icon}
                                                                alt={spec.label}
                                                                className="w-12 h-12 object-contain"
                                                            />
                                                        ) : (
                                                            <span className="text-4xl w-12 h-12 flex items-center justify-center">
                                                                {spec.icon}
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="text-2xl">🔌</span>
                                                    )}

                                                    <div className="text-white flex-1">
                                                        <div className="font-semibold">
                                                            {spec.label}
                                                        </div>
                                                        {/* Dynamic voltage/current display */}
                                                        {voltage && (
                                                            <div className="text-xs text-gray-300">
                                                                {voltage}V
                                                                {current > 0 && ` • ${current}A`}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }
                )}
            </div>

            {/* Connected Devices */}
            {devices.length > 0 && (
                <>
                    <h3 className="font-bold text-md text-white mt-6 mb-2">
                        Connected Devices
                    </h3>

                    <div className="space-y-3">
                        {devices.map((device) => (
                            <div
                                key={device.id}
                                draggable
                                onDragStart={(e) =>
                                    handleDragStart(e, null, true, {
                                        id: device.id,
                                        current: device.getCurrent(),
                                    })
                                }
                                className="flex items-center gap-3 p-2 rounded-lg border border-blue-700 bg-blue-900 hover:bg-blue-800 cursor-grab active:cursor-grabbing"
                            >
                                <span className="text-2xl">📡</span>

                                <div className="text-white">
                                    <div className="font-semibold">{device.id}</div>
                                    <div className="text-xs text-gray-300">
                                        {device.getCurrent()}A • {device.getPower()}W
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </aside>
    );
}
