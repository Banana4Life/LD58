import * as THREE from 'three';
import {BufferGeometry, CanvasTexture, Points, Vector3} from "three";

export class ParticleSpawner {
    private positions: Float32Array;
    private colors: Float32Array;
    private lifetimes: number[];
    private alpha: number[];
    private velocity: Vector3[];
    // private icon: string;

    private maxCount: number;
    private scene: THREE.Scene;

    private geometry = new THREE.BufferGeometry();

    constructor(scene: THREE.Scene, icon: string, maxCount: number) {
        this.scene = scene;
        // this.icon = icon;
        // maxCount = 1
        this.maxCount = maxCount;
        this.positions = new Float32Array(maxCount * 3);
        this.colors = new Float32Array(maxCount * 4);

        this.lifetimes = new Array(maxCount).fill(0);
        this.alpha = new Array(maxCount).fill(0);
        this.velocity = new Array(maxCount).fill(new Vector3(0,0,0,));

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));

        let particles = this.createTextParticle(this.geometry, icon)

        this.scene.add(particles);
    }

    spawn(position: Vector3) {
        const idx = this.alpha.findIndex(alpha => alpha <= 0);
        if (idx !== -1) {
            // console.log("spawn", this.icon, idx)
            this.lifetimes[idx] = 3;
            this.alpha[idx] = 1;
            this.velocity[idx].x = (Math.random() - 0.5) * 2;
            this.velocity[idx].y = 0.2;
            this.velocity[idx].z = (Math.random() - 0.5) * 2;

            this.positions[idx * 3] = position.x;
            this.positions[idx * 3 + 1] = position.y;
            this.positions[idx * 3 + 2] = position.z;

            this.colors[idx * 4 + 0] = 1;
            this.colors[idx * 4 + 1] = 1;
            this.colors[idx * 4 + 2] = 1;
            this.colors[idx * 4 + 3] = 0;
        }
    }

    update(dt: number) {
        for (let idx = 0; idx < this.maxCount; idx++) {
            let lifetime = this.updateLifeTime(idx, dt);

            let alphaIdx = idx * 4 + 3;
            let alphaChannel = this.alpha[idx]
            // let alphaChannel = this.colors[alphaIdx]
            if (lifetime > 0) { // blend in
                this.moveParticle(idx, dt);

                alphaChannel += dt * 3;
                if (alphaChannel > 1) {
                    alphaChannel = 1
                }
                this.colors[alphaIdx] = 1
            } else {
                // blend out
                alphaChannel -= dt * 2;
                if (alphaChannel <= 0) {
                    alphaChannel = 0
                    this.colors[alphaIdx] = alphaChannel
                }
            }
            if (alphaChannel > 0) {
                this.moveParticle(idx, dt);
            } else {
                this.positions[idx * 3 + 1] = -1000;
            }
            this.alpha[idx] = alphaChannel
            this.colors[alphaIdx] = alphaChannel
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }

    private updateLifeTime(idx: number, dt: number) {
        let lifetime = this.lifetimes[idx];
        lifetime -= dt;
        this.lifetimes[idx] = lifetime
        return lifetime;
    }

    private moveParticle(idx: number, dt: number) {
        let xPos = idx * 3;
        let yPos = idx * 3 + 1;
        let zPos = idx * 3 + 2;
        this.positions[yPos] += this.velocity[idx].y * dt;

        let velocityX = this.velocity[idx].x;
        let velocityZ = this.velocity[idx].z;
        velocityX += (Math.random() - 0.5) * dt;
        velocityZ += (Math.random() - 0.5) * dt;
        this.velocity[idx].x = velocityX;
        this.velocity[idx].z = velocityZ;

        this.positions[xPos] += velocityX * dt / 5;
        this.positions[zPos] += velocityZ * dt / 5;
    }

    /**
     * Creates a fixed particle cloud in the shape of a smiley face using text rendering.
     * Easy to use: just call createSmileyParticles() and add to your scene.
     */
    createTextParticle(geometry: BufferGeometry, icon: string) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = 70
        canvas.height = 60
        ctx.font = "50px Arial" ;
        ctx.textBaseline = "top";
        ctx.fillStyle = "black";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillText(icon, 5, 5);
        let texture = new CanvasTexture(canvas)

        const material = new THREE.PointsMaterial({
            map: texture,
            size: 15,
            vertexColors: true,
            transparent: true,
            alphaTest: 0.5,
        });
        return new Points(geometry, material)
    }


}
