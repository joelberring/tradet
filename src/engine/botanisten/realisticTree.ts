/**
 * Realistic Tree Generator
 * 
 * Based on botanical research:
 * - Tilia cordata: trunk diameter:height = 1:15 to 1:30, oval crown
 * - Quercus robur: trunk diameter:height = 1:11, dome-shaped crown
 * - Leonardo da Vinci's rule: D² = Σdᵢ² (area-preserving branching)
 * - Natural branching angles: 20-45° for linden, 40-60° for oak
 * 
 * Key features:
 * - Central trunk continues through crown (leader)
 * - Branches generated at multiple heights along trunk
 * - Crown envelope limits branch extent for rounded shape
 */

import { Vector3 } from 'three';

interface BranchSegment {
    start: [number, number, number];
    end: [number, number, number];
    r1: number;
    r2: number;
}

// Tree species presets based on botanical research
export interface TreePreset {
    name: string;
    trunkHeightRatio: number;      // Where trunk "stops" being dominant (but continues as leader)
    trunkDiameterRatio: number;    // Trunk diameter as fraction of trunk height
    branchAngleBase: number;       // Base branching angle in radians
    branchAngleVariation: number;  // Random variation in angle
    radiusDecay: number;           // How fast branches get thinner (0.5-0.7)
    lengthDecay: number;           // How fast branches get shorter (0.6-0.8)
    crownShape: 'oval' | 'dome' | 'pyramidal' | 'spreading' | 'umbrella';
    maxBranchLevels: number;       // Maximum recursion depth
    terminalBranchCount: number;   // Branches at terminal nodes
    leaderRatio: number;           // How much leader (central trunk) extends through crown (0.5-1.0)
    terminalCurvature: number;     // NEW: Upward curvature at branch tips (phototropism)
    branchesPerLevel: number;      // NEW: How many primary branches per tier
}

export const TREE_PRESETS: Record<string, TreePreset> = {
    linden: {
        name: 'Lind (Tilia cordata)',
        trunkHeightRatio: 0.40,           // Taller trunk like reference images
        trunkDiameterRatio: 0.035,        // Slightly thinner for elegance
        branchAngleBase: Math.PI / 3,     // ~60 degrees - wider spread
        branchAngleVariation: 0.4,        // More natural variation
        radiusDecay: 0.50,                // Faster tapering for elegance
        lengthDecay: 0.75,                // Longer secondary branches
        crownShape: 'oval',
        maxBranchLevels: 5,               // Reduced for cleaner look
        terminalBranchCount: 2,
        leaderRatio: 0.85,
        terminalCurvature: 0.15,          // Gentle upward curve at tips
        branchesPerLevel: 3,              // Sparser branches
    },
    oak: {
        name: 'Ek (Quercus robur)',
        trunkHeightRatio: 0.30,           // Higher trunk
        trunkDiameterRatio: 0.055,        // Thick trunk
        branchAngleBase: Math.PI / 2.5,   // ~72 degrees - spreading
        branchAngleVariation: 0.45,       // Very natural, irregular
        radiusDecay: 0.55,
        lengthDecay: 0.72,
        crownShape: 'dome',
        maxBranchLevels: 4,               // Reduced for clarity
        terminalBranchCount: 2,
        leaderRatio: 0.55,
        terminalCurvature: 0.08,          // Slight upward curve
        branchesPerLevel: 4,              // Dense but not cluttered
    },
    birch: {
        name: 'Björk (Betula)',
        trunkHeightRatio: 0.45,           // Very tall trunk
        trunkDiameterRatio: 0.020,        // Slender
        branchAngleBase: Math.PI / 3.5,   // ~51 degrees - elegant angle
        branchAngleVariation: 0.3,
        radiusDecay: 0.48,                // Fast tapering
        lengthDecay: 0.68,
        crownShape: 'pyramidal',
        maxBranchLevels: 5,
        terminalBranchCount: 2,
        leaderRatio: 0.95,
        terminalCurvature: 0.20,          // Drooping then upward - characteristic
        branchesPerLevel: 3,
    },
    // Conifers
    spruce: {
        name: 'Gran (Picea abies)',
        trunkHeightRatio: 0.10,           // Low branches
        trunkDiameterRatio: 0.022,        // Slender trunk
        branchAngleBase: Math.PI / 2.0,   // ~90 degrees - horizontal
        branchAngleVariation: 0.10,       // Very consistent (pyramid)
        radiusDecay: 0.50,
        lengthDecay: 0.90,                // Branches get much shorter at top
        crownShape: 'pyramidal',
        maxBranchLevels: 4,
        terminalBranchCount: 2,
        leaderRatio: 0.99,                // Strong central leader
        terminalCurvature: 0.05,          // Very slight droop then up
        branchesPerLevel: 5,              // Whorled branches
    },
    pine: {
        name: 'Tall (Pinus sylvestris)',
        trunkHeightRatio: 0.70,           // Very high trunk
        trunkDiameterRatio: 0.028,        // Moderate trunk
        branchAngleBase: Math.PI / 2.3,   // ~78 degrees - nearly horizontal
        branchAngleVariation: 0.45,       // Irregular, gnarled
        radiusDecay: 0.58,
        lengthDecay: 0.62,                // Branches maintain length
        crownShape: 'umbrella',           // Flat-topped
        maxBranchLevels: 4,
        terminalBranchCount: 2,
        leaderRatio: 0.25,                // Leader stops early
        terminalCurvature: 0.12,
        branchesPerLevel: 3,
    },
};

