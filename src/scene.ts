import {Models} from "./models";
import {
    Box3,
    Clock,
    Color,
    ColorRepresentation,
    DirectionalLight,
    HemisphereLight,
    Mesh,
    MeshLambertMaterial,
    MeshPhongMaterial,
    Object3D,
    PerspectiveCamera,
    Raycaster,
    Scene,
    Texture,
    TextureLoader,
    Vector2,
    Vector3,
    WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {CubeCoord} from "./util/tilegrid.ts";
import {coordToKey, storage} from "./storage.ts";
import {damp} from "three/src/math/MathUtils";
import {ui} from "./ui.ts";

function getSize(obj: Object3D): Vector3 {
    const bounds = new Box3().setFromObject(obj)
    const size = new Vector3()
    bounds.getSize(size)
    return size
}

const HEX_GRID_OBJ = new Map<string, Object3D>()

const gridSize = getSize(Models.Hexagon.object)

function setTexture(mesh: Mesh, names: string[], texture: Texture, tint: ColorRepresentation) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (let i = 0; i < materials.length; i++){
        let material = materials[i];
        if (names.indexOf(material.name) !== -1) {
            if (material instanceof MeshPhongMaterial) {
                const copy = material.clone()
                copy.map = texture
                copy.color = new Color(tint)
                copy.specular = new Color(tint)
                copy.shininess = 20
                copy.flatShading = true
                copy.needsUpdate = true
                materials[i] = copy
            } else if (material instanceof MeshLambertMaterial) {
                const copy = material.clone()
                copy.map = texture
                copy.color = new Color(tint)
                copy.needsUpdate = true
                materials[i] = copy
            }
        }
    }
}

interface TileObjectData {
    readonly coord: CubeCoord
    readonly targetLevel: number
    readonly initialLevel: number
    readonly textureLoaded: Promise<Texture>
}

function isTileObjectData(data: any): data is TileObjectData {
    return 'coord' in data
}

function asTileObjectData(data: any): TileObjectData | undefined {
    if (isTileObjectData(data)) {
        return data
    }
    return undefined
}

function setCoverImage(obj: Object3D, textureLoader: TextureLoader, _coverUrl: string | null): Promise<Texture> {
    const coverUrl = !!_coverUrl ? _coverUrl : "https://banana4.life/ld58/imageProxy/aHR0cHM6Ly9zdGF0aWMuamFtLmhvc3QvY29udGVudC82MjEvei8xNzRmZi5qcGcuNDgweDM4NC5maXQuanBn.404186b38e0e43ab2456896b32af2f1668556ab8"
    const childMesh = obj.children[0] as Mesh
    return new Promise(resolve => {
        textureLoader.load(coverUrl, (t) => {
            t.anisotropy = 16
            setTexture(childMesh, ["hex-triangle-1", "hex-triangle-2", "hex-triangle-3", "hex-triangle-4", "hex-triangle-5", "hex-triangle-6", "border"], t, Color.NAMES.white)
            resolve(t)
        })
    })
}

function createHex(coord: CubeCoord, textureLoader: TextureLoader, coverUrl: string | null, fallFrom: number): Object3D {
    const hex = Models.Hexagon.object.clone(true);
    const targetLevel = 0
    const data: TileObjectData = {
        coord,
        targetLevel: targetLevel,
        initialLevel: fallFrom,
        textureLoaded: setCoverImage(hex, textureLoader, coverUrl)
    }
    hex.userData = data

    hex.setRotationFromQuaternion(Models.Hexagon.rotationToFlatten)
    const {x, y, z} = coord.toWorld(fallFrom, {x: gridSize.x, y: 0, z: gridSize.y})
    hex.position.set(x, y, z)
    return hex
}

