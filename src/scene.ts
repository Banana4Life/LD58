import {Models} from "./models";
import {
    AmbientLight,
    Box3,
    Color,
    GridHelper,
    Object3D,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {CubeCoord} from "./util/tilegrid.ts";

function getSize(obj: Object3D): Vector3 {
    const bounds = new Box3().setFromObject(obj)
    const size = new Vector3()
    bounds.getSize(size)
    return size
}

const gridSize = getSize(Models.Hexagon)

function createHex(coord: CubeCoord): Object3D {
    const hex = Models.Hexagon.clone();
    hex.quaternion.setFromAxisAngle({x: 1, y: 0, z: 0}, Math.PI / 2);
    const {x, y, z} = coord.toWorld(0, {x: gridSize.x, y: 0, z: gridSize.y})
    hex.position.set(x, y, z)
    return hex
}

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

    const light = new AmbientLight(Color.NAMES.white, 5.0)
    scene.add(light)

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableRotate = false
    orbitControls.enableZoom = true
    orbitControls.screenSpacePanning = false
    orbitControls.minAzimuthAngle = 0
    orbitControls.maxAzimuthAngle = 0
    orbitControls.minPolarAngle = Math.PI / 10
    orbitControls.maxPolarAngle = orbitControls.minPolarAngle
    orbitControls.minDistance = 100
    orbitControls.maxDistance = 200
    orbitControls.listenToKeyEvents(window)
    orbitControls.update()

    // const material = new MeshBasicMaterial({
    //     color: Color.NAMES.green,
    // });
    // const plane = new Mesh(new PlaneGeometry(10, 10), material)
    // plane.rotation.setFromRotationMatrix()
    console.log([...CubeCoord.ORIGIN.spiralAround(0, 40)].length)
    for (let cubeCoord of CubeCoord.ORIGIN.spiralAround(0, 40)) {
        scene.add(createHex(cubeCoord));
    }

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