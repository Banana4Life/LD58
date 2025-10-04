import { findUserGames, GameInfo} from "./server.ts";
import { JAM_NAME,  storage} from "./storage.ts";

const LOCALSTORAGE_USER = "user";

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


let playerNamePlate = document.querySelector("#player")!;
let btnChangeUser = document.querySelector("#btn-change-user")!;

btnChangeUser.addEventListener("click", openUsernameDialog)


async function updateNamePlate(user: string) {
    console.log("Welcome", user)
    playerNamePlate.querySelector(".player-name")!.textContent = user;

    let game = await findUserGames(JAM_NAME, user)
    playerNamePlate.querySelector(".game")!.classList.remove("has-game");

    if (game.games.length === 0) {

        openOkDialog(`Did you know there are exactly ${storage.gameCount()} games submitted for LD${JAM_NAME}?`, () => {})
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

        if (game.current) {
            let coord = storage.gameCoordById(game.current.id);
            if (!coord) {
                await attemptPlacingGame(game.current.id);

                // TODO teleport to
            } else {
                console.log(user, "your game", game.current.id, "is already placed @", coord)
            }
        }


    }
}

async function attemptPlacingGame(gameId: number, i: number = 0) {
    let coord = storage.nextFreeCoord(); // TODO shuffled rings
    let result = await storage.setGame(coord, gameId)
    if (result === gameId) {
        return
    }
    if (i < 20) {
        await attemptPlacingGame(gameId, i + 1)
    } else {
        console.error("Could not place game", gameId, "in", i, "tries")
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
