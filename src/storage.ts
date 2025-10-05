import {CubeCoord} from "./util/tilegrid.ts";
import {fetchHexGrid, fetchJamStats, findGames, GameInfo, JamStats, postHexGridGame} from "./server.ts";

export const JAM_NAME = "56";
export const gameId = 403641;


const HEX_GRID = new Map<CubeCoord, number>
const COORD_BY_GAMEID = new Map<number, CubeCoord>
const GAMES_BY_ID = new Map<number, GameInfo>
let JAM_STATS: JamStats | undefined = undefined

function nextFreeCoord() {
    for (let cubeCoord of CubeCoord.ORIGIN.spiralAround(0, 10)) {
        if (!HEX_GRID.get(cubeCoord)) {
            return cubeCoord
        }
    }
    throw new Error("No free coord found")
}



async function init() {
    JAM_STATS = await fetchJamStats(JAM_NAME)
    await hexGrid()
    await setGame(new CubeCoord(0, 0), gameId) // TODO server side?
    await allGames();
    console.log("Storage Initialized!")
}

async function allGames() {
    let games = await findGames(JAM_NAME);
    games.forEach(g => GAMES_BY_ID.set(g.id, g));
    console.log(games.length, "games preloaded for LD", JAM_NAME)
}

async function hexGrid(): Promise<Map<CubeCoord, number>> {
    if (HEX_GRID.size === 0) {
        let serverGrid = await fetchHexGrid(JAM_NAME)
        serverGrid.forEach((v, k) => HEX_GRID.set(k, v))
        serverGrid.forEach((v, k) => COORD_BY_GAMEID.set(v, k))
        console.log("Initial HexGrid is:")
        console.table(HEX_GRID)
    }
    return HEX_GRID
}

async function setGame(coord: CubeCoord, gameId: number) {
    let result = await postHexGridGame(coord, gameId)
    if (result === gameId) {
        HEX_GRID.set(coord, gameId)
        console.log("Post Hex Grid Success!", coord, gameId)
    } else {
        HEX_GRID.set(coord, result)
        console.log("Post Hex Grid Failed!", coord, "expected", gameId, "found", result)
    }
    return result
}

function gameCoordById(gameId: number): CubeCoord | undefined {
    return COORD_BY_GAMEID.get(gameId)
}


function gameById(gameId: number): GameInfo {
    let game = GAMES_BY_ID.get(gameId)
    if (game) {
        return game;
    }
    // TODO fetch from server?
    throw new Error("Game not found")
}

export let storage = {
    init,
    gameCount: () => JAM_STATS?.published,
    nextFreeCoord,
    setGame,
    gameCoordById,
    gameById
}

