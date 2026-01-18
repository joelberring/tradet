import { create } from 'zustand';

export type TreeType = 'conifer' | 'deciduous' | 'shrub' | 'cypress' | 'palm';
export type TreeSpecies = 'linden' | 'oak' | 'birch' | 'spruce' | 'pine';
export type TreeAge = 'young' | 'mature' | 'old';

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

    // Tree type and foliage
    treeType: TreeType;
    foliageDensity: number;
    foliageSize: number;
    showFoliage: boolean;
    showBranches: boolean;

    // NEW: Realistic tree parameters
    treeSpecies: TreeSpecies;
    treeAge: TreeAge;
    treeHeight: number;
    crownWidth: number;

    // Manual shape controls
    trunkHeight: number;   // 0-1, where branches start (0 = ground, 1 = top)
    crownDensity: number;  // 1-10, how many branches

    // Scaling for physical models
    modelScale: number; // e.g. 500 for 1:500

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
    branchingFactor: 3,
    recursionDepth: 7,
    thicknessDecay: 2.2,
    initialRadius: 3.0,
    lengthDecay: 0.75,

    nozzleDiameter: 0.4,
    minPrintableRadius: 0.05, // Lowered for finer branches
    targetScale: 1.0,

    gravitropism: 0.1,

    // Tree type and foliage defaults
    treeType: 'deciduous',
    foliageDensity: 0.7,
    foliageSize: 1.0,
    showFoliage: true,
    showBranches: true,

    // NEW: Realistic tree defaults
    treeSpecies: 'linden',
    treeAge: 'mature',
    treeHeight: 15,
    crownWidth: 1.0,

    // Manual shape controls - null means use species default
    trunkHeight: 0.3,   // Start with 30% trunk
    crownDensity: 5,    // Medium density
    modelScale: 200, // Default 1:200

    workerReady: false,
    triggerGeneration: 0,

    updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
    setWorkerReady: (ready) => set({ workerReady: ready }),
    generate: () => set((state) => ({ triggerGeneration: state.triggerGeneration + 1 })),
}));
