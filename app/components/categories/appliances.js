export const APPLIANCES = {
    AirConditioner: {
        label: "Air Conditioner",
        icon: "/Air Conditioner.png",
        voltage: 120,
        current: 12, // ~1440W window unit
        get power() {
            return this.voltage * this.current;
        },
        color: "#06b6d4",
    },

    Refrigerator: {
        label: "Refrigerator",
        icon: "/refrigerator.png",
        voltage: 120,
        current: 6, // compressor cycles
        get power() {
            return this.voltage * this.current;
        },
        color: "#3b82f6",
    },

    Microwave: {
        label: "Microwave",
        icon: "/microwave.png",
        voltage: 120,
        current: 10, // ~1200W
        get power() {
            return this.voltage * this.current;
        },
        color: "#f59e0b",
    },

    WashingMachine: {
        label: "Washing Machine",
        icon: "/washer.png",
        voltage: 120,
        current: 8,
        get power() {
            return this.voltage * this.current;
        },
        color: "#6366f1",
    },

    Dryer: {
        label: "Clothes Dryer",
        icon: "/dryer.png",
        voltage: 240,
        current: 20, // high power appliance
        get power() {
            return this.voltage * this.current;
        },
        color: "#ef4444",
    },

    Dishwasher: {
        label: "Dishwasher",
        icon: "/dishwasher.png",
        voltage: 120,
        current: 10,
        get power() {
            return this.voltage * this.current;
        },
        color: "#14b8a6",
    },

    CoffeeMaker: {
        label: "Coffee Maker",
        icon: "/coffee.png",
        voltage: 120,
        current: 6,
        get power() {
            return this.voltage * this.current;
        },
        color: "#a16207",
    },

    Toaster: {
        label: "Toaster",
        icon: "/toaster.png",
        voltage: 120,
        current: 8,
        get power() {
            return this.voltage * this.current;
        },
        color: "#f97316",
    },

    Vacuum: {
        label: "Vacuum Cleaner",
        icon: "/vacuum.png",
        voltage: 120,
        current: 9,
        get power() {
            return this.voltage * this.current;
        },
        color: "#64748b",
    },

    SpaceHeater: {
        label: "Space Heater",
        icon: "/heater.png",
        voltage: 120,
        current: 12.5, // ~1500W (common max)
        get power() {
            return this.voltage * this.current;
        },
        color: "#dc2626",
    },

    HairDryer: {
        label: "Hair Dryer",
        icon: "/hairdryer.png",
        voltage: 120,
        current: 12,
        get power() {
            return this.voltage * this.current;
        },
        color: "#e11d48",
    },

    Oven: {
        label: "Electric Oven",
        icon: "/oven.png",
        voltage: 240,
        current: 25,
        get power() {
            return this.voltage * this.current;
        },
        color: "#7c3aed",
    },
};