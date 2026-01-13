import initManifold from 'manifold-3d';

let manifold: any;
let mModule: any;

const initialize = async () => {
    console.log('Worker initialize() called');
    try {
        console.log('Calling initManifold...');
        mModule = await initManifold();
        console.log('mModule received, setting up...');
        mModule.setup();
        manifold = mModule;
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

    const result = mModule.union(left, right);
    // Cleanup intermediates
    left.delete();
    right.delete();
    return result;
};

const createBranch = (start: number[], end: number[], radiusStart: number, radiusEnd: number) => {
    const height = Math.sqrt(
        Math.pow(end[0] - start[0], 2) +
        Math.pow(end[1] - start[1], 2) +
        Math.pow(end[2] - start[2], 2)
    );

    if (height < 0.0001) return null;

    let cyl = mModule.cylinder(height, radiusStart, radiusEnd, 12);

    // Direction vector
    const dir = [
        (end[0] - start[0]) / height,
        (end[1] - start[1]) / height,
        (end[2] - start[2]) / height
    ];

    // Align Z-axis (cylinder default) with 'dir'
    const z = [0, 0, 1];
    const axis = [
        z[1] * dir[2] - z[2] * dir[1],
        z[2] * dir[0] - z[0] * dir[2],
        z[0] * dir[1] - z[1] * dir[0]
    ];

    const axisLen = Math.sqrt(axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2);
    const dot = z[0] * dir[0] + z[1] * dir[1] + z[2] * dir[2];

    if (axisLen > 0.0001) {
        const normalizedAxis = [axis[0] / axisLen, axis[1] / axisLen, axis[2] / axisLen];
        const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
        cyl = cyl.rotate([0, 0, 0], normalizedAxis, angle);
    } else if (dot < -0.999) {
        // Opposite direction
        cyl = cyl.rotate([0, 0, 0], [1, 0, 0], 180);
    }

    return cyl.translate([start[0], start[1], start[2]]);
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
            const { branches } = payload;
            const solids = [];

            for (const b of branches) {
                const segment = createBranch(b.start, b.end, b.r1, b.r2);
                if (segment) solids.push(segment);
            }

            if (solids.length === 0) {
                self.postMessage({ type: 'ERROR', payload: 'No geometry generated' });
                return;
            }

            const finalSolid = binaryUnion(solids);
            const mesh = finalSolid.getMesh();

            self.postMessage({
                type: 'TREE_READY',
                payload: {
                    vertices: mesh.vertPos,
                    indices: mesh.triVerts
                }
            });

            finalSolid.delete();
        } catch (err: any) {
            self.postMessage({ type: 'ERROR', payload: err.message });
        }
    }
    if (type === 'EXPORT_STL') {
        // finalSolid needs to be accessible here. 
        // Note: finalSolid is currently local to GENERATE_TREE block. 
        // I need to move it to a higher scope to support export.
        self.postMessage({ type: 'ERROR', payload: 'Export not yet refactored for global scope' });
    }
};

