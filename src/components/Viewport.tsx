import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid } from '@react-three/drei';
import { Suspense } from 'react';
import { Tree } from './Tree';

export const Viewport = () => {
    return (
        <div style={{ width: '100%', height: '100vh', background: '#111' }}>
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[10, 10, 10]} />
                <OrbitControls makeDefault />

                <Suspense fallback={null}>
                    <Environment preset="city" />
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

                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} castShadow />

                    <Tree />
                </Suspense>
            </Canvas>
        </div>
    );
};
