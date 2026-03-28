"use client";

import React, { useEffect, useRef } from "react";

export default function Console({ logs = [] }) {
  const consoleEndRef = useRef(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="h-40 bg-gray-950 border-t border-gray-700 overflow-hidden flex flex-col">
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-bold text-white">Console Output</h3>
        <span className="text-xs text-gray-400">
          {logs.length} {logs.length === 1 ? "message" : "messages"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-gray-500">
            Ready. Run simulation to see output...
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`mb-1 ${
                log.type === "error"
                  ? "text-red-400"
                  : log.type === "warning"
                    ? "text-yellow-400"
                    : log.type === "success"
                      ? "text-green-400"
                      : "text-gray-300"
              }`}
            >
              {log.type === "error" && "❌ "}
              {log.type === "warning" && "⚠️  "}
              {log.type === "success" && "✅ "}
              {log.type === "info" && "ℹ️  "}
              {log.message}
            </div>
          ))
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}
