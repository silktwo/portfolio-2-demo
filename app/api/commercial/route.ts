import { NextResponse } from "next/server"
import { Client } from "@notionhq/client"

export const dynamic = "force-dynamic"

// Function to clean database ID by removing dashes
function cleanDatabaseId(id: string): string {
  return id.replace(/-/g, "")
}

// Commercial Projects Database Configuration
const COMMERCIAL_PROJECTS_CONFIG = {
  DATABASE_ID: cleanDatabaseId(process.env.COMMERCIAL_DATABASE_ID || "20955dd5594d8064aeffc4761a8a7c38"),
  REQUIRED_FIELDS: {
    TITLE: "projectTitle",
    TAGS: "categoryTags",
    THUMBNAIL: "thumbnail",
    LINK: "link",
  },
}

interface CommercialProject {
  id: string
  title: string
  categories: string[]
  image: string
  link: string
}

interface APIResponse {
  success: boolean
  projects: CommercialProject[]
  metadata: {
    count: number
    source: string
    databaseId: string
    requiredFields: string[]
    errors?: string[]
    warnings?: string[]
    debugInfo?: any
  }
}

// Create Notion client with validation
function createNotionClient(): { client: Client | null; tokenUsed: string | null; errors: string[] } {
  const tokens = [
    { name: "COMMERCIAL_TOKEN", value: process.env.COMMERCIAL_TOKEN },
    { name: "NOTION_TOKEN", value: process.env.NOTION_TOKEN },
    { name: "PERSONAL_TOKEN", value: process.env.PERSONAL_TOKEN },
    // Fallback token
    { name: "COMMERCIAL_FALLBACK", value: "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" },
  ]

  const errors: string[] = []

  for (const token of tokens) {
    if (token.value && token.value.trim() !== "") {
      try {
        // Validate token format
        if (!token.value.startsWith("ntn_") && !token.value.startsWith("secret_")) {
          errors.push(`❌ Invalid token format for ${token.name}: must start with 'ntn_' or 'secret_'`)
          continue
        }

        const client = new Client({
          auth: token.value.trim(),
          timeoutMs: 15000, // Reduced timeout
        })
        console.log(`✅ Successfully created Notion client using ${token.name}`)
        return { client, tokenUsed: token.name, errors }
      } catch (error) {
        const errorMsg = `❌ Failed to create client with ${token.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    } else {
      const errorMsg = `⚠️ Token ${token.name} is not available or empty`
      console.warn(errorMsg)
      errors.push(errorMsg)
    }
  }

  return { client: null, tokenUsed: null, errors }
}

// Simple database connection test
async function testDatabaseConnection(client: Client): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔍 Testing connection to database: ${COMMERCIAL_PROJECTS_CONFIG.DATABASE_ID}`)

    // First try to retrieve database info
    await client.databases.retrieve({
      database_id: COMMERCIAL_PROJECTS_CONFIG.DATABASE_ID,
    })

    console.log(`✅ Database retrieval successful`)
    return { success: true }
  } catch (error) {
    const errorMsg = `❌ Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`
    console.error(errorMsg)
    return { success: false, error: errorMsg }
  }
}

// Simplified project fetching with better error handling
async function fetchProjectsFromNotion(client: Client): Promise<{
  projects: CommercialProject[]
  errors: string[]
  warnings: string[]
}> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    console.log("📥 Fetching commercial projects from Notion...")

    // Simple query without sorting first
    const response = await client.databases.query({
      database_id: COMMERCIAL_PROJECTS_CONFIG.DATABASE_ID,
      page_size: 50, // Reduced page size
    })

    console.log(`📊 Retrieved ${response.results.length} records from database`)

    if (response.results.length === 0) {
      warnings.push("No records found in the commercial database")
      return { projects: [], errors, warnings }
    }

    const projects: CommercialProject[] = []

    for (const [index, page] of response.results.entries()) {
      try {
        const pageData = page as any
        const properties = pageData.properties

        console.log(`🔄 Processing record ${index + 1}/${response.results.length}`)

        // Extract title - try multiple field types
        let title = ""
        const titleField = properties[COMMERCIAL_PROJECTS_CONFIG.REQUIRED_FIELDS.TITLE]

        if (titleField) {
          if (titleField.title && titleField.title[0]?.plain_text) {
            title = titleField.title[0].plain_text
          } else if (titleField.rich_text && titleField.rich_text[0]?.plain_text) {
            title = titleField.rich_text[0].plain_text
          }
        }

        // Extract thumbnail
        let image = ""
        const thumbnailField = properties[COMMERCIAL_PROJECTS_CONFIG.REQUIRED_FIELDS.THUMBNAIL]

        if (thumbnailField?.files && thumbnailField.files[0]) {
          const file = thumbnailField.files[0]
          if (file.type === "file" && file.file?.url) {
            image = file.file.url
          } else if (file.type === "external" && file.external?.url) {
            image = file.external.url
          }
        }

        // Extract link
        let link = ""
        const linkField = properties[COMMERCIAL_PROJECTS_CONFIG.REQUIRED_FIELDS.LINK]
        if (linkField?.url) {
          link = linkField.url
        }

        // Extract categories
        let categories: string[] = []
        const categoriesField = properties[COMMERCIAL_PROJECTS_CONFIG.REQUIRED_FIELDS.TAGS]
        if (categoriesField?.multi_select) {
          categories = categoriesField.multi_select.map((cat: any) => cat.name).filter(Boolean)
        }

        // Only include projects with required fields
        if (title && image && link) {
          const project: CommercialProject = {
            id: pageData.id,
            title,
            categories,
            image,
            link,
          }

          projects.push(project)
          console.log(`✅ Added project: ${title}`)
        } else {
          const missing = []
          if (!title) missing.push("title")
          if (!image) missing.push("thumbnail")
          if (!link) missing.push("link")
          warnings.push(`⚠️ Skipped record ${pageData.id}: missing ${missing.join(", ")}`)
        }
      } catch (recordError) {
        const error = `❌ Error processing record ${index + 1}: ${recordError instanceof Error ? recordError.message : "Unknown error"}`
        console.error(error)
        errors.push(error)
      }
    }

    console.log(`🎉 Successfully processed ${projects.length} projects`)
    return { projects, errors, warnings }
  } catch (error) {
    const errorMsg = `❌ Failed to fetch projects: ${error instanceof Error ? error.message : "Unknown error"}`
    console.error(errorMsg)
    console.error("Error details:", error)
    errors.push(errorMsg)
    return { projects: [], errors, warnings }
  }
}

