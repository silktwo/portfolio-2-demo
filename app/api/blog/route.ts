import { NextResponse } from "next/server"
import { getBlogPosts } from "@/lib/notion"

export const dynamic = "force-dynamic" // No caching

export async function GET() {
  try {
    const posts = await getBlogPosts()
    return NextResponse.json(posts)
  } catch (error) {
    console.error("Error in blog API route:", error)
    return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500 })
  }
}
