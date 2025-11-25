"use client"

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { CreatePinDialog } from "./create-pin-dialog"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Fix for default leaflet markers
const iconUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png"
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png"
const shadowUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png"

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

  // Initial bounds
  useEffect(() => {
    onBoundsChange(map.getBounds())
  }, [map, onBoundsChange])

  return null
}

function MapNavigation({ lat, lng, pinId }: { lat?: number; lng?: number; pinId?: string }) {
  const map = useMap()
  
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 10)
    }
  }, [lat, lng, map])

  return null
}

export default function TravelMap({ pins: initialPins, currentUser, initialLat, initialLng, initialPinId }: { pins: any[]; currentUser: any; initialLat?: number; initialLng?: number; initialPinId?: string }) {
  const router = useRouter()
  const [pins, setPins] = useState(initialPins)
  const [visiblePins, setVisiblePins] = useState<any[]>([])
  const [isAddingPin, setIsAddingPin] = useState(false)
  const [tempPin, setTempPin] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedPin, setSelectedPin] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [enlargedPin, setEnlargedPin] = useState<any>(null)
  const [isEnlargedDialogOpen, setIsEnlargedDialogOpen] = useState(false)
  const [L, setL] = useState<any>(null)

  // Handle initial navigation from URL parameters
  useEffect(() => {
    if (initialPinId && pins.length > 0) {
      const targetPin = pins.find((p) => p.id === initialPinId)
      if (targetPin) {
        setTimeout(() => {
          handleEditPin(targetPin)
        }, 1000)
      }
    }
  }, [initialPinId, pins])

  // Update local pins when prop changes
  useEffect(() => {
    console.log("[v0] Pins updated:", initialPins.length)
    setPins(initialPins)
    setVisiblePins(initialPins.slice(0, 20))
  }, [initialPins])

  const handleBoundsChange = useCallback(
    (bounds: any) => {
      if (!bounds) return
      // Simple culling: only show pins within current view
      const visible = pins.filter((pin) => {
        const lat = Number(pin.latitude)
        const lng = Number(pin.longitude)
        if (isNaN(lat) || isNaN(lng)) return false
        return bounds.contains([lat, lng])
      })

      console.log("[v0] Bounds change. Total pins:", pins.length, "Visible in bounds:", visible.length)

      // Sort to prioritize own pins and liked pins, and limit to avoid clutter
      const sorted = visible.sort((a, b) => {
        if (a.is_mine && !b.is_mine) return -1
        if (!a.is_mine && b.is_mine) return 1
        return (b.likes_count || 0) - (a.likes_count || 0)
      })

      // Show up to 20 pins to maintain performance and "intelligent" density
      setVisiblePins(sorted.slice(0, 20))
    },
    [pins],
  )

  const handleLike = async (pinId: string) => {
    // Optimistic update
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
      // Revert on error
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

  // Note: Long-press is now handled directly on each marker via eventHandlers
  // This approach is more reliable and works every time


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

  const createPolaroidIcon = useMemo(() => {
    if (!L) return () => null
    return (pin: any) => {
      const hasPhoto = pin.pin_photos && pin.pin_photos.length > 0
      const photoUrl = hasPhoto ? pin.pin_photos[0].photo_url : null
      const isMine = pin.is_mine
      const isLiked = pin.is_liked
      const likesCount = pin.likes_count || 0

      const heartIcon = isLiked
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5 4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5 4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`

      const editButton = isMine
        ? `<div class="edit-button" style="position: absolute; top: -10px; right: -10px; background: white; border-radius: 50%; width: 28px; height: 28px; display: none; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer; z-index: 20;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
           </div>`
        : ""

      const likeButton = `<div class="like-button" style="position: absolute; bottom: -12px; right: -12px; background: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer; z-index: 20; color: ${isLiked ? "#ef4444" : "#666"};">
            ${heartIcon}
            ${likesCount > 0 ? `<span style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: bold;">${likesCount}</span>` : ""}
          </div>`

      const authorBadge = !isMine && pin.author_id
        ? `<div class="author-badge" data-author-id="${pin.author_id}" style="position: absolute; top: -8px; left: -8px; background: #3b82f6; color: white; font-size: 10px; padding: 2px 8px; border-radius: 12px; transform: rotate(-5deg); z-index: 15; max-width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer; transition: all 0.2s;">
            ${pin.author_name}
           </div>`
        : ""

      const htmlContent = photoUrl
        ? `<div class="polaroid-marker group cursor-pointer" data-pin-id="${pin.id}" style="width: 120px; background: white; padding: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.4); transform: rotate(-3deg); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; touch-action: manipulation;">
            ${authorBadge}
            <img 
  src="${photoUrl}" 
  alt="${pin.location_name || 'Photo'}"
  style="
    width: 100%;
    height: 100px;
    object-fit: cover;
    image-rendering: auto;
    pointer-events: none;
  "
>

            <div style="padding: 6px 4px; text-align: center; font-size: 14px; font-family: 'Caveat', cursive; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none;">${pin.location_name || "Visited"}</div>
            ${editButton}
            ${likeButton}
          </div>
          <style>
            .polaroid-marker:hover { transform: rotate(0deg) scale(1.5) !important; z-index: 9999 !important; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important; }
            .polaroid-marker:hover .edit-button { display: flex !important; }
            .author-badge:hover { background: #2563eb !important; transform: rotate(0deg) scale(1.1) !important; }
          </style>`
        : `<div class="polaroid-marker" style="width: 80px; background: white; padding: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.4); transform: rotate(-3deg); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; position: relative;">
            ${authorBadge}
            <div style="width: 100%; height: 80px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); display: flex; align-items: center; justify-content: center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div style="padding: 6px 4px; text-align: center; font-size: 12px; font-family: 'Caveat', cursive; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pin.location_name || "No photo"}</div>
            ${editButton}
            ${likeButton}
          </div>
          <style>
            .polaroid-marker:hover { transform: rotate(0deg) scale(1.5) !important; z-index: 9999 !important; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important; }
            .polaroid-marker:hover .edit-button { display: flex !important; }
            .author-badge:hover { background: #2563eb !important; transform: rotate(0deg) scale(1.1) !important; }
          </style>`

      return L.divIcon({
        className: "custom-polaroid-marker",
        html: htmlContent,
        iconSize: [120, 150],
        iconAnchor: [60, 75],
        popupAnchor: [0, -75],
      })
    }
  }, [L])

  if (!L || !defaultIcon) return null

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap" rel="stylesheet" />

      <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={true} className="h-full w-full z-0" minZoom={2}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEvents onMapClick={handleMapClick} isAddingPin={isAddingPin} onBoundsChange={handleBoundsChange} />
        
        {initialLat && initialLng && (
          <MapNavigation
            lat={initialLat}
            lng={initialLng}
            pinId={initialPinId}
          />
        )}

        {visiblePins.map((pin) => (
          <Marker
            key={pin.id}
            position={[Number(pin.latitude), Number(pin.longitude)]} // Ensure numeric coordinates
            icon={createPolaroidIcon(pin)}
              eventHandlers={{
                click: (e) => {
                  // Check if this was triggered by a long-press (we'll prevent it)
                  const target = e.originalEvent.target as HTMLElement
                  
                  // Add a small delay to check if long-press dialog opened
                  setTimeout(() => {
                    // If dialog is open, don't handle click
                    if (isEnlargedDialogOpen) {
                      return
                    }
                    
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
                mousedown: (e) => {
                  const target = e.originalEvent.target as HTMLElement
                  const polaroidDiv = target.closest('[data-pin-id]')
                  if (!polaroidDiv || target.closest('.edit-button') || target.closest('.like-button') || target.closest('.author-badge')) {
                    return
                  }
                  
                  let timer: NodeJS.Timeout | null = null
                  const handleLongPress = () => {
                    if (pin.pin_photos && pin.pin_photos.length > 0) {
                      setEnlargedPin(pin)
                      setIsEnlargedDialogOpen(true)
                    }
                  }
                  
                  timer = setTimeout(handleLongPress, 500)
                  
                  const cleanup = () => {
                    if (timer) {
                      clearTimeout(timer)
                      timer = null
                    }
                  }
                  
                  const handleMouseUp = () => {
                    cleanup()
                    document.removeEventListener('mouseup', handleMouseUp)
                    document.removeEventListener('mousemove', handleMouseMove)
                  }
                  
                  const handleMouseMove = () => {
                    cleanup()
                    document.removeEventListener('mouseup', handleMouseUp)
                    document.removeEventListener('mousemove', handleMouseMove)
                  }
                  
                  document.addEventListener('mouseup', handleMouseUp, { once: true })
                  document.addEventListener('mousemove', handleMouseMove, { once: true })
                },
                touchstart: (e) => {
                  const target = e.originalEvent.target as HTMLElement
                  const polaroidDiv = target.closest('[data-pin-id]')
                  if (!polaroidDiv || target.closest('.edit-button') || target.closest('.like-button') || target.closest('.author-badge')) {
                    return
                  }
                  
                  let timer: NodeJS.Timeout | null = null
                  const handleLongPress = () => {
                    if (pin.pin_photos && pin.pin_photos.length > 0) {
                      e.originalEvent.preventDefault()
                      setEnlargedPin(pin)
                      setIsEnlargedDialogOpen(true)
                    }
                  }
                  
                  timer = setTimeout(handleLongPress, 500)
                  
                  const cleanup = () => {
                    if (timer) {
                      clearTimeout(timer)
                      timer = null
                    }
                  }
                  
                  const handleTouchEnd = () => {
                    cleanup()
                    document.removeEventListener('touchend', handleTouchEnd)
                    document.removeEventListener('touchmove', handleTouchMove)
                  }
                  
                  const handleTouchMove = () => {
                    cleanup()
                    document.removeEventListener('touchend', handleTouchEnd)
                    document.removeEventListener('touchmove', handleTouchMove)
                  }
                  
                  document.addEventListener('touchend', handleTouchEnd, { once: true })
                  document.addEventListener('touchmove', handleTouchMove, { once: true })
                },
            }}
          />
        ))}

        {tempPin && (
          <Marker position={[tempPin.lat, tempPin.lng]} icon={defaultIcon}>
            <Popup>
              <div className="p-2">
                <p className="mb-2 font-medium">New Location</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

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

      {/* Map Controls */}
      <div className="absolute bottom-8 right-8 z-[1000] flex flex-col gap-4">
        {isAddingPin ? (
          <Card className="w-64 animate-in slide-in-from-bottom-4">
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-sm font-medium">Click on the map to place a pin</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsAddingPin(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-xl transition-transform hover:scale-105"
            onClick={() => {
              setIsAddingPin(true)
              setTempPin(null)
            }}
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">Add Pin</span>
          </Button>
        )}
      </div>

      {/* Instructions Overlay */}
      {isAddingPin && <div className="absolute inset-0 z-[999] cursor-crosshair bg-black/10 pointer-events-none" />}

      {/* Enlarged Photo Dialog - Polaroid Style */}
      <Dialog open={isEnlargedDialogOpen} onOpenChange={setIsEnlargedDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[90vw] bg-transparent border-none shadow-none p-0">
          <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap" rel="stylesheet" />
          <DialogTitle className="sr-only">
            {enlargedPin?.location_name || "Travel Memory"} - Polaroid View
          </DialogTitle>
          {enlargedPin && enlargedPin.pin_photos && enlargedPin.pin_photos.length > 0 && (
            <div className="relative w-full flex items-center justify-center min-h-[400px]">
              <div 
                className="bg-white p-6 sm:p-8 shadow-2xl mx-auto w-full max-w-lg"
                style={{
                  transform: "rotate(-2deg)",
                  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
                  maxHeight: "90vh",
                  overflow: "hidden"
                }}
              >
                {/* Photo */}
                <div className="aspect-[4/3] sm:aspect-square w-full overflow-hidden bg-gray-100 mb-4 sm:mb-6">
                  <img
                    src={enlargedPin.pin_photos[0].photo_url}
                    alt={enlargedPin.location_name || "Photo"}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Caption - Polaroid style */}
                <div className="text-center px-2 sm:px-4 pb-2">
                  <h3 
                    className="text-2xl sm:text-3xl text-gray-800 mb-1"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {enlargedPin.location_name || "Travel Memory"}
                  </h3>
                  {enlargedPin.pin_photos[0].caption && (
                    <p 
                      className="text-lg sm:text-xl text-gray-600 mb-2"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      {enlargedPin.pin_photos[0].caption}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
                    <span>{enlargedPin.author_name || "Unknown Traveler"}</span>
                    {enlargedPin.visit_date && (
                      <>
                        <span>•</span>
                        <span>{new Date(enlargedPin.visit_date).toLocaleDateString()}</span>
                      </>
                    )}
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
