export class Device {
    constructor(id, current = 0) {
        this.id = id;
        this.current = parseFloat(current) || 0;
        this.timestamp = new Date();
    }

    // Calculate power (default 120V, but can override for 240V devices)
    getPower(voltage = 120) {
        return this.current * voltage;
    }

    // Get current in amps
    getCurrent() {
        return this.current;
    }

    // Update current from sensor/live data
    updateCurrent(newCurrent) {
        this.current = parseFloat(newCurrent) || 0;
        this.timestamp = new Date();
    }

    // Useful for serialization
    toJSON() {
        return {
            id: this.id,
            current: this.current,
            power: this.getPower(),
            timestamp: this.timestamp,
        };
    }
}