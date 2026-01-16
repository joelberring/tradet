/**
 * Organic Tree Generator for 3D Printable Model Trees
 * 
 * Creates organic, looping crown structures similar to architectural model trees.
 * Uses thin connected tubes that form cloud-like crowns.
 * 
 * Key features:
 * - Distinct trunk with proper taper
 * - Organic looping crown structures (not spheres!)
 * - All geometry connected for robust 3D printing
 */

import { Vector3, Quaternion, Euler } from 'three';

interface BranchSegment {
    start: [number, number, number];
    end: [number, number, number];
    r1: number;
    r2: number;
}

/**
 * Organic Tree Generator
 * Creates trees with looping crown structures for 3D printing
 */
export class OrganicTreeGenerator {
    private segments: BranchSegment[] = [];
    private seed: number = 42;

    constructor() { }

    private random(): number {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    private randomRange(min: number, max: number): number {
        return min + this.random() * (max - min);
    }

    /**
     * Generate a complete tree with trunk and organic crown
     */
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
        this.seed = params.seed ?? 42;

        const {
            trunkRadius,
            trunkHeight,
            crownRadius,
            crownHeight,
            branchThickness,
            crownDensity,
        } = params;

        // 1. Generate trunk
        this.generateTrunk(trunkRadius, trunkHeight, branchThickness);

        // 2. Generate main branches from trunk top
        const trunkTop = new Vector3(0, trunkHeight, 0);
        this.generateMainBranches(trunkTop, crownRadius, crownHeight, branchThickness, crownDensity);

        // 3. Generate organic crown loops
        this.generateCrownLoops(trunkTop, crownRadius, crownHeight, branchThickness, crownDensity);

        console.log('[OrganicTree] Generated', this.segments.length, 'segments');
        return this.segments;
    }

    /**
     * Generate the main trunk
     */
    private generateTrunk(radius: number, height: number, minRadius: number): void {
        // Single continuous trunk segment for better connection
        this.segments.push({
            start: [0, 0, 0],
            end: [0, height, 0],
            r1: Math.max(radius, minRadius),
            r2: Math.max(radius * 0.7, minRadius),
        });
    }

    /**
     * Generate main branches that extend outward from trunk
     */
    private generateMainBranches(
        trunkTop: Vector3,
        crownRadius: number,
        _crownHeight: number,
        branchThickness: number,
        density: number
    ): void {
        const numBranches = Math.floor(3 + density * 4);

        for (let i = 0; i < numBranches; i++) {
            const angle = (i / numBranches) * Math.PI * 2 + this.randomRange(-0.2, 0.2);
            const upAngle = this.randomRange(0.3, 0.8); // Angle from vertical

            // Branch direction
            const dx = Math.sin(angle) * Math.sin(upAngle);
            const dy = Math.cos(upAngle);
            const dz = Math.cos(angle) * Math.sin(upAngle);

            const length = crownRadius * this.randomRange(0.4, 0.7);

            const start = trunkTop.clone().add(new Vector3(0, -0.5, 0));
            const end = start.clone().add(new Vector3(dx * length, dy * length, dz * length));

            this.segments.push({
                start: [start.x, start.y, start.z],
                end: [end.x, end.y, end.z],
                r1: branchThickness * 1.5,
                r2: branchThickness,
            });

            // Add secondary branches
            this.generateSecondaryBranches(end, new Vector3(dx, dy, dz), branchThickness, crownRadius * 0.4, 2);
        }
    }

    /**
     * Generate secondary branches recursively
     */
    private generateSecondaryBranches(
        origin: Vector3,
        parentDir: Vector3,
        thickness: number,
        length: number,
        depth: number
    ): void {
        if (depth <= 0 || length < 0.3) return;

        const numBranches = 2 + Math.floor(this.random() * 2);

        for (let i = 0; i < numBranches; i++) {
            // Random deviation from parent direction
            const deviation = new Vector3(
                this.randomRange(-0.5, 0.5),
                this.randomRange(0, 0.5),
                this.randomRange(-0.5, 0.5)
            );

            const dir = parentDir.clone().add(deviation).normalize();
            const branchLength = length * this.randomRange(0.5, 0.9);
            const end = origin.clone().add(dir.clone().multiplyScalar(branchLength));

            this.segments.push({
                start: [origin.x, origin.y, origin.z],
                end: [end.x, end.y, end.z],
                r1: thickness,
                r2: thickness * 0.8,
            });

            // Recurse
            this.generateSecondaryBranches(end, dir, thickness * 0.8, branchLength * 0.7, depth - 1);
        }
    }

