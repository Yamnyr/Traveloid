"use client"

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { CreatePinDialog } from "./create-pin-dialog"

// Fix for default leaflet markers
const iconUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png"
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png"
const shadowUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png"

function MapEvents({ onMapClick, isAddingPin }: { onMapClick: (e: any) => void; isAddingPin: boolean }) {
  useMapEvents({
    click: (e) => {
      if (isAddingPin) {
        onMapClick(e)
      }
    },
  })
  return null
}

export default function TravelMap({ pins }: { pins: any[] }) {
  const [isAddingPin, setIsAddingPin] = useState(false)
  const [tempPin, setTempPin] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedPin, setSelectedPin] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [L, setL] = useState<any>(null)

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

      const htmlContent = photoUrl
        ? `<div class="polaroid-marker group cursor-pointer" style="width: 80px; background: white; padding: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); transform: rotate(-3deg); transition: all 0.3s;">
            <img src="${photoUrl}" alt="${pin.location_name || "Photo"}" style="width: 100%; height: 70px; object-fit: cover; display: block;" />
            <div style="padding: 4px 2px; text-align: center; font-size: 10px; font-family: 'Caveat', cursive; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pin.location_name || "Visited"}</div>
            <div class="edit-button" style="position: absolute; top: -8px; right: -8px; background: white; border-radius: 50%; width: 24px; height: 24px; display: none; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </div>
          </div>
          <style>
            .polaroid-marker:hover { transform: rotate(0deg) scale(1.1); z-index: 1000 !important; }
            .polaroid-marker:hover .edit-button { display: flex !important; }
          </style>`
        : `<div class="polaroid-marker" style="width: 60px; background: white; padding: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); transform: rotate(-3deg); transition: all 0.3s; cursor: pointer;">
            <div style="width: 100%; height: 60px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); display: flex; align-items: center; justify-content: center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div style="padding: 4px 2px; text-align: center; font-size: 9px; font-family: 'Caveat', cursive; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pin.location_name || "No photo"}</div>
          </div>
          <style>
            .polaroid-marker:hover { transform: rotate(0deg) scale(1.1); z-index: 1000 !important; }
          </style>`

      return L.divIcon({
        className: "custom-polaroid-marker",
        html: htmlContent,
        iconSize: [80, 110],
        iconAnchor: [40, 55],
        popupAnchor: [0, -55],
      })
    }
  }, [L])

  useEffect(() => {
    const handleMarkerEdit = (e: any) => {
      if (e.target.closest(".edit-button")) {
        const markerId = e.target.closest(".leaflet-marker-icon")?.getAttribute("data-pin-id")
        if (markerId) {
          const pin = pins.find((p) => p.id === markerId)
          if (pin) {
            handleEditPin(pin)
          }
        }
      }
    }

    document.addEventListener("click", handleMarkerEdit)
    return () => document.removeEventListener("click", handleMarkerEdit)
  }, [pins])

  if (!L || !defaultIcon) return null

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap" rel="stylesheet" />

      <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={true} className="h-full w-full z-0" minZoom={2}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEvents onMapClick={handleMapClick} isAddingPin={isAddingPin} />

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.latitude, pin.longitude]}
            icon={createPolaroidIcon(pin)}
            eventHandlers={{
              click: () => handleEditPin(pin),
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
    </div>
  )
}
