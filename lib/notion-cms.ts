import { Client } from "@notionhq/client"

// Unified Notion CMS configuration
export const NOTION_CONFIG = {
  // Personal Projects Database
  PERSONAL_PROJECTS: {
    DATABASE_ID: "20955dd5594d809999c8c3562cc7e95f",
    TOKEN_ENV: "PERSONAL_TOKEN",
    DEFAULT_TOKEN: "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",
    FIELDS: {
      TITLE: "workTitle",
      FILE: "workFile",
    },
  },
  // Commercial Projects Database
  COMMERCIAL_PROJECTS: {
    DATABASE_ID: "20955dd5594d8064aeffc4761a8a7c38",
    TOKEN_ENV: "COMMERCIAL_TOKEN",
    DEFAULT_TOKEN: "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",
    FIELDS: {
      TITLE: "projectTitle",
      CATEGORY: "categoryTags",
      THUMBNAIL: "thumbnail",
      LINK: "link",
    },
  },
  // Case Studies Database
  CASE_STUDIES: {
    DATABASE_ID: "20855dd5594d805f94d8d0f5686b292d",
    TOKEN_ENV: "CASES_TOKEN",
    DEFAULT_TOKEN: "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",
    FIELDS: {
      TITLE: "projectTitle",
      CATEGORY: "categoryTags",
      DESCRIPTION: "description",
      TEAM: "team",
      THUMBNAIL: "thumbnail",
      INTRO_IMAGE: "introImage",
      PROJECT_MEDIA: "projectMedia",
      DRAFT_PROCESS: "draftProcess",
      PUBLISH: "publish",
      LINK: "link",
    },
  },
  // Blog Posts Database
  BLOG_POSTS: {
    DATABASE_ID: "20855dd5594d80a8b3e2cdf91d74eb53",
    TOKEN_ENV: "NOTION_TOKEN",
    DEFAULT_TOKEN: "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",
    FIELDS: {
      TITLE: "blogPost",
      DATE: "date",
      PUBLISH: "publish",
      ATTACHMENTS: "attachments",
    },
  },
}

// Create Notion client with fallback tokens
function createNotionClient(preferredTokenEnv?: string): Client | null {
  const tokens = [
    preferredTokenEnv ? process.env[preferredTokenEnv] : null,
    process.env.CASES_TOKEN,
    process.env.COMMERCIAL_TOKEN,
    process.env.PERSONAL_TOKEN,
    process.env.NOTION_TOKEN,
    "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", // Cases fallback
    "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", // Commercial fallback
    "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", // Personal fallback
    "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", // Blog fallback
  ].filter(Boolean)

  for (const token of tokens) {
    if (token) {
      try {
        return new Client({ auth: token })
      } catch (error) {
        console.warn(`Failed to create Notion client with token: ${token.slice(0, 10)}...`)
        continue
      }
    }
  }

  console.error("No valid Notion token found")
  return null
}

// Test database connection
export async function testDatabaseConnection(
  databaseId: string,
  tokenEnv?: string,
): Promise<{
  success: boolean
  error?: string
  recordCount?: number
}> {
  try {
    const notion = createNotionClient(tokenEnv)
    if (!notion) {
      return { success: false, error: "No valid Notion client" }
    }

    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 1,
    })

    return {
      success: true,
      recordCount: response.results.length,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Validate database schema
export async function validateDatabaseSchema(
  databaseId: string,
  requiredFields: string[],
  tokenEnv?: string,
): Promise<{
  valid: boolean
  missingFields: string[]
  availableFields: string[]
}> {
  try {
    const notion = createNotionClient(tokenEnv)
    if (!notion) {
      return { valid: false, missingFields: requiredFields, availableFields: [] }
    }

    const database = await notion.databases.retrieve({ database_id: databaseId })
    const availableFields = Object.keys(database.properties)
    const missingFields = requiredFields.filter((field) => !availableFields.includes(field))

    return {
      valid: missingFields.length === 0,
      missingFields,
      availableFields,
    }
  } catch (error) {
    console.error("Error validating database schema:", error)
    return { valid: false, missingFields: requiredFields, availableFields: [] }
  }
}

export { createNotionClient }
