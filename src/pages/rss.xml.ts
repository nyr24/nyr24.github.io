import { SITE } from "@/consts"
import { getPosts } from "@/lib/content"
import { baseUrl } from "@/lib/utils"
import rss from "@astrojs/rss"
import type { APIContext } from "astro"

export async function GET(context: APIContext) {
  const posts = await getPosts()
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: new URL(baseUrl, context.site),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `${baseUrl}blog/${post.id}`,
    })),
  })
}
