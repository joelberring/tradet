import initManifold from 'manifold-3d';

let manifold: any;
let mModule: any;
let Manifold: any;
let currentSolid: any = null; // Store for export

// Types for foliage clusters
interface FoliageCluster {
    position: [number, number, number];
    radius: number;
    type: 'sphere' | 'cone' | 'cylinder';
    height?: number;
    topRadius?: number;
}

const initialize = async () => {
    console.log('Worker initialize() called');
    try {
        console.log('Calling initManifold...');
        mModule = await initManifold();
        console.log('mModule received, setting up...');
        mModule.setup();
        manifold = mModule;
        Manifold = mModule.Manifold;
        console.log('Manifold-3D Worker Ready ✅');
        self.postMessage({ type: 'READY' });
    } catch (err: any) {
        console.error('❌ Failed to initialize Manifold-3D:', err);
        self.postMessage({ type: 'ERROR', payload: 'Init failed: ' + err.message });
    }
};

// Binary tree union strategy for performance
const binaryUnion = (solids: any[]): any => {
    if (solids.length === 0) return null;
    if (solids.length === 1) return solids[0];

    const mid = Math.floor(solids.length / 2);
    const leftArr = solids.slice(0, mid);
    const rightArr = solids.slice(mid);

    const left = binaryUnion(leftArr);
    const right = binaryUnion(rightArr);

    if (!left) return right;
    if (!right) return left;

    const result = Manifold.union(left, right);
    // Cleanup intermediates
    left.delete();
    right.delete();
    return result;
};

// Create a sphere at a given position
const createSphere = (position: number[], radius: number, segments: number = 16): any => {
    if (radius < 0.001) return null;

    // Manifold uses sphere(radius, segments)
    let sphere = Manifold.sphere(radius, segments);
    return sphere.translate(position);
};

// Create foliage cluster based on type
const createFoliageCluster = (cluster: FoliageCluster): any => {
    const { position, radius, type, height, topRadius } = cluster;

    switch (type) {
        case 'sphere':
            return createSphere(position, radius);
        case 'cone':
            // Cone oriented upward (along Z in Manifold, but we'll rotate)
            const coneHeight = height || radius * 2;
            const coneTopRadius = topRadius !== undefined ? topRadius : radius * 0.1;
            let cone = Manifold.cylinder(coneHeight, radius, coneTopRadius, 16);
            // Rotate so cone points up (Y axis)
            cone = cone.rotate([0, 0, 0], [1, 0, 0], -90);
            return cone.translate([position[0], position[1], position[2]]);
        case 'cylinder':
            const cylHeight = height || radius * 2;
            let cyl = Manifold.cylinder(cylHeight, radius, radius, 16);
            cyl = cyl.rotate([0, 0, 0], [1, 0, 0], -90);
            return cyl.translate([position[0], position[1], position[2]]);
        default:
            return createSphere(position, radius);
    }
};

const createBranch = (start: number[], end: number[], radiusStart: number, radiusEnd: number) => {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const dz = end[2] - start[2];

    const height = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (height < 0.0001) return null;

    // Use fewer segments for smaller branches (optimization)
    const avgRadius = (radiusStart + radiusEnd) / 2;
    const segments = avgRadius > 0.3 ? 12 : avgRadius > 0.1 ? 8 : 6;

    let cyl = Manifold.cylinder(height, radiusStart, radiusEnd, segments);

    // Calculate spherical angles for direction
    // We need to rotate the Z-axis (0,0,1) to align with (dx, dy, dz)
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    // Yaw (rotation around Y-axis) - angle in XZ plane
    let yaw = 0;
    if (horizontalDist > 0.0001) {
        yaw = Math.atan2(dx, dz) * (180 / Math.PI);
    }

    // Pitch (rotation around X-axis after yaw) - elevation from XZ plane
    // After yaw, our direction in the rotated frame is (0, dy, horizontalDist)
    // We need to rotate around X to align Z with this
    const pitch = -Math.atan2(dy, horizontalDist) * (180 / Math.PI);

    // Special case: nearly vertical cylinder (dy dominant)
    if (Math.abs(dy) > height * 0.999 && horizontalDist < 0.001) {
        // Pointing straight up (0,1,0) or down (0,-1,0)
        if (dy > 0) {
            // Rotate -90 degrees around X to make Z point to Y
            cyl = cyl.rotate([-90, 0, 0]);
        } else {
            // Rotate +90 degrees around X to make Z point to -Y
            cyl = cyl.rotate([90, 0, 0]);
        }
    } else {
        // General case: apply yaw then pitch
        cyl = cyl.rotate([pitch, yaw, 0]);
    }

    // Translate to start position
    return cyl.translate([start[0], start[1], start[2]]);
};

