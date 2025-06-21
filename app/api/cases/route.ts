import { NextResponse } from "next/server"
import { getCaseProjects } from "@/lib/notion-cases"

export async function GET() {
  try {
    console.log("🚀 Cases API route called")

    const result = await getCaseProjects()

    console.log("📊 Cases API result:", {
      success: result.success,
      count: result.metadata.count,
      errors: result.metadata.errors.length,
      warnings: result.metadata.warnings.length,
    })

    return NextResponse.json(result, { status: 200 })
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
