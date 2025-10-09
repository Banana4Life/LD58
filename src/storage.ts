import {CubeCoord} from "./util/tilegrid.ts";
import {Award, GameInfo, GivenAward, JamStats, server} from "./server.ts";
import {scene} from "./scene.ts";
import {getJam} from "./util";

export const JAM_NAME = getJam();

const GAMEID_BY_COORD = new Map<string, number>
const AWARDS_MAP = new Map<number, GivenAward[]>
const RATINGS_MAP = new Map<number, number>
const COORD_BY_GAMEID = new Map<number, string>
const GAMES_BY_ID = new Map<number, GameInfo>
const AWARDS_PARTICLE_CD = new Map<number, Map<String, number>>

let JAM_STATS: JamStats | undefined = undefined
let AWARD_OBJECTS: Award[]

export function coordToKey(cubeCoord: CubeCoord): string {
    return `${cubeCoord.q}:${cubeCoord.r}`
}

export function keyToCoord(key: string): CubeCoord {
    const [q, r] = key.split(':')
    return new CubeCoord(Number(q), Number(r))
}

async function placeNextGameAt(coord: CubeCoord, tries: number = 0): Promise<GameInfo | undefined> {
    let coolGames = Array.from(GAMES_BY_ID.values())
        .sort((a, b) => b.cool - a.cool)

    const next = coolGames.find(g => !(new Set(GAMEID_BY_COORD.values()).has(g.id)))

    if (next) {
        let result = await setGame(coord, next.id)
        if (result === next.id) {
            return next
        }
        if (result == 0) {
            if (tries > 5) {
                console.error("Could not place a new Game after 5 tries")
            } else {
                return placeNextGameAt(coord, tries + 1)
            }
        }
    } else {
        console.log("No next game available. Try Fetching more...")
        await fetchAllGames()
    }

    return undefined;
}

function nextFreeCoord() {
    for (let cubeCoord of CubeCoord.ORIGIN.shuffledRingsAround(0, 10)) {
        if (!GAMEID_BY_COORD.get(coordToKey(cubeCoord))) {
            return cubeCoord
        }
    }
    throw new Error("No free coord found")
}

async function init() {
    JAM_STATS = await server.fetchJamStats(JAM_NAME)
    await fetchPlacedGames()
    await fetchGameAwards()
    await fetchAllGames();

    setInterval(async () => {
        await fetchPlacedGames()
        await fetchGameAwards()
    }, 30000) // 30s

    AWARD_OBJECTS = await server.fetchAwardsDefs()
    console.log("Storage Initialized!")
}

async function fetchAllGames() {
    let games = await server.findGames(JAM_NAME);
    games.forEach(g => GAMES_BY_ID.set(g.id, g));
    console.log(games.length, "games preloaded for LD", JAM_NAME)
}

async function updateGameTexture(gameId: number, coord: string) {
    // console.log("New Game", coord, gameId)
    let cover = gameById(gameId).cover
    if (cover != null) {
        let tile = scene.hexObj(keyToCoord(coord))
        if (tile) {
            await scene.setCoverImage(tile, cover)
        }
    }
}

async function fetchPlacedGames(): Promise<any> {
    let serverGrid = await server.fetchPlacedGames(JAM_NAME)
    if (GAMEID_BY_COORD.size > 0) {
        for (let [coord, gameId] of serverGrid) {
            let foundGameId = GAMEID_BY_COORD.get(coord)
            let foundCoord = COORD_BY_GAMEID.get(gameId)
            if (!foundCoord || !foundGameId) {
                await updateGameTexture(gameId, coord);
            }

        }
    }

    // TODO deletions are not possible?
    GAMEID_BY_COORD.clear()
    COORD_BY_GAMEID.clear()
    serverGrid.forEach((v, k) => GAMEID_BY_COORD.set(k, v))
    serverGrid.forEach((v, k) => COORD_BY_GAMEID.set(v, k))
    console.log("placed games #", GAMEID_BY_COORD.size)

}

