import hexagonFbx from './assets/hexagon.fbx?arraybuffer'
import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader";
import {Group, Quaternion} from "three";

const basePath = new URL(document.location.href).pathname

function loadFbx(content: ArrayBuffer): Group {
    const fbxLoader = new FBXLoader()
    return fbxLoader.parse(content, basePath)
}

export const Models = {
    Hexagon: {
        object: loadFbx(hexagonFbx),
        rotationToFlatten: (() => {
            const a = new Quaternion()
            a.setFromAxisAngle({x: 1, y: 0, z: 0}, Math.PI / 2);
            const b = new Quaternion()
            b.setFromAxisAngle({x: 0, y: 0, z: 1}, Math.PI / 3);
            return a.multiply(b)
        })(),
    },
} as const