// Mother Class: Components (Drag Functionality)

import React, { useState } from "react";
import { useDrag } from "react-dnd";

const Component = ({
  id,
  name,
  type, // 'wire', 'breaker', 'outlet', etc.
  initposition = { x: 0, y: 0 },
}) => {
  const [position, setPosition] = useState(initposition);
  const [status, setStatus] = useState("floating"); // 'connected', 'floating', 'shorted'

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "COMPONENT",
    item: { id, name, type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag} // Drag functionality
      style={{
        position: "absolute",
        opacity: isDragging ? 0.5 : 1, // Visual feedback when dragging
        left: position.x,
        top: position.y,
        cursor: "grab",
      }}
    >
      <span>{name}</span>
      <span>{type}</span>
    </div>
  );
};
export default Component;
