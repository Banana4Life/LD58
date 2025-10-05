import {getBackendUrlFor} from "./util";
import {CubeCoord} from "./util/tilegrid.ts";

export interface GameInfo {
    id: number,
    jamId: number,
    name: string,
    cover: string | null,
    web: string | null,
    cool: number
}

export interface UserGames {
    current: GameInfo | null
    games: GameInfo[]
}

export interface JamStats {
    id: number,
    canGrade: boolean,
    published: number,
    signups: number,
    authors: number,
    unpublished: number
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
        .then(r => r as GameInfo[])
}

export async function fetchHexGrid(jam: string): Promise<Map<string, number>> {
    let url = getBackendUrlFor(`/ld58/hexGrid`) + `?jam=${jam}`
    console.log("GET", url)

    return fetch(url)
        .then(r => r.json())
        .then(r => new Map<string, number>(Object.entries(r)))

}

export async function postHexGridGame(coord: CubeCoord, gameId: number): Promise<number> {
    let url = getBackendUrlFor(`/ld58/hexGrid`) + `?q=${coord.q}&r=${coord.r}&gameId=${gameId}`
    console.log("POST", url)
    return fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
    }).then((r) => r.json())
}

export async function fetchJamStats(jam: string): Promise<JamStats> {
    let url = getBackendUrlFor(`/ld58/stats`) + `?jam=${jam}`
    console.log("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => r as JamStats)
}