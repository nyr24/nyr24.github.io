export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export const isSubpost = (id: string) => id.includes("/")

export const subpostSlug = (id: string) => id.split("/")[1]

export const normalizePath = (pathname: string) => {
  try {
    return decodeURIComponent(pathname).replace(/\/+$/, "")
  } catch {
    return pathname.replace(/\/+$/, "")
  }
}

export const baseUrl = (() => {
  const base = import.meta.env.BASE_URL
  return base.endsWith("/") ? base : `${base}/`
})()

export const rootPath = (path: string) =>
  path.startsWith("/") ? `${baseUrl}${path.slice(1)}` : path

export const hashId = (hash: string) => decodeURIComponent(hash.slice(1))
