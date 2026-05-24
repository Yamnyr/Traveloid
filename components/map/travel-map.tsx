"use client"

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CreatePinDialog } from "./create-pin-dialog"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import Link from "next/link"
import { 
  Plus, X, Search, Globe, LogOut, User, Sun, Moon, 
  Map, Grid, Compass, Heart, Calendar, Filter, Eye, ChevronRight,
  MapPin
} from "lucide-react"

// Fix for default leaflet markers
const iconUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png"
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png"
const shadowUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png"

// Leaflet Events and Bounds Sync
function MapEvents({
  onMapClick,
  isAddingPin,
  onBoundsChange,
}: {
  onMapClick: (e: any) => void
  isAddingPin: boolean
  onBoundsChange: (bounds: any) => void
}) {
  const map = useMapEvents({
    click: (e) => {
      if (isAddingPin) {
        onMapClick(e)
      }
    },
    moveend: () => {
      onBoundsChange(map.getBounds())
    },
    zoomend: () => {
      onBoundsChange(map.getBounds())
    },
  })

  // Set initial bounds once loaded
  useEffect(() => {
    onBoundsChange(map.getBounds())
  }, [map, onBoundsChange])

  return null
}

// Map Panning Controller
function MapNavigationController({ centerCoords }: { centerCoords: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (centerCoords) {
      map.setView(centerCoords, 12, { animate: true, duration: 1.2 })
    }
  }, [centerCoords, map])

  return null
}

