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
        worker.postMessage({ type: 'INIT' });

        const handleMessage = (e: MessageEvent) => {
            const { type, payload } = e.data;
            if (type === 'TREE_READY') {
                const { vertices, indices } = payload;
                const newGeo = new THREE.BufferGeometry();
                newGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                newGeo.setIndex(new THREE.BufferAttribute(indices, 1));
                newGeo.computeVertexNormals();
                setGeometry(newGeo);
                setIsGenerating(false);
            }
        };

        worker.addEventListener('message', handleMessage);
        return () => worker.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        if (isGenerating) return;

        setIsGenerating(true);
        let branches = [];

        if (settings.generationMode === 'realistic') {
            const lString = botanist.current.generateString('F', settings.recursionDepth);
            branches = botanist.current.interpret(
                lString,
                settings.initialRadius,
                settings.thicknessDecay,
                settings.lengthDecay,
                settings.minPrintableRadius,
                settings.targetScale,
                settings.gravitropism
            );
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

        worker.postMessage({
            type: 'GENERATE_TREE',
            payload: { branches }
        });
    }, [settings]);

    if (!geometry) return null;

    return (
        <group scale={[settings.targetScale, settings.targetScale, settings.targetScale]}>
            <mesh geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial color={settings.generationMode === 'realistic' ? "#8B4513" : "#4488ff"} metalness={0.2} roughness={0.8} />
            </mesh>
        </group>
    );
};
