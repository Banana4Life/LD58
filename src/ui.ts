import {findGames, findUserGames, GameInfo, getHexgrid, postHexGridGame} from "./server.ts";
import {CubeCoord} from "./util/tilegrid.ts";

const LOCALSTORAGE_USER = "user";
const JAM_NAME = "56";

let dlgUserName = document.querySelector<HTMLDialogElement>("#dlg-username")!;
dlgUserName.querySelector("form")?.addEventListener("submit", saveUserName)

let dlgOk = document.querySelector<HTMLDialogElement>("#dlg-ok")!;
let dlgOkCb: (() => void) | null = null;
dlgOk.querySelector(".dlg-btn-ok")?.addEventListener("click", () => {
    dlgOk.close();
    // console.log(dlgOk, "close ok", dlgOkCb)
    if (dlgOkCb) {
        let cb = dlgOkCb
        dlgOkCb = null
        cb()
    }
})

let GAMES_MAPPING = new Map<number, GameInfo>();

let playerNamePlate = document.querySelector("#player")!;
let btnChangeUser = document.querySelector("#btn-change-user")!;

btnChangeUser.addEventListener("click", openUsernameDialog)


async function updateNamePlate(user: string) {
    console.log("update player name plate", user)
    playerNamePlate.querySelector(".player-name")!.textContent = user;

    let game = await findUserGames(JAM_NAME, user)
    playerNamePlate.querySelector(".game")!.classList.remove("has-game");
    if (game.games.length === 0) {
        let cnt = 420;
        openOkDialog(`Did you know there are exactly ${cnt} games submitted for LD${JAM_NAME}?`, () => {})
        // TODO fun fact?
        // # of game submissions
        // # of compo games
        // etc

    } else {
        const randomIndex = Math.floor(Math.random() * game.games.length);
        const randomGame = game.games[randomIndex];

        // openOkDialog(`Does ${randomGame.name} ring a bell? Good.`, () => askEmbedd(game.current))
        let currentGameName = game.current?.name;
        playerNamePlate.querySelector(".game-name")!.textContent = currentGameName || ""
        playerNamePlate.querySelector(".game")
        if (game.current != null) {
            playerNamePlate.querySelector(".game")!.classList.add("has-game");
        }


    }
}

function askEmbedd(current: GameInfo | null) {
    if (current != null) {
        openOkDialog(`Does your current game ${current.name} support embedding?`, null)
    }
}


function openOkDialog(textContent: string, cb: (() => void) | null = null) {
    dlgOk.querySelector(".content")!.textContent = textContent;
    dlgOkCb = cb;
    dlgOk.show()
    console.log("open ok",textContent)
}

export async function loadUI() {
    let user = localStorage.getItem(LOCALSTORAGE_USER);
    if (user === null || user === "") {
        openUsernameDialog()
    } else {
        updateNamePlate(user);
    }

    let games = await findGames(JAM_NAME);
    games.games.forEach(g => GAMES_MAPPING.set(g.id, g));
    console.log(games.games.length, "games found for LD", JAM_NAME)
    console.log("grading enabled:", games["can-grade"])


    await postHexGridGame(new CubeCoord(0, 0), 403641)


    let hexGrid = await getHexgrid(JAM_NAME)
    console.log("HexGrid is", hexGrid)
}

function openUsernameDialog() {
    dlgUserName.showModal()
}

function saveUserName(e: SubmitEvent) {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement;
    const submitter = e.submitter as HTMLElement;
    if (submitter === dlgUserName.querySelector(".dlg-btn-submit")) {
        const input = form.querySelector("input") as HTMLInputElement;
        const userName = input.value;
        localStorage.setItem(LOCALSTORAGE_USER, userName)
        updateNamePlate(userName)
    } else {
        localStorage.removeItem(LOCALSTORAGE_USER);
        updateNamePlate("???")
    }
    dlgUserName.close()
}
