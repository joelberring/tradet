import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTreeStore } from '../store/useTreeStore';
import { RealisticTreeGenerator } from '../engine/botanisten/realisticTree';
import { AttractorGenerator } from '../engine/fysikern/attractors';

// Bridge to Web Worker
const worker = new Worker(new URL('../engine/manifold.worker.ts', import.meta.url), { type: 'module' });

export const Tree = () => {
    const settings = useTreeStore((state) => state);
    const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const treeGenerator = useRef(new RealisticTreeGenerator());

    useEffect(() => {
        console.log('[Tree] Initializing worker...');
        worker.postMessage({ type: 'INIT' });

        const handleMessage = (e: MessageEvent) => {
            const { type, payload } = e.data;
            console.log('[Tree] Worker message:', type);
            if (type === 'TREE_READY') {
                console.log('[Tree] TREE_READY received, vertices:', payload.vertices?.length, 'indices:', payload.indices?.length);
                const { vertices, indices } = payload;
                const newGeo = new THREE.BufferGeometry();
                newGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                newGeo.setIndex(new THREE.BufferAttribute(indices, 1));
                newGeo.computeVertexNormals();
                setGeometry(newGeo);
                setIsGenerating(false);
            }
            if (type === 'READY') {
                console.log('[Tree] Worker READY, triggering initial generation');
                useTreeStore.getState().setWorkerReady(true);
                useTreeStore.getState().generate();
            }
            if (type === 'STL_READY') {
                console.log('[Tree] STL_READY received, downloading file...');
                const blob = new Blob([payload], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tree.stl';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            if (type === 'ERROR') {
                console.error('[Tree] Worker ERROR:', payload);
                setIsGenerating(false);
            }
        };

        const handleGenerateEvent = () => {
            console.log('[Tree] GENERATE_TREE event received, calling generate()');
            useTreeStore.getState().generate();
        };

        const handleExportEvent = () => {
            console.log('[Tree] EXPORT_STL event received, requesting export...');
            worker.postMessage({ type: 'EXPORT_STL' });
        };

        worker.addEventListener('message', handleMessage);
        window.addEventListener('GENERATE_TREE', handleGenerateEvent);
        window.addEventListener('EXPORT_STL', handleExportEvent);

        return () => {
            worker.removeEventListener('message', handleMessage);
            window.removeEventListener('GENERATE_TREE', handleGenerateEvent);
            window.removeEventListener('EXPORT_STL', handleExportEvent);
        };
    }, []);

    useEffect(() => {
        console.log('[Tree] Generation effect triggered, workerReady:', settings.workerReady, 'triggerGeneration:', settings.triggerGeneration);
        if (isGenerating) {
            console.log('[Tree] Already generating, skipping');
            return;
        }
        if (!settings.workerReady) {
            console.log('[Tree] Worker not ready yet, skipping generation');
            return;
        }

        const timer = setTimeout(() => {
            console.log('[Tree] Starting tree generation...');
            setIsGenerating(true);
            let branches: any[] = [];

            if (settings.generationMode === 'realistic') {
                console.log('[Tree] Generating realistic tree:', settings.treeSpecies, settings.treeAge);

                branches = treeGenerator.current.generateTree({
                    treeHeight: settings.treeHeight,
                    minRadius: settings.minPrintableRadius,
                    seed: settings.triggerGeneration,
                    preset: settings.treeSpecies,
                    age: settings.treeAge,
                    crownWidth: settings.crownWidth,
                });

                console.log('[Tree] Generated', branches.length, 'realistic segments');
            } else {
                // Abstract mode - attractors
                const points = AttractorGenerator.generate(
                    settings.attractorType,
                    settings.attractorIterations,
                    0.02
                );
                for (let i = 0; i < points.length - 1; i++) {
                    branches.push({
                        start: [points[i].x, points[i].y, points[i].z],
                        end: [points[i + 1].x, points[i + 1].y, points[i + 1].z],
                        r1: settings.initialRadius * 0.1,
                        r2: settings.initialRadius * 0.1
                    });
                }
            }

            console.log('[Tree] Sending GENERATE_TREE to worker with', branches.length, 'branches');
            worker.postMessage({
                type: 'GENERATE_TREE',
                payload: { branches, foliage: [] } // No separate foliage - all in branches
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [
        settings.workerReady,
        settings.triggerGeneration,
        settings.generationMode,
        settings.treeSpecies,
        settings.treeAge,
        settings.treeHeight,
        settings.crownWidth,
        settings.recursionDepth,
        settings.minPrintableRadius,
        settings.targetScale,
        settings.attractorType,
        settings.attractorIterations,
    ]);

    if (!geometry) return null;

    // Light green/white color similar to the physical models
    const meshColor = settings.generationMode === 'realistic' ? "#c8d8c0" : "#4488ff";

    return (
        <group scale={[settings.targetScale, settings.targetScale, settings.targetScale]}>
            <mesh geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial color={meshColor} metalness={0.1} roughness={0.9} />
            </mesh>
        </group>
    );
};


