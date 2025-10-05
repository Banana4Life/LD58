import {Models} from "./models";
import {
    AudioListener,
    Box3,
    Camera,
    Clock,
    Color,
    ColorRepresentation,
    HemisphereLight,
    Mesh,
    MeshLambertMaterial,
    MeshPhongMaterial,
    Object3D,
    PerspectiveCamera,
    PlaneGeometry,
    Raycaster,
    RepeatWrapping,
    Scene,
    SpotLight,
    Texture,
    TextureLoader,
    Vector2,
    Vector3,
    WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {CubeCoord} from "./util/tilegrid.ts";
import {coordToKey, storage} from "./storage.ts";
import {ui} from "./ui.ts";
import {Textures} from "./textures.ts";
import {Sounds} from "./sounds.ts";

const selectedHeight = 10

function getSize(obj: Object3D): Vector3 {
    const bounds = new Box3().setFromObject(obj)
    const size = new Vector3()
    bounds.getSize(size)
    return size
}

const HEX_GRID_OBJ = new Map<string, Object3D>()

const gridSize = getSize(Models.Hexagon.object)

function setTexture(mesh: Mesh, names: string[], texture: Texture | null, tint: ColorRepresentation, shininess: number) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (let i = 0; i < materials.length; i++){
        let material = materials[i];
        if (names.indexOf(material.name) !== -1) {
            if (material instanceof MeshPhongMaterial) {
                const copy = material.clone()
                if (texture) {
                    copy.map = texture
                }
                copy.color = new Color(tint)
                copy.specular = new Color(tint)
                copy.blendColor = new Color(tint)
                copy.shininess = shininess
                copy.flatShading = true
                copy.needsUpdate = true
                materials[i] = copy
            } else if (material instanceof MeshLambertMaterial) {
                const copy = material.clone()
                if (texture) {
                    copy.map = texture
                }
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
    readonly textureLoaded: Promise<void>
    readonly fallDuration?: number
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

function setCoverImage(obj: Object3D, textureLoader: TextureLoader, coverUrl: string | null): Promise<void> {
    const childMesh = obj.children[0] as Mesh
    let targetMaterials = ["hex-triangle-1", "hex-triangle-2", "hex-triangle-3", "hex-triangle-4", "hex-triangle-5", "hex-triangle-6", "border"];
    if (coverUrl) {
        return new Promise(resolve => {
            const cachableUrl = new URL(coverUrl)
            cachableUrl.searchParams.set("cacheKey", "2025-10-05")
            textureLoader.load(cachableUrl.toString(), (t) => {
                t.anisotropy = 16
                setTexture(childMesh, targetMaterials, t, Color.NAMES.white, 20)
                resolve()
            })
        })
    } else {
        setTexture(childMesh, targetMaterials, null, Color.NAMES.grey, 200)
        return Promise.resolve()
    }
}

function createHex(coord: CubeCoord, textureLoader: TextureLoader, coverUrl: string | null, fallFrom: number, fallDuration?: number, initialLevel: number = 0): Object3D {
    const hex = Models.Hexagon.object.clone(true);
    // noinspection UnnecessaryLocalVariableJS
    const data: TileObjectData = {
        coord,
        targetLevel: initialLevel,
        initialLevel: fallFrom,
        textureLoaded: setCoverImage(hex, textureLoader, coverUrl),
        fallDuration,
    }
    hex.userData = data

    hex.setRotationFromQuaternion(Models.Hexagon.rotationToFlatten)
    const {x, y, z} = coord.toWorld(fallFrom, {x: gridSize.x, y: 0, z: gridSize.y})
    hex.position.set(x, y, z)
    return hex
}

type Updater = (dt: DOMHighResTimeStamp) => void

function tileSpawner(scene: Scene, tilesPerSecond: number, fallDuration: number = 2): [Updater, (obj: Object3D, next?: boolean) => Promise<void>] {

    function initialSpeed(acceleration: number, height: number, durationSeconds: number): number {
        return -((acceleration * durationSeconds / 2) - ((height / durationSeconds)))
    }

    interface FallingState {
        resolve(): void
        fallingTime: number
        fallDuration: number
        speed: number
    }

    let tileDelay = 1/tilesPerSecond
    const tileQueue: [Object3D, () => void][] = []

    const falling = new Map<number, FallingState>()
    const epsilon = 0.02

    const g = 10

    const update = (dt: DOMHighResTimeStamp) => {
        for (let [id, state] of falling) {
            const obj = scene.getObjectById(id)
            if (!obj) {
                falling.delete(id)
                state.resolve()
                continue
            }
            const userData = obj.userData
            if (!isTileObjectData(userData)) {
                falling.delete(id)
                state.resolve()
                continue
            }
            if (obj.position.y - epsilon <= userData.targetLevel) {
                obj.position.setY(userData.targetLevel)
                falling.delete(id)
                state.resolve()
                continue
            }


            // obj.position.setY(lerp(userData.initialLevel, userData.targetLevel, smootherstep(state.fallingTime, 0, fallDuration)))
            // obj.position.setY(Math.max(0, lerp(userData.initialLevel, userData.targetLevel, state.fallingTime / state.fallDuration)))
            // obj.position.setY(damp(obj.position.y, userData.targetLevel, fallDuration, dt))
            obj.position.setY(Math.max(0, obj.position.y - (state.speed * dt)))
            state.speed += g * dt
            state.fallingTime += dt
        }

        if (tileDelay <= 0) {
            const item = tileQueue.shift()
            if (item) {
                const [queuedTile, resolve] = item
                const t = asTileObjectData(queuedTile.userData)?.fallDuration ?? fallDuration
                falling.set(queuedTile.id, {
                    resolve,
                    fallingTime: 0,
                    fallDuration: asTileObjectData(queuedTile.userData)?.fallDuration ?? fallDuration,
                    speed: initialSpeed(g, queuedTile.position.y, t),
                })
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

function gameSurface(scene: Scene, camera: Camera): Updater {
    const backgroundTexture = Textures.Background.clone()
    backgroundTexture.wrapS = RepeatWrapping;
    backgroundTexture.wrapT = RepeatWrapping;
    backgroundTexture.repeat.set(3, 3);
    const backgroundPlane = new PlaneGeometry(window.innerWidth, window.innerHeight)
    const backgroundPlaneMaterial = new MeshPhongMaterial({
        map: backgroundTexture,
        color: Color.NAMES.white,
        specular: Color.NAMES.white,
        shininess: 10,
    })
    const backgroundMesh = new Mesh(backgroundPlane, backgroundPlaneMaterial)
    backgroundMesh.receiveShadow = true
    backgroundMesh.rotateX(-Math.PI/2)
    backgroundMesh.position.set(0, 0, -100)
    scene.add(backgroundMesh)

    const previousCameraPosition = camera.position.clone()
    return () => {
        backgroundMesh.position.x = camera.position.x
        backgroundMesh.position.z = camera.position.z

        const deltaX = previousCameraPosition.x - camera.position.x
        const deltaZ = camera.position.z - previousCameraPosition.z

        backgroundTexture.offset.x -= deltaX * (backgroundTexture.repeat.x / backgroundPlane.parameters.width)
        backgroundTexture.offset.y -= deltaZ * (backgroundTexture.repeat.y / backgroundPlane.parameters.height)

        previousCameraPosition.copy(camera.position)
    }
}

function setupControls(camera: Camera, renderer: WebGLRenderer) {
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
}

function setupLight(scene: Scene, camera: Camera) {
    const hemisphereLight = new HemisphereLight( Color.NAMES.white, Color.NAMES.white, .4);
    hemisphereLight.castShadow = true
    scene.add(hemisphereLight)

    const spotTarget = new Object3D()
    scene.add(spotTarget)
    let spotLight = new SpotLight(Color.NAMES.white, 10000, 0, Math.PI/2);
    spotLight.castShadow = true
    camera.add(spotLight)
    spotLight.position.set(0,0,100);
    spotLight.target = camera;
    spotLight.castShadow = true

}

let currentTile: Object3D | undefined = undefined
function selectTile(tile: Object3D, gameAt: number, isNewTile: boolean = false) {
    if (currentTile === tile) {
        unselectCurrentTile()
        return
    }

    unselectCurrentTile()

    currentTile = tile
    if (!isNewTile) {
        tile.position.y += selectedHeight
    }
    ui.openGameInfo(gameAt)
}

function unselectCurrentTile() {
    if (currentTile){
        currentTile.position.y -= selectedHeight
        ui.closeGameInfo()
        currentTile = undefined
    }
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
    scene.background = new Color(Color.NAMES.hotpink)
    const camera = new PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    scene.add(camera)
    camera.translateY(100)
    const renderer = new WebGLRenderer({
        antialias: true
    });
    const audioListener = new AudioListener()
    scene.add(audioListener)
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    setupLight(scene, camera)
    setupControls(camera, renderer)

    const [spawnTiles, enqueueTile] = tileSpawner(scene, 10)
    const updateGameSurface = gameSurface(scene, camera)

    // const material = new MeshBasicMaterial({
    //     color: Color.NAMES.green,
    // });
    // const plane = new Mesh(new PlaneGeometry(10, 10), material)
    // plane.rotation.setFromRotationMatrix()
    const camWorldPos = new Vector3()
    camera.getWorldPosition(camWorldPos)
    const serverGrid = await storage.hexGrid()
    for (let cubeCoord of CubeCoord.ORIGIN.shuffledRingsAround(0, 6)) {
        const gameId = serverGrid.get(coordToKey(cubeCoord))
        const coverUrl = (!!gameId) ? storage.gameById(gameId).cover : null
        let hexObj = createHex(cubeCoord, textureLoader, coverUrl, camWorldPos.y, 0.6);
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
                            selectTile(parent, gameAt)
                        } else {
                            const info = await storage.placeNextGameAt(data.coord)
                            if (info && info.cover) {
                                unselectCurrentTile()
                                const newObj = createHex(data.coord, textureLoader, info?.cover, camWorldPos.y, 1, selectedHeight)
                                asTileObjectData(newObj.userData)
                                    ?.textureLoaded
                                    ?.then(() => Sounds.DropSlap.prepare(audioListener))
                                ?.then(play => enqueueTile(newObj, true).then(() => play))
                                    ?.then(play => {
                                    play()
                                    parent.removeFromParent()
                                    gameAt = storage.gameAt(data.coord);
                                    if (gameAt) {
                                        selectTile(newObj, gameAt, true)
                                    }
                                })
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
        updateGameSurface(dt)

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
