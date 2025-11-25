"use client"

import dynamic from "next/dynamic"
import { useMemo, Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useSearchParams } from "next/navigation"

function MapWithParams({ pins, currentUser }: { pins: any[]; currentUser: any }) {
  const searchParams = useSearchParams()
  const Map = useMemo(
    () =>
      dynamic(() => import("@/components/map/travel-map"), {
        loading: () => <Skeleton className="h-[calc(100vh-4rem)] w-full" />,
        ssr: false,
      }),
    [],
  )

  const lat = searchParams?.get("lat") ? Number(searchParams.get("lat")) : undefined
  const lng = searchParams?.get("lng") ? Number(searchParams.get("lng")) : undefined
  const pinId = searchParams?.get("pin") || undefined

  return <Map pins={pins} currentUser={currentUser} initialLat={lat} initialLng={lng} initialPinId={pinId} />
}

export default function MapWrapper({ pins, currentUser }: { pins: any[]; currentUser: any }) {
  return (
    <Suspense fallback={<Skeleton className="h-[calc(100vh-4rem)] w-full" />}>
      <MapWithParams pins={pins} currentUser={currentUser} />
    </Suspense>
  )
}