// Age-based modifiers
export interface AgeModifiers {
    trunkThicknessMultiplier: number;
    branchDensityMultiplier: number;
    irregularity: number;
    maxLevelsAdjust: number;
}

export const AGE_MODIFIERS: Record<string, AgeModifiers> = {
    young: {
        trunkThicknessMultiplier: 0.6,
        branchDensityMultiplier: 0.7,
        irregularity: 0.1,
        maxLevelsAdjust: -2,
    },
    mature: {
        trunkThicknessMultiplier: 1.0,
        branchDensityMultiplier: 1.0,
        irregularity: 0.2,
        maxLevelsAdjust: 0,
    },
    old: {
        trunkThicknessMultiplier: 1.4,
        branchDensityMultiplier: 1.3,
        irregularity: 0.4,
        maxLevelsAdjust: 1,
    },
};

// Crown envelope - defines the outer shape of the crown
interface CrownEnvelope {
    center: Vector3;
    radiusX: number;
    radiusY: number;
    radiusZ: number;
}

export class RealisticTreeGenerator {
    private segments: BranchSegment[] = [];
    private seed: number = 42;
    private preset: TreePreset = TREE_PRESETS.linden;
    private ageModifiers: AgeModifiers = AGE_MODIFIERS.mature;
    private crownEnvelope: CrownEnvelope | null = null;

    constructor() { }

