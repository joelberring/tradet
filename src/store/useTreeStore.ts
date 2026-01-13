import { create } from 'zustand';

export interface TreeSettings {
    // Biological parameters
    branchingFactor: number;
    recursionDepth: number;
    thicknessDecay: number; // Da Vinci exponent
    initialRadius: number;
    lengthDecay: number;

    // Physical parameters
    nozzleDiameter: number;
    minPrintableRadius: number;
    targetScale: number;

    // Growth bias
    gravitropism: number;

    // Global mode
    generationMode: 'realistic' | 'abstract';
    attractorType: 'thomas' | 'aizawa';
    attractorIterations: number;

    // Infrastructure
    workerReady: boolean;
    triggerGeneration: number;
}

interface TreeState extends TreeSettings {
    updateSettings: (settings: Partial<TreeSettings>) => void;
    setWorkerReady: (ready: boolean) => void;
    generate: () => void;
}

export const useTreeStore = create<TreeState>((set) => ({
    generationMode: 'realistic',
    attractorType: 'thomas',
    attractorIterations: 1000,

    // Defaults
    branchingFactor: 2,
    recursionDepth: 5,
    thicknessDecay: 2.2,
    initialRadius: 2.0,
    lengthDecay: 0.8,

    nozzleDiameter: 0.4,
    minPrintableRadius: 0.4,
    targetScale: 1.0,

    gravitropism: 0.1,

    workerReady: false,
    triggerGeneration: 0,

    updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
    setWorkerReady: (ready) => set({ workerReady: ready }),
    generate: () => set((state) => ({ triggerGeneration: state.triggerGeneration + 1 })),
}));
