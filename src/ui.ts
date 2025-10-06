import {server} from "./server.ts";
import {JAM_NAME, storage} from "./storage.ts";
import fullStar from './assets/full-star.svg';
import halfStar from './assets/half-star.svg';
import emptyStar from './assets/empty-star.svg';
// import award1 from './assets/award-1.svg';
import award2 from './assets/award-2.svg';
// import award3 from './assets/award-3.svg';
import certificate from './assets/certificate.svg';
import {scene} from "./scene.ts";


const LOCALSTORAGE_USER = "user";

let dlgUserName = document.querySelector<HTMLDialogElement>("#dlg-username")!;
dlgUserName.querySelector("form")?.addEventListener("submit", saveUserName)

let dlgAwardRanking = document.querySelector<HTMLDialogElement>("#dlg-award-ranking")!;

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


let headerElement = document.querySelector("header")!;
let headerGame = headerElement.querySelector<HTMLElement>(".game")!;

let playerNamePlate = document.querySelector("#player")!;
let btnChangeUser = document.querySelector("#btn-change-user")!;
btnChangeUser.addEventListener("click", openUsernameDialog)
let btnAwardRanking = document.querySelector("#btn-award-ranking")!;
btnAwardRanking.addEventListener("click", openAwardRanking)


let dlgLogo = document.querySelector<HTMLDialogElement>("#dlg-logo")!;

let dlgGame = document.querySelector<HTMLDialogElement>("#dlg-game")!;
let btbWebGameOpener = dlgGame.querySelector<HTMLButtonElement>(".dlg-btn-webgame")!;
let btnJamPageOpener = dlgGame.querySelector<HTMLButtonElement>(".dlg-btn-jamgamepage")!;
let btnAwards = dlgGame.querySelector<HTMLButtonElement>(".dlg-btn-awards")!;
let gameStars = dlgGame.querySelectorAll<HTMLImageElement>(".star")!
let gameStarsContainer = dlgGame.querySelector<HTMLElement>(".stars")!

