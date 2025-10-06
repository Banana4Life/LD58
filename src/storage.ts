import {CubeCoord} from "./util/tilegrid.ts";
import {Award, fetchHexGrid, fetchJamStats, findGames, GameInfo, GivenAward, JamStats, postHexGridGame, server} from "./server.ts";
import {scene} from "./scene.ts";
import {TextureLoader} from "three";
import {getJam} from "./util";

export const JAM_NAME = getJam();

const HEX_GRID = new Map<string, number>
const AWARDS_MAP = new Map<number, GivenAward[]>
const RATINGS_MAP = new Map<number, number>
const COORD_BY_GAMEID = new Map<number, string>
const GAMES_BY_ID = new Map<number, GameInfo>
let JAM_STATS: JamStats | undefined = undefined
let AWARD_OBJECTS: Award[]

export function coordToKey(cubeCoord: CubeCoord): string {
    return `${cubeCoord.q}:${cubeCoord.r}`
}

export function keyToCoord(key: string): CubeCoord {
    const [q, r] = key.split(':')
    return new CubeCoord(Number(q), Number(r))
}

async function placeNextGameAt(coord: CubeCoord): Promise<GameInfo | undefined> {
    let coolGames = Array.from(GAMES_BY_ID.values())
        .sort((a, b) => b.cool - a.cool)

    const next = coolGames.find(g => !(new Set(HEX_GRID.values()).has(g.id)))

    if (next) {
        let result = await setGame(coord, next.id)
        if (result === next.id) {
            return next
        }
        if (result == 0) {
            await hexGrid()
        }
    } else {
        console.log("No next game available. Try Fetching more...")
        await allGames()
    }

    return undefined;
}

function nextFreeCoord() {
    for (let cubeCoord of CubeCoord.ORIGIN.shuffledRingsAround(0, 10)) {
        if (!HEX_GRID.get(coordToKey(cubeCoord))) {
            return cubeCoord
        }
    }
    throw new Error("No free coord found")
}



async function init() {
    JAM_STATS = await fetchJamStats(JAM_NAME)
    await hexGrid()
    await awardMap()
    await allGames();
    AWARD_OBJECTS = await server.fetchAwards()
    console.log("Storage Initialized!")
}

async function allGames() {
    let games = await findGames(JAM_NAME);
    games.forEach(g => GAMES_BY_ID.set(g.id, g));
    console.log(games.length, "games preloaded for LD", JAM_NAME)
}

async function hexGrid(): Promise<Map<string, number>> {
    if (HEX_GRID.size === 0) {
        // TODO this never updates atm.
        let serverGrid = await fetchHexGrid(JAM_NAME)
        serverGrid.forEach((v, k) => HEX_GRID.set(k, v))
        serverGrid.forEach((v, k) => COORD_BY_GAMEID.set(v, k))
        // console.log("Initial HexGrid is:")
        // console.table(HEX_GRID)
    }
    return HEX_GRID
}

async function awardMap(): Promise<Map<number, GivenAward[]>> {
    if (AWARDS_MAP.size === 0) {
        // TODO this never updates atm.
        let givenAwards = await server.fetchGivenAwards(JAM_NAME)
        // console.log(givenAwards)

        givenAwards.forEach((v, k) => AWARDS_MAP.set(parseInt(k), v))
    }
    return AWARDS_MAP
}

async function setGame(coord: CubeCoord, gameId: number) {
    let result = await postHexGridGame(coord, gameId)
    if (result === gameId) {
        HEX_GRID.set(coordToKey(coord), gameId)
        console.log("Post Hex Grid Success!", coord, gameId)
    } else {
        HEX_GRID.set(coordToKey(coord), result)
        console.log("Post Hex Grid Failed!", coord, "expected", gameId, "found", result == 0 ? "already placed" : result)
    }
    return result
}

function gameCoordById(gameId: number): CubeCoord | undefined {
    let key = COORD_BY_GAMEID.get(gameId);
    if (key === undefined) {
        return undefined
    }
    return keyToCoord(key)
}


function gameById(gameId: number): GameInfo {
    let game = GAMES_BY_ID.get(gameId)
    if (game) {
        return game;
    }
    // TODO fetch from server?
    throw new Error("Game not found " + gameId)
}

function gameAt(coord: CubeCoord) {
    return HEX_GRID.get(coordToKey(coord))
}

async function attemptPlacingGame(gameId: number, i: number = 0) {
    let coord = nextFreeCoord();
    let result = await setGame(coord, gameId)
    if (result === gameId) {
        let hexObj = scene.hexObj(coord);
        if (hexObj) {
            await allGames();
            scene.setCoverImage(hexObj, new TextureLoader(), gameById(gameId).cover)
        }
        return
    }
    if (i < 20) {
        await attemptPlacingGame(gameId, i + 1)
    } else {
        console.error("Could not place game", gameId, "in", i, "tries")
    }
}

function givenAwards(gameId: number) {
    let awards = AWARDS_MAP.get(gameId) || []
    return awards;
}

function giveAward(gameId: number, user: string, awardKey: string) {
    let awards = givenAwards(gameId)
    let found = awards.find(a => a.byUser === user && a.key === awardKey)
    let count = awards.filter(a => a.key === awardKey).length;
    if (found) {
        return count
    }
    AWARDS_MAP.set(gameId, [...awards, {key: awardKey, byUser: user}])
    server.postAward(gameId, user, awardKey)
    return count + 1
}

async function getUserRating(gameId: number, user: string) {
    await getUserRatings(user)
    return RATINGS_MAP.get(gameId) || -1
}

async function getUserRatings(user: string) {
    if (RATINGS_MAP.size === 0) {
        const userRatings = await server.fetchUserRatings(getJam(), user);
        userRatings.forEach((v, k) => RATINGS_MAP.set(parseInt(k), v))
    }

    return RATINGS_MAP;
}


async function setUserRating(gameId: number, user: string, rating: number) {
    if (await server.postRating(gameId, user, rating)) {
        RATINGS_MAP.set(gameId, rating)
    }
}

export let storage = {
    init,
    stats: () => JAM_STATS,
    awards: () => AWARD_OBJECTS,
    placeNextGameAt,
    gameCoordById,
    attemptPlacingGame,
    hexGrid,
    gameAt,
    gameById,
    givenAwards,
    giveAward,
    getUserRating,
    getUserRatings,
    setUserRating,
} as const

