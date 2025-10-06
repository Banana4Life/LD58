import {Models} from "./models";
import {
    AudioListener,
    Box3,
    Camera,
    Clock,
    Color,
    ColorRepresentation,
    DirectionalLight, Group,
    Matrix4,
    Mesh,
    MeshLambertMaterial,
    MeshPhongMaterial,
    Object3D,
    PerspectiveCamera, Plane,
    PlaneGeometry,
    Raycaster,
    RepeatWrapping,
    Scene, SpotLight,
    Texture,
    TextureLoader,
    Vector2,
    Vector3,
    Vector3Like,
    WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {CubeCoord} from "./util/tilegrid.ts";
import {coordToKey, storage} from "./storage.ts";
import {ui} from "./ui.ts";
import {Textures} from "./textures.ts";
import {Sounds} from "./sounds.ts";
import {PCFSoftShadowMap} from "three/src/constants";
import {lerp} from "three/src/math/MathUtils";

const TEXTURE_LOADER = new TextureLoader()
const FALL_START_HEIGHT = 100
const SELECTED_HEIGHT = 10

function getSize(obj: Object3D): Vector3 {
    const bounds = new Box3().setFromObject(obj)
    const size = new Vector3()
    bounds.getSize(size)
    // Turn it
    size.z = size.y;
    size.y = 0;
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
    selected?: boolean
}

function isTileObjectData(data: any): data is TileObjectData {
    return 'coord' in data
}

function asTileObjectData(data: Object3D | any): TileObjectData | undefined {
    if (!data) {
        return undefined
    }
    if (data instanceof Object3D) {
        data = data.userData
    }
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

function setCoverImage(obj: Object3D, coverUrl: string | null): Promise<void> {
    const childMesh = obj.children[0] as Mesh
    let targetMaterials = ["hex-triangle-1", "hex-triangle-2", "hex-triangle-3", "hex-triangle-4", "hex-triangle-5", "hex-triangle-6", "border"];
    if (coverUrl) {
        return new Promise(resolve => {
            const cachableUrl = new URL(coverUrl)
            cachableUrl.searchParams.set("cacheKey", "2025-10-05")
            TEXTURE_LOADER.load(cachableUrl.toString(), (t) => {
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

function createHex(coord: CubeCoord, coverUrl: string | null, fallFrom: number, fallDuration?: number, initialLevel: number = 0): Object3D {
    const hex = Models.Hexagon.object.clone(true);
    enableShadows(hex)
    // noinspection UnnecessaryLocalVariableJS
    const data: TileObjectData = {
        coord,
        targetLevel: initialLevel,
        initialLevel: fallFrom,
        textureLoaded: setCoverImage(hex, coverUrl),
        fallDuration,
    }
    hex.userData = data

    hex.setRotationFromQuaternion(Models.Hexagon.rotationToFlatten)
    const {x, y, z} = coord.toWorld(fallFrom, gridSize)
    hex.position.set(x, y, z)
    return hex
}

type Updater = (dt: DOMHighResTimeStamp) => void

function tileSpawner(scene: Scene, tilesPerSecond: number, fallDuration: number = 2): [Updater, (obj: Object3D, next?: boolean) => Promise<void>, (obj: Object3D) => boolean, (tiles: Object3D[]) => void] {

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
                const t = asTileObjectData(queuedTile)?.fallDuration ?? fallDuration
                falling.set(queuedTile.id, {
                    resolve,
                    fallingTime: 0,
                    fallDuration: asTileObjectData(queuedTile)?.fallDuration ?? fallDuration,
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

    function spawnBatch(tiles: Object3D[], next: boolean = true) {
        tiles.forEach(t => {
            remove(t)
        })

        const reverseFilteredTiles =  tiles.filter(t => {
            return !falling.has(t.id)
        })
        reverseFilteredTiles.reverse()

        reverseFilteredTiles.forEach(t => {
            spawn(t, next)
        })
    }

    return [update, spawn, remove, spawnBatch]
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

let orbitControls: (target: Vector3Like) => void

function setupCamera(aspect: number, renderer: WebGLRenderer, smoothMover: SmoothMover): [PerspectiveCamera, (target: Vector3Like, duration: number) => Promise<void>] {
    const camera = new PerspectiveCamera(80, aspect, 0.1, 1000);
    camera.translateY(100)

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

    const setCameraTarget = async (target: Vector3Like, duration: number): Promise<void> => {
        orbitControls.enabled = false
        await smoothMover.move(orbitControls.target, target, duration, {
            update(dt) {
                orbitControls.update(dt)
            },
            interpolator: ease,
        });
        orbitControls.enabled = true
    }

    return [camera, setCameraTarget]
}

interface SmoothMoverOptions {
    update?(dt: number): void
    interpolator?(from: number, to: number, t: number): number
    cancellation?: AbortSignal
}
interface SmoothMover {
    update(dt: number): void
    move(from: Vector3, to: Vector3Like, duration: number, options?: SmoothMoverOptions): Promise<void>
}

function ease(from: number, to: number, t: number): number {
    const easedTime = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2
    return lerp(from, to, easedTime)
}

function moveOvertime(): SmoothMover {

    let i = 0

    interface State {
        subject: Vector3
        from: Vector3
        to: Vector3
        duration: number
        time: number
        options?: SmoothMoverOptions,
        resolve(): void
    }

    const movements = new Map<number, State>()

    return {
        move(from: Vector3, to: Vector3Like, duration: number, options?: SmoothMoverOptions): Promise<void> {
            const fromCopy = new Vector3(from.x, from.y, from.z)
            const toCopy = new Vector3(to.x, to.y, to.z)

            return new Promise(resolve => {
                const state: State = {
                    subject: from,
                    from: fromCopy,
                    to: toCopy,
                    duration,
                    time: 0,
                    resolve,
                    options,
                }
                movements.set(i++, state)
            })
        },
        update(dt: number): void {
            for (let [id, state] of movements) {
                const cancel = state.options?.cancellation
                if (cancel && cancel.aborted) {
                    movements.delete(id)
                    continue
                }
                state.time = Math.min(state.duration, state.time + dt)
                const t = state.time / state.duration
                const interpolator = state?.options?.interpolator ?? lerp
                // noinspection JSSuspiciousNameCombination
                state.subject.set(
                    interpolator(state.from.x, state.to.x, t),
                    interpolator(state.from.y, state.to.y, t),
                    interpolator(state.from.z, state.to.z, t),
                )
                const update = state.options?.update
                if (update) {
                    update(dt)
                }

                if (state.time >= state.duration) {
                    movements.delete(id)
                    state.resolve()
                }
            }
        }
    }
}

let currentTile: Object3D | undefined = undefined

function setupSelectedTileHighlight(mover: SmoothMover): [Object3D, Updater] {
    const intensity = 1000
    const target = new Object3D()
    const light = new SpotLight(Color.NAMES.white, 0)
    light.translateY(45)
    light.angle = Math.PI / 4
    light.target = target
    light.distance = 60
    light.castShadow = true

    const group = new Group()
    group.add(light, target)

    let previouslySelectedTile: CubeCoord | null = null
    let cancelLast: AbortController | null = null

    const updater = (): void => {
        const currentCoord = asTileObjectData(currentTile)?.coord ?? null
        if (!CubeCoord.equals(previouslySelectedTile, currentCoord)) {
            if (!currentCoord) {
                light.intensity = 0
            } else {
                if (cancelLast) {
                    cancelLast.abort()
                }
                cancelLast = new AbortController()
                const options = {
                    cancellation: cancelLast.signal,
                }
                mover.move(group.position, currentCoord?.toWorld(group.position.y, gridSize), 0.1, options).then(() => {
                    light.intensity = intensity
                    cancelLast = null
                })
            }
            previouslySelectedTile = currentCoord
        }
    }

    return [group, updater]
}

function setupGlobalLight(scene: Scene, camera: Camera): Updater {
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

async function trySelectTile(coord: CubeCoord, tile: Object3D) {
    let gameId = storage.gameAt(coord)
    if (gameId) {
        selectTile(tile, gameId)
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

    await selectTile(tile, gameId, false)
}

async function selectTile(tile: Object3D, gameId: number, toggle: boolean = true) {
    const data = asTileObjectData(tile)
    if (!data) {
        return Promise.reject("invalid object!")
    }
    if (toggle && currentTile === tile) {
        unselectCurrentTile()
        return
    }

    unselectCurrentTile()

    data.selected = true

    currentTile = tile

    if (!toggle) {
        orbitControls(data.coord.toWorld(0, gridSize));
    }

    await ui.openGameInfo(gameId)
}

function unselectCurrentTile() {
    if (currentTile){
        const data = asTileObjectData(currentTile)
        if (data) {
            data.selected = false
        }
        ui.closeGameInfo()
        currentTile = undefined
    }
}

const canvasContainer = document.querySelector<HTMLElement>('.canvas-container')!

let TILE_SPAWNER: TileSpawner

function loadTilesAround(origin: CubeCoord, maxRings: number = 6) {
    let tiles: Object3D[] = []
    for (let cubeCoord of origin.shuffledRingsAround(0, maxRings)) {
        const coord = coordToKey(cubeCoord);
        const gameId = storage.knownPlacedGames().get(coord)
        const coverUrl = (!!gameId) ? storage.gameById(gameId).cover : null
        let hexObj = HEX_GRID_OBJ.get(coord)
        if (!hexObj) {
            hexObj = createHex(cubeCoord, coverUrl, FALL_START_HEIGHT, 0.6);
            HEX_GRID_OBJ.set(coord, hexObj)
        }

        tiles.push(hexObj)
    }

    TILE_SPAWNER.spawnBatch(tiles);
}

export function setupScene()
{
    const raycaster = new Raycaster()
    const camCenterRaycaster = new Raycaster()
    let floorPlane = new Plane(new Vector3(0, 1, 0))
    let lastCenterCoord = CubeCoord.ORIGIN


    // Scene setup
    const scene = new Scene();
    scene.background = new Color(Color.NAMES.hotpink)

    const canvas = document.querySelector<HTMLCanvasElement>('#main-canvas')!
    const pointer = new Vector2()
    document.addEventListener('mousemove', e => {
        pointer.x = ( e.clientX / canvas.width ) * 2 - 1;
        pointer.y = - ( e.clientY /  canvas.height ) * 2 + 1;
    })

    const renderer = new WebGLRenderer({
        antialias: true,
        canvas: canvas,
    });
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap

    const smoothMover = moveOvertime()
    const [camera, setCameraTarget] = setupCamera(canvasContainer.clientWidth / canvasContainer.clientHeight, renderer, smoothMover)
    orbitControls = (target: Vector3Like) => setCameraTarget(target, 0.5)
    scene.add(camera)


    const audioListener = new AudioListener()
    scene.add(audioListener)

    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);


    const updateLight = setupGlobalLight(scene, camera)
    const [selectedTileHighlight, updateSelectedTileHighlight] = setupSelectedTileHighlight(smoothMover)
    scene.add(selectedTileHighlight)

    const [spawnTiles, enqueueTile, removeQueuedTile, spawnBatch] = tileSpawner(scene, 10)
    TILE_SPAWNER = {enqueueTile, removeQueuedTile, spawnBatch}
    const updateGameSurface = gameSurface(scene, camera)

    // const material = new MeshBasicMaterial({
    //     color: Color.NAMES.green,
    // });
    // const plane = new Mesh(new PlaneGeometry(10, 10), material)
    // plane.rotation.setFromRotationMatrix()
    const camWorldPos = new Vector3()
    camera.getWorldPosition(camWorldPos)
    loadTilesAround(CubeCoord.ORIGIN)

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
                                unselectCurrentTile()
                                const newObj = createHex(data.coord, info?.cover, camWorldPos.y, 1)
                                asTileObjectData(newObj)
                                    ?.textureLoaded
                                    ?.then(() => {
                                        return Sounds.DropSlap.prepare(audioListener)
                                    })
                                ?.then(async play => {
                                    trySelectTile(data.coord, newObj)
                                    await enqueueTile(newObj, true);
                                    return play;
                                })
                                ?.then(async play => {
                                    play()
                                    parent.removeFromParent()
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

        smoothMover.update(dt)
        updateLight(dt)
        spawnTiles(dt)
        updateGameSurface(dt)
        updateSelectedTileHighlight(dt)

        raycaster.setFromCamera( pointer, camera );
        camCenterRaycaster.setFromCamera(new Vector2(0,0), camera)
        let intersection = new Vector3()
        camCenterRaycaster.ray.intersectPlane(floorPlane, intersection)
        let centerCoord = CubeCoord.fromWorld(intersection.divide(gridSize))
        if (lastCenterCoord.q !== centerCoord.q || lastCenterCoord.r !== centerCoord.r) {
            lastCenterCoord = centerCoord;
            let wantSpiral = [...centerCoord.shuffledRingsAround(0, 6)]
            let containsKnown = wantSpiral.find(cc => storage.knownPlacedGames().has(coordToKey(cc)))
            // console.log(coordToKey(centerCoord), containsKnown)
            let wantsMore = wantSpiral.filter(coord => !HEX_GRID_OBJ.has(coordToKey(coord))).length > 0;
            if (wantsMore) {
                if (containsKnown) {
                    loadTilesAround(centerCoord, 6)
                } else {
                    storage.fetchPlacedGames() // Fetch new data
                }
            }

        }


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
}

export interface TileSpawner {
    enqueueTile(obj: Object3D, next?: boolean): Promise<void>
    removeQueuedTile(obj: Object3D): boolean
    spawnBatch(tiles: Object3D[]): void
}

 function hexObj(coord: CubeCoord) {
    return HEX_GRID_OBJ.get(coordToKey(coord))
}

export let scene = {
    hexObj,
    setCoverImage,
    selectTileByGameId,
    selectedHeight: SELECTED_HEIGHT,
    loadTilesAround,
}  as const
