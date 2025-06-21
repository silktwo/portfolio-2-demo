import { Client } from "@notionhq/client"

export interface CaseProject {
  id: string
  projectTitle: string
  slug: string // We'll generate this from projectTitle
  description: string
  team: string
  categoryTags: string[]
  thumbnail: string // NEW - for listing pages
  introImage: string
  projectMedia: string[]
  draftProcess: string[]
  publish: boolean
  comingSoon: boolean // NEW - for "Coming Soon" projects
  link?: string // Optional, in case you add it later
}

export interface CaseProjectsResult {
  success: boolean
  data: CaseProject[]
  error?: string
}

// Helper function to generate slug from project title
function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim()
}

export async function getCaseProjects(): Promise<CaseProjectsResult> {
  try {
    console.log("🔍 Fetching case projects from Notion...")

    const notion = new Client({
      auth: process.env.CASES_TOKEN,
    })

    const response = await notion.databases.query({
      database_id: process.env.CASES_DATABASE_ID!,
      filter: {
        property: "publish",
        checkbox: {
          equals: true,
        },
      },
      sorts: [
        {
          property: "Created",
          direction: "descending",
        },
      ],
    })

    console.log(`✅ Found ${response.results.length} published case projects`)

    const projects: CaseProject[] = response.results.map((page: any) => {
      const properties = page.properties

      // Helper function to extract text from rich text
      const getRichText = (richTextArray: any[]) => {
        return richTextArray?.map((text: any) => text.plain_text).join("") || ""
      }

      // Helper function to extract files
      const getFiles = (filesArray: any[]) => {
        return (
          filesArray
            ?.map((file: any) => {
              if (file.type === "file") {
                return file.file.url
              } else if (file.type === "external") {
                return file.external.url
              }
              return ""
            })
            .filter(Boolean) || []
        )
      }

      // Helper function to extract multi-select
      const getMultiSelect = (multiSelectArray: any[]) => {
        return multiSelectArray?.map((item: any) => item.name) || []
      }

      const project: CaseProject = {
        id: page.id,
        projectTitle: properties["projectTitle"]?.title?.[0]?.plain_text || "",
        slug: generateSlugFromTitle(properties["projectTitle"]?.title?.[0]?.plain_text || ""),
        description: getRichText(properties["description"]?.rich_text || []),
        team: getRichText(properties["team"]?.rich_text || []),
        categoryTags: getMultiSelect(properties["categoryTags"]?.multi_select || []),
        thumbnail: getFiles(properties["thumbnail"]?.files || [])[0] || "",
        introImage: getFiles(properties["introImage"]?.files || [])[0] || "",
        projectMedia: getFiles(properties["projectMedia"]?.files || []),
        draftProcess: getFiles(properties["draftProcess"]?.files || []),
        publish: properties["publish"]?.checkbox || false,
        comingSoon: properties["comingSoon"]?.checkbox || false,
        link: properties["link"]?.url || "", // Optional field
      }

      return project
    })

    return {
      success: true,
      data: projects,
    }
  } catch (error) {
    console.error("❌ Error in getCaseProjects:", error)
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function getCaseBySlug(slug: string): Promise<CaseProject | null> {
  try {
    console.log(`🔍 Fetching case project by slug: ${slug}`)

    const notion = new Client({
      auth: process.env.CASES_TOKEN,
    })

    const response = await notion.databases.query({
      database_id: process.env.CASES_DATABASE_ID!,
      filter: {
        and: [
          {
            property: "Slug",
            rich_text: {
              equals: slug,
            },
          },
          {
            property: "publish",
            checkbox: {
              equals: true,
            },
          },
        ],
      },
    })

    if (response.results.length === 0) {
      console.log(`❌ No published project found with slug: ${slug}`)
      return null
    }

    const page = response.results[0] as any
    const properties = page.properties

    // Helper function to extract text from rich text
    const getRichText = (richTextArray: any[]) => {
      return richTextArray?.map((text: any) => text.plain_text).join("") || ""
    }

    // Helper function to extract files
    const getFiles = (filesArray: any[]) => {
      return (
        filesArray
          ?.map((file: any) => {
            if (file.type === "file") {
              return file.file.url
            } else if (file.type === "external") {
              return file.external.url
            }
            return ""
          })
          .filter(Boolean) || []
      )
    }

    // Helper function to extract multi-select
    const getMultiSelect = (multiSelectArray: any[]) => {
      return multiSelectArray?.map((item: any) => item.name) || []
    }

    const project: CaseProject = {
      id: page.id,
      projectTitle: properties["projectTitle"]?.title?.[0]?.plain_text || "",
      slug: generateSlugFromTitle(properties["projectTitle"]?.title?.[0]?.plain_text || ""),
      description: getRichText(properties["description"]?.rich_text || []),
      team: getRichText(properties["team"]?.rich_text || []),
      categoryTags: getMultiSelect(properties["categoryTags"]?.multi_select || []),
      thumbnail: getFiles(properties["thumbnail"]?.files || [])[0] || "",
      introImage: getFiles(properties["introImage"]?.files || [])[0] || "",
      projectMedia: getFiles(properties["projectMedia"]?.files || []),
      draftProcess: getFiles(properties["draftProcess"]?.files || []),
      publish: properties["publish"]?.checkbox || false,
      comingSoon: properties["comingSoon"]?.checkbox || false,
      link: properties["link"]?.url || "", // Optional field
    }

    console.log(`✅ Found project: ${project.projectTitle}`)
    return project
  } catch (error) {
    console.error(`❌ Error fetching project by slug ${slug}:`, error)
    return null
  }
}