function tileSpawner(scene: Scene, tilesPerSecond: number, fallDampening: number): [(dt: DOMHighResTimeStamp) => void, (obj: Object3D, next?: boolean) => Promise<void>] {
    let tileDelay = 1/tilesPerSecond
    const tileQueue: [Object3D, () => void][] = []

    const falling = new Map<number, () => void>()
    const epsilon = 0.05

    const update = (dt: DOMHighResTimeStamp) => {
        for (let [id, resolve] of falling) {
            const obj = scene.getObjectById(id)
            if (!obj) {
                falling.delete(id)
                resolve()
                continue
            }
            const userData = obj.userData
            if (!isTileObjectData(userData)) {
                falling.delete(id)
                resolve()
                continue
            }
            if (obj.position.y - epsilon <= userData.targetLevel) {
                obj.position.setY(userData.targetLevel)
                falling.delete(id)
                resolve()
                continue
            }


            //obj.position.setY(lerp(userData.initialLevel, userData.targetLevel, smootherstep(userData.fallingTime, 0, fallDuration)))
            obj.position.setY(damp(obj.position.y, userData.targetLevel, fallDampening, dt))
        }

        if (tileDelay <= 0) {
            const item = tileQueue.shift()
            if (item) {
                const [queuedTile, resolve] = item
                falling.set(queuedTile.id, resolve)
                scene.add(queuedTile)
            }
            tileDelay = 1/tilesPerSecond
        }
        if (tileDelay > 0) {
            tileDelay -= dt
        }
    }

    const spawn = (t: Object3D, next?: boolean) => {
        return new Promise<void>(resolve => {
            const item: [Object3D, () => void] = [t, resolve]
            if (next) {
                tileQueue.unshift(item)
            } else {
                tileQueue.push(item)
            }
        })
    }

    return [update, spawn]
}

export async function setupScene()
{
    const pointer = new Vector2()
    document.addEventListener('mousemove', e => {
        pointer.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
    })

    const raycaster = new Raycaster()

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

    const [spawnTiles, enqueueTile] = tileSpawner(scene, 10, 4)

    // const material = new MeshBasicMaterial({
    //     color: Color.NAMES.green,
    // });
    // const plane = new Mesh(new PlaneGeometry(10, 10), material)
    // plane.rotation.setFromRotationMatrix()
    const serverGrid = await storage.hexGrid()
    for (let cubeCoord of CubeCoord.ORIGIN.shuffledRingsAround(0, 6)) {
        const gameId = serverGrid.get(coordToKey(cubeCoord))
        const coverUrl = (!!gameId) ? storage.gameById(gameId).cover : null
        let hexObj = createHex(cubeCoord, textureLoader, coverUrl, 100);
        HEX_GRID_OBJ.set(coordToKey(cubeCoord), hexObj)
        enqueueTile(hexObj);
    }

    renderer.domElement.addEventListener('click', async () => {
        const intersects = raycaster.intersectObjects( scene.children, true );
        if (Array.isArray(intersects) && intersects.length > 0) {
            for (let intersect of intersects) {
                const parent = intersect.object.parent
                if (parent) {
                    const data = parent.userData
                    if (isTileObjectData(data)) {
                        let gameAt = storage.gameAt(data.coord);
                        if (gameAt) {
                            ui.clickGame(gameAt)
                        } else {
                            const info = await storage.placeNextGameAt(data.coord)
                            if (info && info.cover) {
                                const newObj = createHex(data.coord, textureLoader, info?.cover, 100)
                                asTileObjectData(newObj.userData)
                                    ?.textureLoaded
                                    ?.then(() => enqueueTile(newObj, true))
                                    ?.then(() => parent.removeFromParent())
                            }
                        }
                        break
                    }
                }
            }
        }
    })


    const clock = new Clock()
    function animate(): void {
        const dt = clock.getDelta()


        spawnTiles(dt)
        raycaster.setFromCamera( pointer, camera );
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

 function hexObj(coord: CubeCoord) {
    return HEX_GRID_OBJ.get(coordToKey(coord))
}

export let scene = {
    hexObj,
    setCoverImage
}  as const
