import backgrountImage from './textures/prototype_512x512_green2.png?arraybuffer'
import {Texture} from "three";

function loadTexture(content: ArrayBuffer, contentType: string): Texture {
    const blob = new Blob([content], {type: contentType});
    const url =  window.URL.createObjectURL(blob);
    console.log(url)
    const texture = new Texture();
    const imageElement = document.createElement('img');
    imageElement.onload = () => {
        texture.image = imageElement;
        texture.needsUpdate = true
    }
    imageElement.src = url
    return texture
}

export const Textures = {
    Background: loadTexture(backgrountImage, 'image/png')
} as const