import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid } from '@react-three/drei';
import { Suspense } from 'react';
import { Tree } from './Tree';

export const Viewport = () => {
    return (
        <div style={{ width: '100%', height: '100vh', background: '#111' }}>
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[25, 12, 25]} fov={50} />
                <OrbitControls makeDefault target={[0, 6, 0]} />

                <Grid
                    infiniteGrid
                    fadeDistance={50}
                    fadeStrength={5}
                    sectionThickness={1}
                    cellSize={1}
                    sectionSize={5}
                    cellColor="#444"
                    sectionColor="#666"
                />

                <ambientLight intensity={0.7} />
                <pointLight position={[10, 20, 10]} castShadow intensity={1.5} />

                <Suspense fallback={null}>
                    <Environment preset="city" />
                    <Tree />
                </Suspense>
            </Canvas>
        </div>
    );
};
