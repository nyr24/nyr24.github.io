import type { SvgComponent } from "astro/types"
import GitHub from "@/assets/icons/github.svg"
import { baseUrl } from "@/lib/utils"

export const SITE = {
  title: "nyr24-blog",
  description: "Blog about programming",
  locale: "en-US",
  dir: "ltr",
  defaultPageImage: `${baseUrl}static/opengraph-image.png`,
  defaultPostImage: `${baseUrl}static/1200x630.png`,
} as const

export const NAVIGATION = [
  { href: `${baseUrl}blog`, label: "Blog" },
  { href: `${baseUrl}authors`, label: "Authors" },
]

export const SOCIALS: { href: string; label: string; icon: SvgComponent }[] = [
  { href: "https://github.com/nyr24", label: "GitHub", icon: GitHub },
]
