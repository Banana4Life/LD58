import {Models} from "./models";
import {
    Box3,
    Color, ColorRepresentation, DirectionalLight,
    GridHelper, HemisphereLight, Mesh, MeshLambertMaterial, MeshPhongMaterial,
    Object3D,
    PerspectiveCamera, Quaternion,
    Scene, Texture, TextureLoader,
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

function setTexture(mesh: Mesh, names: string[], texture: Texture, tint: ColorRepresentation) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (let material of materials) {
        if (names.indexOf(material.name) !== -1) {
            if (material instanceof MeshPhongMaterial) {
                material.map = texture
                material.color = new Color(tint)
                material.specular = new Color(tint)
                material.shininess = 20
                material.flatShading = true
                material.needsUpdate = true
            } else if (material instanceof MeshLambertMaterial) {
                material.map = texture
                material.color = new Color(tint)
                material.needsUpdate = true
            }
        }
    }
}

function createHex(coord: CubeCoord, textureLoader: TextureLoader): Object3D {
    const hex = Models.Hexagon.clone();

    const childMesh = hex.children[0] as Mesh
    const texture = textureLoader.load("https://banana4.life/ld58/imageProxy/aHR0cHM6Ly9zdGF0aWMuamFtLmhvc3QvY29udGVudC82MjEvei8xNzRmZi5qcGcuNDgweDM4NC5maXQuanBn.404186b38e0e43ab2456896b32af2f1668556ab8", (t) => {
        t.anisotropy = 16
    })
    setTexture(childMesh, ["hex-triangle-1", "hex-triangle-2", "hex-triangle-3", "hex-triangle-4", "hex-triangle-5", "hex-triangle-6", "border"], texture, Color.NAMES.white)

    const a = new Quaternion()
    a.setFromAxisAngle({x: 1, y: 0, z: 0}, Math.PI / 2);
    const b = new Quaternion()
    b.setFromAxisAngle({x: 0, y: 0, z: 1}, Math.PI / 3);
    hex.setRotationFromQuaternion(a.multiply(b))
    const {x, y, z} = coord.toWorld(0, {x: gridSize.x, y: 0, z: gridSize.y})
    hex.position.set(x, y, z)
    return hex
}

export function setupScene()
{
    const textureLoader = new TextureLoader()
    // Scene setup
    const scene = new Scene();
    scene.background = new Color(Color.NAMES.red)
    const camera = new PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.translateY(100)
    const renderer = new WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const grid = new GridHelper(2000, 20, 0x000000, 0x000000)
    grid.material.opacity = 0.8;
    grid.material.transparent = true;
    scene.add( grid );

    // const light = new AmbientLight(Color.NAMES.white, 5.0)
    // const light = new DirectionalLight(Color.NAMES.white, 0.5)
    scene.add(new DirectionalLight(Color.NAMES.white, 0.05))
    const light = new HemisphereLight( Color.NAMES.white, 0x00ff00, 1 );
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
    for (let cubeCoord of CubeCoord.ORIGIN.spiralAround(0, 40)) {
        scene.add(createHex(cubeCoord, textureLoader));
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