export async function GET() {
  console.log("🚀 Commercial Projects API route called")
  console.log("🔧 Environment check:")
  console.log("- COMMERCIAL_TOKEN:", process.env.COMMERCIAL_TOKEN ? "✅ Set" : "❌ Not set")
  console.log("- COMMERCIAL_DATABASE_ID:", process.env.COMMERCIAL_DATABASE_ID ? "✅ Set" : "❌ Not set")
  console.log("- Database ID being used:", COMMERCIAL_PROJECTS_CONFIG.DATABASE_ID)

  const response: APIResponse = {
    success: false,
    projects: [],
    metadata: {
      count: 0,
      source: "error",
      databaseId: COMMERCIAL_PROJECTS_CONFIG.DATABASE_ID,
      requiredFields: [
        COMMERCIAL_PROJECTS_CONFIG.REQUIRED_FIELDS.TITLE,
        COMMERCIAL_PROJECTS_CONFIG.REQUIRED_FIELDS.THUMBNAIL,
        COMMERCIAL_PROJECTS_CONFIG.REQUIRED_FIELDS.LINK,
      ],
      errors: [],
      warnings: [],
    },
  }

  try {
    // Step 1: Create Notion client
    console.log("📝 Step 1: Creating Notion client...")
    const { client, tokenUsed, errors: clientErrors } = createNotionClient()
    response.metadata.errors = [...(response.metadata.errors || []), ...clientErrors]

    if (!client) {
      const errorMsg = "❌ Failed to create Notion client with any available token"
      response.metadata.errors?.push(errorMsg)
      console.error(errorMsg)
      return NextResponse.json(response, { status: 200 })
    }

    console.log(`✅ Step 1 complete: Using token ${tokenUsed}`)

    // Step 2: Test database connection
    console.log("🔗 Step 2: Testing database connection...")
    const connectionTest = await testDatabaseConnection(client)
    if (!connectionTest.success) {
      const errorMsg = connectionTest.error || "Database connection failed"
      response.metadata.errors?.push(errorMsg)
      console.error(errorMsg)
      return NextResponse.json(response, { status: 200 })
    }

    console.log("✅ Step 2 complete: Database connection successful")

    // Step 3: Fetch projects
    console.log("📊 Step 3: Fetching projects...")
    const { projects, errors: fetchErrors, warnings } = await fetchProjectsFromNotion(client)

    response.success = true
    response.projects = projects
    response.metadata.count = projects.length
    response.metadata.source = projects.length > 0 ? "notion" : "empty"
    response.metadata.errors = [...(response.metadata.errors || []), ...fetchErrors]
    response.metadata.warnings = warnings
    response.metadata.debugInfo = {
      tokenUsed,
      databaseId: COMMERCIAL_PROJECTS_CONFIG.DATABASE_ID,
      recordCount: projects.length,
    }

    console.log(`✅ Step 3 complete: ${projects.length} projects fetched`)
    console.log(
      `🎉 API response ready: ${projects.length} projects, ${fetchErrors.length} errors, ${warnings.length} warnings`,
    )

    return NextResponse.json(response)
  } catch (error) {
    const errorMsg = `❌ Unexpected error in API route: ${error instanceof Error ? error.message : "Unknown error"}`
    console.error(errorMsg)
    console.error("Full error:", error)
    response.metadata.errors?.push(errorMsg)
    return NextResponse.json(response, { status: 200 })
  }
}
