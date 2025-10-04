import {getBackendUrlFor} from "@/util.ts";

export type Game = {
    id: number,
    name: string,
    cover: string,
    web: string,
    cool: number
}

export async function findGame(username: string): Promise<Game[]> {
    if (username === "???") {
        return Promise.resolve([])
    }
    let url = getBackendUrlFor(`/ld58/userGame`) + `?username=${username}`
    return  fetch(url)
        .then(r => r.json())
        .then(r => r as Game[])
}

