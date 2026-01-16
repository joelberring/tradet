/**
 * Foliage Generator for 3D Printable Model Trees
 * 
 * Generates foliage clusters using spheres and cones that can be
 * combined with branch geometry for 3D-printable tree models.
 * 
 * Strategies:
 * - Conical: Stacked cones for conifers (gran, tall)
 * - Spherical: Overlapping spheres for deciduous trees
 * - Columnar: Elongated ellipsoid for cypress
 * - Umbrella: Flat disc arrangement for palms
 */

import { Vector3 } from 'three';
import type { TreeStyle, FoliageCluster } from './treeStyles';

export interface FoliageGeneratorParams {
    treeHeight: number;
    treeStyle: TreeStyle;
    seed?: number;
}

export interface GeneratedFoliage {
    clusters: FoliageCluster[];
    boundingBox: {
        min: [number, number, number];
        max: [number, number, number];
    };
}

/**
 * Generates foliage geometry for 3D printable trees
 */
export class FoliageGenerator {
    private seed: number;

    constructor(seed: number = 42) {
        this.seed = seed;
    }

    // Seeded random for reproducibility
    private random(): number {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    private randomRange(min: number, max: number): number {
        return min + this.random() * (max - min);
    }

    /**
     * Main entry point - generates foliage based on tree style
     */
    generate(params: FoliageGeneratorParams): GeneratedFoliage {
        const { treeHeight, treeStyle } = params;

        if (params.seed !== undefined) {
            this.seed = params.seed;
        }

        switch (treeStyle.crownStyle) {
            case 'conical':
                return this.generateConical(treeHeight, treeStyle);
            case 'spherical':
                return this.generateSpherical(treeHeight, treeStyle);
            case 'columnar':
                return this.generateColumnar(treeHeight, treeStyle);
            case 'umbrella':
                return this.generateUmbrella(treeHeight, treeStyle);
            case 'irregular':
                return this.generateIrregular(treeHeight, treeStyle);
            default:
                return this.generateSpherical(treeHeight, treeStyle);
        }
    }

    /**
     * Conical foliage for conifers (gran, tall)
     * Creates a stack of cone layers from bottom to top
     */
    private generateConical(treeHeight: number, style: TreeStyle): GeneratedFoliage {
        const clusters: FoliageCluster[] = [];
        const crownStart = treeHeight * style.crownBaseHeight;
        const crownHeight = treeHeight - crownStart;
        const maxWidth = treeHeight * style.crownWidthRatio;

        // Number of layers based on density
        const numLayers = Math.max(3, Math.floor(8 * style.crownDensity));
        const layerHeight = crownHeight / numLayers;

        for (let i = 0; i < numLayers; i++) {
            const layerY = crownStart + i * layerHeight + layerHeight * 0.5;
            const progress = i / numLayers; // 0 at bottom, 1 at top

            // Width decreases as we go up (conical shape)
            const layerWidth = maxWidth * (1 - progress * 0.9);
            const coneHeight = layerHeight * 1.5; // Slight overlap

            // Add the main cone for this layer
            clusters.push({
                position: [0, layerY, 0],
                radius: layerWidth,
                type: 'cone',
                height: coneHeight,
                topRadius: layerWidth * 0.1, // Slight top for printability
            });

            // Add smaller secondary cones around the main one for texture
            if (style.crownDensity > 0.5) {
                const numSecondary = Math.floor(4 * style.crownDensity);
                for (let j = 0; j < numSecondary; j++) {
                    const angle = (j / numSecondary) * Math.PI * 2 + this.randomRange(-0.2, 0.2);
                    const offsetRadius = layerWidth * 0.3;
                    const x = Math.cos(angle) * offsetRadius;
                    const z = Math.sin(angle) * offsetRadius;
                    const size = layerWidth * 0.3 * this.randomRange(0.7, 1.3);

                    clusters.push({
                        position: [x, layerY + this.randomRange(-0.5, 0.5) * layerHeight, z],
                        radius: size,
                        type: 'sphere',
                    });
                }
            }
        }

        return {
            clusters,
            boundingBox: {
                min: [-maxWidth, crownStart, -maxWidth],
                max: [maxWidth, treeHeight, maxWidth],
            },
        };
    }

    /**
     * Spherical foliage for deciduous trees (lövträd)
     * Creates overlapping spheres forming a rounded crown
     */
    private generateSpherical(treeHeight: number, style: TreeStyle): GeneratedFoliage {
        const clusters: FoliageCluster[] = [];
        const crownStart = treeHeight * style.crownBaseHeight;
        const crownHeight = treeHeight - crownStart;
        const maxWidth = treeHeight * style.crownWidthRatio;
        const crownCenterY = crownStart + crownHeight * 0.5;

        // Main central sphere
        const mainRadius = Math.min(crownHeight, maxWidth) * 0.4;
        clusters.push({
            position: [0, crownCenterY, 0],
            radius: mainRadius,
            type: 'sphere',
        });

        // Number of surrounding spheres
        const numSpheres = Math.floor(12 * style.crownDensity);

        // Create sphere distribution using golden angle for even spacing
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));

