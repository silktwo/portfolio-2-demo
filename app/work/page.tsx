import type { Metadata } from "next"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { getCaseProjects } from "@/lib/notion-cases"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"

export const metadata: Metadata = {
  title: "Work",
  description: "My projects",
}

// Fallback projects for development
const fallbackProjects = [
  {
    id: "fallback-1",
    projectTitle: "MAITREYA",
    slug: "maitreya-logo-design",
    description: "Maitreya is a premium tea brand that focuses on organic, ethically sourced teas.",
    team: "Designer: Dmytro Kifuliak, Creative director: Illia Anufriienko",
    categoryTags: ["identity", "packaging", "logo design"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    introImage: "/placeholder.svg?height=800&width=1440",
    projectMedia: [],
    draftProcess: [],
    publish: true,
    comingSoon: false,
  },
  {
    id: "fallback-2",
    projectTitle: "DERZHSTAT",
    slug: "derzhstat-identity",
    description: "A comprehensive identity system for Derzhstat, Ukraine's State Statistics Service.",
    team: "Designer: Dmytro Kifuliak, Creative director: Illia Anufriienko",
    categoryTags: ["identity", "site design"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    introImage: "/placeholder.svg?height=800&width=1440",
    projectMedia: [],
    draftProcess: [],
    publish: true,
    comingSoon: false,
  },
]

export default async function WorkPage() {
  let projects = []
  let dataSource = "database"

  try {
    console.log("🔍 Fetching projects for work page...")
    const result = await getCaseProjects()

    if (result.success && result.data.length > 0) {
      projects = result.data
      console.log(`✅ Using ${projects.length} projects from database`)
    } else {
      console.log("⚠️ No projects from database, using fallback data")
      projects = fallbackProjects
      dataSource = "fallback"
    }
  } catch (error) {
    console.error("❌ Error fetching projects:", error)
    projects = fallbackProjects
    dataSource = "fallback"
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="w-[calc(100%-40px)] sm:w-[calc(100%-60px)] mx-[20px] sm:mx-[30px] py-[30px]">
        <Navigation />
      </div>

      {/* Data source indicator */}
      {dataSource === "fallback" && (
        <div className="w-[calc(100%-40px)] sm:w-[calc(100%-60px)] mx-[20px] sm:mx-[30px] mb-8">
          <div className="bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-md">
            <p className="text-sm text-yellow-800">
              ⚠️ Using fallback data.{" "}
              <a href="/cases-debug" className="underline">
                Debug connection
              </a>{" "}
              to use live data.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="w-[calc(100%-40px)] sm:w-[calc(100%-60px)] mx-[20px] sm:mx-[30px] pb-[60px]">
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-2">Work</h1>
          <p className="text-gray-600">Selected case studies and projects</p>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <Link key={project.id} href={`/work/${project.slug}`}>
              <div className="group cursor-pointer">
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden mb-4 rounded-lg">
                  <img
                    src={project.thumbnail || project.introImage || "/placeholder.svg?height=400&width=600"}
                    alt={project.projectTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-black text-lg group-hover:text-gray-700 transition-colors">
                      {project.projectTitle}
                    </h3>
                    {project.comingSoon && (
                      <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">Coming Soon</Badge>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2">{project.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {project.categoryTags.map((tag, tagIndex) => (
                      <Badge
                        key={tagIndex}
                        variant="outline"
                        className="text-xs px-2 py-1 bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No projects found. Check your CMS connection.</p>
            <Link href="/cases-debug" className="text-blue-600 hover:underline mt-2 inline-block">
              Debug CMS Connection
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
