import type { APIRoute } from "astro"
import { baseUrl } from "@/lib/utils"

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL(`${baseUrl}sitemap-index.xml`, site)
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`)
}
