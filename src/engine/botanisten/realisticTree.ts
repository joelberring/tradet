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
        trunkHeightRatio: 0.30,           // Lower trunk for fuller crown
        trunkDiameterRatio: 0.028,        // Elegant trunk proportion
        branchAngleBase: Math.PI / 4,     // ~45 degrees - upward sweep
        branchAngleVariation: 0.30,       // Natural variation
        radiusDecay: 0.58,                // Slower tapering for denser branches
        lengthDecay: 0.75,                // Longer branches
        crownShape: 'oval',
        maxBranchLevels: 7,               // More levels for dense silhouette
        terminalBranchCount: 3,           // More terminal branches
        leaderRatio: 0.90,                // Strong leader for clear top
        terminalCurvature: 0.08,          // Subtle upward curve
        branchesPerLevel: 6,              // Many branches for dense crown
    },
    oak: {
        name: 'Ek (Quercus robur)',
        trunkHeightRatio: 0.25,           // Low crown start - characteristic oak
        trunkDiameterRatio: 0.045,        // Strong but not excessive trunk
        branchAngleBase: Math.PI / 3,     // ~60 degrees - upward then spreading
        branchAngleVariation: 0.40,       // Natural irregularity
        radiusDecay: 0.58,
        lengthDecay: 0.70,
        crownShape: 'dome',
        maxBranchLevels: 5,               // Good detail
        terminalBranchCount: 3,           // Fuller terminal branching
        leaderRatio: 0.80,                // Strong leader extends through crown
        terminalCurvature: 0.10,          // Upward curve at tips
        branchesPerLevel: 5,              // Dense, characteristic oak crown
    },
    birch: {
        name: 'Björk (Betula)',
        trunkHeightRatio: 0.40,           // Mid-height crown start
        trunkDiameterRatio: 0.022,        // Thin but not too thin (needs radius for branches)
        branchAngleBase: Math.PI / 3.5,   // ~51 degrees - elegant upward then drooping
        branchAngleVariation: 0.30,       // Natural irregularity  
        radiusDecay: 0.60,                // Good visible branches
        lengthDecay: 0.72,                // Good branch length
        crownShape: 'dome',               // Dome works better for deciduous
        maxBranchLevels: 6,               // Fine detail
        terminalBranchCount: 3,           // Many fine twigs - birch character
        leaderRatio: 0.85,                // Clear central leader
        terminalCurvature: 0.18,          // Characteristic weeping at tips
        branchesPerLevel: 5,              // Dense branching
    },
    // Conifers
    spruce: {
        name: 'Gran (Picea abies)',
        trunkHeightRatio: 0.02,           // Branches from very near ground
        trunkDiameterRatio: 0.016,        // Slender conifer trunk
        branchAngleBase: Math.PI / 2.0,   // ~90 degrees - horizontal then drooping
        branchAngleVariation: 0.03,       // Very consistent for clean pyramid
        radiusDecay: 0.50,
        lengthDecay: 0.92,                // Strong taper - bottom branches much longer
        crownShape: 'pyramidal',
        maxBranchLevels: 3,               // Simple whorl structure
        terminalBranchCount: 2,
        leaderRatio: 1.0,                 // Leader extends to very top
        terminalCurvature: -0.08,         // Downward droop (characteristic spruce)
        branchesPerLevel: 8,              // More whorled branches
    },
    pine: {
        name: 'Tall (Pinus sylvestris)',
        trunkHeightRatio: 0.50,           // High trunk - mature pine
        trunkDiameterRatio: 0.012,        // Thinner trunk
        branchAngleBase: Math.PI / 2.3,   // ~78 degrees - spreading
        branchAngleVariation: 0.40,       // Natural irregularity
        radiusDecay: 0.58,
        lengthDecay: 0.72,                // Good branch length
        crownShape: 'umbrella',           // Flat-topped
        maxBranchLevels: 5,               // More branching detail
        terminalBranchCount: 3,           // Fuller branching
        leaderRatio: 0.50,                // Leader stops - umbrella top
        terminalCurvature: 0.06,          // Subtle upward curve
        branchesPerLevel: 6,              // More branches in crown
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
     * Calculate crown radius at a given height based on crown shape
     */
    private getCrownRadiusAtHeight(y: number, crownBase: number, crownTop: number, maxRadius: number): number {
        if (y < crownBase || y > crownTop) return 0;

        const crownHeight = crownTop - crownBase;
        const normalizedY = (y - crownBase) / crownHeight;

        // Shape multiplier based on crown shape
        let shapeMultiplier: number;

        switch (this.preset.crownShape) {
            case 'pyramidal':
                // Widest at base, tapering to point at top (like spruce)
                shapeMultiplier = 1.0 - normalizedY * 0.9;
                break;
            case 'umbrella':
                // Narrow at bottom, wide at top (like Scots pine)
                shapeMultiplier = 0.2 + normalizedY * 0.8;
                break;
            case 'dome':
                // Rounded dome - wider in middle-upper region
                shapeMultiplier = Math.sin(normalizedY * Math.PI * 0.8 + 0.2);
                break;
            case 'oval':
            case 'spreading':
            default:
                // Oval/ellipsoid shape - max radius at center
                shapeMultiplier = Math.sin(normalizedY * Math.PI);
                break;
        }

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
        trunkHeight?: number;    // Manual override for trunk height ratio (0-1)
        crownDensity?: number;   // Manual override for branch density (1-10)
    }): BranchSegment[] {
        this.segments = [];
        this.seed = params.seed ?? 42;
        this.preset = TREE_PRESETS[params.preset ?? 'linden'] || TREE_PRESETS.linden;
        this.ageModifiers = AGE_MODIFIERS[params.age ?? 'mature'] || AGE_MODIFIERS.mature;

        const treeHeight = params.treeHeight;
        const crownWidth = params.crownWidth ?? 1.0;

        // Use manual overrides if provided, otherwise use preset defaults
        const effectiveTrunkHeight = params.trunkHeight ?? this.preset.trunkHeightRatio;
        const effectiveDensity = params.crownDensity ?? 5;  // 1-10 scale

        // Calculate trunk dimensions using effective trunk height
        const baseOfCrown = treeHeight * effectiveTrunkHeight;
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
        // Use crownDensity parameter: 1=sparse (4 levels), 10=dense (15 levels)
        const numBranchLevels = Math.floor(4 + (effectiveDensity / 10) * 11 * this.ageModifiers.branchDensityMultiplier);

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

        // Generate child branches - balance density vs performance
        const baseChildren = depth < 2 ?
            Math.floor(3 + this.random()) :  // 3-4 at primary level
            this.preset.terminalBranchCount;
        const numChildren = Math.min(baseChildren, 4); // cap at 4 for performance

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
