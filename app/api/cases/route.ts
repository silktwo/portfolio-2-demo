import { NextResponse } from "next/server"
import { getCaseProjects } from "@/lib/notion-cases"

export async function GET() {
  try {
    console.log("🚀 Cases API route called")

    const result = await getCaseProjects()

    const metadata = {
      count: result.data.length,
      errors: result.error ? [result.error] : [],
      warnings: [] as string[],
      debugInfo: {
        token: process.env.CASES_TOKEN ? "CASES_TOKEN" : undefined,
        databaseId: process.env.CASES_DATABASE_ID,
      },
    }

    console.log("📊 Cases API result:", metadata)

    return NextResponse.json(
      {
        success: result.success,
        data: result.data,
        metadata,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("❌ Cases API route error:", error)
    return NextResponse.json(
      {
        success: false,
        data: [],
        metadata: {
          count: 0,
          errors: [error instanceof Error ? error.message : "Unknown API error"],
          warnings: [],
          debugInfo: { apiError: true },
        },
      },
      { status: 200 },
    )
  }
}
