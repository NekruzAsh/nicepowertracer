"use client";

import { useState, useEffect } from "react";
import Simulation from "./components/simulation";
import Categories from "./components/categories";
import Console from "./components/console";
import { Device } from "./components/categories/device";

export default function Home() {
    const [logs, setLogs] = useState([]);
    const [devices, setDevices] = useState([]);
    const [devicesLoading, setDevicesLoading] = useState(true);
    const [showConsole, setShowConsole] = useState(true);

    const pushLog = (type, message) =>
        setLogs((prev) => [...prev, { type, message }]);

    // Fetch devices from API
    const fetchDevices = async () => {
        try {
            const response = await fetch("/api/arduino");

            if (!response.ok) {
                pushLog(
                    "error",
                    `Failed to fetch devices (HTTP ${response.status})`,
                );
                return;
            }

            const data = await response.json();
            const deviceInstances = data.devices.map(
                (d) => new Device(d.id, d.current),
            );
            setDevices(deviceInstances);
            setDevicesLoading(false);
            
            // Only log if we haven't logged yet (on initial load)
            if (devices.length === 0 && deviceInstances.length > 0) {
                pushLog(
                    "info",
                    `📋 Loaded ${deviceInstances.length} device${deviceInstances.length !== 1 ? "s" : ""}`,
                );
            }
        } catch (error) {
            pushLog("error", `Could not reach device API: ${error.message}`);
            setDevicesLoading(false);
        }
    };

    // Initial fetch on mount
    useEffect(() => {
        fetchDevices();
    }, []);

    // Poll for device updates every 2 seconds
    useEffect(() => {
        const pollInterval = setInterval(fetchDevices, 2000);
        return () => clearInterval(pollInterval);
    }, [devices.length]);

    return (
        <div className="flex h-screen w-full bg-gray-900 overflow-hidden">
            {/* Left Sidebar: Categories */}
            <div className="shrink-0 h-full">
                <Categories devices={devices} devicesLoading={devicesLoading} />
            </div>

            {/* Right: Simulation + Console */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Simulation Canvas — grows to fill remaining space */}
                <div className="h-screen flex-1 min-h-0">
                    <Simulation onLogsUpdate={setLogs} devices={devices} />
                </div>

                {/* Console — fixed height, not a double-height conflict */}
                <div className="shrink-0 relative z-20 bg-gray-900">
                    <Console logs={logs} />
                </div>
            </div>
        </div>
    );
}