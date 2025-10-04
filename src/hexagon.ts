import bla from './assets/hexagon.fbx?arraybuffer'
import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader";
import {Group, Object3DEventMap, Scene} from "three";

const basePath = new URL(document.location.href).pathname

function loadFbx(content: ArrayBuffer): Group<Object3DEventMap> {
    const fbxLoader = new FBXLoader()
    return fbxLoader.parse(content, basePath)
}

export function loadHexagon(scene: Scene): void {
    const groups = loadFbx(bla as unknown as ArrayBuffer);

    scene.add(groups)
}
