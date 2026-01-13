import { useControls, folder, button } from 'leva';
import { useTreeStore, type TreeSettings } from '../store/useTreeStore';
import { useEffect } from 'react';

export const Controls = () => {
    const updateSettings = useTreeStore((state) => state.updateSettings);

    const [values] = useControls(() => ({
        'Generate Tree 🌳': button(() => {
            window.dispatchEvent(new CustomEvent('GENERATE_TREE'));
        }),
        'Export STL 📥': button(() => {
            window.dispatchEvent(new CustomEvent('EXPORT_STL'));
        }),
        Mode: folder({
            generationMode: { value: 'realistic', options: ['realistic', 'abstract'] },
        }),
        Realistic: folder({
            branchingFactor: { value: 2, min: 1, max: 4, step: 1, render: (get) => get('Mode.generationMode') === 'realistic' },
            recursionDepth: { value: 5, min: 1, max: 10, step: 1, render: (get) => get('Mode.generationMode') === 'realistic' },
            thicknessDecay: { value: 2.2, min: 1.5, max: 3.0, step: 0.1, render: (get) => get('Mode.generationMode') === 'realistic' },
            initialRadius: { value: 2.0, min: 0.1, max: 5.0, step: 0.1, render: (get) => get('Mode.generationMode') === 'realistic' },
            lengthDecay: { value: 0.8, min: 0.5, max: 0.95, step: 0.01, render: (get) => get('Mode.generationMode') === 'realistic' },
        }, { collapsed: false }),
        Abstract: folder({
            attractorType: { value: 'thomas', options: ['thomas', 'aizawa'], render: (get) => get('Mode.generationMode') === 'abstract' },
            attractorIterations: { value: 1000, min: 100, max: 10000, step: 100, render: (get) => get('Mode.generationMode') === 'abstract' },
        }, { collapsed: true }),
        Physical: folder({
            nozzleDiameter: { value: 0.4, min: 0.1, max: 1.0, step: 0.1 },
            minPrintableRadius: { value: 0.4, min: 0.1, max: 1.0, step: 0.1 },
            targetScale: { value: 1.0, min: 0.1, max: 10.0, step: 0.1 },
        }),
        Forces: folder({
            gravitropism: { value: 0.1, min: -1.0, max: 1.0, step: 0.05 },
        }),
    }));

    useEffect(() => {
        // cast to Partial<TreeSettings> safely
        updateSettings(values as Partial<TreeSettings>);
    }, [values, updateSettings]);

    return null;
};