        for (let i = 0; i < numSpheres; i++) {
            const t = i / numSpheres;
            const inclination = Math.acos(1 - 2 * t);
            const azimuth = goldenAngle * i + this.randomRange(-0.1, 0.1);

            // Spherical to Cartesian
            const radius = mainRadius * (0.8 + t * 0.4);
            const x = Math.sin(inclination) * Math.cos(azimuth) * radius;
            const z = Math.sin(inclination) * Math.sin(azimuth) * radius;
            const y = crownCenterY + Math.cos(inclination) * radius * 0.7; // Flatten slightly

            // Sphere size varies
            const sphereRadius = style.foliageElementSize * this.randomRange(0.6, 1.0);

            // Don't add spheres too low (below crown start)
            if (y >= crownStart) {
                clusters.push({
                    position: [x, y, z],
                    radius: sphereRadius,
                    type: 'sphere',
                });
            }
        }

        return {
            clusters,
            boundingBox: {
                min: [-maxWidth, crownStart, -maxWidth],
                max: [maxWidth, treeHeight, maxWidth],
            },
        };
    }

    /**
     * Columnar foliage for cypress
     * Creates a tall, narrow ellipsoid shape
     */
    private generateColumnar(treeHeight: number, style: TreeStyle): GeneratedFoliage {
        const clusters: FoliageCluster[] = [];
        const crownStart = treeHeight * style.crownBaseHeight;
        const crownHeight = treeHeight - crownStart;
        const width = treeHeight * style.crownWidthRatio;

        // Stack of spheres forming columnar shape
        const numLayers = Math.max(4, Math.floor(10 * style.crownDensity));
        const layerSpacing = crownHeight / numLayers;

        for (let i = 0; i < numLayers; i++) {
            const y = crownStart + i * layerSpacing + layerSpacing * 0.5;
            const progress = i / numLayers;

            // Columnar shape: widest in middle, tapers at top and bottom
            const taper = 1 - Math.pow(Math.abs(progress - 0.5) * 2, 2) * 0.3;
            const layerWidth = width * taper;

            // Main sphere for this layer
            clusters.push({
                position: [0, y, 0],
                radius: layerWidth * style.foliageElementSize,
                type: 'sphere',
            });

            // Add small offset spheres for texture
            const numOffset = 3;
            for (let j = 0; j < numOffset; j++) {
                const angle = (j / numOffset) * Math.PI * 2 + this.randomRange(0, 0.5);
                const offsetR = layerWidth * 0.2;
                clusters.push({
                    position: [
                        Math.cos(angle) * offsetR,
                        y + this.randomRange(-0.2, 0.2) * layerSpacing,
                        Math.sin(angle) * offsetR,
                    ],
                    radius: layerWidth * 0.4 * style.foliageElementSize,
                    type: 'sphere',
                });
            }
        }

        return {
            clusters,
            boundingBox: {
                min: [-width, crownStart, -width],
                max: [width, treeHeight, width],
            },
        };
    }

    /**
     * Umbrella foliage for palm trees
     * Creates flat disc/fan arrangement at tree top
     */
    private generateUmbrella(treeHeight: number, style: TreeStyle): GeneratedFoliage {
        const clusters: FoliageCluster[] = [];
        const crownStart = treeHeight * style.crownBaseHeight;
        const maxWidth = treeHeight * style.crownWidthRatio;

        // Number of fronds/leaves
        const numFronds = Math.max(6, Math.floor(12 * style.crownDensity));

        for (let i = 0; i < numFronds; i++) {
            const angle = (i / numFronds) * Math.PI * 2;

            // Each frond is represented by elongated spheres
            const frondLength = maxWidth;
            const numSegments = 3;

            for (let j = 0; j < numSegments; j++) {
                const segmentProgress = j / numSegments;
                const r = frondLength * (0.3 + segmentProgress * 0.7);
                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;
                // Fronds droop downward
                const droop = segmentProgress * segmentProgress * 2;
                const y = crownStart - droop;

                const sphereSize = style.foliageElementSize * (1 - segmentProgress * 0.3);

                clusters.push({
                    position: [x, y, z],
                    radius: sphereSize,
                    type: 'sphere',
                });
            }
        }

        // Central cluster at top
        clusters.push({
            position: [0, crownStart + 0.5, 0],
            radius: style.foliageElementSize * 1.2,
            type: 'sphere',
        });

        return {
            clusters,
            boundingBox: {
                min: [-maxWidth, crownStart - 3, -maxWidth],
                max: [maxWidth, crownStart + 1, maxWidth],
            },
        };
    }

    /**
     * Irregular foliage for shrubs
     * Creates random-looking but balanced distribution
     */
    private generateIrregular(treeHeight: number, style: TreeStyle): GeneratedFoliage {
        const clusters: FoliageCluster[] = [];
        const crownStart = treeHeight * style.crownBaseHeight;
        const crownHeight = treeHeight - crownStart;
        const maxWidth = treeHeight * style.crownWidthRatio;

        // Number of spheres based on density
        const numSpheres = Math.floor(20 * style.crownDensity);

        // Fill volume with random spheres
        for (let i = 0; i < numSpheres; i++) {
            // Random position within bounding ellipsoid
            let x, y, z;
            let attempts = 0;
            do {
                x = this.randomRange(-1, 1) * maxWidth;
                y = crownStart + this.randomRange(0, 1) * crownHeight;
                z = this.randomRange(-1, 1) * maxWidth;
                attempts++;
            } while (
                // Check if inside ellipsoid
                (x * x) / (maxWidth * maxWidth) +
                Math.pow((y - crownStart - crownHeight * 0.5) / (crownHeight * 0.5), 2) +
                (z * z) / (maxWidth * maxWidth) > 1 &&
                attempts < 20
            );

            const sphereRadius = style.foliageElementSize * this.randomRange(0.5, 1.2);

            clusters.push({
                position: [x, y, z],
                radius: sphereRadius,
                type: 'sphere',
            });
        }

        return {
            clusters,
            boundingBox: {
                min: [-maxWidth, crownStart, -maxWidth],
                max: [maxWidth, treeHeight, maxWidth],
            },
        };
    }
}

/**
 * Helper function to calculate foliage from branch endpoints
 * Useful for combining procedural branches with foliage
 */
export function generateFoliageFromBranchEnds(
    branchEnds: Vector3[],
    style: TreeStyle,
    baseRadius: number = 1.0
): FoliageCluster[] {
    const clusters: FoliageCluster[] = [];

    for (const end of branchEnds) {
        const radius = baseRadius * style.foliageElementSize;
        clusters.push({
            position: [end.x, end.y, end.z],
            radius: radius,
            type: 'sphere',
        });
    }

    return clusters;
}
