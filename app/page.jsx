"use client";

import { useState } from "react";
import Simulation from "./components/simulation";
import Categories from "./components/categories";
import Console from "./components/console";

export default function Home() {
  const [logs, setLogs] = useState([]);

  return (
    <div className="flex h-screen w-full bg-gray-900 overflow-hidden gap-0">
      {/* Left Sidebar: Categories */}
      <div className="flex-shrink-0 h-full">
        <Categories />
      </div>

      {/* Right: Simulation + Console */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top: Simulation Canvas */}
        <Simulation onLogsUpdate={setLogs} />

        {/* Bottom: Console */}
        <div className="flex-shrink-0 h-40 border-t border-gray-700">
          <Console logs={logs} />
        </div>
      </div>
    </div>
  );
}
