import { Vector3, Quaternion } from 'three';

interface BranchSegment {
    start: [number, number, number];
    end: [number, number, number];
    r1: number;
    r2: number;
}

/**
 * Branch class following user specification:
 * Each branch has origin, orientation, length, radius, and level
 */
class Branch {
    origin: Vector3;
    orientation: Quaternion;
    length: number;
    radius: number;
    level: number;

    constructor(
        origin: Vector3,
        orientation: Quaternion,
        length: number,
        radius: number,
        level: number
    ) {
        this.origin = origin;
        this.orientation = orientation;
        this.length = length;
        this.radius = radius;
        this.level = level;
    }

    /**
     * Get the endpoint of this branch
     */
    getEndPoint(): Vector3 {
        const direction = new Vector3(0, 1, 0).applyQuaternion(this.orientation);
        return this.origin.clone().add(direction.multiplyScalar(this.length));
    }
}

/**
 * Procedural Tree Generator
 * 
 * Based on:
 * - Recursive branch structures
 * - Leonardo da Vinci's rule: Σ(r_child²) = r_parent²
 * - Gravity bending inversely proportional to radius
 * - Per-level taper and angle parameters
 */
export class Botanist {
    private segments: BranchSegment[] = [];
    private seed: number = 12345;

    constructor() { }

    // Simple seeded random for reproducibility
    private random(): number {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    // Random in range [min, max]
    private randomRange(min: number, max: number): number {
        return min + this.random() * (max - min);
    }

    // Random angle variation
    private getRandomAngle(baseAngle: number, variation: number = 0.3): number {
        return baseAngle + this.randomRange(-variation, variation) * baseAngle;
    }

    /**
     * Main entry point - generates tree and returns branch segments
     */
    generateTree(
        initialRadius: number,
        thicknessDecay: number,
        lengthDecay: number,
        minPrintableRadius: number,
        targetScale: number,
        gravitropism: number,
        branchingFactor: number,
        maxLevels: number
    ): BranchSegment[] {
        this.segments = [];
        this.seed = 42; // Reset for reproducibility

        // Create trunk branch
        const trunk = new Branch(
            new Vector3(0, 0, 0),                    // origin
            new Quaternion(),                        // orientation (pointing up)
            5.0,                                     // length
            initialRadius,                           // radius
            0                                        // level
        );

        // Start recursive generation
        this.generateBranch(
            trunk,
            maxLevels,
            branchingFactor,
            lengthDecay,
            thicknessDecay,
            gravitropism,
            minPrintableRadius,
            targetScale
        );

        console.log('[Botanist] Total segments generated:', this.segments.length);
        return this.segments;
    }

    /**
     * Recursive branch generation following user specification
     */
    private generateBranch(
        branch: Branch,
        maxLevels: number,
        branchingFactor: number,
        lengthFactor: number,
        taperFactor: number,
        gravity: number,
        minRadius: number,
        scale: number
    ): void {
        // Check recursion depth
        if (branch.level >= maxLevels) {
            return;
        }

        // Check minimum printable radius
        const physicalRadius = branch.radius * scale;
        if (physicalRadius < minRadius * 0.3) {
            return;
        }

        // Create geometry for this branch segment
        const endPoint = branch.getEndPoint();
        const taperEndRadius = branch.radius * 0.9; // Taper along branch

        this.segments.push({
            start: [branch.origin.x, branch.origin.y, branch.origin.z],
            end: [endPoint.x, endPoint.y, endPoint.z],
            r1: Math.max(branch.radius, minRadius / scale),
            r2: Math.max(taperEndRadius, minRadius / scale)
        });

        // Calculate number of children for this level
        // More children at lower levels, fewer at top
        const levelMultiplier = Math.max(0.5, 1 - branch.level * 0.1);
        const childrenCount = Math.max(1, Math.round(branchingFactor * levelMultiplier));

        // LEONARDO'S RULE: Σ(r_child²) = r_parent²
        // For n equal children: r_child = r_parent / sqrt(n)
        const leonardoRadius = taperEndRadius / Math.sqrt(childrenCount);
        const childRadius = leonardoRadius * (1 / Math.pow(taperFactor, 0.3));

        // Child length
        const childLength = branch.length * lengthFactor * this.randomRange(0.8, 1.2);

        // Base angle for children (wider at lower levels)
        const baseAngle = (25 + branch.level * 10) * (Math.PI / 180);

        // Generate children
        for (let i = 0; i < childrenCount; i++) {
            // Clone parent orientation
            const childOrientation = branch.orientation.clone();

            // Twist around parent axis (distribute children around the branch)
            const twistAngle = (i / childrenCount) * Math.PI * 2 + this.randomRange(-0.3, 0.3);
            const twistQuat = new Quaternion().setFromAxisAngle(
                new Vector3(0, 1, 0).applyQuaternion(branch.orientation),
                twistAngle
            );
            childOrientation.premultiply(twistQuat);

            // Tilt away from parent (pitch outward)
            const tiltAngle = this.getRandomAngle(baseAngle, 0.3);
            const rightAxis = new Vector3(1, 0, 0).applyQuaternion(childOrientation);
            const tiltQuat = new Quaternion().setFromAxisAngle(rightAxis, tiltAngle);
            childOrientation.premultiply(tiltQuat);

            // GRAVITY: Bend towards ground, inversely proportional to radius
            // Thinner branches (smaller radius) bend more
            if (gravity !== 0 && branch.level > 0) {
                const gravityStrength = gravity / (branch.radius * 10);
                const currentUp = new Vector3(0, 1, 0).applyQuaternion(childOrientation);
                const gravityDir = new Vector3(0, -1, 0);

                // Blend current direction towards gravity
                const blendedDir = currentUp.lerp(gravityDir, Math.min(gravityStrength * 0.1, 0.3));
                const gravityQuat = new Quaternion().setFromUnitVectors(
                    new Vector3(0, 1, 0),
                    blendedDir.normalize()
                );
                // Apply partial gravity effect
                childOrientation.slerp(gravityQuat, gravityStrength * 0.05);
            }

            // Create child branch
            const child = new Branch(
                endPoint.clone(),
                childOrientation,
                childLength,
                childRadius,
                branch.level + 1
            );

            // Recursive call
            this.generateBranch(
                child,
                maxLevels,
                branchingFactor,
                lengthFactor,
                taperFactor,
                gravity,
                minRadius,
                scale
            );
        }
    }

    // Legacy compatibility method
    generateString(_axiom: string, _depth: number, _branchingFactor: number = 2): string {
        return 'LEGACY_NOT_USED';
    }

    // Legacy compatibility - main entry point from Tree.tsx
    interpret(
        _str: string,
        initialRadius: number,
        thicknessDecay: number,
        lengthDecay: number,
        minPrintableRadius: number,
        targetScale: number,
        gravitropism: number,
        branchingFactor: number = 3,
        maxDepth: number = 6
    ): BranchSegment[] {
        return this.generateTree(
            initialRadius,
            thicknessDecay,
            lengthDecay,
            minPrintableRadius,
            targetScale,
            gravitropism,
            branchingFactor,
            maxDepth
        );
    }
}
