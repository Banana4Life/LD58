import {getBackendUrlFor} from "./util";
import {CubeCoord} from "./util/tilegrid.ts";

export interface GameInfo {
    id: number,
    jamId: number,
    name: string,
    cover: string,
    web: string,
    cool: number
}

export interface UserGames {
    current: GameInfo | null
    games: GameInfo[]
}

export interface JamGames {
    'can-grade': boolean
    games: GameInfo[]
}

export async function findUserGames(jam: string, username: string): Promise<UserGames> {
    if (username === "???") {
        return Promise.resolve({current: null, games: []})
    }
    let url = getBackendUrlFor(`/ld58/userGame`) + `?username=${username}&jam=${jam}`
    console.log("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => r as UserGames)
}

export async function findGames(jam: string) {
    let url = getBackendUrlFor(`/ld58/games`) + `?jam=${jam}`
    console.log("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => r as JamGames)
}

export async function fetchHexGrid(jam: string): Promise<Map<CubeCoord, number>> {
    let url = getBackendUrlFor(`/ld58/hexGrid`) + `?jam=${jam}`
    console.log("GET", url)

    function cubecoordFrom(key: String) {
        const [q, r] = key.split(":").map(Number);
        return new CubeCoord(q, r);
    }

    return fetch(url)
        .then(r => r.json())
        .then(r => r as Map<String, number>)
        .then(r => {
            let entries = Array.from(Object.entries(r))
            let mapped = entries.map(([key, value]) => {
                return [cubecoordFrom(key), value] as [CubeCoord, number]
            });
            return new Map<CubeCoord, number>(mapped)
        })

}

export async function postHexGridGame(coord: CubeCoord, gameId: number): Promise<number> {
    let url = getBackendUrlFor(`/ld58/hexGrid`) + `?q=${coord.q}&r=${coord.r}&gameId=${gameId}`
    console.log("POST", url)
    return fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
    }).then((r) => r.json())
}