import {findUserGames, GameInfo, server} from "./server.ts";
import {JAM_NAME, storage} from "./storage.ts";
import fullStar from './assets/full-star.svg';
import halfStar from './assets/half-star.svg';
import emptyStar from './assets/empty-star.svg';
import award1 from './assets/award-1.svg';
import award2 from './assets/award-2.svg';
import award3 from './assets/award-3.svg';


const LOCALSTORAGE_USER = "user";

let dlgUserName = document.querySelector<HTMLDialogElement>("#dlg-username")!;
dlgUserName.querySelector("form")?.addEventListener("submit", saveUserName)

let dlgOk = document.querySelector<HTMLDialogElement>("#dlg-ok")!;
let dlgOkCb: (() => void) | null = null;
let dlgBtnOk = dlgOk.querySelector(".dlg-btn-ok")!;

dlgBtnOk.addEventListener("click", () => {
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


let dlgGame = document.querySelector<HTMLDialogElement>("#dlg-game")!;
let btbWebGameOpener = dlgGame.querySelector<HTMLButtonElement>(".dlg-btn-webgame")!;
let btnJamPageOpener = dlgGame.querySelector<HTMLButtonElement>(".dlg-btn-jamgamepage")!;
let btnAwards = dlgGame.querySelector<HTMLButtonElement>(".dlg-btn-awards")!;
let gameStars = dlgGame.querySelectorAll<HTMLImageElement>(".star")!
let gameStarsContainer = dlgGame.querySelector<HTMLElement>(".stars")!

btbWebGameOpener.addEventListener("click", (e) => {
    console.log("open...", btbWebGameOpener.dataset.url)
    e.preventDefault()
    e.stopPropagation()
    openWebGame(btbWebGameOpener.dataset.url)
})

btnJamPageOpener.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(btnJamPageOpener.dataset.url, "_blank")
})

btnAwards.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    openAwards()
})
gameStarsContainer.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    openRating()
})

let dlgAwards =  document.querySelector<HTMLDialogElement>("#dlg-awards")!;
let btnCloseAwards = dlgAwards.querySelector<HTMLButtonElement>(".dlg-btn-close-award")
btnCloseAwards?.addEventListener("click", () => {
    dlgAwards.close()
})


let dlgYesNo = document.querySelector<HTMLDialogElement>("#dlg-yes-no")!;
let dlgBtnYes = dlgYesNo.querySelector<HTMLButtonElement>(".dlg-btn-yes")!;
let dlgBtnNo = dlgYesNo.querySelector<HTMLButtonElement>(".dlg-btn-no")!;

let dlgYesNoCb: {
    yes: (() => void) | null;
    no: (() => void) | null;
} = {yes: null, no: null}

dlgBtnYes.addEventListener("click", () => {
    dlgYesNo.close();
    if (dlgYesNoCb.yes) {
        let cb = dlgYesNoCb.yes
        dlgYesNoCb.yes = null
        cb()
    }
})

dlgBtnNo.addEventListener("click", () => {
    console.log("no", dlgYesNoCb)
    console.log("no", dlgYesNoCb)
    dlgYesNo.close();
    if (dlgYesNoCb.no) {
        let cb = dlgYesNoCb.no
        dlgYesNoCb.no = null
        cb()
    }
})


let dlgRating = document.querySelector<HTMLDialogElement>("#dlg-rating")!;
let stars = dlgRating.querySelectorAll<HTMLImageElement>(".star")!
stars.forEach((star, index) => {
    star.addEventListener('mousemove', (e) => {
        selectRating(e, index, 'move')
    });
    star.addEventListener('click', (e) => {
        selectRating(e, index, 'click')
    });

    star.addEventListener('mouseleave', () => {
        resetRating(dlgRating.dataset, stars)
    });
});


let btnSubmitRating = dlgRating.querySelector(".dlg-btn-submit-rating")!;
btnSubmitRating.addEventListener('click', () => {
    submitRating()
})

function selectRating(e: MouseEvent, index: number, action: string) {
    const rect = (e.target as HTMLElement)!.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    const isEmpty = index == 0 && e.clientX - rect.left < rect.width / 8;
    index = isEmpty ? index - 1 : index
    setRatingTo(index, isHalf, stars);
    if (action == 'click') {
        dlgRating.dataset.rating = index.toString()
        dlgRating.dataset.halfRating = isHalf.toString()
        btnSubmitRating.classList.remove("inactive")
    }
}

function setRatingTo(index: number, isHalf: boolean, stars: NodeListOf<HTMLImageElement>) {
    stars.forEach((s, i) => {
        if (i < index) s.src = fullStar;
        else if (i === index && isHalf) s.src = halfStar;
        else if (i === index) s.src = fullStar
        else s.src = emptyStar
    });
}


function resetRating(dataset: DOMStringMap, stars: NodeListOf<HTMLImageElement>) {
    let index = parseInt(dataset.rating || "-1")
    let half = dataset.halfRating === "true"
    setRatingTo(index, half, stars)
}


document.addEventListener("click", (e) => {
    if (dlgGame.open && dlgGame.contains(e.target as Node)) {
        dlgGame.close()
    }
})

