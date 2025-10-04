const defaultBackendUrl = new URL("https://banana4.life")

function getBackendUrl(): URL {
    const currentUrl = new URL(document.location.href)
    const backendUrl = currentUrl.searchParams.get("backend")
    if (backendUrl) {
        return new URL(backendUrl)
    }
    return defaultBackendUrl
}