async function fetchGameAwards() {
    let givenAwards = await server.fetchGivenAwards(JAM_NAME)
    givenAwards.forEach((v, k) => AWARDS_MAP.set(parseInt(k), v))
}

async function setGame(coord: CubeCoord, gameId: number) {
    let [status, resultGameId] = await server.postHexGridGame(coord, gameId)
    let coordKey = coordToKey(coord);
    if (resultGameId === gameId) {
        GAMEID_BY_COORD.set(coordKey, gameId)
        COORD_BY_GAMEID.set(gameId, coordKey)
        // console.log("Post Hex Grid Success!", coord, gameId)
    } else {
        if (resultGameId !== 0) {
            GAMEID_BY_COORD.set(coordKey, resultGameId)
            COORD_BY_GAMEID.set(resultGameId, coordKey)
            updateGameTexture(resultGameId, coordKey)
        } else {
            GAMEID_BY_COORD.delete(coordKey)
            COORD_BY_GAMEID.delete(resultGameId)
        }
        if (status == 409) {
            await fetchPlacedGames();
            console.log(status, "Post Hex Grid Failed!", coord, "expected", gameId, "found", "already placed", resultGameId)
        } else if (status == 403) {
            console.log(status, "Post Hex Grid Failed!", coord, "out of reach")
            return -1
        } else {
            console.log(status, "Post Hex Grid Failed!", coord, "expected", gameId, "found", resultGameId)
        }
    }
    return resultGameId
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
    return GAMEID_BY_COORD.get(coordToKey(coord))
}

async function attemptPlacingGame(gameId: number, i: number = 0) {
    let coord = nextFreeCoord();
    let result = await setGame(coord, gameId)
    if (result === gameId) {
        let hexObj = scene.hexObj(coord);
        if (hexObj) {
            await fetchAllGames();
            scene.setCoverImage(hexObj, gameById(gameId).cover)
        }
        return
    }
    if (i < 20) {
        await attemptPlacingGame(gameId, i + 1)
    } else {
        console.error("Could not place game", gameId, "in", i, "tries")
    }
}

function topAwards(): {gameId: number, awardCount: number}[] {
    return Array.from(AWARDS_MAP.entries())
        .map(([gameId, awards]) => ({
            gameId,
            awardCount: awards.length
        }))
        .sort((a, b) => b.awardCount - a.awardCount)
        .slice(0, 10);
}

async function topRatings(): Promise<[number, number][]> {
    return await server.fetchTopRatings(JAM_NAME);
}

function givenAwards(gameId: number) {
    return AWARDS_MAP.get(gameId) || [];
}


function awardsParticleCooldowns(gameId: number) {
    let cooldowns = AWARDS_PARTICLE_CD.get(gameId);
    if (!cooldowns) {
        cooldowns = new Map<string, number>()
        AWARDS_PARTICLE_CD.set(gameId, cooldowns)
    }
    return cooldowns;
}


async function giveAward(gameId: number, user: string, awardKey: string) {
    let awards = givenAwards(gameId)
    let found = awards.find(a => a.byUser === user && a.key === awardKey)
    let count = awards.filter(a => a.key === awardKey).length;
    if (found) {
        return count
    }
    return server.postAward(gameId, user, awardKey).then(wasSet => {
        if (wasSet) {
            AWARDS_MAP.set(gameId, [...awards, {key: awardKey, byUser: user}])
        }
        return wasSet ? count + 1 : count
    })
}

function clearUserRatingsCache() {
    RATINGS_MAP.clear()
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
    fetchPlacedGames: fetchPlacedGames,
    knownPlacedGames: () => GAMEID_BY_COORD,
    gameAt,
    gameById,
    awardsParticleCooldowns,
    givenAwards,
    giveAward,
    topAwards,
    topRatings,
    clearUserRatingsCache,
    getUserRating,
    getUserRatings,
    setUserRating,
} as const

