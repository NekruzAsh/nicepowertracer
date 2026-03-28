"use client";
import { useState } from "react";

export default function Console() {
  const [logs, setLogs] = useState([]);

  const addLog = (type, message, data = {}) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      { type, message, data, timestamp, id: Date.now() },
    ]);
  };

  return (
    <div className="console-container">
      <div className="console-header">
        <h2>Power Tracer Console</h2>
      </div>

      <div className="console-output">
        {logs.length === 0 ? (
          <p className="empty-state">Waiting for runs...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`log-entry log-${log.type}`}>
              <span className="timestamp">[{log.timestamp}]</span>
              <span className="message">{log.message}</span>
              {Object.keys(log.data).length > 0 && (
                <div className="data-details">
                  {log.data.devices && (
                    <div>
                      <strong>Devices:</strong>
                      {log.data.devices.map((device) => (
                        <div key={device.id} className="device-info">
                          {device.name}: {device.wattage}W
                        </div>
                      ))}
                    </div>
                  )}
                  {log.data.totalWattage && (
                    <div>
                      <strong>Total:</strong> {log.data.totalWattage}W
                    </div>
                  )}
                  {log.data.fuses && (
                    <div>
                      <strong>Fuses:</strong> {log.data.fuses.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .console-container {
          border: 1px solid #333;
          border-radius: 8px;
          background: #0d1117;
          color: #c9d1d9;
          font-family: "Courier New", monospace;
          max-height: 500px;
          display: flex;
          flex-direction: column;
        }
        .console-header {
          padding: 12px;
          border-bottom: 1px solid #30363d;
          background: #161b22;
        }
        .console-output {
          overflow-y: auto;
          padding: 12px;
          flex: 1;
        }
        .log-entry {
          padding: 8px;
          margin-bottom: 8px;
          border-left: 3px solid #30363d;
          background: #0d1117;
        }
        .log-completed {
          border-left-color: #28a745;
        }
        .log-fail {
          border-left-color: #dc3545;
        }
        .timestamp {
          color: #79c0ff;
          margin-right: 8px;
        }
        .data-details {
          margin-top: 8px;
          padding-left: 12px;
          font-size: 0.9em;
          color: #8b949e;
        }
        .device-info {
          margin: 4px 0;
        }
        .empty-state {
          color: #6e7681;
          text-align: center;
          padding: 20px;
        }
      `}</style>
    </div>
  );
}