    private random(): number {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    private randomRange(min: number, max: number): number {
        return min + this.random() * (max - min);
    }



    /**
     * Get direction toward the crown envelope surface (for forming silhouette)
     */
    private getDirectionTowardSurface(point: Vector3): Vector3 {
        if (!this.crownEnvelope) return new Vector3(0, 1, 0);

        // Direction from center to point (outward)
        const toPoint = point.clone().sub(this.crownEnvelope.center);

        // Normalize by ellipsoid radii to find scaled direction
        const scaledDir = new Vector3(
            toPoint.x / this.crownEnvelope.radiusX,
            toPoint.y / this.crownEnvelope.radiusY,
            toPoint.z / this.crownEnvelope.radiusZ
        );

        // Return normalized outward direction
        return scaledDir.normalize();
    }

    /**
     * Calculate distance to crown surface (0 = at surface, negative = inside, positive = outside)
     */
    private distanceToCrownSurface(point: Vector3): number {
        if (!this.crownEnvelope) return -1;

        const dx = (point.x - this.crownEnvelope.center.x) / this.crownEnvelope.radiusX;
        const dy = (point.y - this.crownEnvelope.center.y) / this.crownEnvelope.radiusY;
        const dz = (point.z - this.crownEnvelope.center.z) / this.crownEnvelope.radiusZ;

        return Math.sqrt(dx * dx + dy * dy + dz * dz) - 1.0;
    }

    /**
     * Calculate crown radius at a given height (for rounded envelope)
     */
    private getCrownRadiusAtHeight(y: number, crownBase: number, crownTop: number, maxRadius: number): number {
        if (y < crownBase || y > crownTop) return 0;

        const crownHeight = crownTop - crownBase;
        const normalizedY = (y - crownBase) / crownHeight;

        // Oval/ellipsoid shape - max radius at center, tapering at top and bottom
        const shapeMultiplier = Math.sin(normalizedY * Math.PI);

        return maxRadius * shapeMultiplier;
    }

    /**
     * Generate a realistic tree structure
     */
    generateTree(params: {
        treeHeight: number;
        minRadius: number;
        seed?: number;
        preset?: string;
        age?: string;
        crownWidth?: number;
    }): BranchSegment[] {
        this.segments = [];
        this.seed = params.seed ?? 42;
        this.preset = TREE_PRESETS[params.preset ?? 'linden'] || TREE_PRESETS.linden;
        this.ageModifiers = AGE_MODIFIERS[params.age ?? 'mature'] || AGE_MODIFIERS.mature;

        const treeHeight = params.treeHeight;
        const crownWidth = params.crownWidth ?? 1.0;

        // Calculate trunk dimensions
        const baseOfCrown = treeHeight * this.preset.trunkHeightRatio;
        // Conifers with very low trunk ratios need trunk radius based on treeHeight
        // Deciduous trees use baseOfCrown to maintain original proportions
        const isConifer = this.preset.crownShape === 'pyramidal' || this.preset.crownShape === 'umbrella';
        const trunkRadiusBase = isConifer ? treeHeight : baseOfCrown;
        const trunkRadius = trunkRadiusBase * this.preset.trunkDiameterRatio * this.ageModifiers.trunkThicknessMultiplier;
        // Higher min radius = fewer segments = faster generation
        const minRadius = Math.max(params.minRadius * 0.25, 0.03);

        // Crown dimensions - tighter envelope for clearer silhouette
        const crownHeight = treeHeight - baseOfCrown;
        const crownMaxRadius = crownHeight * 0.4 * crownWidth;

        // Set up crown envelope - ellipsoid shape for realistic tree silhouette
        this.crownEnvelope = {
            center: new Vector3(0, baseOfCrown + crownHeight * 0.48, 0),
            radiusX: crownMaxRadius,
            radiusY: crownHeight * 0.48,
            radiusZ: crownMaxRadius,
        };

        // Generate main trunk (from ground to base of crown)
        this.segments.push({
            start: [0, 0, 0],
            end: [0, baseOfCrown, 0],
            r1: trunkRadius * 1.3,
            r2: trunkRadius,
        });

        // Generate leader (central trunk continuing through crown)
        // This should be VISIBLE as a central spine
        const leaderHeight = crownHeight * this.preset.leaderRatio;
        const leaderTop = baseOfCrown + leaderHeight;
        // Leader tapers slowly to remain visible
        const leaderTopRadius = trunkRadius * 0.4;

        // Split leader into 2-3 segments for smoother tapering
        const leaderMid = baseOfCrown + leaderHeight * 0.5;
        const leaderMidRadius = trunkRadius * 0.65;

        this.segments.push({
            start: [0, baseOfCrown, 0],
            end: [0, leaderMid, 0],
            r1: trunkRadius,
            r2: leaderMidRadius,
        });

        this.segments.push({
            start: [0, leaderMid, 0],
            end: [0, leaderTop, 0],
            r1: leaderMidRadius,
            r2: leaderTopRadius,
        });

        // Effective max levels based on age
        const maxLevels = Math.max(4, this.preset.maxBranchLevels + this.ageModifiers.maxLevelsAdjust);

        // Generate branches at multiple heights along the leader
        const numBranchLevels = Math.floor(5 + this.ageModifiers.branchDensityMultiplier * 3);

        for (let level = 0; level < numBranchLevels; level++) {
            // Height along the leader where this tier of branches originates
            const t = (level + 0.5) / numBranchLevels;
            const branchHeight = baseOfCrown + t * leaderHeight * 0.9;

            // Radius of leader at this height
            const leaderRadiusHere = trunkRadius * 0.9 * (1 - t * 0.7);

            // Available crown radius at this height (for limiting branch extent)
            const availableRadius = this.getCrownRadiusAtHeight(
                branchHeight,
                baseOfCrown,
                treeHeight,
                crownMaxRadius
            );

            // Branch length based on available space
            const baseBranchLength = availableRadius * this.randomRange(0.85, 1.1);

            // Number of branches at this level - use preset value with variation
            const baseCount = this.preset.branchesPerLevel || 3;
            const branchesAtLevel = Math.max(2, Math.floor(
                baseCount * (1 - t * 0.2) * this.ageModifiers.branchDensityMultiplier
            ));

            const origin = new Vector3(0, branchHeight, 0);

            for (let i = 0; i < branchesAtLevel; i++) {
                // Use golden angle distribution for more natural spacing
                const goldenAngle = Math.PI * (3 - Math.sqrt(5));
                const phi = i * goldenAngle + level * 0.5 + this.randomRange(-0.4, 0.4);

                // Angle decreases slightly for upper branches (more upward)
                const angleMultiplier = 1 - t * 0.25;
                const theta = this.preset.branchAngleBase * angleMultiplier +
                    this.randomRange(-this.preset.branchAngleVariation, this.preset.branchAngleVariation);

                const dir = this.calculateBranchDirection(new Vector3(0, 1, 0), theta, phi);

                // Branch radius using da Vinci rule approximation - more variation
                const branchRadius = leaderRadiusHere * (0.35 + this.random() * 0.25);

                this.generateBranchWithEnvelope(
                    origin.clone(),
                    dir,
                    branchRadius,
                    baseBranchLength,
                    0,
                    minRadius,
                    maxLevels
                );
            }
        }

        console.log('[RealisticTree] Generated', this.segments.length, 'segments with preset:', this.preset.name);
        return this.segments;
    }

    /**
     * Generate branches that respect the crown envelope
     */
    private generateBranchWithEnvelope(
        origin: Vector3,
        direction: Vector3,
        radius: number,
        length: number,
        depth: number,
        minRadius: number,
        maxLevels: number
    ): void {
        if (depth >= maxLevels) return;
        if (radius < minRadius) return;
        if (length < 0.04) return;

        // Calculate end point
        const endPoint = origin.clone().add(direction.clone().multiplyScalar(length));

        // Check if end point is within crown envelope
        const dist = this.distanceToCrownSurface(endPoint);

        // If outside the crown, shorten the branch to exactly hit the surface
        if (dist > 0) {
            const currentDistFromCenter = endPoint.clone().sub(this.crownEnvelope!.center).length();
            const targetDist = currentDistFromCenter / (1.0 + dist);
            const factor = targetDist / currentDistFromCenter;

            endPoint.copy(origin).lerp(endPoint, factor);
        }

        const endRadius = radius * 0.85;

        this.segments.push({
            start: [origin.x, origin.y, origin.z],
            end: [endPoint.x, endPoint.y, endPoint.z],
            r1: radius,
            r2: endRadius,
        });

        // Generate child branches
        const numChildren = depth < 2 ?
            Math.floor(2 + this.random()) :  // Simpler at primary level
            this.preset.terminalBranchCount;

        const childRadius = radius * this.preset.radiusDecay;
        const childLength = length * this.preset.lengthDecay;

        for (let i = 0; i < numChildren; i++) {
            // Golden angle distribution for natural branch arrangement
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));
            const phi = i * goldenAngle + this.randomRange(-0.6, 0.6);

            // Reduce angle for deeper branches (tend toward tips)
            const depthFactor = 1 - (depth / maxLevels) * 0.35;
            const theta = this.preset.branchAngleBase * 0.55 * depthFactor +
                this.randomRange(-this.preset.branchAngleVariation * 0.6, this.preset.branchAngleVariation * 0.6);

            const isNearTerminal = depth >= maxLevels - 2;
            const surfaceDir = this.getDirectionTowardSurface(endPoint);

            let childDir = this.calculateBranchDirection(direction, theta, phi);

            // If near terminal, attract branch toward the silhouette surface
            if (isNearTerminal) {
                childDir.lerp(surfaceDir, 0.35);
                childDir.normalize();
            }

            // Phototropism - upward curvature, stronger at tips (uses preset value)
            const curvature = this.preset.terminalCurvature || 0.1;
            const curvatureStrength = curvature * (0.5 + depth * 0.15);
            childDir.y += curvatureStrength;
            childDir.normalize();

            const actualLength = childLength * this.randomRange(0.75, 1.25);
            const actualRadius = Math.max(childRadius * this.randomRange(0.9, 1.1), minRadius);

            this.generateBranchWithEnvelope(
                endPoint.clone(),
                childDir,
                actualRadius,
                actualLength,
                depth + 1,
                minRadius,
                maxLevels
            );
        }
    }

    /**
     * Calculate branch direction given parent direction and angles
     */
    private calculateBranchDirection(
        parentDir: Vector3,
        theta: number,
        phi: number
    ): Vector3 {
        const up = parentDir.clone().normalize();

        // Find perpendicular vectors
        const arbitrary = Math.abs(up.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
        const right = new Vector3().crossVectors(up, arbitrary).normalize();
        const forward = new Vector3().crossVectors(right, up).normalize();

        // Rotate around parent by phi
        const rotatedRight = right.clone().multiplyScalar(Math.cos(phi))
            .add(forward.clone().multiplyScalar(Math.sin(phi)));

        // Rotate away from parent by theta
        const branchDir = up.clone().multiplyScalar(Math.cos(theta))
            .add(rotatedRight.multiplyScalar(Math.sin(theta)));

        return branchDir.normalize();
    }
}
