import React from "react";
import {
    getComponentIcon,
    getComponentLabel,
} from "./componentRegistry";

const Component = ({
    id,
    type, // 'wire', 'breaker', 'outlet', etc.
    x = 0,
    y = 0,
    onDragStart,
}) => {
    const icon = getComponentIcon(type);
    const label = getComponentLabel(type);

    const handleDragStart = (e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("componentId", id);
        e.dataTransfer.setData("componentType", type);
        onDragStart?.(e, id);
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            style={{
                position: "absolute",
                left: x,
                top: y,
                cursor: "grab",
            }}
            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 active:cursor-grabbing select-none"
        >
            {typeof icon === "string" && icon.startsWith("/") ? (
                <img src={icon} alt={label} className="w-8 h-8 object-contain" />
            ) : (
                <span className="text-2xl">{icon}</span>
            )}
            <span className="text-white text-xs font-semibold">{label}</span>
        </div>
    );
};

export default Component;