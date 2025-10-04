import hexagonFbx from './assets/hexagon.fbx?arraybuffer'
import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader";
import {Group} from "three";

const basePath = new URL(document.location.href).pathname

function loadFbx(content: ArrayBuffer): Group {
    const fbxLoader = new FBXLoader()
    return fbxLoader.parse(content, basePath)
}

export const Models = {
    Hexagon: loadFbx(hexagonFbx),
} as const