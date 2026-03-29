export const LIGHTING = {
    ledBulb: {
        label: "LED Bulb",
        icon: "/led.png",
        voltage: 120,
        current: 0.08, // ~10W
        get power() {
            return this.voltage * this.current;
        },
        color: "#facc15",
    },

    incandescentBulb: {
        label: "Incandescent Bulb",
        icon: "/bulb.png",
        voltage: 120,
        current: 0.5, // ~60W
        get power() {
            return this.voltage * this.current;
        },
        color: "#f59e0b",
    },

    ceilingLight: {
        label: "Ceiling Light",
        icon: "/ceiling.png",
        voltage: 120,
        current: 0.6, // multiple bulbs
        get power() {
            return this.voltage * this.current;
        },
        color: "#fde047",
    },

    deskLamp: {
        label: "Desk Lamp",
        icon: "/lamp.png",
        voltage: 120,
        current: 0.2,
        get power() {
            return this.voltage * this.current;
        },
        color: "#eab308",
    },

    floorLamp: {
        label: "Floor Lamp",
        icon: "/floorlamp.png",
        voltage: 120,
        current: 0.4,
        get power() {
            return this.voltage * this.current;
        },
        color: "#fbbf24",
    },

    ledStrip: {
        label: "LED Strip Lights",
        icon: "/ledstrip.png",
        voltage: 120,
        current: 0.15,
        get power() {
            return this.voltage * this.current;
        },
        color: "#a78bfa",
    },

    smartLight: {
        label: "Smart Bulb",
        icon: "/smartbulb.png",
        voltage: 120,
        current: 0.1,
        get power() {
            return this.voltage * this.current;
        },
        color: "#22c55e",
    },

    fluorescentTube: {
        label: "Fluorescent Tube",
        icon: "/fluorescent.png",
        voltage: 120,
        current: 0.3,
        get power() {
            return this.voltage * this.current;
        },
        color: "#34d399",
    },

    recessedLighting: {
        label: "Recessed Lighting",
        icon: "/recessed.png",
        voltage: 120,
        current: 0.5,
        get power() {
            return this.voltage * this.current;
        },
        color: "#fef08a",
    },

    outdoorLight: {
        label: "Outdoor Light",
        icon: "/outdoor.png",
        voltage: 120,
        current: 0.4,
        get power() {
            return this.voltage * this.current;
        },
        color: "#84cc16",
    },

    holidayLights: {
        label: "Holiday Lights",
        icon: "/holiday.png",
        voltage: 120,
        current: 1.5, // long string
        get power() {
            return this.voltage * this.current;
        },
        color: "#ef4444",
    },
};