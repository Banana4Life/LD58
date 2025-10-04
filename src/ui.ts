import {findGames, findUserGames} from "./server.ts";

const LOCALSTORAGE_USER = "user";
const JAM_ID = "56";

let userNameDlg = document.querySelector<HTMLDialogElement>("#dlg-username")!;
let playerNamePlate = document.querySelector("#player")!;
let btnChangeUser = document.querySelector("#btn-change-user")!;

btnChangeUser.addEventListener("click", openUsernameDialog)


async function updateNamePlate(user: string) {
    playerNamePlate.querySelector(".player-name")!.textContent = user;

    let game = await findUserGames(JAM_ID, user)
    if (game.length === 0) {
        // TODO fun fact?
        // # of game submissions
        // # of compo games
        // etc

    } else {
        const randomIndex = Math.floor(Math.random() * game.length);
        const randomGame = game[randomIndex];
        console.log(`Does ${randomGame.name} ring a bell? Good.`, randomGame)
    }
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
    userNameDlg.showModal()
    userNameDlg.querySelector("form")?.addEventListener("submit", saveUserName)
}

function saveUserName(e: SubmitEvent) {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement;
    const submitter = e.submitter as HTMLElement;
    if (submitter === userNameDlg.querySelector(".dlg-btn-submit")) {
        const input = form.querySelector("input") as HTMLInputElement;
        const userName = input.value;
        localStorage.setItem(LOCALSTORAGE_USER, userName)
        updateNamePlate(userName)
    } else {
        localStorage.removeItem(LOCALSTORAGE_USER);
        updateNamePlate("???")
    }
    userNameDlg.close()
}
