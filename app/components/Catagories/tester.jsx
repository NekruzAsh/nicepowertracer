"use client";

import React, { useCallback } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ─── Custom Node: Power Source ───────────────────────────────────────────────
const PowerSourceNode = ({ data }) => (
  <div style={styles.node("#22c55e", "#052e16")}>
    <div style={styles.nodeLabel}>⚡ {data.label}</div>
    <div style={styles.nodeSub}>{data.voltage}V</div>
    {/* Only an output — power flows out */}
    <Handle
      type="source"
      position={Position.Right}
      style={styles.handle("#22c55e")}
    />
  </div>
);

// ─── Custom Node: Breaker ─────────────────────────────────────────────────────
const BreakerNode = ({ data }) => (
  <div style={styles.node("#facc15", "#1c1917")}>
    <Handle
      type="target"
      position={Position.Left}
      style={styles.handle("#facc15")}
    />
    <div style={styles.nodeLabel}>🔌 {data.label}</div>
    <div style={styles.nodeSub}>Breaker</div>
    <Handle
      type="source"
      position={Position.Right}
      style={styles.handle("#facc15")}
    />
  </div>
);

// ─── Custom Node: Device ──────────────────────────────────────────────────────
const DeviceNode = ({ data }) => (
  <div style={styles.node("#60a5fa", "#0f172a")}>
    <Handle
      type="target"
      position={Position.Left}
      style={styles.handle("#60a5fa")}
    />
    <div style={styles.nodeLabel}>💡 {data.label}</div>
    <div style={styles.nodeSub}>{data.voltage}V rated</div>
  </div>
);

// ─── Node Type Registry ───────────────────────────────────────────────────────
const nodeTypes = {
  powerSource: PowerSourceNode,
  breaker: BreakerNode,
  device: DeviceNode,
};

// ─── Initial Nodes ────────────────────────────────────────────────────────────
const initialNodes = [
  {
    id: "1",
    type: "powerSource",
    position: { x: 80, y: 200 },
    data: { label: "Main Supply", voltage: 120 },
  },
  {
    id: "2",
    type: "breaker",
    position: { x: 320, y: 200 },
    data: { label: "Breaker A" },
  },
  {
    id: "3",
    type: "device",
    position: { x: 560, y: 120 },
    data: { label: "Device 1", voltage: 120 },
  },
  {
    id: "4",
    type: "device",
    position: { x: 560, y: 280 },
    data: { label: "Device 2", voltage: 120 },
  },
];

// ─── Initial Edges (Wires) ────────────────────────────────────────────────────
const initialEdges = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: { stroke: "#22c55e", strokeWidth: 2 },
  },
  {
    id: "e2-3",
    source: "2",
    target: "3",
    animated: true,
    style: { stroke: "#facc15", strokeWidth: 2 },
  },
  {
    id: "e2-4",
    source: "2",
    target: "4",
    animated: true,
    style: { stroke: "#facc15", strokeWidth: 2 },
  },
];

// ─── Main Canvas ──────────────────────────────────────────────────────────────
export default function PowerFlowTest() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // When user draws a new connection wire
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0a0a" }}>
      {/* Status Node (corner widget) */}
      <div style={statusBox}>
        <div style={{ color: "#22c55e", fontWeight: 700, marginBottom: 4 }}>
          SYSTEM STATUS
        </div>
        <div style={{ color: "#a3a3a3", fontSize: 12 }}>
          Nodes: {nodes.length}
        </div>
        <div style={{ color: "#a3a3a3", fontSize: 12 }}>
          Connections: {edges.length}
        </div>
        <div style={{ color: "#22c55e", fontSize: 12, marginTop: 4 }}>
          ● SAFE
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  node: (accent, bg) => ({
    background: bg,
    border: `1px solid ${accent}`,
    borderRadius: 8,
    padding: "10px 16px",
    minWidth: 130,
    boxShadow: `0 0 12px ${accent}44`,
    fontFamily: "monospace",
  }),
  nodeLabel: {
    color: "#f5f5f5",
    fontWeight: 700,
    fontSize: 13,
  },
  nodeSub: {
    color: "#a3a3a3",
    fontSize: 11,
    marginTop: 2,
  },
  handle: (color) => ({
    background: color,
    width: 10,
    height: 10,
    border: "none",
  }),
};

const statusBox = {
  position: "absolute",
  top: 16,
  right: 16,
  zIndex: 10,
  background: "#111",
  border: "1px solid #22c55e",
  borderRadius: 8,
  padding: "12px 16px",
  fontFamily: "monospace",
  fontSize: 13,
  minWidth: 160,
  boxShadow: "0 0 20px #22c55e22",
};
