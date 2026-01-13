import { Vector3, Quaternion } from 'three';

interface Branch {
    start: [number, number, number];
    end: [number, number, number];
    r1: number;
    r2: number;
}


export class Botanist {
    constructor() { }

    generateString(axiom: string, depth: number, branchingFactor: number = 2): string {
        // Dynamic rule generation based on branching factor
        // Default: 'FF-[-F+F+F]+[+F-F-F]' has 2 major branching points
        // Let's create a rule that has 'branchingFactor' branches
        let branchStr = '';
        for (let i = 0; i < branchingFactor; i++) {
            const angleSign = i % 2 === 0 ? '+' : '-';
            branchStr += `[${angleSign}F]`;
        }
        const rule = 'FF' + branchStr;

        let current = axiom;
        for (let i = 0; i < depth; i++) {
            let next = '';
            for (const char of current) {
                if (char === 'F') {
                    next += rule;
                } else {
                    next += char;
                }
            }
            current = next;
        }
        return current;
    }

    interpret(
        str: string,
        initialRadius: number,
        thicknessDecay: number,
        lengthDecay: number,
        minPrintableRadius: number,
        targetScale: number,
        gravitropism: number
    ): Branch[] {
        const branches: Branch[] = [];
        const stateStack: any[] = [];

        let currentPos = new Vector3(0, 0, 0);
        let currentQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0);
        let currentRadius = initialRadius;
        let currentLength = 1.0;

        const up = new Vector3(0, 1, 0);
        const right = new Vector3(1, 0, 0);
        const forward = new Vector3(0, 0, 1);

        const angle = (Math.PI / 180) * 25; // Default 25 degrees

        for (const char of str) {
            // Check for physical pruning
            const physicalRadius = currentRadius * targetScale;
            if (physicalRadius < minPrintableRadius * 0.5) {
                // Too thin to even bother, but we might want to "clamp"
                // For now, let's keep going if it's close, or prune if very small
            }

            switch (char) {
                case 'F':
                    // Move forward and create branch
                    const step = new Vector3(0, currentLength, 0).applyQuaternion(currentQuat);

                    // Apply Gravitropism
                    if (gravitropism !== 0) {
                        const gravEffect = new Vector3(0, gravitropism, 0);
                        step.add(gravEffect).normalize().multiplyScalar(currentLength);
                        // Update quaternion to match new direction
                        const targetQuat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), step.clone().normalize());
                        currentQuat.slerp(targetQuat, 0.5);
                    }

                    const nextPos = currentPos.clone().add(step);

                    // Da Vinci Rule calculation for next radius
                    // Actually, for a single segment F, the radius doesn't change much
                    // unless we split. But we'll apply a slight taper.
                    const nextRadius = currentRadius * Math.pow(0.5, 1 / thicknessDecay); // Placeholder for taper

                    branches.push({
                        start: [currentPos.x, currentPos.y, currentPos.z],
                        end: [nextPos.x, nextPos.y, nextPos.z],
                        r1: Math.max(currentRadius, minPrintableRadius / targetScale),
                        r2: Math.max(nextRadius, minPrintableRadius / targetScale)
                    });

                    currentPos = nextPos;
                    currentRadius = nextRadius;
                    currentLength *= lengthDecay;
                    break;

                case '+':
                    currentQuat.multiply(new Quaternion().setFromAxisAngle(right, angle));
                    break;
                case '-':
                    currentQuat.multiply(new Quaternion().setFromAxisAngle(right, -angle));
                    break;
                case '&':
                    currentQuat.multiply(new Quaternion().setFromAxisAngle(forward, angle));
                    break;
                case '^':
                    currentQuat.multiply(new Quaternion().setFromAxisAngle(forward, -angle));
                    break;
                case '\\':
                    currentQuat.multiply(new Quaternion().setFromAxisAngle(up, angle));
                    break;
                case '/':
                    currentQuat.multiply(new Quaternion().setFromAxisAngle(up, -angle));
                    break;
                case '[':
                    stateStack.push({
                        pos: currentPos.clone(),
                        quat: currentQuat.clone(),
                        radius: currentRadius,
                        length: currentLength
                    });
                    break;
                case ']':
                    const state = stateStack.pop();
                    if (state) {
                        currentPos = state.pos;
                        currentQuat = state.quat;
                        currentRadius = state.radius;
                        currentLength = state.length;
                    }
                    break;
            }
        }

        return branches;
    }
}
