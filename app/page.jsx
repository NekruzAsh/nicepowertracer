"use client";

import { useState, useEffect } from "react";
import Simulation from "./components/simulation";
import Categories from "./components/categories";
import Console from "./components/console";
import { Device } from "./utils/powerCalculations";

export default function Home() {
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState([]);

  // Fetch devices from API
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch("/api/arduino");
        if (response.ok) {
          const data = await response.json();
          const deviceInstances = data.devices.map(
            (d) => new Device(d.id, d.current),
          );
          setDevices(deviceInstances);
          setLogs((prev) => [
            ...prev,
            {
              type: "info",
              message: `📋 Loaded ${deviceInstances.length} devices`,
            },
          ]);
        } else {
          console.error("Failed to fetch devices");
        }
      } catch (error) {
        console.error("Error fetching devices:", error);
      }
    };

    fetchDevices();
  }, []);

  return (
    <div className="flex h-screen w-full bg-gray-900 overflow-hidden gap-0">
      {/* Left Sidebar: Categories */}
      <div className="shrink-0 h-full">
        <Categories devices={devices} />
      </div>

      {/* Right: Simulation + Console */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top: Simulation Canvas */}
        <Simulation onLogsUpdate={setLogs} devices={devices} />

        {/* Bottom: Console */}
        <div className="shrink-0 h-40 border-t border-gray-700">
          <Console logs={logs} />
        </div>
      </div>
    </div>
  );
}
