import {findGames, findUserGames, Game} from "./server.ts";

const LOCALSTORAGE_USER = "user";
const JAM_ID = "56";

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
    playerNamePlate.querySelector(".player-name")!.textContent = user;

    let game = await findUserGames(JAM_ID, user)
    if (game.games.length === 0) {
        let cnt = 420;
        openOkDialog(`Did you know there are exactly ${cnt} games submitted for LD${JAM_ID}?`, () => {})
        // TODO fun fact?
        // # of game submissions
        // # of compo games
        // etc

    } else {
        const randomIndex = Math.floor(Math.random() * game.games.length);
        const randomGame = game.games[randomIndex];
        openOkDialog(`Does ${randomGame.name} ring a bell? Good.`, () => askEmbedd(game.current))

        console.log(randomGame);
    }
}

function askEmbedd(current: Game | null) {
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

    let games = await findGames(JAM_ID);
    console.log(games.games.length, "games found for LD", JAM_ID)
    console.log("grading enabled:", games["can-grade"])

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
