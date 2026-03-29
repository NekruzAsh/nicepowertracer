// Power calculations and validation utilities

export const COMPONENT_SPECS = {
  powerSource: {
    label: "Power Source",
    icon: "/Powersource.png",
    outputVoltage: 120, // default
    watts: 0,
    color: "#22c55e",
  },
  breaker: {
    label: "Breaker",
    icon: "/Breaker.png",
    ampRating: 15,
    color: "#facc15",
    requiresFuseCount: true, // Special flag for breakers
  },
  outlet120: {
    label: "Outlet (120V)",
    icon: "/Outlet.png",
    voltage: 120,
    maxAmps: 15,
    color: "#3b82f6",
  },
  outlet240: {
    label: "Outlet (240V)",
    icon: "/Outlet.png",
    voltage: 240,
    maxAmps: 20,
    color: "#8b5cf6",
  },
  tv: {
    label: "TV",
    icon: "/TV.png",
    power: 200, // watts
    voltage: 120, // requires 120V
    color: "#06b6d4",
  },
  xbox: {
    label: "Xbox",
    icon: "/xbox.png",
    power: 150, // watts
    voltage: 120, // requires 120V
    color: "#10b981",
  },
  lamp: {
    label: "Lamp",
    icon: "/light.png",
    power: 60, // watts
    voltage: 120,
    color: "#fbbf24",
  },
  heater: {
    label: "Heater",
    icon: "/light.png",
    power: 1500, // watts - high power
    voltage: 120,
    color: "#ef4444",
  },
  wire120: {
    label: "Wire (120V)",
    icon: "═",
    voltage: 120,
    resistance: 0.1, // ohms for 10ft
    color: "#fbbf24",
  },
  wire240: {
    label: "Wire (240V)",
    icon: "═",
    voltage: 240,
    resistance: 0.1,
    color: "#a855f7",
  },

};

export const calculateAmps = (watts, voltage) => {
  if (voltage === 0) return 0;
  return watts / voltage;
};

export const validateVoltageMatch = (device, outlet) => {
  // Device's required voltage must match outlet's voltage
  return device.voltage === outlet.voltage;
};

export const calculateTotalLoad = (connectedDevices, outlets) => {
  let totalWatts = 0;
  let totalAmps = 0;

  connectedDevices.forEach((device) => {
    if (
      device.type === "tv" ||
      device.type === "xbox" ||
      device.type === "lamp" ||
      device.type === "heater"
    ) {
      totalWatts += COMPONENT_SPECS[device.type].power;
      totalAmps += calculateAmps(
        COMPONENT_SPECS[device.type].power,
        COMPONENT_SPECS[device.type].voltage,
      );
    }
  });

  return { totalWatts, totalAmps };
};

export const getComponentColor = (type) => {
  return COMPONENT_SPECS[type]?.color || "#666";
};

export const getComponentIcon = (type) => {
  return COMPONENT_SPECS[type]?.icon || "?";
};

export const getComponentLabel = (type) => {
  return COMPONENT_SPECS[type]?.label || type;
};

// Check if system is safe to run
export const isSafeToRun = (connections, devices) => {
  const issues = [];

  // Check voltage matching
  connections.forEach((conn) => {
    const source = devices.find((d) => d.id === conn.from);
    const target = devices.find((d) => d.id === conn.to);

    if (
      target &&
      (target.type === "tv" ||
        target.type === "xbox" ||
        target.type === "lamp" ||
        target.type === "heater")
    ) {
      const outlet = devices.find(
        (d) =>
          d.id === conn.from &&
          (d.type === "outlet120" || d.type === "outlet240"),
      );
      if (
        outlet &&
        !validateVoltageMatch(
          COMPONENT_SPECS[target.type],
          COMPONENT_SPECS[outlet.type],
        )
      ) {
        issues.push(
          `${target.id}: Voltage mismatch! Device needs ${COMPONENT_SPECS[target.type].voltage}V`,
        );
      }
    }
  });

  return { safe: issues.length === 0, issues };
};

// Device class for representing connected devices with sensor data
export class Device {
  constructor(id, current) {
    this.id = id;
    this.current = parseFloat(current) || 0;
    this.timestamp = new Date();
  }

  // Calculate power assuming 120V (common voltage)
  getPower(voltage = 120) {
    return this.current * voltage;
  }

  // Get current in amps
  getCurrent() {
    return this.current;
  }

  // Update current value
  updateCurrent(newCurrent) {
    this.current = parseFloat(newCurrent) || 0;
    this.timestamp = new Date();
  }

  // Get device info as object
  toJSON() {
    return {
      id: this.id,
      current: this.current,
      power: this.getPower(),
      timestamp: this.timestamp
    };
  }
}
