import {Models} from "./models";
import {
    Clock,
    Color, GridHelper,
    PerspectiveCamera,
    Scene,
    WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

export function setupScene()
{
    // Scene setup
    const scene = new Scene();
    scene.background = new Color(Color.NAMES.red)
    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.translateY(100)
    const renderer = new WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const grid = new GridHelper(2000, 20, 0x000000, 0x000000)
    grid.material.opacity = 0.8;
    grid.material.transparent = true;
    scene.add( grid );

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.update()
    orbitControls.listenToKeyEvents(window)

    // const material = new MeshBasicMaterial({
    //     color: Color.NAMES.green,
    // });
    // const plane = new Mesh(new PlaneGeometry(10, 10), material)
    // plane.rotation.setFromRotationMatrix()
    const cube = Models.Hexagon;
    cube.scale.multiplyScalar(0.06)
    scene.add(cube);

    camera.position.z = 5;

    let rotationPerSecond = .3
    let angle = 0
    const clock = new Clock()

    function animate(): void {
        const dt = clock.getDelta()
        requestAnimationFrame(animate);

        angle = (angle + 2 * Math.PI * rotationPerSecond * dt) % (2 * Math.PI)
        cube.quaternion.setFromAxisAngle({x: 0, y: 1, z: 0}, angle)

        renderer.render(scene, camera);
    }

// Handle window resize
    const onWindowResize = (): void => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onWindowResize, false);

    // Start animation loop
    requestAnimationFrame(animate)
}