async function updateNamePlate(user: string) {
    console.log("Welcome", user)
    playerNamePlate.querySelector(".player-name")!.textContent = user;

    let game = await findUserGames(JAM_NAME, user)
    playerNamePlate.querySelector(".game")!.classList.remove("has-game");

    if (game.games.length === 0) {
        const dialogs = [
            `Did you know there are exactly ${storage.stats()?.published} games submitted for LD${JAM_NAME}?`,
            `Did you know there are ${storage.stats()?.signups} signups with ${storage.stats()?.authors} authors for LD${JAM_NAME}?`,
            `Sadly ${storage.stats()?.unpublished} games were not published for LD${JAM_NAME}.`,
        ];
        const randomIndex = Math.floor(Math.random() * dialogs.length);
        const randomDialog = dialogs[randomIndex];
        openOkDialog(randomDialog, () => {
        });

    } else {
        const randomIndex = Math.floor(Math.random() * game.games.length);
        const randomGame = game.games[randomIndex];

        if (localStorage.getItem("bells") !== user) {
            openOkDialog(`Does ${randomGame.name} ring a bell? Good.`, () => {
                localStorage.setItem("bells", user)
                askEmbedd(game.current)
            })
        }

        let currentGameName = game.current?.name;
        playerNamePlate.querySelector(".game-name")!.textContent = currentGameName || ""
        playerNamePlate.querySelector(".game")
        if (game.current != null) {
            playerNamePlate.querySelector(".game")!.classList.add("has-game");
        }

        if (game.current) {
            let coord = storage.gameCoordById(game.current.id);
            if (!coord) {
                await storage.attemptPlacingGame(game.current.id);

                // TODO teleport to
            } else {
                console.log(user, "your game", game.current.id, "is already placed @", coord)
            }
        } else {
            console.log(user, "You have no game")
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
    console.log("open ok", textContent)
}

function currentUser() {
    return localStorage.getItem(LOCALSTORAGE_USER) || '???';
}

export async function loadUI() {
    let user = currentUser();
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
        updateNamePlate("Guest")
    }
    dlgUserName.close()
}

function openGameInfo(gameId: number) {
    let info = storage.gameById(gameId)

    console.log("Open Game", gameId)

    dlgGame.dataset.gameId = gameId.toString();
    dlgGame.querySelector(".content")!.textContent = info.name

    btbWebGameOpener.style.display = "none"
    if (info.web) {
        btbWebGameOpener.style.display = "block"
        btbWebGameOpener.dataset.url = info.web
    }
    btnJamPageOpener.dataset.url = `https://ldjam.com${info.path}`

    // TODO read rating
    let rating = 2.5
    dlgGame.dataset.rating = Math.round(rating - 1).toString()
    dlgGame.dataset.halfRating = (Math.floor(rating) !== rating).toString()

    resetRating(dlgGame.dataset, gameStars)

    dlgGame.show()

}

function closeGameInfo() {
    dlgGame.close()
}

function openWebGame(url: string | undefined) {
    let popupWindow: Window | null = null;
    if (url) {
        popupWindow = window.open(url, "_blank", "resizable=no,toolbar=no,scrollbars=no,menubar=no,status=no,directories=no");

        const interval = setInterval(() => {
            if (popupWindow === null || popupWindow.closed) {
                clearInterval(interval);
                openQuestion("Thanks for Playing. Did it work?", openRating, reportBrokenGame)
                // TODO trophies
                // TODO if logged in note that we played a game
            }
        }, 100);
    }
}

function openAwards() {
    let content = dlgAwards.querySelector(".content");
    content!.innerHTML = storage.awards().map(award => {
        const awardObjects = [award1, award2, award3]
        let awIdx = Math.floor(Math.random() * awardObjects.length);
        const randomAwardObject = awardObjects[awIdx]
        return `<button data-award="${award.key}">
                        <div class="bg">
                            <img class="aw-${awIdx}" src="${randomAwardObject}">
                        </div>
                        <div class="bg icon">
                            <div class="aw-${awIdx}">${award.icon}</div>
                        </div>
                        <div class="name">${award.name}</div>
                    </button>`
    }).join("")
    for (let btn of content!.querySelectorAll("button")) {
        btn.addEventListener("click", () => {

            server.postAward(currentGameId(), currentUser(), btn.dataset.award!)

        }
        )
    }

    dlgAwards.showModal()
}

function currentGameId() {
    return parseInt(dlgGame.dataset.gameId!);
}

function reportBrokenGame() {
    let gameId = currentGameId();
    console.log("TODO report broken game ", gameId)

}

function openRating() {
    dlgRating.dataset.rating = undefined
    dlgRating.dataset.halfRating = undefined
    resetRating(dlgRating.dataset, stars)
    dlgRating.show()
    btnSubmitRating.classList.add("inactive")
}


function submitRating() {
    let gameId = parseInt(dlgGame.dataset.gameId!)
    let index = parseInt(dlgRating.dataset.rating || "-1")
    let half = dlgRating.dataset.halfRating === "true"

    console.log("TODO submit rating", gameId, index - (half ? 0.5 : 0))
    // TODO submit to server
    dlgRating.close()
    setRatingTo(index, half, gameStars)

    // btbWebGameOpener.style.display = 'none'
}


function openQuestion(question: string, yesCb: (() => void) | null, noCb: (() => void) | null) {
    dlgYesNo.querySelector(".content")!.textContent = question;
    dlgYesNoCb.yes = yesCb;
    dlgYesNoCb.no = noCb;
    dlgYesNo.showModal()
}


export let ui = {
    openGameInfo,
    closeGameInfo
} as const