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

export function getMaxZoom(): number | undefined {
    let max = currentUrl.searchParams.get("max-zoom");
    if (max == null) {
        return undefined;
    }
    return parseInt(max)
}

export function getBackendUrlFor(path: string, queryParams?: [string, string | number][]): URL {
    const backendUrl = getBackendUrl()
    const prefix = backendUrl.pathname.replace(/\/$/, '')
    if (queryParams) {
        for (let [parameter, value] of queryParams) {
            backendUrl.searchParams.append(parameter, `${value}`)
        }
    }
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