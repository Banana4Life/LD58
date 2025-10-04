import {getBackendUrlFor} from "./util";

export interface Game {
    id: number,
    name: string,
    cover: string,
    web: string,
    cool: number
}

export interface JamGames {
    'can-grade': boolean
    games: Game[]
}

export async function findUserGames(jam :string, username: string): Promise<Game[]> {
    if (username === "???") {
        return Promise.resolve([])
    }
    let url = getBackendUrlFor(`/ld58/userGame`) + `?username=${username}&jam=${jam}`
    return fetch(url)
        .then(r => r.json())
        .then(r => r as Game[])
}

export async function findGames(jam :string) {
    let url = getBackendUrlFor(`/ld58/games`) + `?jam=${jam}`
    return fetch(url)
        .then(r => r.json())
        .then(r => r as JamGames)
}
