import {Audio, AudioContext, AudioListener} from "three";
import dropSlap from "./assets/sounds/drop-slap.mp3?arraybuffer"

function loadSound(content: ArrayBuffer): Promise<AudioBuffer> {
    const context = AudioContext.getContext()
    return context.decodeAudioData(content)
}

export const Sounds = {
    DropSlap: {
        buffer: loadSound(dropSlap),
        play(listener: AudioListener) {
            this.prepare(listener).then(play => play())
        },
        async prepare(listener: AudioListener): Promise<() => void> {
            const audio = new Audio(listener)
            let buffer = await this.buffer;
            listener.parent?.add(audio)
            audio.setBuffer(buffer)
            return () => {
                audio.play()
                audio.onEnded = () => {
                    audio.removeFromParent()
                }
            }
        }
    },
} as const