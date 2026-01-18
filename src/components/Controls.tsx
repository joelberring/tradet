import { useControls, folder, button } from 'leva';
import { useTreeStore, type TreeSettings, type TreeSpecies, type TreeAge } from '../store/useTreeStore';
import { useEffect } from 'react';

export const Controls = () => {
    const updateSettings = useTreeStore((state) => state.updateSettings);

    const [values, set] = useControls(() => ({
        'Generate Tree 🌳': button(() => {
            window.dispatchEvent(new CustomEvent('GENERATE_TREE'));
        }),
        'Export STL 📥': button(() => {
            window.dispatchEvent(new CustomEvent('EXPORT_STL'));
        }),
        Mode: folder({
            generationMode: { value: 'realistic', options: ['realistic', 'abstract'] },
        }),
        // NEW: Tree species and age controls
        'Trädart': folder({
            treeSpecies: {
                value: 'linden' as TreeSpecies,
                options: {
                    'Lind (Tilia cordata)': 'linden',
                    'Ek (Quercus robur)': 'oak',
                    'Björk (Betula)': 'birch',
                    'Gran (Picea abies)': 'spruce',
                    'Tall (Pinus sylvestris)': 'pine',
                },
                label: 'Art',
                render: (get) => get('Mode.generationMode') === 'realistic'
            },
            treeAge: {
                value: 'mature' as TreeAge,
                options: {
                    'Ung (10-20 år)': 'young',
                    'Mogen (30-60 år)': 'mature',
                    'Gammal (100+ år)': 'old',
                },
                label: 'Ålder',
                render: (get) => get('Mode.generationMode') === 'realistic'
            },
            treeHeight: {
                value: 15,
                min: 5,
                max: 30,
                step: 1,
                label: 'Trädhöjd (m)',
                render: (get) => get('Mode.generationMode') === 'realistic'
            },
            crownWidth: {
                value: 1.0,
                min: 0.5,
                max: 2.0,
                step: 0.1,
                label: 'Kronbredd',
                render: (get) => get('Mode.generationMode') === 'realistic'
            },
            trunkHeight: {
                value: 3,
                min: 1,
                max: 10,
                step: 0.5,
                label: 'Grenstart (m)',
                render: (get) => get('Mode.generationMode') === 'realistic'
            },
            crownDensity: {
                value: 5,
                min: 1,
                max: 10,
                step: 1,
                label: 'Kronfyllnad',
                hint: '(antal grenar)',
                render: (get) => get('Mode.generationMode') === 'realistic'
            },
        }, { collapsed: false }),
        // Branching detail controls
        'Grenstruktur': folder({
            recursionDepth: {
                value: 7,
                min: 3,
                max: 10,
                step: 1,
                label: 'Grennivåer',
                render: (get) => get('Mode.generationMode') === 'realistic'
            },
            minPrintableRadius: {
                value: 0.05,
                min: 0.01,
                max: 0.3,
                step: 0.01,
                label: 'Min grenradie',
                render: (get) => get('Mode.generationMode') === 'realistic'
            },
        }, { collapsed: true }),
        // Physical/print settings
        'Utskrift': folder({
            modelScale: {
                label: 'Skala (1:X)',
                value: 200,
                options: {
                    '1:50': 50,
                    '1:100': 100,
                    '1:200': 200,
                    '1:400': 400,
                    '1:500': 500,
                    '1:1000': 1000
                }
            },
            printHeight: {
                label: 'Höjd i utskrift',
                value: '75.0 mm',
                editable: false,
            },
            minThickness: {
                label: 'Min tjocklek',
                value: '0.40 mm',
                editable: false,
            },
            nozzleDiameter: { value: 0.4, min: 0.1, max: 1.0, step: 0.1, label: 'Munstycke (mm)' },
            targetScale: { value: 1.0, min: 0.1, max: 10.0, step: 0.1, label: 'Exportskala' },
        }, { collapsed: false }),
        // Abstract mode settings
        Abstract: folder({
            attractorType: { value: 'thomas', options: ['thomas', 'aizawa'], render: (get) => get('Mode.generationMode') === 'abstract' },
            attractorIterations: { value: 1000, min: 100, max: 10000, step: 100, render: (get) => get('Mode.generationMode') === 'abstract' },
        }, { collapsed: true }),
    }));

    useEffect(() => {
        updateSettings(values as Partial<TreeSettings>);

        // Update read-only displays
        const printH = ((values.treeHeight * 1000) / values.modelScale).toFixed(1);

        // Calculate effective min thickness (2mm floor for printability)
        const minPrintDiameter = 2; // 2mm minimum for 3D printing
        const userMinDiameter = (values.minPrintableRadius * 2 * 1000) / values.modelScale;
        const effectiveMinDiameter = Math.max(userMinDiameter, minPrintDiameter);

        set({
            printHeight: `${printH} mm`,
            minThickness: `${effectiveMinDiameter.toFixed(1)} mm`
        });
    }, [values, updateSettings, set]);

    return null;
};
