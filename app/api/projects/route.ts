import { NextResponse } from "next/server"
import { Client } from "@notionhq/client"

export const dynamic = "force-dynamic"

// Function to clean database ID by removing dashes
function cleanDatabaseId(id: string): string {
  return id.replace(/-/g, "")
}

// Personal Projects Database Configuration
const PERSONAL_PROJECTS_CONFIG = {
  DATABASE_ID: cleanDatabaseId(process.env.PERSONAL_DATABASE_ID || "20955dd5594d809999c8c3562cc7e95f"),
  REQUIRED_FIELDS: {
    TITLE: "workTitle",
    FILE: "workFile",
  },
}

interface PersonalProject {
  id: string
  title: string
  slug: string
  image: string
  height?: string
  rawData?: any // For debugging
}

interface APIResponse {
  success: boolean
  projects: PersonalProject[]
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

// Create Notion client with multiple token fallbacks
function createNotionClient(): { client: Client | null; tokenUsed: string | null; errors: string[] } {
  const tokens = [
    { name: "PERSONAL_TOKEN", value: process.env.PERSONAL_TOKEN },
    { name: "NOTION_TOKEN", value: process.env.NOTION_TOKEN },
    // Fallback tokens
    { name: "FALLBACK_1", value: "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" },
    { name: "FALLBACK_2", value: "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" },
  ]

  const errors: string[] = []

  for (const token of tokens) {
    if (token.value) {
      try {
        const client = new Client({ auth: token.value })
        console.log(`✅ Successfully created Notion client using ${token.name}`)
        return { client, tokenUsed: token.name, errors }
      } catch (error) {
        const errorMsg = `❌ Failed to create client with ${token.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    } else {
      const errorMsg = `⚠️ Token ${token.name} is not available`
      console.warn(errorMsg)
      errors.push(errorMsg)
    }
  }

  return { client: null, tokenUsed: null, errors }
}

// Test database connection
async function testDatabaseConnection(
  client: Client,
): Promise<{ success: boolean; error?: string; recordCount?: number }> {
  try {
    console.log(`🔍 Testing connection to database: ${PERSONAL_PROJECTS_CONFIG.DATABASE_ID} (cleaned format)`)

    const response = await client.databases.query({
      database_id: PERSONAL_PROJECTS_CONFIG.DATABASE_ID,
      page_size: 1,
    })

    console.log(`✅ Database connection successful. Found ${response.results.length} records (showing 1 of total)`)
    return { success: true, recordCount: response.results.length }
  } catch (error) {
    const errorMsg = `❌ Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`
    console.error(errorMsg)
    return { success: false, error: errorMsg }
  }
}

// Validate database schema
async function validateDatabaseSchema(client: Client): Promise<{
  valid: boolean
  availableFields: string[]
  missingFields: string[]
  fieldTypes: Record<string, string>
}> {
  try {
    console.log("🔍 Validating database schema...")

    const database = await client.databases.retrieve({
      database_id: PERSONAL_PROJECTS_CONFIG.DATABASE_ID,
    })

    const availableFields = Object.keys(database.properties)
    const fieldTypes: Record<string, string> = {}

    // Get field types
    Object.entries(database.properties).forEach(([key, value]: [string, any]) => {
      fieldTypes[key] = value.type
    })

    const requiredFields = Object.values(PERSONAL_PROJECTS_CONFIG.REQUIRED_FIELDS)
    const missingFields = requiredFields.filter((field) => !availableFields.includes(field))

    console.log(`📋 Available fields: ${availableFields.join(", ")}`)
    console.log(`📋 Required fields: ${requiredFields.join(", ")}`)
    console.log(`📋 Missing fields: ${missingFields.join(", ") || "None"}`)

    return {
      valid: missingFields.length === 0,
      availableFields,
      missingFields,
      fieldTypes,
    }
  } catch (error) {
    console.error("❌ Schema validation failed:", error)
    return {
      valid: false,
      availableFields: [],
      missingFields: Object.values(PERSONAL_PROJECTS_CONFIG.REQUIRED_FIELDS),
      fieldTypes: {},
    }
  }
}

// Fetch projects from Notion
async function fetchProjectsFromNotion(client: Client): Promise<{
  projects: PersonalProject[]
  errors: string[]
  warnings: string[]
  debugInfo: any
}> {
  const errors: string[] = []
  const warnings: string[] = []
  const debugInfo: any = { processedRecords: [], skippedRecords: [] }

  try {
    console.log("📥 Fetching projects from Notion...")

    const response = await client.databases.query({
      database_id: PERSONAL_PROJECTS_CONFIG.DATABASE_ID,
      sorts: [
        {
          property: PERSONAL_PROJECTS_CONFIG.REQUIRED_FIELDS.TITLE,
          direction: "ascending",
        },
      ],
    })

    console.log(`📊 Retrieved ${response.results.length} records from database`)

    if (response.results.length === 0) {
      warnings.push("No records found in the database")
      return { projects: [], errors, warnings, debugInfo }
    }

    const projects: PersonalProject[] = []

    for (const [index, page] of response.results.entries()) {
      try {
        const pageData = page as any
        const properties = pageData.properties

        console.log(`🔄 Processing record ${index + 1}/${response.results.length} (ID: ${pageData.id})`)

        // Extract title
        let title = ""
        const titleField = properties[PERSONAL_PROJECTS_CONFIG.REQUIRED_FIELDS.TITLE]

        if (titleField?.title?.[0]?.plain_text) {
          title = titleField.title[0].plain_text
        } else if (titleField?.rich_text?.[0]?.plain_text) {
          title = titleField.rich_text[0].plain_text
        }

        if (!title) {
          const warning = `⚠️ Record ${pageData.id} skipped: No title found in ${PERSONAL_PROJECTS_CONFIG.REQUIRED_FIELDS.TITLE} field`
          console.warn(warning)
          warnings.push(warning)
          debugInfo.skippedRecords.push({ id: pageData.id, reason: "No title", properties })
          continue
        }

        // Extract image/file
        let image = ""
        const fileField = properties[PERSONAL_PROJECTS_CONFIG.REQUIRED_FIELDS.FILE]

        if (fileField?.files && Array.isArray(fileField.files) && fileField.files.length > 0) {
          const file = fileField.files[0]
          if (file.type === "file" && file.file?.url) {
            image = file.file.url
          } else if (file.type === "external" && file.external?.url) {
            image = file.external.url
          }
        }

        if (!image) {
          const warning = `⚠️ Record ${pageData.id} skipped: No file found in ${PERSONAL_PROJECTS_CONFIG.REQUIRED_FIELDS.FILE} field`
          console.warn(warning)
          warnings.push(warning)
          debugInfo.skippedRecords.push({ id: pageData.id, reason: "No file", properties })
          continue
        }

        // Create slug
        const slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")

        const project: PersonalProject = {
          id: pageData.id,
          title: title.toUpperCase(),
          slug,
          image,
          height: "200px",
          rawData: { properties }, // For debugging
        }

        projects.push(project)
        debugInfo.processedRecords.push({ id: pageData.id, title, image: image.substring(0, 50) + "..." })

        console.log(`✅ Successfully processed: ${title}`)
      } catch (recordError) {
        const error = `❌ Error processing record ${index + 1}: ${recordError instanceof Error ? recordError.message : "Unknown error"}`
        console.error(error)
        errors.push(error)
      }
    }

    console.log(`🎉 Successfully processed ${projects.length} projects out of ${response.results.length} records`)
    return { projects, errors, warnings, debugInfo }
  } catch (error) {
    const errorMsg = `❌ Failed to fetch projects: ${error instanceof Error ? error.message : "Unknown error"}`
    console.error(errorMsg)
    errors.push(errorMsg)
    return { projects: [], errors, warnings, debugInfo }
  }
}

export async function GET() {
  console.log("🚀 Personal Projects API route called")

  const response: APIResponse = {
    success: false,
    projects: [],
    metadata: {
      count: 0,
      source: "error",
      databaseId: PERSONAL_PROJECTS_CONFIG.DATABASE_ID,
      requiredFields: Object.values(PERSONAL_PROJECTS_CONFIG.REQUIRED_FIELDS),
      errors: [],
      warnings: [],
    },
  }

  try {
    // Step 1: Create Notion client
    const { client, tokenUsed, errors: clientErrors } = createNotionClient()
    response.metadata.errors = [...(response.metadata.errors || []), ...clientErrors]

    if (!client) {
      response.metadata.errors?.push("❌ Failed to create Notion client with any available token")
      return NextResponse.json(response, { status: 500 })
    }

    console.log(`✅ Using token: ${tokenUsed}`)

    // Step 2: Test database connection
    const connectionTest = await testDatabaseConnection(client)
    if (!connectionTest.success) {
      response.metadata.errors?.push(connectionTest.error || "Database connection failed")
      return NextResponse.json(response, { status: 500 })
    }

    // Step 3: Validate schema
    const schemaValidation = await validateDatabaseSchema(client)
    response.metadata.debugInfo = {
      tokenUsed,
      availableFields: schemaValidation.availableFields,
      fieldTypes: schemaValidation.fieldTypes,
    }

    if (!schemaValidation.valid) {
      response.metadata.errors?.push(`❌ Missing required fields: ${schemaValidation.missingFields.join(", ")}`)
      response.metadata.errors?.push(`Available fields: ${schemaValidation.availableFields.join(", ")}`)
      return NextResponse.json(response, { status: 400 })
    }

    // Step 4: Fetch projects
    const { projects, errors: fetchErrors, warnings, debugInfo } = await fetchProjectsFromNotion(client)

    response.success = true
    response.projects = projects
    response.metadata.count = projects.length
    response.metadata.source = projects.length > 0 ? "notion" : "empty"
    response.metadata.errors = [...(response.metadata.errors || []), ...fetchErrors]
    response.metadata.warnings = warnings
    response.metadata.debugInfo = { ...response.metadata.debugInfo, ...debugInfo }

    console.log(
      `🎉 API response ready: ${projects.length} projects, ${fetchErrors.length} errors, ${warnings.length} warnings`,
    )

    return NextResponse.json(response)
  } catch (error) {
    const errorMsg = `❌ Unexpected error in API route: ${error instanceof Error ? error.message : "Unknown error"}`
    console.error(errorMsg)
    response.metadata.errors?.push(errorMsg)
    return NextResponse.json(response, { status: 500 })
  }
}