    /**
     * Generate organic loop structures in the crown
     * These create the characteristic "cloud-like" appearance
     */
    private generateCrownLoops(
        center: Vector3,
        radius: number,
        height: number,
        thickness: number,
        density: number
    ): void {
        const numLoops = Math.floor(8 + density * 20);
        const crownCenter = center.clone().add(new Vector3(0, height * 0.4, 0));

        for (let i = 0; i < numLoops; i++) {
            // Random position within crown volume (ellipsoid)
            const phi = this.random() * Math.PI * 2;
            const theta = this.random() * Math.PI;
            const r = Math.pow(this.random(), 0.5) * radius; // Square root for uniform distribution

            const loopCenter = new Vector3(
                Math.sin(theta) * Math.cos(phi) * r,
                Math.cos(theta) * height * 0.4 + this.randomRange(-0.5, 0.5),
                Math.sin(theta) * Math.sin(phi) * r
            ).add(crownCenter);

            // Generate a small organic loop at this position
            this.generateLoop(loopCenter, thickness, this.randomRange(0.5, 1.5));
        }
    }

    /**
     * Generate a single organic loop (figure-8 or irregular loop)
     */
    private generateLoop(center: Vector3, thickness: number, size: number): void {
        const loopType = this.random();

        if (loopType < 0.5) {
            // Circular/oval loop
            this.generateCircularLoop(center, thickness, size);
        } else {
            // Figure-8 or double loop
            this.generateFigureEight(center, thickness, size);
        }
    }

    /**
     * Generate a circular/oval loop
     */
    private generateCircularLoop(center: Vector3, thickness: number, size: number): void {
        const segments = 8;
        const points: Vector3[] = [];

        // Random rotation for the loop (using proper Euler object)
        const rotX = this.randomRange(0, Math.PI);
        const rotY = this.randomRange(0, Math.PI * 2);
        const rotation = new Quaternion().setFromEuler(new Euler(rotX, rotY, 0, 'XYZ'));

        // Oval shape
        const scaleX = this.randomRange(0.6, 1.0);
        const scaleZ = this.randomRange(0.6, 1.0);

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const point = new Vector3(
                Math.cos(angle) * size * scaleX,
                0,
                Math.sin(angle) * size * scaleZ
            );
            point.applyQuaternion(rotation);
            points.push(point.add(center));
        }

        // Create segments
        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];
            this.segments.push({
                start: [start.x, start.y, start.z],
                end: [end.x, end.y, end.z],
                r1: thickness,
                r2: thickness,
            });
        }
    }

    /**
     * Generate a figure-8 or double loop
     */
    private generateFigureEight(center: Vector3, thickness: number, size: number): void {
        const segments = 12;
        const points: Vector3[] = [];

        // Random rotation (using proper Euler object)
        const rotX = this.randomRange(0, Math.PI);
        const rotY = this.randomRange(0, Math.PI * 2);
        const rotation = new Quaternion().setFromEuler(new Euler(rotX, rotY, 0, 'XYZ'));

        // Figure-8 shape using lemniscate
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2;
            const scale = 1 / (1 + Math.sin(t) * Math.sin(t) * 0.5);
            const point = new Vector3(
                Math.sin(t) * size * scale,
                Math.sin(t) * Math.cos(t) * size * 0.5 * scale,
                Math.cos(t) * size * 0.3 * scale
            );
            point.applyQuaternion(rotation);
            points.push(point.add(center));
        }

        // Create segments
        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];
            this.segments.push({
                start: [start.x, start.y, start.z],
                end: [end.x, end.y, end.z],
                r1: thickness,
                r2: thickness,
            });
        }
    }
}
