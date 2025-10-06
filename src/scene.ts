import {Models} from "./models";
import {
    AudioListener,
    Box3,
    Camera,
    Clock,
    Color,
    ColorRepresentation,
    DirectionalLight,
    Matrix4,
    Mesh,
    MeshLambertMaterial,
    MeshPhongMaterial,
    Object3D,
    PerspectiveCamera,
    PlaneGeometry,
    Raycaster,
    RepeatWrapping,
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
import {ui} from "./ui.ts";
import {Textures} from "./textures.ts";
import {Sounds} from "./sounds.ts";
import {PCFSoftShadowMap} from "three/src/constants";

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

function enableShadows(obj: Object3D) {
    obj.traverse(o => {
        // noinspection SuspiciousTypeOfGuard
        if (o instanceof Mesh) {
            o.receiveShadow = true
            o.castShadow = true
        }
    })
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
    enableShadows(hex)
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

function updateGameIdUserDataTargetLevel(gameId: number, targetLevel: number) {
    const coord = storage.gameCoordById(gameId);
    if (!coord) {
        return
    }

    const obj = hexObj(coord)
    if (!obj) {
        return
    }

    const userData = obj.userData
    if (!isTileObjectData(userData)) {
        return
    }

    obj.userData = {
        coord: userData.coord,
        targetLevel: targetLevel,
        initialLevel: userData.initialLevel,
        textureLoaded: userData.textureLoaded,
        fallDuration: userData.fallDuration,
    }
}

function tileSpawner(scene: Scene, tilesPerSecond: number, fallDuration: number = 2): [Updater, (obj: Object3D, next?: boolean) => Promise<void>, (obj: Object3D) => boolean, (id: number) => boolean] {

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

    const remove = (t: Object3D) => {
        const index = tileQueue.findIndex(([obj]) => obj.id === t.id)
        if (index !== -1) {
            tileQueue.splice(index, 1)
            return true
        }

        return false
    }

    const prioritize = (id: number) => {
        const coord = storage.gameCoordById(id);
        if (!coord) {
            return false
        }

        const tile = hexObj(coord);
        if (!tile) {
            return false
        }

        if (remove(tile)) {
            spawn(tile, true)
            return true
        }

        return false
    }

    return [update, spawn, remove, prioritize]
}

function gameSurface(scene: Scene, camera: Camera): Updater {
    const backgroundTexture = Textures.Background.clone()
    backgroundTexture.wrapS = RepeatWrapping;
    backgroundTexture.wrapT = RepeatWrapping;
    backgroundTexture.repeat.set(100, 100);
    const backgroundPlane = new PlaneGeometry(window.innerWidth, window.innerHeight)
    const backgroundPlaneMaterial = new MeshPhongMaterial({
        map: backgroundTexture,
        color: new Color(0xFF0000),
        specular: Color.NAMES.white,
        shininess: 2,
        dithering: true
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

let orbitControls: OrbitControls
function setupControls(camera: Camera, renderer: WebGLRenderer) {
    orbitControls = new OrbitControls(camera, renderer.domElement);
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

function setupLight(scene: Scene, camera: Camera): Updater {
    const directionalLight = new DirectionalLight( Color.NAMES.white, .7);
    directionalLight.position.set(0, 200, 0)
    directionalLight.target = camera
    directionalLight.castShadow = true
    const mapSize = Math.pow(2, 11)
    directionalLight.shadow.mapSize.width = mapSize
    directionalLight.shadow.mapSize.height = mapSize
    directionalLight.shadow.bias = -0.01
    scene.add(directionalLight)

    const corners = [
        new Vector3(-1, -1, -1),
        new Vector3( 1, -1, -1),
        new Vector3(-1,  1, -1),
        new Vector3( 1,  1, -1),
        new Vector3(-1, -1,  1),
        new Vector3( 1, -1,  1),
        new Vector3(-1,  1,  1),
        new Vector3( 1,  1,  1)
    ];

    const _tmpMat4A = new Matrix4();
    const _tmpMat4B = new Matrix4();
    const _tmpVec3 = new Vector3();
    const _box = new Box3();

    function fitDirectionalLightToCamera(dirLight: DirectionalLight, camera: Camera) {
        const lightCam = dirLight.shadow.camera;

        _tmpMat4A.copy(camera.projectionMatrix).invert();
        _tmpMat4B.multiplyMatrices(camera.matrixWorld, _tmpMat4A);

        _box.makeEmpty();

        const lightViewMatrix = lightCam.matrixWorldInverse;

        for (let i = 0; i < 8; i++) {
            _tmpVec3.copy(corners[i]).applyMatrix4(_tmpMat4B)
            _tmpVec3.applyMatrix4(lightViewMatrix)
            _box.expandByPoint(_tmpVec3)
        }

        lightCam.left   = _box.min.x
        lightCam.right  = _box.max.x
        lightCam.bottom = _box.min.y
        lightCam.top    = _box.max.y
        lightCam.near   = -_box.max.z
        lightCam.far    = -_box.min.z
        lightCam.updateProjectionMatrix()
    }

    return () => {
        fitDirectionalLightToCamera(directionalLight, camera)
        const xOffset = 40
        const zOffset = 20
        directionalLight.position.set(camera.position.x - xOffset, camera.position.y + 30, camera.position.z + zOffset)
    }
}

let currentTile: Object3D | undefined = undefined
async function trySelectTile(coord: CubeCoord, tile: Object3D, isNewTile: boolean = false) {
    let gameId = storage.gameAt(coord)
    if (gameId) {
        selectTile(tile, gameId, isNewTile)
        return true
    }

    return false
}

async function selectTileByGameId(gameId: number) {
    const coord = storage.gameCoordById(gameId)
    if (!coord) {
        return
    }
    const tile = hexObj(coord);
    if (!tile) {
        return
    }

    await selectTile(tile, gameId, false, false)
}

function moveCameraToTile(tile: Object3D) {
    const startX = orbitControls.target.x
    const startZ = orbitControls.target.z
    const targetX = tile.position.x
    const targetZ = tile.position.z
    const duration = 0.5 // duration in seconds
    const startTime = performance.now()

    const animateCamera = () => {
        const elapsed = (performance.now() - startTime) / 1000
        const progress = Math.min(elapsed / duration, 1)

        const eased = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2

        orbitControls.target.set(
            startX + (targetX - startX) * eased,
            orbitControls.target.y,
            startZ + (targetZ - startZ) * eased
        )
        orbitControls.update()

        if (progress < 1) {
            requestAnimationFrame(animateCamera)
        }
    }

    animateCamera()
}

async function selectTile(tile: Object3D, gameId: number, isNewTile: boolean = false, toggle: boolean = true) {
    if (toggle && currentTile === tile) {
        unselectCurrentTile()
        return
    }

    unselectCurrentTile()

    currentTile = tile
    if (!isNewTile) {
        tile.position.y += selectedHeight
    }

    if (!toggle) {
        moveCameraToTile(tile);
    }

    await ui.openGameInfo(gameId)
}

function unselectCurrentTile() {
    if (currentTile){
        currentTile.position.y -= selectedHeight
        ui.closeGameInfo()
        currentTile = undefined
    }
}

const canvasContainer = document.querySelector<HTMLElement>('.canvas-container')!

let TILE_SPAWNER: TileSpawner
export function setupScene()
{
    const raycaster = new Raycaster()

    const textureLoader = new TextureLoader()
    // Scene setup
    const scene = new Scene();
    scene.background = new Color(Color.NAMES.hotpink)
    const camera = new PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    scene.add(camera)
    camera.translateY(100)
    const canvas = document.querySelector<HTMLCanvasElement>('#main-canvas')!
    const pointer = new Vector2()
    document.addEventListener('mousemove', e => {
        pointer.x = ( e.clientX / canvas.width ) * 2 - 1;
        pointer.y = - ( e.clientY /  canvas.height ) * 2 + 1;
    })


    const renderer = new WebGLRenderer({
        antialias: true,
        canvas: canvas
    });
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap

    const audioListener = new AudioListener()
    scene.add(audioListener)

    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);


    const updateLight = setupLight(scene, camera)
    setupControls(camera, renderer)

    const [spawnTiles, enqueueTile, removeQueuedTile, prioritize] = tileSpawner(scene, 10)
    const updateGameSurface = gameSurface(scene, camera)

    // const material = new MeshBasicMaterial({
    //     color: Color.NAMES.green,
    // });
    // const plane = new Mesh(new PlaneGeometry(10, 10), material)
    // plane.rotation.setFromRotationMatrix()
    const camWorldPos = new Vector3()
    camera.getWorldPosition(camWorldPos)
    storage.hexGrid().then(serverGrid => {
        for (let cubeCoord of CubeCoord.ORIGIN.shuffledRingsAround(0, 6)) {
            const gameId = serverGrid.get(coordToKey(cubeCoord))
            const coverUrl = (!!gameId) ? storage.gameById(gameId).cover : null
            let hexObj = createHex(cubeCoord, textureLoader, coverUrl, camWorldPos.y, 0.6);
            HEX_GRID_OBJ.set(coordToKey(cubeCoord), hexObj)
            enqueueTile(hexObj);
        }
    })

    renderer.domElement.addEventListener('click', async () => {
        const intersects = raycaster.intersectObjects( scene.children, true );
        if (Array.isArray(intersects) && intersects.length > 0) {
            for (let intersect of intersects) {
                const parent = intersect.object.parent
                if (parent) {
                    const data = parent.userData
                    if (isTileObjectData(data)) {
                        if (!await trySelectTile(data.coord, parent)) {
                            const info = await storage.placeNextGameAt(data.coord)
                            if (info && info.cover) {
                                parent.position.y += selectedHeight
                                unselectCurrentTile()
                                const newObj = createHex(data.coord, textureLoader, info?.cover, camWorldPos.y, 1, parent.position.y)
                                asTileObjectData(newObj.userData)
                                    ?.textureLoaded
                                    ?.then(() => {
                                        return Sounds.DropSlap.prepare(audioListener)
                                    })
                                ?.then(play => enqueueTile(newObj, true).then(() => play))
                                    ?.then(async play => {
                                    play()
                                    parent.removeFromParent()
                                    await trySelectTile(data.coord, newObj, true)
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

        updateLight(dt)
        spawnTiles(dt)
        updateGameSurface(dt)

        raycaster.setFromCamera( pointer, camera );

        renderer.render(scene, camera);

        requestAnimationFrame(animate);
    }

// Handle window resize
    const onWindowResize = (): void => {
        let w = canvasContainer.clientWidth;
        let h = canvasContainer.clientHeight;
        let a = w / h;
        camera.aspect = a;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };

    window.addEventListener('resize', onWindowResize, false);
    onWindowResize()

    // Start animation loop
    requestAnimationFrame(animate)

    TILE_SPAWNER = {enqueueTile, removeQueuedTile, prioritize}
}

export interface TileSpawner {
    enqueueTile(obj: Object3D, next?: boolean): Promise<void>
    removeQueuedTile(obj: Object3D): boolean
    prioritize(id: number): boolean
}

 function hexObj(coord: CubeCoord) {
    return HEX_GRID_OBJ.get(coordToKey(coord))
}

export let scene = {
    hexObj,
    setCoverImage,
    selectTileByGameId,
    updateGameIdUserDataTargetLevel,
    selectedHeight,
    spawner: () => TILE_SPAWNER,
}  as const
