export interface AttractorPoint {
    x: number;
    y: number;
    z: number;
}

export class AttractorGenerator {
    // Thomas Attractor parameters
    static thomas(x: number, y: number, z: number, b: number = 0.2081) {
        return {
            dx: -b * x + Math.sin(y),
            dy: -b * y + Math.sin(z),
            dz: -b * z + Math.sin(x)
        };
    }

    // Aizawa Attractor parameters
    static aizawa(x: number, y: number, z: number, a: number = 0.95, b: number = 0.7, c: number = 0.6, d: number = 3.5, e: number = 0.25, f: number = 0.1) {
        return {
            dx: (z - b) * x - d * y,
            dy: d * x + (z - b) * y,
            dz: c + a * z - (Math.pow(z, 3) / 3) - (Math.pow(x, 2) + Math.pow(y, 2)) * (1 + e * z) + f * z * Math.pow(x, 3)
        };
    }

    static generate(type: 'thomas' | 'aizawa', iterations: number, dt: number): AttractorPoint[] {
        const points: AttractorPoint[] = [];
        let x = 0.1, y = 0.1, z = 0.1;

        for (let i = 0; i < iterations; i++) {
            // RK4 Integration
            const k1 = type === 'thomas' ? this.thomas(x, y, z) : this.aizawa(x, y, z);

            const k2 = type === 'thomas'
                ? this.thomas(x + k1.dx * dt / 2, y + k1.dy * dt / 2, z + k1.dz * dt / 2)
                : this.aizawa(x + k1.dx * dt / 2, y + k1.dy * dt / 2, z + k1.dz * dt / 2);

            const k3 = type === 'thomas'
                ? this.thomas(x + k2.dx * dt / 2, y + k2.dy * dt / 2, z + k2.dz * dt / 2)
                : this.aizawa(x + k2.dx * dt / 2, y + k2.dy * dt / 2, z + k2.dz * dt / 2);

            const k4 = type === 'thomas'
                ? this.thomas(x + k3.dx * dt, y + k3.dy * dt, z + k3.dz * dt)
                : this.aizawa(x + k3.dx * dt, y + k3.dy * dt, z + k3.dz * dt);

            x += (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
            y += (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
            z += (dt / 6) * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz);

            points.push({ x, y, z });
        }

        return points;
    }
}
