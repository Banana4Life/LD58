import {Models} from "./models";
import {
    // Clock,
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
    const camera = new PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.translateY(100)
    const renderer = new WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const grid = new GridHelper(2000, 20, 0x000000, 0x000000)
    grid.material.opacity = 0.8;
    grid.material.transparent = true;
    scene.add( grid );

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableRotate = false
    orbitControls.enableZoom = true
    orbitControls.screenSpacePanning = false
    orbitControls.minAzimuthAngle = 0
    orbitControls.maxAzimuthAngle = 0
    orbitControls.minPolarAngle = Math.PI / 8
    orbitControls.maxPolarAngle = orbitControls.minPolarAngle
    orbitControls.minDistance = 10
    orbitControls.maxDistance = 20
    orbitControls.listenToKeyEvents(window)
    orbitControls.update()

    // const material = new MeshBasicMaterial({
    //     color: Color.NAMES.green,
    // });
    // const plane = new Mesh(new PlaneGeometry(10, 10), material)
    // plane.rotation.setFromRotationMatrix()
    const cube = Models.Hexagon;
    cube.scale.multiplyScalar(0.06)
    cube.quaternion.setFromAxisAngle({x: 1, y: 0, z: 0}, Math.PI / 2)
    scene.add(cube);

    //const clock = new Clock()

    function animate(): void {
        //const dt = clock.getDelta()

        renderer.render(scene, camera);

        requestAnimationFrame(animate);
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