export default function TravelMap({
  pins: initialPins,
  currentUser,
  initialLat,
  initialLng,
  initialPinId,
}: {
  pins: any[]
  currentUser: any
  initialLat?: number
  initialLng?: number
  initialPinId?: string
}) {
  const router = useRouter()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [pins, setPins] = useState(initialPins)
  
  // Navigation & States
  const [activeTab, setActiveTab] = useState<"map" | "explore">("map")
  const [isAddingPin, setIsAddingPin] = useState(false)
  const [tempPin, setTempPin] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedPin, setSelectedPin] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [enlargedPin, setEnlargedPin] = useState<any>(null)
  const [isEnlargedDialogOpen, setIsEnlargedDialogOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [L, setL] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [onlyMyPins, setOnlyMyPins] = useState(false)
  const [mapBounds, setMapBounds] = useState<any>(null)
  const [panTarget, setPanTarget] = useState<[number, number] | null>(null)

  // Sync isMobile layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Handle initial navigation from URL parameters
  useEffect(() => {
    if (initialPinId && pins.length > 0) {
      const targetPin = pins.find((p) => p.id === initialPinId)
      if (targetPin) {
        setPanTarget([Number(targetPin.latitude), Number(targetPin.longitude)])
        setTimeout(() => {
          handleEditPin(targetPin)
        }, 1200)
      }
    } else if (initialLat && initialLng) {
      setPanTarget([initialLat, initialLng])
    }
  }, [initialPinId, initialLat, initialLng, pins])

  // Update local pins when props change
  useEffect(() => {
    setPins(initialPins)
  }, [initialPins])

  // Filter logic
  const filteredPins = useMemo(() => {
    return pins.filter((pin) => {
      const name = pin.location_name?.toLowerCase() || ""
      const notes = pin.notes?.toLowerCase() || ""
      const author = pin.author_name?.toLowerCase() || ""
      const query = searchQuery.toLowerCase()

      const matchesSearch = name.includes(query) || notes.includes(query) || author.includes(query)
      const matchesOwner = !onlyMyPins || pin.is_mine

      return matchesSearch && matchesOwner
    })
  }, [pins, searchQuery, onlyMyPins])

  // Filter pins within viewport bounds
  const visiblePins = useMemo(() => {
    if (!mapBounds) return filteredPins.slice(0, 15)
    
    const visible = filteredPins.filter((pin) => {
      const lat = Number(pin.latitude)
      const lng = Number(pin.longitude)
      if (isNaN(lat) || isNaN(lng)) return false
      return mapBounds.contains([lat, lng])
    })

    // Sort: own pins first, then by likes count
    return visible.sort((a, b) => {
      if (a.is_mine && !b.is_mine) return -1
      if (!a.is_mine && b.is_mine) return 1
      return (b.likes_count || 0) - (a.likes_count || 0)
    }).slice(0, 15)
  }, [filteredPins, mapBounds])

  // Like pin handler
  const handleLike = async (pinId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()

    // Find marker element to trigger animate scale pop
    const markerEl = document.querySelector(`[data-pin-id="${pinId}"] .like-button`)
    if (markerEl) {
      markerEl.classList.add("heart-pop-active")
      setTimeout(() => markerEl.classList.remove("heart-pop-active"), 450)
    }

    // Optimistic Update
    setPins((currentPins) =>
      currentPins.map((pin) => {
        if (pin.id === pinId) {
          const newIsLiked = !pin.is_liked
          return {
            ...pin,
            is_liked: newIsLiked,
            likes_count: (pin.likes_count || 0) + (newIsLiked ? 1 : -1),
          }
        }
        return pin
      }),
    )

    try {
      const response = await fetch("/api/likes/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinId }),
      })

      if (!response.ok) throw new Error("Failed to like")
    } catch (error) {
      // Revert if error
      setPins((currentPins) =>
        currentPins.map((pin) => {
          if (pin.id === pinId) {
            const newIsLiked = !pin.is_liked
            return {
              ...pin,
              is_liked: newIsLiked,
              likes_count: (pin.likes_count || 0) + (newIsLiked ? 1 : -1),
            }
          }
          return pin
        }),
      )
      toast.error("Failed to update like")
    }
  }

  const handleMapClick = (e: any) => {
    setTempPin(e.latlng)
    setSelectedPin(null)
    setIsAddingPin(false)
    setIsDialogOpen(true)
  }

  const handleEditPin = (pin: any) => {
    setSelectedPin(pin)
    setTempPin(null)
    setIsDialogOpen(true)
  }

  const handleSidebarPinClick = (pin: any) => {
    setPanTarget([Number(pin.latitude), Number(pin.longitude)])
    handleEditPin(pin)
  }

  useEffect(() => {
    import("leaflet").then((module) => {
      setL(module.default || module)
    })
  }, [])

  const defaultIcon = useMemo(() => {
    if (!L) return null
    return L.icon({
      iconUrl: iconUrl,
      iconRetinaUrl: iconRetinaUrl,
      shadowUrl: shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })
  }, [L])

  // Custom Polaroid Div Icon generator
  const createPolaroidIcon = useMemo(() => {
    if (!L) return () => null
    return (pin: any) => {
      const hasPhoto = pin.pin_photos && pin.pin_photos.length > 0
      const photoUrl = hasPhoto ? pin.pin_photos[0].photo_url : null
      const isMine = pin.is_mine
      const isLiked = pin.is_liked
      const likesCount = pin.likes_count || 0
      
      // Keep rotation consistent based on pin id hash
      const hash = pin.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
      const rotation = (hash % 8) - 4

      const heartSvg = isLiked
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`

      const editButton = isMine
        ? `<div class="edit-button" style="position: absolute; top: -8px; right: -8px; background: var(--card); border: 1px solid var(--border); border-radius: 50%; width: 26px; height: 26px; display: none; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.15); cursor: pointer; z-index: 30; color: var(--foreground);">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
           </div>`
        : ""

      const likeButton = `<div class="like-button" style="position: absolute; bottom: -10px; right: -10px; background: white; color: #334155; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.15); cursor: pointer; z-index: 30;">
            ${heartSvg}
            ${likesCount > 0 ? `<span style="position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; font-size: 8px; font-weight: 800; padding: 1.5px 5px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">${likesCount}</span>` : ""}
          </div>`

      const authorBadge = !isMine && pin.author_id
        ? `<div class="author-badge" data-author-id="${pin.author_id}" style="position: absolute; top: -8px; left: -8px; background: var(--primary); color: var(--primary-foreground); font-size: 9px; font-weight: bold; padding: 2px 8px; border-radius: 20px; z-index: 15; max-width: 75px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 4px 8px rgba(0,0,0,0.15); cursor: pointer; border: 1px solid rgba(255,255,255,0.1);">
            ${pin.author_name}
           </div>`
        : ""

      const htmlContent = photoUrl
        ? `<div class="polaroid-marker group cursor-pointer" data-pin-id="${pin.id}" style="width: 100px; background: white; padding: 6px; pb: 24px; box-shadow: 0 8px 20px rgba(0,0,0,0.3); transform: rotate(${rotation}deg); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; touch-action: manipulation; border-radius: 4px; border: 1px solid rgba(0,0,0,0.06);">
            ${authorBadge}
            <img src="${photoUrl}" alt="${pin.location_name || "Photo"}" style="width: 100%; height: 80px; object-fit: cover; display: block; pointer-events: none; border-radius: 2px;" />
            <div style="padding: 4px 2px; text-align: center; font-size: 11px; font-family: 'Caveat', cursive; color: #1e293b; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none;">${pin.location_name || "Visited"}</div>
            ${editButton}
            ${likeButton}
          </div>
          <style>
            .polaroid-marker:hover { transform: rotate(0deg) scale(1.4) !important; z-index: 9999 !important; box-shadow: 0 25px 30px rgba(0,0,0,0.45) !important; }
            .polaroid-marker:hover .edit-button { display: flex !important; }
          </style>`
        : `<div class="polaroid-marker cursor-pointer" data-pin-id="${pin.id}" style="width: 80px; background: white; padding: 6px; pb: 18px; box-shadow: 0 8px 18px rgba(0,0,0,0.3); transform: rotate(${rotation}deg); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; border-radius: 4px; border: 1px solid rgba(0,0,0,0.06);">
            ${authorBadge}
            <div style="width: 100%; height: 60px; background: linear-gradient(135deg, var(--primary) 0%, var(--ring) 100%); opacity: 0.85; border-radius: 2px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div style="padding: 4px 2px; text-align: center; font-size: 9px; font-family: 'Caveat', cursive; color: #1e293b; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none;">${pin.location_name || "Location"}</div>
            ${editButton}
            ${likeButton}
          </div>
          <style>
            .polaroid-marker:hover { transform: rotate(0deg) scale(1.4) !important; z-index: 9999 !important; box-shadow: 0 25px 30px rgba(0,0,0,0.45) !important; }
            .polaroid-marker:hover .edit-button { display: flex !important; }
          </style>`

      return L.divIcon({
        className: "custom-polaroid-marker",
        html: htmlContent,
        iconSize: [100, 120],
        iconAnchor: [50, 60],
        popupAnchor: [0, -60],
      })
    }
  }, [L])

  if (!L || !defaultIcon) return null

  // Resolved CartoDB map tiles based on light/dark theme
  const mapTileUrl = resolvedTheme === "dark" 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"

  return (
    <div className="relative h-screen w-full flex overflow-hidden bg-background font-sans selection:bg-primary/20">
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* 1. Desktop Floating Glass Sidebar Panel */}
      <aside className="hidden md:flex flex-col w-[380px] h-[calc(100vh-2rem)] my-4 ml-4 rounded-2xl glass-panel shadow-2xl z-[1000] overflow-hidden border border-border/40 shrink-0">
        
        {/* Sidebar Header */}
        <div className="p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-md glow-primary">
              <Globe className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              TravelMap
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            
            {/* Sign Out Button */}
            <form action="/auth/sign-out" method="post">
              <Button
                variant="ghost"
                size="icon"
                type="submit"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* User Stats Card */}
        <div className="p-4 mx-4 mt-4 rounded-xl bg-secondary/30 border border-border/40 flex items-center gap-3">
          <Link
            href={`/profile/${currentUser.id}`}
            className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-ring text-primary-foreground flex items-center justify-center font-bold text-lg hover:scale-105 transition-all shadow-md shrink-0"
          >
            {currentUser.user_metadata?.display_name?.[0].toUpperCase() || "T"}
          </Link>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm truncate">
              {currentUser.user_metadata?.display_name || "Traveler"}
            </h4>
            <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
          </div>
          <Button variant="ghost" size="icon" asChild className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary shrink-0">
            <Link href={`/profile/${currentUser.id}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Search & Filter Section */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search travel memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-lg text-xs bg-background/50 border border-border/80 focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant={onlyMyPins ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyMyPins(!onlyMyPins)}
              className="text-xs rounded-lg py-1 px-3 h-8 flex-1 flex items-center justify-center gap-1.5"
            >
              <Filter className="h-3 w-3" />
              {onlyMyPins ? "My Memories Only" : "All Travelers"}
            </Button>
          </div>
        </div>

        {/* Visible Pins Lists */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider">Pins in View ({visiblePins.length})</span>
            {searchQuery && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">Filtered</span>}
          </div>
          
          {visiblePins.length === 0 ? (
            <div className="text-center py-12 bg-secondary/15 rounded-xl border border-dashed border-border/50 text-muted-foreground p-4">
              <Globe className="h-8 w-8 mx-auto text-muted-foreground/45 mb-2" />
              <p className="text-xs font-semibold">No memories in this view</p>
              <p className="text-[10px] mt-1 text-muted-foreground/75">Drag the map or clear search query to discover pins.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visiblePins.map((pin) => {
                const photo = pin.pin_photos?.[0]?.photo_url
                return (
                  <div
                    key={pin.id}
                    onClick={() => handleSidebarPinClick(pin)}
                    className="group flex gap-3 p-2.5 rounded-xl bg-card border border-border/50 hover:border-primary/40 hover:shadow-md cursor-pointer select-none transition-all duration-200"
                  >
                    {/* Thumbnail */}
                    {photo ? (
                      <div className="h-16 w-16 rounded-lg bg-secondary overflow-hidden shrink-0 shadow-inner">
                        <img src={photo} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-primary/10 to-ring/5 shrink-0 flex items-center justify-center text-primary">
                        <MapPin className="h-6 w-6 opacity-60" />
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs truncate leading-snug group-hover:text-primary transition-colors">
                          {pin.location_name || "Travel Location"}
                        </h4>
                        <p className="text-[10px] text-muted-foreground truncate font-medium mt-0.5">
                          by {pin.author_name || "Unknown traveler"}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground/60" />
                          {pin.visit_date ? new Date(pin.visit_date).toLocaleDateString(undefined, {month: 'short', year: 'numeric'}) : "No Date"}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleLike(pin.id, e)}
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-secondary transition-all ${pin.is_liked ? "text-destructive font-bold" : "text-muted-foreground"}`}
                          >
                            <Heart className={`h-3 w-3 ${pin.is_liked ? "fill-destructive stroke-destructive" : ""}`} />
                            <span>{pin.likes_count || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      {/* 2. Map Area */}
      <div className="flex-1 h-full w-full relative">
        
        {/* Map Container */}
        <MapContainer center={[20, 0]} zoom={2.5} scrollWheelZoom={true} className="h-full w-full z-0" minZoom={2}>
          
          <TileLayer
            key={resolvedTheme} // Forces redraw of map tiles on theme toggle
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={mapTileUrl}
          />

          <MapEvents 
            onMapClick={handleMapClick} 
            isAddingPin={isAddingPin} 
            onBoundsChange={setMapBounds} 
          />
          
          {panTarget && <MapNavigationController centerCoords={panTarget} />}

          {/* Render markers */}
          {filteredPins.map((pin) => (
            <Marker
              key={pin.id}
              position={[Number(pin.latitude), Number(pin.longitude)]}
              icon={createPolaroidIcon(pin)}
              eventHandlers={{
                click: (e) => {
                  const target = e.originalEvent.target as HTMLElement
                  
                  // Small delay to prevent dialog overlapping double tap gestures
                  setTimeout(() => {
                    if (isEnlargedDialogOpen) return
                    
                    if (target.closest(".edit-button")) {
                      handleEditPin(pin)
                    } else if (target.closest(".like-button")) {
                      handleLike(pin.id)
                    } else if (target.closest(".author-badge")) {
                      const authorId = target.closest(".author-badge")?.getAttribute("data-author-id")
                      if (authorId) {
                        e.originalEvent.stopPropagation()
                        router.push(`/profile/${authorId}`)
                      }
                    } else {
                      handleEditPin(pin)
                    }
                  }, 100)
                },
                
                // Mouse & touch long press for full photo pop
                mousedown: (e) => {
                  const target = e.originalEvent.target as HTMLElement
                  const polaroidDiv = target.closest('[data-pin-id]')
                  if (!polaroidDiv || target.closest('.edit-button') || target.closest('.like-button') || target.closest('.author-badge')) {
                    return
                  }
                  
                  let timer: NodeJS.Timeout | null = setTimeout(() => {
                    if (pin.pin_photos && pin.pin_photos.length > 0) {
                      setEnlargedPin(pin)
                      setIsEnlargedDialogOpen(true)
                    }
                  }, 550)
                  
                  const cleanup = () => { if (timer) { clearTimeout(timer); timer = null } }
                  const handleEnd = () => { cleanup(); document.removeEventListener('mouseup', handleEnd); document.removeEventListener('mousemove', handleEnd) }
                  document.addEventListener('mouseup', handleEnd)
                  document.addEventListener('mousemove', handleEnd)
                },
                
                touchstart: (e) => {
                  const target = e.originalEvent.target as HTMLElement
                  const polaroidDiv = target.closest('[data-pin-id]')
                  if (!polaroidDiv || target.closest('.edit-button') || target.closest('.like-button') || target.closest('.author-badge')) {
                    return
                  }
                  
                  let timer: NodeJS.Timeout | null = setTimeout(() => {
                    if (pin.pin_photos && pin.pin_photos.length > 0) {
                      e.originalEvent.preventDefault()
                      setEnlargedPin(pin)
                      setIsEnlargedDialogOpen(true)
                    }
                  }, 550)
                  
                  const cleanup = () => { if (timer) { clearTimeout(timer); timer = null } }
                  const handleEnd = () => { cleanup(); document.removeEventListener('touchend', handleEnd); document.removeEventListener('touchmove', handleEnd) }
                  document.addEventListener('touchend', handleEnd)
                  document.addEventListener('touchmove', handleEnd)
                },
              }}
            />
          ))}

          {tempPin && (
            <Marker position={[tempPin.lat, tempPin.lng]} icon={defaultIcon} />
          )}
        </MapContainer>

        {/* Desktop Custom Overlay Control - Add Memory Info Alert */}
        {isAddingPin && (
          <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[1000] glass-panel px-4 sm:px-6 py-2.5 sm:py-3 w-[calc(100%-2rem)] sm:w-auto max-w-sm sm:max-w-none rounded-full border border-primary/30 flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 shadow-lg glow-primary animate-in fade-in slide-in-from-top-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary animate-ping shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                {isMobile ? "Tap anywhere to drop a pin" : "Click anywhere on the map to drop a pin"}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-secondary shrink-0" onClick={() => setIsAddingPin(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Desktop Float Action Trigger (Add Pin) - only visible if desktop */}
        {!isMobile && !isAddingPin && (
          <Button
            onClick={() => {
              setIsAddingPin(true)
              setTempPin(null)
            }}
            className="absolute bottom-6 right-6 z-[1000] h-14 px-5 rounded-2xl bg-primary text-primary-foreground shadow-2xl hover:scale-105 active:scale-95 transition-all glow-primary font-bold flex items-center gap-2"
          >
            <Plus className="h-5.5 w-5.5" />
            Add Travel Pin
          </Button>
        )}
      </div>

      {/* 3. Mobile Explore/Feed View Overlay (Full Screen over Map when Explore tab active) */}
      {isMobile && activeTab === "explore" && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-[990] overflow-y-auto px-4 pb-24 pt-6">
          <div className="max-w-md mx-auto space-y-5">
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight">Explore Memories</h2>
              <p className="text-xs text-muted-foreground">Discover other travelers' moments from around the world.</p>
            </div>
            
            {/* Search inputs */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search by city, country or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl text-xs bg-secondary/35 border border-border focus:outline-none focus:border-primary"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3 text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <Button
              variant={onlyMyPins ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyMyPins(!onlyMyPins)}
              className="w-full rounded-xl flex items-center justify-center gap-1.5 h-9"
            >
              <Filter className="h-3.5 w-3.5" />
              {onlyMyPins ? "Showing My Pins Only" : "Showing All Travelers' Pins"}
            </Button>

            {/* Mobile Feed list */}
            {filteredPins.length === 0 ? (
              <div className="text-center py-16 bg-secondary/15 rounded-2xl border border-dashed border-border/50 text-muted-foreground px-4">
                <Globe className="h-10 w-10 mx-auto text-muted-foreground/45 mb-2" />
                <p className="text-sm font-semibold">No memories match search</p>
                <p className="text-xs mt-1 text-muted-foreground/75">Try clearing filters or search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredPins.map((pin) => {
                  const photo = pin.pin_photos?.[0]?.photo_url
                  const likesCount = pin.likes_count || 0
                  
                  return (
                    <div
                      key={pin.id}
                      onClick={() => {
                        setActiveTab("map")
                        setPanTarget([Number(pin.latitude), Number(pin.longitude)])
                        handleEditPin(pin)
                      }}
                      className="bg-white p-2.5 pb-6 rounded-lg shadow-md border border-gray-100 flex flex-col justify-between cursor-pointer"
                    >
                      {photo ? (
                        <div className="aspect-square w-full rounded overflow-hidden bg-gray-100">
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-square w-full rounded bg-gradient-to-br from-primary/10 to-ring/5 flex items-center justify-center text-primary">
                          <MapPin className="h-8 w-8 opacity-65" />
                        </div>
                      )}
                      
                      <div className="pt-2 px-0.5 flex flex-col gap-1">
                        <h4 className="font-bold text-xs truncate text-gray-800 leading-snug font-['Caveat'] text-center">
                          {pin.location_name || "Visited"}
                        </h4>
                        <div className="flex items-center justify-between text-[8px] text-gray-400">
                          <span className="truncate max-w-[50px]">{pin.author_name || "Traveler"}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleLike(pin.id)
                            }}
                            className="flex items-center gap-0.5"
                          >
                            <Heart className={`h-2.5 w-2.5 ${pin.is_liked ? "fill-destructive stroke-destructive text-destructive" : ""}`} />
                            <span>{likesCount}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Mobile Glassmorphic Bottom Navigation Bar */}
      {isMobile && (
        <nav className="fixed bottom-4 left-4 right-4 h-16 rounded-2xl mobile-nav-bar flex items-center justify-around px-2 z-[1000] shadow-xl">
          {/* Map Tab */}
          <button
            onClick={() => {
              setActiveTab("map")
              setIsAddingPin(false)
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === "map" && !isAddingPin ? "text-primary" : "text-muted-foreground/80"}`}
          >
            <Map className="h-5.5 w-5.5" />
            <span>Map</span>
          </button>

          {/* Explore Tab */}
          <button
            onClick={() => {
              setActiveTab("explore")
              setIsAddingPin(false)
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === "explore" ? "text-primary" : "text-muted-foreground/80"}`}
          >
            <Compass className="h-5.5 w-5.5" />
            <span>Explore</span>
          </button>

          {/* Center Plus Button (glowing core) */}
          <button
            onClick={() => {
              setActiveTab("map")
              setIsAddingPin(!isAddingPin)
              if (!isAddingPin) {
                toast("Touch the map to place your pin!")
              }
            }}
            className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg -translate-y-4 transition-all duration-200 bg-primary text-primary-foreground glow-primary active:scale-95 ${isAddingPin ? "rotate-45 bg-destructive text-destructive-foreground" : ""}`}
          >
            <Plus className="h-7 w-7" />
          </button>

          {/* Profile Tab */}
          <button
            onClick={() => router.push(`/profile/${currentUser.id}`)}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-muted-foreground/80"
          >
            <User className="h-5.5 w-5.5" />
            <span>Profile</span>
          </button>

          {/* More Settings Drawer Toggle */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-muted-foreground/80"
          >
            <SlidersHorizontal className="h-5.5 w-5.5" />
            <span>More</span>
          </button>
        </nav>
      )}

      {/* 5. Mobile More Settings Drawer (Slide Up Sheet) */}
      <Drawer open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DrawerContent className="pb-8">
          <DrawerHeader>
            <DrawerTitle className="font-extrabold font-['Plus_Jakarta_Sans'] text-lg">Travel Settings</DrawerTitle>
            <DrawerDescription className="text-xs">Adjust your preferences or sign out below.</DrawerDescription>
          </DrawerHeader>
          <div className="px-6 space-y-4">
            
            {/* View Profile */}
            <Button
              variant="outline"
              onClick={() => {
                setIsSettingsOpen(false)
                router.push(`/profile/${currentUser.id}`)
              }}
              className="w-full justify-between h-12 rounded-xl text-sm font-semibold"
            >
              <span className="flex items-center gap-2">
                <User className="h-4.5 w-4.5 text-primary" />
                Go to Profile
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {/* Dark Mode toggle */}
            <Button
              variant="outline"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="w-full justify-between h-12 rounded-xl text-sm font-semibold"
            >
              <span className="flex items-center gap-2">
                {resolvedTheme === "dark" ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-blue-500" />}
                Theme: {resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"}
              </span>
              <span className="text-xs text-muted-foreground font-medium">Switch</span>
            </Button>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => {
                setOnlyMyPins(!onlyMyPins)
                setIsSettingsOpen(false)
              }}
              className="w-full justify-between h-12 rounded-xl text-sm font-semibold"
            >
              <span className="flex items-center gap-2">
                <Filter className="h-4.5 w-4.5 text-primary" />
                {onlyMyPins ? "Showing Only My Pins" : "Showing All Pins"}
              </span>
              <span className="text-xs text-muted-foreground font-medium">Toggle</span>
            </Button>

            {/* Logout */}
            <form action="/auth/sign-out" method="post" className="pt-2">
              <Button
                type="submit"
                variant="destructive"
                className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 shadow-inner"
              >
                <LogOut className="h-4.5 w-4.5" />
                Sign Out
              </Button>
            </form>

          </div>
        </DrawerContent>
      </Drawer>

      {/* 6. Create & Edit Pin Dialog (Conditional Slide Up Drawer on Mobile vs Pop up on Desktop) */}
      <CreatePinDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setTempPin(null)
            setSelectedPin(null)
          }
        }}
        latitude={selectedPin ? selectedPin.latitude : tempPin?.lat || 0}
        longitude={selectedPin ? selectedPin.longitude : tempPin?.lng || 0}
        initialData={selectedPin}
        readOnly={selectedPin && !selectedPin.is_mine}
      />

      {/* 7. Fullscreen Polaroid Details Overlay on Marker Double Press/Long Press */}
      <Dialog open={isEnlargedDialogOpen} onOpenChange={setIsEnlargedDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[85vw] bg-transparent border-none shadow-none p-0 focus:outline-none">
          <DialogTitle className="sr-only">Polaroid Print Enlargement</DialogTitle>
          {enlargedPin && enlargedPin.pin_photos && enlargedPin.pin_photos.length > 0 && (
            <div className="relative w-full flex items-center justify-center min-h-[360px] animate-in zoom-in-95 duration-200">
              <div 
                className="bg-white p-5 pb-10 shadow-2xl mx-auto w-full max-w-sm rounded-sm"
                style={{
                  transform: "rotate(-1.5deg)",
                  boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4)",
                }}
              >
                {/* Photo */}
                <div className="aspect-square w-full overflow-hidden bg-gray-100 mb-4 rounded-xs border border-gray-100">
                  <img
                    src={enlargedPin.pin_photos[0].photo_url}
                    alt={enlargedPin.location_name || "Photo"}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Text - polaroid styled */}
                <div className="text-center px-1">
                  <h3 className="text-2xl text-gray-800 tracking-wide font-['Caveat'] leading-tight mb-1">
                    {enlargedPin.location_name || "Visited"}
                  </h3>
                  {enlargedPin.pin_photos[0].caption && enlargedPin.pin_photos[0].caption !== enlargedPin.location_name && (
                    <p className="text-base text-gray-500 font-['Caveat'] mb-2 leading-snug">
                      {enlargedPin.pin_photos[0].caption}
                    </p>
                  )}
                  {enlargedPin.notes && (
                    <p className="text-xs text-gray-600 italic leading-relaxed mb-3 border-t border-dashed border-gray-200 pt-2 font-medium">
                      "{enlargedPin.notes}"
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 tracking-wider uppercase border-t border-gray-100 pt-3">
                    <span>{enlargedPin.author_name || "Explorer"}</span>
                    <span>•</span>
                    <span>{enlargedPin.visit_date ? new Date(enlargedPin.visit_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "No date"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Custom wrapper to prevent bundle conflicts
function SlidersHorizontal(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="21" x2="14" y1="4" y2="4" />
      <line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" />
      <line x1="8" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" />
      <line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="16" x2="16" y1="18" y2="22" />
    </svg>
  )
}
