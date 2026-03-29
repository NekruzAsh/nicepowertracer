export const ENTERTAINMENT = {
    tv: {
        label: "TV",
        voltage: 120,
        current: 1, // ~120W LED TV
        get power() {
            return this.voltage * this.current;
        },
        color: "#06b6d4",
    },

    xbox: {
        label: "Xbox Series X",
        voltage: 120,
        current: 1.75, // ~210W peak gaming
        get power() {
            return this.voltage * this.current;
        },
        color: "#10b981",
    },

    playstation: {
        label: "PlayStation 5",
        voltage: 120,
        current: 1.8,
        get power() {
            return this.voltage * this.current;
        },
        color: "#2563eb",
    },

    gamingPC: {
        label: "Gaming PC",
        voltage: 120,
        current: 4, // ~500W under load
        get power() {
            return this.voltage * this.current;
        },
        color: "#7c3aed",
    },

    monitor: {
        label: "Monitor",
        voltage: 120,
        current: 0.5,
        get power() {
            return this.voltage * this.current;
        },
        color: "#0ea5e9",
    },

    soundSystem: {
        label: "Sound System",
        voltage: 120,
        current: 2,
        get power() {
            return this.voltage * this.current;
        },
        color: "#f59e0b",
    },

    streamingBox: {
        label: "Streaming Device",
        voltage: 120,
        current: 0.1, // Roku/Apple TV type
        get power() {
            return this.voltage * this.current;
        },
        color: "#f97316",
    },

    router: {
        label: "WiFi Router",
        voltage: 120,
        current: 0.2,
        get power() {
            return this.voltage * this.current;
        },
        color: "#14b8a6",
    },

    vrHeadset: {
        label: "VR Headset",
        voltage: 120,
        current: 0.5,
        get power() {
            return this.voltage * this.current;
        },
        color: "#a855f7",
    },

    projector: {
        label: "Projector",
        voltage: 120,
        current: 2.5,
        get power() {
            return this.voltage * this.current;
        },
        color: "#e11d48",
    },

    dvdPlayer: {
        label: "Blu-ray Player",
        voltage: 120,
        current: 0.3,
        get power() {
            return this.voltage * this.current;
        },
        color: "#64748b",
    },

    consoleStandby: {
        label: "Console (Standby)",
        voltage: 120,
        current: 0.05, // phantom load
        get power() {
            return this.voltage * this.current;
        },
        color: "#94a3b8",
    },
};