export const APPLIANCES = {
    AirConditioner: {
        label: "Air Conditioner",
        voltage: 120,
        current: 12, // ~1440W window unit
        get power() {
            return this.voltage * this.current;
        },
        color: "#06b6d4",
    },

    Refrigerator: {
        label: "Refrigerator",
        voltage: 240,
        current: 6, // compressor cycles
        get power() {
            return this.voltage * this.current;
        },
        color: "#3b82f6",
    },

    Microwave: {
        label: "Microwave",
        voltage: 120,
        current: 10, // ~1200W
        get power() {
            return this.voltage * this.current;
        },
        color: "#f59e0b",
    },

    WashingMachine: {
        label: "Washing Machine",
        voltage: 120,
        current: 8,
        get power() {
            return this.voltage * this.current;
        },
        color: "#6366f1",
    },

    Dryer: {
        label: "Clothes Dryer",
        voltage: 240,
        current: 20, // high power appliance
        get power() {
            return this.voltage * this.current;
        },
        color: "#ef4444",
    },

    Dishwasher: {
        label: "Dishwasher",
        voltage: 120,
        current: 10,
        get power() {
            return this.voltage * this.current;
        },
        color: "#14b8a6",
    },

    CoffeeMaker: {
        label: "Coffee Maker",
        voltage: 120,
        current: 6,
        get power() {
            return this.voltage * this.current;
        },
        color: "#a16207",
    },

    Toaster: {
        label: "Toaster",
        voltage: 120,
        current: 8,
        get power() {
            return this.voltage * this.current;
        },
        color: "#f97316",
    },

    Vacuum: {
        label: "Vacuum Cleaner",
        voltage: 120,
        current: 9,
        get power() {
            return this.voltage * this.current;
        },
        color: "#64748b",
    },

    SpaceHeater: {
        label: "Space Heater",
        voltage: 120,
        current: 12.5, // ~1500W (common max)
        get power() {
            return this.voltage * this.current;
        },
        color: "#dc2626",
    },

    HairDryer: {
        label: "Hair Dryer",
        voltage: 120,
        current: 12,
        get power() {
            return this.voltage * this.current;
        },
        color: "#e11d48",
    },

    Oven: {
        label: "Electric Oven",
        voltage: 240,
        current: 25,
        get power() {
            return this.voltage * this.current;
        },
        color: "#7c3aed",
    },
};