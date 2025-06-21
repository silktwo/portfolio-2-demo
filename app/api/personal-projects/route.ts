import { NextResponse } from "next/server"
import { createNotionClient, NOTION_CONFIG } from "@/lib/notion-cms"

export const dynamic = "force-dynamic"

interface PersonalProject {
  id: string
  title: string
  slug: string
  image: string
  height?: string
}

async function getPersonalProjectsFromNotion(): Promise<PersonalProject[]> {
  try {
    const notion = createNotionClient(NOTION_CONFIG.PERSONAL_PROJECTS.TOKEN_ENV)
    if (!notion) {
      console.error("Failed to create Notion client for Personal Projects")
      return []
    }

    console.log("Querying Personal Projects database:", NOTION_CONFIG.PERSONAL_PROJECTS.DATABASE_ID.slice(0, 8) + "...")

    const response = await notion.databases.query({
      database_id: NOTION_CONFIG.PERSONAL_PROJECTS.DATABASE_ID,
      sorts: [
        {
          property: NOTION_CONFIG.PERSONAL_PROJECTS.FIELDS.TITLE,
          direction: "ascending",
        },
      ],
    })

    console.log(`Fetched ${response.results.length} projects from Personal Projects database`)

    if (response.results.length === 0) {
      console.warn("No projects found in Personal Projects database")
      return []
    }

    const projects = response.results
      .map((page: any) => {
        const properties = page.properties

        // Extract title from workTitle field
        let title = ""
        const titleField = properties[NOTION_CONFIG.PERSONAL_PROJECTS.FIELDS.TITLE]
        if (titleField?.title?.[0]?.plain_text) {
          title = titleField.title[0].plain_text
        } else if (titleField?.rich_text?.[0]?.plain_text) {
          title = titleField.rich_text[0].plain_text
        }

        if (!title) {
          console.warn(`Skipping project ${page.id} - no ${NOTION_CONFIG.PERSONAL_PROJECTS.FIELDS.TITLE} found`)
          return null
        }

        // Extract image from workFile field
        let image = ""
        const fileField = properties[NOTION_CONFIG.PERSONAL_PROJECTS.FIELDS.FILE]
        if (fileField?.files && Array.isArray(fileField.files)) {
          const file = fileField.files[0]
          if (file) {
            if (file.type === "file" && file.file?.url) {
              image = file.file.url
            } else if (file.type === "external" && file.external?.url) {
              image = file.external.url
            }
          }
        }

        if (!image) {
          console.warn(`Skipping project ${page.id} - no ${NOTION_CONFIG.PERSONAL_PROJECTS.FIELDS.FILE} found`)
          return null
        }

        // Create slug from title
        const slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")

        return {
          id: page.id,
          title: title.toUpperCase(),
          slug,
          image,
          height: "200px",
        }
      })
      .filter(Boolean)

    console.log(`Successfully processed ${projects.length} valid projects`)
    return projects
  } catch (error) {
    console.error("Error fetching personal projects from Notion:", error)
    return []
  }
}

export async function GET() {
  try {
    console.log("Personal Projects API route called")
    const projects = await getPersonalProjectsFromNotion()

    return NextResponse.json({
      projects,
      metadata: {
        isRealData: projects.length > 0,
        source: projects.length > 0 ? "notion" : "empty",
        count: projects.length,
        databaseId: NOTION_CONFIG.PERSONAL_PROJECTS.DATABASE_ID,
        requiredFields: [NOTION_CONFIG.PERSONAL_PROJECTS.FIELDS.TITLE, NOTION_CONFIG.PERSONAL_PROJECTS.FIELDS.FILE],
      },
    })
  } catch (error) {
    console.error("Error in Personal Projects API route:", error)

    return NextResponse.json({
      projects: [],
      metadata: {
        isRealData: false,
        source: "error",
        count: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}
