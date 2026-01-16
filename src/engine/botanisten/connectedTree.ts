/**
 * Connected Tree Generator for 3D Printable Model Trees
 * 
 * Creates trees with all segments connected for valid 3D printing.
 * Uses a graph-based approach where branches connect to each other.
 * 
 * Key difference from OrganicTreeGenerator:
 * - All segments START from a previous segment's endpoint
 * - Crown is formed by many small connected branches
 * - No floating geometry
 */

import { Vector3 } from 'three';

interface BranchSegment {
    start: [number, number, number];
    end: [number, number, number];
    r1: number;
    r2: number;
}

export class ConnectedTreeGenerator {
    private segments: BranchSegment[] = [];
    private seed: number = 42;
    private branchEnds: Vector3[] = []; // Track all branch endpoints

    constructor() { }

    private random(): number {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    private randomRange(min: number, max: number): number {
        return min + this.random() * (max - min);
    }

    generateTree(params: {
        trunkRadius: number;
        trunkHeight: number;
        crownRadius: number;
        crownHeight: number;
        branchThickness: number;
        crownDensity: number;
        seed?: number;
    }): BranchSegment[] {
        this.segments = [];
        this.branchEnds = [];
        this.seed = params.seed ?? 42;

        const {
            trunkRadius,
            trunkHeight,
            branchThickness,
            crownDensity,
        } = params;

        // 1. Generate trunk (single segment from origin)
        const trunkTop = new Vector3(0, trunkHeight, 0);

        console.log('[ConnectedTree] Trunk: (0,0,0) -> (0,' + trunkHeight + ',0)');
        console.log('[ConnectedTree] trunkRadius:', trunkRadius, 'branchThickness:', branchThickness);

        this.segments.push({
            start: [0, 0, 0],
            end: [trunkTop.x, trunkTop.y, trunkTop.z],
            r1: Math.max(trunkRadius, branchThickness * 2),
            r2: Math.max(trunkRadius * 0.7, branchThickness * 1.5),
        });

        // Mark trunk top as the starting point for branches
        this.branchEnds.push(trunkTop.clone());

        // 2. Generate crown with connected branches
        this.generateConnectedCrown(trunkTop, params.crownRadius, params.crownHeight, branchThickness, crownDensity);

        console.log('[ConnectedTree] Generated', this.segments.length, 'connected segments');
        console.log('[ConnectedTree] First branch end:', this.branchEnds[0]?.x, this.branchEnds[0]?.y, this.branchEnds[0]?.z);
        return this.segments;
    }

    /**
     * Generate a crown made of connected branches
     * Each new branch starts from an existing branch end
     */
    private generateConnectedCrown(
        trunkTop: Vector3,
        crownRadius: number,
        _crownHeight: number, // Prefixed with _ to indicate intentionally unused
        thickness: number,
        density: number
    ): void {
        // branchEnds already contains trunkTop from generateTree
        console.log('[ConnectedCrown] Starting from:', this.branchEnds[0]?.x, this.branchEnds[0]?.y, this.branchEnds[0]?.z);

        // Number of branch generations
        const totalBranches = Math.floor(20 + density * 60);

        for (let i = 0; i < totalBranches; i++) {
            // Pick a random existing branch end to grow from
            const parentIndex = Math.floor(this.random() * this.branchEnds.length);
            const parentPoint = this.branchEnds[parentIndex].clone();

            // Random direction (biased upward and outward)
            const angle = this.randomRange(0, Math.PI * 2);
            const upwardBias = this.randomRange(0.2, 0.8);

            // Direction vector
            const dx = Math.cos(angle) * (1 - upwardBias);
            const dy = upwardBias;
            const dz = Math.sin(angle) * (1 - upwardBias);
            const dir = new Vector3(dx, dy, dz).normalize();

            // Length - shorter branches as we get more
            const progress = i / totalBranches;
            const baseLength = crownRadius * 0.3;
            const length = baseLength * this.randomRange(0.3, 1.0) * (1 - progress * 0.5);

            // End point
            const endPoint = parentPoint.clone().add(dir.multiplyScalar(length));

            // Add slight jitter to make it more organic
            endPoint.add(new Vector3(
                this.randomRange(-0.2, 0.2),
                this.randomRange(-0.1, 0.3),
                this.randomRange(-0.2, 0.2)
            ));

            // Thickness decreases with each generation
            const branchThickness = thickness * (1 - progress * 0.3);

            // Add the branch segment
            this.segments.push({
                start: [parentPoint.x, parentPoint.y, parentPoint.z],
                end: [endPoint.x, endPoint.y, endPoint.z],
                r1: branchThickness,
                r2: branchThickness * 0.9,
            });

            // Add this endpoint as a potential parent for future branches
            this.branchEnds.push(endPoint);

            // Occasionally create loops by connecting to nearby branch ends
            if (this.random() < 0.15 && i > 10) {
                this.tryCreateLoop(endPoint, thickness * 0.8);
            }
        }
    }

    /**
     * Try to create a loop by connecting to a nearby branch end
     */
    private tryCreateLoop(from: Vector3, thickness: number): void {
        const maxDistance = 2.0;

        // Find nearby branch ends
        const nearby = this.branchEnds.filter(end => {
            const dist = from.distanceTo(end);
            return dist > 0.1 && dist < maxDistance; // Not itself, within range
        });

        if (nearby.length === 0) return;

        // Pick a random nearby end to connect to
        const targetIndex = Math.floor(this.random() * nearby.length);
        const target = nearby[targetIndex];

        // Create the connecting segment
        this.segments.push({
            start: [from.x, from.y, from.z],
            end: [target.x, target.y, target.z],
            r1: thickness,
            r2: thickness,
        });
    }
}