// Convert mesh to binary STL format
const meshToSTL = (mesh: any): ArrayBuffer => {
    const numProp = mesh.numProp || 3;
    const numVerts = mesh.vertProperties.length / numProp;
    const numTris = mesh.triVerts.length / 3;

    // Extract vertices
    const vertices: number[][] = [];
    for (let i = 0; i < numVerts; i++) {
        vertices.push([
            mesh.vertProperties[i * numProp + 0],
            mesh.vertProperties[i * numProp + 1],
            mesh.vertProperties[i * numProp + 2]
        ]);
    }

    // Binary STL format:
    // 80 bytes header
    // 4 bytes: number of triangles (uint32)
    // For each triangle:
    //   12 bytes: normal vector (3 floats)
    //   36 bytes: 3 vertices (9 floats)
    //   2 bytes: attribute byte count (uint16, typically 0)

    const headerSize = 80;
    const triangleSize = 50; // 12 + 36 + 2
    const bufferSize = headerSize + 4 + (numTris * triangleSize);
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // Header (80 bytes, can be any text)
    const header = 'Binary STL exported from Tradet Tree Generator';
    for (let i = 0; i < 80; i++) {
        view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
    }

    // Number of triangles
    view.setUint32(80, numTris, true); // little-endian

    let offset = 84;

    for (let t = 0; t < numTris; t++) {
        const i0 = mesh.triVerts[t * 3 + 0];
        const i1 = mesh.triVerts[t * 3 + 1];
        const i2 = mesh.triVerts[t * 3 + 2];

        const v0 = vertices[i0];
        const v1 = vertices[i1];
        const v2 = vertices[i2];

        // Calculate face normal
        const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
        const nx = e1[1] * e2[2] - e1[2] * e2[1];
        const ny = e1[2] * e2[0] - e1[0] * e2[2];
        const nz = e1[0] * e2[1] - e1[1] * e2[0];
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

        // Normal (3 floats)
        view.setFloat32(offset, len > 0 ? nx / len : 0, true); offset += 4;
        view.setFloat32(offset, len > 0 ? ny / len : 0, true); offset += 4;
        view.setFloat32(offset, len > 0 ? nz / len : 0, true); offset += 4;

        // Vertex 1
        view.setFloat32(offset, v0[0], true); offset += 4;
        view.setFloat32(offset, v0[1], true); offset += 4;
        view.setFloat32(offset, v0[2], true); offset += 4;

        // Vertex 2
        view.setFloat32(offset, v1[0], true); offset += 4;
        view.setFloat32(offset, v1[1], true); offset += 4;
        view.setFloat32(offset, v1[2], true); offset += 4;

        // Vertex 3
        view.setFloat32(offset, v2[0], true); offset += 4;
        view.setFloat32(offset, v2[1], true); offset += 4;
        view.setFloat32(offset, v2[2], true); offset += 4;

        // Attribute byte count
        view.setUint16(offset, 0, true); offset += 2;
    }

    return buffer;
};

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    if (type === 'INIT') {
        await initialize();
        return;
    }

    if (type === 'GENERATE_TREE') {
        if (!manifold) return;

        try {
            const { branches, foliage } = payload;
            const solids = [];

            // Create branch geometry
            for (const b of branches) {
                const segment = createBranch(b.start, b.end, b.r1, b.r2);
                if (segment) solids.push(segment);
            }

            // Create foliage geometry if provided
            if (foliage && Array.isArray(foliage)) {
                console.log('[Worker] Processing', foliage.length, 'foliage clusters');
                for (const cluster of foliage) {
                    const foliageGeom = createFoliageCluster(cluster);
                    if (foliageGeom) solids.push(foliageGeom);
                }
            }

            if (solids.length === 0) {
                self.postMessage({ type: 'ERROR', payload: 'No geometry generated' });
                return;
            }

            // Clean up previous solid
            if (currentSolid) {
                currentSolid.delete();
            }

            console.log('[Worker] Performing union of', solids.length, 'solids');
            currentSolid = binaryUnion(solids);
            const mesh = currentSolid.getMesh();

            // Extract vertex positions from interleaved vertProperties array
            const numProp = mesh.numProp || 3;
            const numVerts = mesh.vertProperties.length / numProp;
            const vertices = new Float32Array(numVerts * 3);

            for (let i = 0; i < numVerts; i++) {
                vertices[i * 3 + 0] = mesh.vertProperties[i * numProp + 0];
                vertices[i * 3 + 1] = mesh.vertProperties[i * numProp + 1];
                vertices[i * 3 + 2] = mesh.vertProperties[i * numProp + 2];
            }

            self.postMessage({
                type: 'TREE_READY',
                payload: {
                    vertices: vertices,
                    indices: mesh.triVerts
                }
            });

        } catch (err: any) {
            self.postMessage({ type: 'ERROR', payload: err.message });
        }
    }

    if (type === 'EXPORT_STL') {
        if (!currentSolid) {
            self.postMessage({ type: 'ERROR', payload: 'No tree generated yet. Generate a tree first.' });
            return;
        }

        try {
            // Get scale from payload (modelScale like 200 for 1:200)
            // We need to convert meters to the print size: divide by scale
            const modelScale = payload?.modelScale ?? 1;
            const scaleFactor = 1 / modelScale;

            const mesh = currentSolid.getMesh();

            // Scale vertices for export (internal units are meters, output in meters/scale)
            // e.g. 15m tree at 1:200 → 0.075m = 75mm in the STL
            const scaledVertProperties = new Float32Array(mesh.vertProperties.length);
            for (let i = 0; i < mesh.vertProperties.length; i++) {
                scaledVertProperties[i] = mesh.vertProperties[i] * scaleFactor;
            }

            // Create a scaled mesh copy for export
            const scaledMesh = {
                ...mesh,
                vertProperties: scaledVertProperties
            };

            const stlBuffer = meshToSTL(scaledMesh);

            self.postMessage({
                type: 'STL_READY',
                payload: stlBuffer
            }, { transfer: [stlBuffer] }); // Transfer ownership for efficiency
        } catch (err: any) {
            self.postMessage({ type: 'ERROR', payload: 'STL export failed: ' + err.message });
        }
    }
};
