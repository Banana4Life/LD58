const defaultJam = "58"
const defaultBackendUrl = new URL("https://banana4.life")
const currentUrl = new URL(document.location.href)

export function getBackendUrl(): URL {
    const backendUrl = currentUrl.searchParams.get("backend")
    if (backendUrl) {
        return new URL(backendUrl)
    }
    return new URL(defaultBackendUrl)
}

export function getBackendUrlFor(path: string): URL {
    const backendUrl = getBackendUrl()
    const prefix = backendUrl.pathname.replace(/\/$/, '')
    backendUrl.pathname = prefix + path
    return backendUrl
}

export function getJam() {
    const jam = currentUrl.searchParams.get("jam")
    if (jam) {
        return jam
    }
    return defaultJam
}

export function eggs() {
    if (currentUrl.searchParams.get("utm_source") === "MetaJammer") {
        alert("🥚🥚🥚")
    }
}