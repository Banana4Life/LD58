import * as THREE from 'three';
import {BufferGeometry, CanvasTexture, Points} from "three";

export class ParticleSpawner {
    private positions: Float32Array;
    private colors: Float32Array;
    private lifetimes: number[];
    private alpha: number[];


    private maxCount: number;
    private speed: number;
    private scene: THREE.Scene;

    private geometry = new THREE.BufferGeometry();

    constructor(scene: THREE.Scene, icon: string, maxCount: number) {
        this.scene = scene;
        this.maxCount = maxCount;
        this.speed = 0.05;
        this.positions = new Float32Array(maxCount * 3);
        this.colors = new Float32Array(maxCount * 4);

        this.lifetimes = new Array(maxCount).fill(0);
        this.alpha = new Array(maxCount).fill(0);

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));

        let particles = this.createTextParticle(this.geometry, icon)

        this.scene.add(particles);
    }

    spawn(position: THREE.Vector3) {
        const idx = this.alpha.findIndex(alpha => alpha <= 0);
        if (idx !== -1) {
            this.lifetimes[idx] = 5;
            this.alpha[idx] = 1;

            this.positions[idx * 3] = position.x;
            this.positions[idx * 3 + 1] = position.y;
            this.positions[idx * 3 + 2] = position.z;

            this.colors[idx * 4 + 0] = 1;
            this.colors[idx * 4 + 1] = 1;
            this.colors[idx * 4 + 2] = 1;
            this.colors[idx * 4 + 3] = 1;
        }
    }

    update(dt: number) {
        for (let idx = 0; idx < this.maxCount; idx++) {
            this.lifetimes[idx] -= dt

            let yPos = idx * 3 + 1;
            this.positions[yPos] += this.speed;

            if (this.lifetimes[idx] <= 0) {
                this.colors[idx * 4 + 3] -= dt * 2;
                this.alpha[idx] -= dt * 2
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }

    /**
     * Creates a fixed particle cloud in the shape of a smiley face using text rendering.
     * Easy to use: just call createSmileyParticles() and add to your scene.
     */
    createTextParticle(geometry: BufferGeometry, icon: string) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = 50
        canvas.height = 50
        ctx.font = "50px Arial" ;
        ctx.textBaseline = "top";
        ctx.fillStyle = "black";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillText(icon, 0, 0);
        let texture = new CanvasTexture(canvas)

        // === MATERIAL ===
        const material = new THREE.PointsMaterial({
            map: texture,
            size: 4,
            vertexColors: true,
            transparent: true,
        });
        return new Points(geometry, material)
    }


}
