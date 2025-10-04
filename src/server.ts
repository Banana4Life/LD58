import {getBackendUrlFor} from "./util";

export interface Game {
    id: number,
    jamId: number,
    name: string,
    cover: string,
    web: string,
    cool: number
}

export interface UserGames {
    current: Game | null
    games: Game[]
}

export interface JamGames {
    'can-grade': boolean
    games: Game[]
}

export async function findUserGames(jam :string, username: string): Promise<UserGames> {
    if (username === "???") {
        return Promise.resolve({current: null, games: []})
    }
    let url = getBackendUrlFor(`/ld58/userGame`) + `?username=${username}&jam=${jam}`
    console.log("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => r as UserGames)
}

export async function findGames(jam :string) {
    let url = getBackendUrlFor(`/ld58/games`) + `?jam=${jam}`
    console.log("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => r as JamGames)
}
