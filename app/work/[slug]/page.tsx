import { getCaseBySlug } from "@/lib/notion-cases"
import WorkPageClient from "./WorkPageClient"
import type { Metadata } from "next"

// Fallback data for development and testing
const fallbackProjects = {
  "maitreya-logo-design": {
    id: "fallback-1",
    projectTitle: "MAITREYA",
    slug: "maitreya-logo-design",
    description:
      "Maitreya is a premium tea brand that focuses on organic, ethically sourced teas. The identity system was designed to reflect the brand's commitment to quality and sustainability while maintaining a modern, minimalist aesthetic.",
    team: "Designer: Dmytro Kifuliak, Creative director: Illia Anufriienko, Senior copywriter: Sergey Artemenko",
    categoryTags: ["identity", "packaging", "logo design"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    introImage: "/placeholder.svg?height=800&width=1440",
    projectMedia: [
      "/placeholder.svg?height=600&width=800",
      "/placeholder.svg?height=600&width=800",
      "/placeholder.svg?height=800&width=600",
      "/placeholder.svg?height=600&width=800",
    ],
    draftProcess: [
      "/placeholder.svg?height=400&width=600",
      "/placeholder.svg?height=400&width=600",
      "/placeholder.svg?height=400&width=600",
    ],
    addMedia: ["/placeholder.svg?height=600&width=800", "/placeholder.svg?height=600&width=800"],
    publish: true,
    comingSoon: false,
    link: "",
  },
  "derzhstat-identity": {
    id: "fallback-2",
    projectTitle: "DERZHSTAT",
    slug: "derzhstat-identity",
    description:
      "A comprehensive identity system for Derzhstat, Ukraine's State Statistics Service. The project involved creating a modern visual language that could effectively communicate complex statistical data while maintaining a professional government identity.",
    team: "Designer: Dmytro Kifuliak, Creative director: Illia Anufriienko, Senior strategist: Sergey Lizunov",
    categoryTags: ["IDENTITY", "BRANDING"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    introImage: "/placeholder.svg?height=800&width=1440",
    projectMedia: [
      "/placeholder.svg?height=600&width=800",
      "/placeholder.svg?height=600&width=800",
      "/placeholder.svg?height=800&width=600",
      "/placeholder.svg?height=600&width=800",
    ],
    draftProcess: [
      "/placeholder.svg?height=400&width=600",
      "/placeholder.svg?height=400&width=600",
      "/placeholder.svg?height=400&width=600",
    ],
    addMedia: ["/placeholder.svg?height=600&width=800"],
    publish: true,
    comingSoon: false,
    link: "",
  },
}

interface Props {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    // Try to get from database
    const project = await getCaseBySlug(params.slug)

    if (project) {
      return {
        title: project.projectTitle,
        description: project.description,
      }
    }

    // Try fallback data
    const fallbackProject = fallbackProjects[params.slug]
    if (fallbackProject) {
      return {
        title: fallbackProject.projectTitle,
        description: fallbackProject.description,
      }
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
  }

  // Default metadata
  return {
    title: "Case Study",
    description: "View this case study project",
  }
}

export default async function WorkPage({ params }: Props) {
  try {
    console.log(`🔍 Server: Fetching project with slug: ${params.slug}`)

    // Try to get from database
    let project = await getCaseBySlug(params.slug)
    let dataSource = "database"

    // If not found in database, try fallback data
    if (!project) {
      console.log(`⚠️ Server: Project not found in database, checking fallback data`)
      const fallbackProject = fallbackProjects[params.slug]

      if (fallbackProject) {
        console.log(`✅ Server: Using fallback data for: ${params.slug}`)
        project = fallbackProject
        dataSource = "fallback"
      } else {
        console.log(`❌ Server: Project not found in fallback data either: ${params.slug}`)
      }
    } else {
      console.log(`✅ Server: Found project in database: ${project.projectTitle}`)
    }

    // If we have a project (either from database or fallback), render the page
    if (project) {
      return <WorkPageClient params={params} initialProject={project} dataSource={dataSource} />
    }

    // If no project found, show a custom not found page
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="w-[calc(100%-40px)] sm:w-[calc(100%-60px)] mx-[20px] sm:mx-[30px] py-[30px]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Project Not Found</h1>
            <p className="mt-2">
              The project "{params.slug}" could not be found. Please check the URL or return to the projects page.
            </p>
            <div className="mt-4">
              <a href="/work" className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors">
                Back to Projects
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error in WorkPage:", error)

    // Show error page
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="w-[calc(100%-40px)] sm:w-[calc(100%-60px)] mx-[20px] sm:mx-[30px] py-[30px]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Error Loading Project</h1>
            <p className="mt-2">
              There was an error loading this project. Please try again later or return to the projects page.
            </p>
            <div className="mt-4">
              <a href="/work" className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors">
                Back to Projects
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
