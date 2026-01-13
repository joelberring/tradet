import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTreeStore } from '../store/useTreeStore';
import { Botanist } from '../engine/botanisten/lsystem';
import { AttractorGenerator } from '../engine/fysikern/attractors';

// Bridge to Web Worker
const worker = new Worker(new URL('../engine/manifold.worker.ts', import.meta.url), { type: 'module' });

export const Tree = () => {
    const settings = useTreeStore((state) => state);
    const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const botanist = useRef(new Botanist());

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
            if (type === 'ERROR') {
                console.error('[Tree] Worker ERROR:', payload);
            }
        };

        // Listen for Generate Tree button click
        const handleGenerateEvent = () => {
            console.log('[Tree] GENERATE_TREE event received, calling generate()');
            useTreeStore.getState().generate();
        };

        worker.addEventListener('message', handleMessage);
        window.addEventListener('GENERATE_TREE', handleGenerateEvent);

        return () => {
            worker.removeEventListener('message', handleMessage);
            window.removeEventListener('GENERATE_TREE', handleGenerateEvent);
        };
    }, []);

    useEffect(() => {
        console.log('[Tree] Generation effect triggered, workerReady:', settings.workerReady, 'triggerGeneration:', settings.triggerGeneration, 'isGenerating:', isGenerating);
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
                console.log('[Tree] Generating L-system string...');
                const lString = botanist.current.generateString('F', settings.recursionDepth, settings.branchingFactor);
                console.log('[Tree] L-string length:', lString.length);
                branches = botanist.current.interpret(
                    lString,
                    settings.initialRadius,
                    settings.thicknessDecay,
                    settings.lengthDecay,
                    settings.minPrintableRadius,
                    settings.targetScale,
                    settings.gravitropism
                );
                console.log('[Tree] Generated branches:', branches.length);
            } else {
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
                payload: { branches }
            });
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [
        settings.workerReady,
        settings.triggerGeneration,
        settings.generationMode,
        settings.branchingFactor,
        settings.recursionDepth,
        settings.thicknessDecay,
        settings.initialRadius,
        settings.lengthDecay,
        settings.minPrintableRadius,
        settings.targetScale,
        settings.gravitropism,
        settings.attractorType,
        settings.attractorIterations
    ]);

    if (!geometry) return null;

    return (
        <group scale={[settings.targetScale, settings.targetScale, settings.targetScale]}>
            <mesh geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial color={settings.generationMode === 'realistic' ? "#8B4513" : "#4488ff"} metalness={0.2} roughness={0.8} />
            </mesh>
        </group>
    );
};
