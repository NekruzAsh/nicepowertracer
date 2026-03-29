export const calculateAmps = (watts, voltage = 120) => {
    if (voltage === 0 || !voltage) return 0;
    return watts / voltage;
};

export const calculateTotalLoad = (connectedDevices = []) => {
    let totalWatts = 0;
    let totalAmps = 0;

    connectedDevices.forEach((device) => {
        const spec = getSpecByType(device.type);
        if (spec?.isConsumer) {
            const watts = spec.getPower();
            totalWatts += watts;
            totalAmps += calculateAmps(watts, spec.getVoltage());
        }
    });

    return { totalWatts, totalAmps };
};

export const validateVoltageMatch = (deviceSpec, outletSpec) => {
    if (!deviceSpec?.getVoltage || !outletSpec?.getVoltage) return false;
    return deviceSpec.getVoltage() === outletSpec.getVoltage();
};

export const isSafeToRun = (connections = [], devices = []) => {
    const issues = [];

    connections.forEach((conn) => {
        const target = devices.find((d) => d.id === conn.to);
        if (!target) return;

        const targetSpec = getSpecByType(target.type);
        if (!targetSpec?.isConsumer) return;

        // Find the outlet this target is connected from (adjust logic to your connection structure)
        const outlet = devices.find((d) =>
            d.id === conn.from &&
            (d.type === "outlet120" || d.type === "outlet240")
        );

        if (outlet) {
            const outletSpec = getSpecByType(outlet.type);
            if (outletSpec && !validateVoltageMatch(targetSpec, outletSpec)) {
                issues.push(
                    `${target.id}: Voltage mismatch! Device needs ${targetSpec.getVoltage()}V`
                );
            }
        }
    });

    return { safe: issues.length === 0, issues };
};