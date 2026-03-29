import { APPLIANCES } from './categories/appliances';
import { ENTERTAINMENT } from './categories/entertainment';
import { LIGHTING } from './categories/lighting';
import { OUTLETS } from './categories/outlets';

const COMPONENT_LIBRARIES = {
    "Appliances": APPLIANCES,
    "Entertainment": ENTERTAINMENT,
    "Lighting": LIGHTING,
    "Outlets": OUTLETS,
};

// Build the single dynamic categories object
const buildCategories = () => {
    const categories = {};

    Object.entries(COMPONENT_LIBRARIES).forEach(([libName, specs]) => {
        if (!specs) return;

        Object.entries(specs).forEach(([type, spec]) => {
            const categoryName = spec.category || libName;

            if (!categories[categoryName]) {
                categories[categoryName] = {};
            }

            categories[categoryName][type] = {
                ...spec,
                type, // store the identifier
                isConsumer: spec.isConsumer ?? !!(spec.power != null || spec.current != null),
                // Normalized helpers (works with both static values and getters)
                getPower: () => spec.power ?? (spec.voltage && spec.current ? spec.voltage * spec.current : 0),
                getCurrent: () => spec.current ?? 0,
                getVoltage: () => spec.voltage ?? spec.outputVoltage ?? null,
            };
        });
    });

    return categories;
};

export const COMPONENT_CATEGORIES = buildCategories();

// Flat list of all consumer types (useful for calculations)
export const CONSUMER_TYPES = new Set(
    Object.values(COMPONENT_CATEGORIES)
        .flatMap(cat => Object.values(cat))
        .filter(spec => spec.isConsumer)
        .map(spec => spec.type)
);

// Simple lookup helpers
export const getSpecByType = (type) => {
    for (const cat of Object.values(COMPONENT_CATEGORIES)) {
        if (cat[type]) return cat[type];
    }
    return null;
};

export const getComponentColor = (type) => getSpecByType(type)?.color || "#666";
export const getComponentIcon = (type) => getSpecByType(type)?.icon || "?";
export const getComponentLabel = (type) => getSpecByType(type)?.label || type;
