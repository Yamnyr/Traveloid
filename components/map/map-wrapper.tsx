"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function MapWrapper({ pins }: { pins: any[] }) {
  const Map = useMemo(
    () =>
      dynamic(() => import("@/components/map/travel-map"), {
        loading: () => <Skeleton className="h-[calc(100vh-4rem)] w-full" />,
        ssr: false,
      }),
    [],
  )

  return <Map pins={pins} />
}
