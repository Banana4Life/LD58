import {findGame} from "@/server.ts";

const LOCALSTORAGE_USER = "user";

let userNameDlg = document.querySelector<HTMLDialogElement>("#dlg-username")!;
let playerNamePlate = document.querySelector("#player")!;
let btnChangeUser = document.querySelector("#btn-change-user")!;

btnChangeUser.addEventListener("click", openUsernameDialog)

async function updatePlate(user: string) {
    playerNamePlate.querySelector(".player-name")!.textContent = user;

    let game = await findGame(user)
    if (game.length === 0) {
        // TODO fun fact?
        // # of game submissions
        // # of compo games
        // etc

    } else {
        const randomIndex = Math.floor(Math.random() * game.length);
        const randomGame = game[randomIndex];
        alert(`Does ${randomGame.name} ring a bell? Good.`)
    }


}

export function loadUI() {
    let user = localStorage.getItem(LOCALSTORAGE_USER);
    if (user === null || user === "") {
        openUsernameDialog()
    } else {
        updatePlate(user);
    }

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
        updatePlate(userName)
    } else {
        localStorage.removeItem(LOCALSTORAGE_USER);
        updatePlate("???")
    }
    userNameDlg.close()
}