let dlgGames = document.querySelector("#dlg-games")!
let dlgGamesTemplate = document.querySelector<HTMLTemplateElement>("#prev-game-template")!
let dlgAwardRankingTemplate = document.querySelector<HTMLTemplateElement>("#award-ranking-template")!


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
let btnCloseAwardRanking = dlgAwardRanking.querySelector<HTMLButtonElement>(".dlg-btn-close-award-ranking")
btnCloseAwardRanking?.addEventListener("click", () => {
    dlgAwardRanking.close()
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
let ratingStars = dlgRating.querySelectorAll<HTMLImageElement>(".star")!
ratingStars.forEach((star, index) => {
    star.addEventListener('mousemove', (e) => {
        selectRating(e, index, 'move')
    });
    star.addEventListener('click', (e) => {
        selectRating(e, index, 'click')
    });

    star.addEventListener('mouseleave', () => {
        resetStarsToDataSet(dlgRating.dataset, ratingStars)
    });
});


let btnSubmitRating = dlgRating.querySelector(".dlg-btn-submit-rating")!;
btnSubmitRating.addEventListener('click', () => {
    submitRating()
})
let btnCancelRating = dlgRating.querySelector(".dlg-btn-cancel-rating")!;
btnCancelRating.addEventListener('click', () => {
    dlgRating.close()
})

function selectRating(e: MouseEvent, index: number, action: string) {
    const rect = (e.target as HTMLElement)!.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    const isEmpty = index == 0 && e.clientX - rect.left < rect.width / 8;
    index = isEmpty ? index - 1 : index
    setStars(index, isHalf, ratingStars);
    if (action == 'click') {
        dlgRating.dataset.rating = index.toString()
        dlgRating.dataset.halfRating = isHalf.toString()
        btnSubmitRating.classList.remove("inactive")
    }
}

function setStars(index: number, isHalf: boolean, stars: NodeListOf<HTMLImageElement>) {
    stars.forEach((s, i) => {
        if (i < index) s.src = fullStar;
        else if (i === index && isHalf) s.src = halfStar;
        else if (i === index) s.src = fullStar
        else s.src = emptyStar
    });
}


function resetStarsToDataSet(dataset: DOMStringMap, stars: NodeListOf<HTMLImageElement>) {
    let index = parseInt(dataset.rating || "-1")
    let half = dataset.halfRating === "true"
    setStars(index, half, stars)
}


document.addEventListener("click", (e) => {
    if (dlgGame.open && dlgGame.contains(e.target as Node)) {
        dlgGame.close()
    }
})

async function updateNamePlate(user: string) {
    console.log("Welcome", user)
    playerNamePlate.querySelector(".player-name")!.textContent = user;

    let userGamesInfo = await server.findUserGames(JAM_NAME, user)
    headerGame.classList.remove("has-game");

    if (userGamesInfo.games.length === 0) {
        const dialogs = [
            `Did you know there are exactly ${storage.stats()?.published} games submitted for LD${JAM_NAME}?`,
            `Did you know there are ${storage.stats()?.signups} signups with ${storage.stats()?.authors} authors for LD${JAM_NAME}?`,
            `Sadly ${storage.stats()?.unpublished} games were not published for LD${JAM_NAME}.`,
        ];
        const randomIndex = Math.floor(Math.random() * dialogs.length);
        const randomDialog = dialogs[randomIndex];
        openOkDialog(randomDialog, () => {});

    } else {
        const randomIndex = Math.floor(Math.random() * userGamesInfo.games.length);
        const randomGame = userGamesInfo.games[randomIndex];

        if (localStorage.getItem("bells") !== user) {
            openOkDialog(`Does ${randomGame.name} ring a bell? Good.`, () => {
                localStorage.setItem("bells", user)
            })
        }

        let currentGameName = userGamesInfo.current?.name;
        headerElement.querySelector(".game-name")!.textContent = currentGameName || ""
        if (userGamesInfo.current != null) {
            headerGame.dataset.owngame = userGamesInfo.current.id.toString()
            headerGame.classList.add("has-game");
        }

        if (userGamesInfo.current) {
            let coord = storage.gameCoordById(userGamesInfo.current.id);
            if (!coord) {
                await storage.attemptPlacingGame(userGamesInfo.current.id);
                coord = storage.gameCoordById(userGamesInfo.current.id);
                if (!coord){
                    console.log("coord not found for", userGamesInfo.current.id, "after placing")
                    return
                }
            } else {
                console.log(user, "your game", userGamesInfo.current.id, "is already placed @", coord)
            }

            scene.selectTileByGameId(userGamesInfo.current.id)

            scene.loadTilesAround(coord, 4)
        } else {
            console.log(user, "You have no game")
        }
    }

    storage.clearUserRatingsCache()
    dlgGames.querySelectorAll<HTMLDivElement>(".game").forEach(game => game.remove())
    loadRatedGames()
}

function openOkDialog(textContent: string, cb: (() => void) | null = null) {
    dlgOk.querySelector(".content")!.textContent = textContent;
    dlgOkCb = cb;
    dlgOk.showModal()
    // console.log("open ok", textContent)
}

function currentUser() {
    return localStorage.getItem(LOCALSTORAGE_USER) || 'Guest';
}

async function loadRatedGames() {
    let ratings = await storage.getUserRatings(currentUser())

    for (let [gameId, rating] of ratings) {
        let game = storage.gameById(gameId)
        let starIndex = Math.ceil((rating / 2) - 1);
        let halfRating = (rating % 2 === 1)
        appendGame(starIndex, halfRating, game.name, gameId)
    }
}

async function loadUI() {
    let user = currentUser();
    if (user === null || user === "" || user === "Guest") {
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

function setDatasetStars(rating: number, dlg: HTMLDialogElement) {
    let starIndex = Math.ceil((rating / 2) - 1);
    dlg.dataset.rating = starIndex.toString()
    dlg.dataset.halfRating = (rating % 2 === 1).toString()
}

function openAwardRanking() {
    dlgAwardRanking.querySelectorAll<HTMLDivElement>(`.award-ranking`).forEach(game => game.remove())

    const topAwards = storage.topAwards();
    for (let {gameId, awardCount} of topAwards) {
        appendTopAwardGame(gameId, awardCount)
    }
    dlgAwardRanking.showModal()
}

function appendTopAwardGame(gameId: number, awardCount: number) {
    let clone = document.importNode(dlgAwardRankingTemplate.content, true)
    clone.querySelector(".name")!.textContent = storage.gameById(gameId).name
    clone.querySelector(".count")!.textContent = awardCount.toString()
    const gameIdDiv = document.createElement("div")
    gameIdDiv.classList.add("award-ranking")
    gameIdDiv.dataset.gameId = gameId.toString()
    gameIdDiv.appendChild(clone)
    dlgAwardRanking.querySelector(`.content`)!.append(gameIdDiv)
    gameIdDiv.addEventListener("click",  () => scene.selectTileByGameId(gameId))
}

async function openGameInfo(gameId: number) {
    let info = storage.gameById(gameId)

    // console.log("Open Game", gameId)

    if (headerGame.dataset.owngame === gameId.toString()) {
        gameStarsContainer.classList.add("own-game")
    } else {
        gameStarsContainer.classList.remove("own-game")
    }

    dlgGame.dataset.gameId = gameId.toString();
    dlgGame.querySelector(".content")!.textContent = info.name
    dlgGame.querySelector<HTMLImageElement>(".count img")!.src = certificate;
    let givenAwards = storage.givenAwards(currentGameId())
    dlgGame.querySelector<HTMLImageElement>(".count span")!.innerText = givenAwards.length.toString()

    btbWebGameOpener.style.display = "none"
    if (info.web) {
        btbWebGameOpener.style.display = "block"
        btbWebGameOpener.dataset.url = info.web
    }
    btnJamPageOpener.dataset.url = `https://ldjam.com${info.path}`

    let rating = await server.fetchGameRating(gameId)
    setDatasetStars(rating, dlgGame);
    resetStarsToDataSet(dlgGame.dataset, gameStars)

    dlgGame.style.display = "block"
    dlgLogo.style.display = "none"
}

function closeGameInfo() {
    dlgGame.style.display = "none"
    dlgLogo.style.display = "flex"
}

function openWebGame(url: string | undefined) {
    let popupWindow: Window | null = null;
    if (url) {
        popupWindow = window.open(url, "_blank", "resizable=no,toolbar=no,scrollbars=no,menubar=no,status=no,directories=no");

        if (headerGame.dataset.owngame !== currentGameId().toString()) {
            const interval = setInterval(() => {
                if (popupWindow === null || popupWindow.closed) {
                    clearInterval(interval);
                    openQuestion("Thanks for Playing. Did it work?", openRating, reportBrokenGame)
                }
            }, 100);
        }


    }
}

function openAwards() {
    let content = dlgAwards.querySelector(".content");
    let givenAwards = storage.givenAwards(currentGameId())
    // console.log("open", givenAwards)
    content!.innerHTML = storage.awards().map(award => {
        // const awardObjects = [award1, award2, award3]
        // const awIdx = Math.floor(Math.random() * awardObjects.length);
        // const randomAwardObject = awardObjects[awIdx]
        let cnt = givenAwards.filter(givenAward => givenAward.key === award.key).length
        return `<button data-award="${award.key}">
                        <div class="bg">
                            <img class="aw-${1}" src="${award2}">
                        </div>
                        <div class="bg icon">
                            <div class="aw-${1}">${award.icon}</div>
                        </div>
                        
                        <div class="name">
                            <div>${award.name}</div>
                        </div>
                        
                        <div class="bg count">
                            <img src="${certificate}">
                        </div>
                        <div class="bg count">
                            <span>${cnt}</span>
                        </div>
                    </button>`
    }).join("")
    for (let btn of content!.querySelectorAll("button")) {
        btn.addEventListener("click", async () => {
            let newCount = await storage.giveAward(currentGameId(), currentUser(), btn.dataset.award!)
            btn.querySelector(".bg.count span")!.textContent = newCount.toString();
        })
    }

    dlgAwards.showModal()
}

function currentGameId() {
    return parseInt(dlgGame.dataset.gameId!);
}

function reportBrokenGame() {
    let gameId = currentGameId();
    // TODO remove broken games when reported a bunch?
    console.log("TODO report broken game ", gameId)
}

async function openRating() {
    await openSpecificRating(currentGameId())
}

async function openSpecificRating(gameId: number) {
    const rating = await storage.getUserRating(gameId, currentUser())
    setDatasetStars(rating, dlgRating)
    resetStarsToDataSet(dlgRating.dataset, ratingStars)
    dlgRating.showModal()
    if (rating === -1) {
        btnSubmitRating.classList.add("inactive")
    }
}

function appendGame(index: number, half: boolean, name: string, gameId: number) {
    dlgGames.querySelectorAll<HTMLDivElement>(`.game[data-game-id="${gameId}"]`).forEach(game => game.remove())

    let clone = document.importNode(dlgGamesTemplate.content, true)
    clone.querySelector(".content")!.textContent = name
    setStars(index, half, clone.querySelectorAll<HTMLImageElement>(".star"))
    const gameIdDiv = document.createElement("div")
    gameIdDiv.classList.add("game")
    gameIdDiv.dataset.gameId = gameId.toString()
    gameIdDiv.appendChild(clone)
    dlgGames.prepend(gameIdDiv)
    gameIdDiv.addEventListener("click",  () => scene.selectTileByGameId(gameId))
}

async function submitRating() {
    let gameId = parseInt(dlgGame.dataset.gameId!)
    let index = parseInt(dlgRating.dataset.rating || "-1")
    let half = dlgRating.dataset.halfRating === "true"

    let newRating = ((index + 1) * 2) - (half ? 1 : 0);
    await storage.setUserRating(gameId, currentUser(), newRating)

    dlgRating.close()
    let rating = await server.fetchGameRating(gameId)
    setDatasetStars(rating, dlgGame);
    resetStarsToDataSet(dlgGame.dataset, gameStars)
    appendGame(index, half, dlgGame.querySelector(".content")!.textContent, gameId);
}


function openQuestion(question: string, yesCb: (() => void) | null, noCb: (() => void) | null) {
    dlgYesNo.querySelector(".content")!.textContent = question;
    dlgYesNoCb.yes = yesCb;
    dlgYesNoCb.no = noCb;
    dlgYesNo.showModal()
}


export let ui = {
    openGameInfo,
    closeGameInfo,
    loadUI
} as const