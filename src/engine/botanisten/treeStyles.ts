/**
 * Tree Style Definitions for 3D Printable Model Trees
 * 
 * Defines different tree types with parameters optimized for 3D printing:
 * - Conifer (Gran/Tall): Conical shape, visible branches
 * - Deciduous (Lövträd): Rounded crown, partially visible branches
 * - Shrub (Buske): Compact spherical form
 * - Cypress: Narrow columnar shape
 */

export type CrownStyle = 'conical' | 'spherical' | 'irregular' | 'umbrella' | 'columnar';
export type TrunkStyle = 'straight' | 'tapered' | 'gnarled';
export type TreeType = 'conifer' | 'deciduous' | 'shrub' | 'cypress' | 'palm';

export interface TreeStyle {
    name: string;
    type: TreeType;
    trunkStyle: TrunkStyle;
    crownStyle: CrownStyle;
    
    // Crown parameters
    crownBaseHeight: number;      // Where crown starts (0-1, relative to total height)
    crownWidthRatio: number;      // Crown width relative to height
    crownDensity: number;         // Number of foliage elements (0.1-1)
    
    // Branch visibility
    branchVisibility: number;     // 0 = hidden in foliage, 1 = fully visible
    
    // Trunk parameters
    trunkHeightRatio: number;     // Trunk height relative to total tree height
    trunkTaper: number;           // How much trunk tapers (0.3-1)
    
    // 3D printing constraints
    minWallThickness: number;     // Minimum printable wall thickness in mm
    
    // Foliage element sizing
    foliageElementSize: number;   // Base size of foliage spheres/cones
    foliageOverlap: number;       // How much foliage elements overlap (0-1)
}

export interface FoliageCluster {
    position: [number, number, number];
    radius: number;
    type: 'sphere' | 'cone' | 'cylinder';
    // For cones
    height?: number;
    topRadius?: number;
}

/**
 * Predefined tree styles matching model tree aesthetics
 */
export const TREE_STYLES: Record<TreeType, TreeStyle> = {
    conifer: {
        name: 'Gran/Tall (Conifer)',
        type: 'conifer',
        trunkStyle: 'straight',
        crownStyle: 'conical',
        crownBaseHeight: 0.1,
        crownWidthRatio: 0.4,
        crownDensity: 0.7,
        branchVisibility: 0.3,
        trunkHeightRatio: 0.15,
        trunkTaper: 0.6,
        minWallThickness: 0.8,
        foliageElementSize: 1.0,
        foliageOverlap: 0.4,
    },
    deciduous: {
        name: 'Lövträd (Deciduous)',
        type: 'deciduous',
        trunkStyle: 'tapered',
        crownStyle: 'spherical',
        crownBaseHeight: 0.35,
        crownWidthRatio: 0.8,
        crownDensity: 0.8,
        branchVisibility: 0.2,
        trunkHeightRatio: 0.4,
        trunkTaper: 0.5,
        minWallThickness: 0.8,
        foliageElementSize: 1.2,
        foliageOverlap: 0.5,
    },
    shrub: {
        name: 'Buske (Shrub)',
        type: 'shrub',
        trunkStyle: 'gnarled',
        crownStyle: 'irregular',
        crownBaseHeight: 0.05,
        crownWidthRatio: 1.2,
        crownDensity: 0.9,
        branchVisibility: 0.05,
        trunkHeightRatio: 0.1,
        trunkTaper: 0.8,
        minWallThickness: 0.6,
        foliageElementSize: 0.8,
        foliageOverlap: 0.6,
    },
    cypress: {
        name: 'Cypress',
        type: 'cypress',
        trunkStyle: 'straight',
        crownStyle: 'columnar',
        crownBaseHeight: 0.1,
        crownWidthRatio: 0.2,
        crownDensity: 0.9,
        branchVisibility: 0.0,
        trunkHeightRatio: 0.1,
        trunkTaper: 0.7,
        minWallThickness: 0.8,
        foliageElementSize: 0.6,
        foliageOverlap: 0.7,
    },
    palm: {
        name: 'Palmträd (Palm)',
        type: 'palm',
        trunkStyle: 'straight',
        crownStyle: 'umbrella',
        crownBaseHeight: 0.7,
        crownWidthRatio: 1.0,
        crownDensity: 0.5,
        branchVisibility: 0.8,
        trunkHeightRatio: 0.75,
        trunkTaper: 0.9,
        minWallThickness: 1.0,
        foliageElementSize: 1.5,
        foliageOverlap: 0.2,
    },
};

/**
 * Get tree style by type
 */
export function getTreeStyle(type: TreeType): TreeStyle {
    return TREE_STYLES[type];
}

/**
 * Get all available tree types
 */
export function getAvailableTreeTypes(): TreeType[] {
    return Object.keys(TREE_STYLES) as TreeType[];
}
