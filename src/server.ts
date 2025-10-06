import {getBackendUrlFor} from "./util";
import {CubeCoord} from "./util/tilegrid.ts";

export interface GameInfo {
    id: number,
    jamId: number,
    name: string,
    cover: string | null,
    web: string | null,
    cool: number
    path: String
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

export interface Award {
   key: string,
    icon: string,
    name: string
}

export interface GivenAward {
    key: string,
    byUser: string
}

const DEBUG = false;
function debug(method: string, url: string) {
    if (DEBUG) {
        console.log(method, url)
    }
}


async function findUserGames(jam: string, username: string): Promise<UserGames> {
    if (username === "Guest") {
        return Promise.resolve({current: null, games: []})
    }
    let url = getBackendUrlFor(`/ld58/userGame`) + `?username=${username}&jam=${jam}`
    debug("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => r as UserGames)
}

async function findGames(jam: string) {
    let url = getBackendUrlFor(`/ld58/games`) + `?jam=${jam}`
    debug("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => r as GameInfo[])
}

async function fetchPlacedGames(jam: string): Promise<Map<string, number>> {
    let url = getBackendUrlFor(`/ld58/hexGrid`) + `?jam=${jam}`
    debug("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => new Map<string, number>(Object.entries(r)))
}

async function postHexGridGame(coord: CubeCoord, gameId: number): Promise<number> {
    let url = getBackendUrlFor(`/ld58/hexGrid`) + `?q=${coord.q}&r=${coord.r}&gameId=${gameId}`
    debug("POST", url)
    return fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
    }).then((r) => r.json())
}

async function fetchJamStats(jam: string): Promise<JamStats> {
    let url = getBackendUrlFor(`/ld58/stats`) + `?jam=${jam}`
    debug("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => r as JamStats)
}

async function fetchAwardsDefs(){
    let url = getBackendUrlFor(`/ld58/awards`).toString()
    debug("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => r as Award[])
}

async function fetchGivenAwards(jam: String){
    let url = getBackendUrlFor(`/ld58/givenAwards`) + `?jam=${jam}`
    debug("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => new Map<string, GivenAward[]>(Object.entries(r)))
}

async function postAward(gameId: number, user: string, awardKey: string){
    let url = getBackendUrlFor(`/ld58/award`) + `?gameId=${gameId}&user=${user}&awardKey=${awardKey}`
    debug("POST", url)
    return fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
    }).then((r) => r.json())
}

async function fetchUserRatings(jam: string, user: string){
    let url = getBackendUrlFor(`/ld58/userRatings`) + `?jam=${jam}&user=${user}`
    debug("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => new Map<string, number>(Object.entries(r)))
}

async function fetchGameRating(gameId: number){
    let url = getBackendUrlFor(`/ld58/gameRating`) + `?gameId=${gameId}`
    debug("GET", url)
    return fetch(url)
        .then(r => r.json())
        .then(r => r as number)
}

async function postRating(gameId: number, user: string, rating: number){
    let url = getBackendUrlFor(`/ld58/rate`) + `?gameId=${gameId}&user=${user}&rating=${rating}`
    debug("POST", url)
    return fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
    }).then((r) => r.json())
}

export let server = {
    findUserGames,
    findGames,
    fetchPlacedGames,
    postHexGridGame,
    fetchJamStats,
    fetchAwardsDefs,
    fetchGivenAwards,
    postAward,
    fetchUserRatings,
    fetchGameRating,
    postRating,
} as const