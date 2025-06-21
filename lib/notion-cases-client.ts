export interface CaseCardProject {
  title: string
  categories: string[]
  image: string
  slug: string
  comingSoon?: boolean
}

// Fetch case projects from the API route
export async function getCaseProjects(): Promise<CaseCardProject[]> {
  try {
    const res = await fetch('/api/cases', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })

    if (!res.ok) {
      console.error(`Failed to fetch /api/cases: ${res.status}`)
      return []
    }

    const data = await res.json()
    if (!data?.data) return []

    return data.data.map((p: any) => ({
      title: p.projectTitle,
      categories: Array.isArray(p.categoryTags)
        ? p.categoryTags.map((c: string) => c.toUpperCase())
        : [],
      image: p.thumbnail || p.introImage || '/placeholder.svg',
      slug: p.slug,
      comingSoon: p.comingSoon,
    }))
  } catch (error) {
    console.error('Error fetching case projects:', error)
    return []
  }
}
