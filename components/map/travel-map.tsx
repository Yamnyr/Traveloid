"use client"

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { CreatePinDialog } from "./create-pin-dialog"
import { Dialog, DialogContent } from "@/components/ui/dialog"

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
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; pin: any } | null>(null)
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
        ? `<div class="polaroid-marker group cursor-pointer" style="width: 140px; background: white; padding: 10px; box-shadow: 0 8px 16px rgba(0,0,0,0.25); transform: rotate(-2deg); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);">
            <img src="${photoUrl}" alt="${pin.location_name || "Photo"}" style="width: 100%; height: 120px; object-fit: cover; display: block; border-radius: 2px;" />
            <div style="padding: 8px 4px; text-align: center; font-size: 14px; font-family: 'Caveat', cursive; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600;">${pin.location_name || "Visited"}</div>
            <div class="edit-button" style="position: absolute; top: -10px; right: -10px; background: white; border-radius: 50%; width: 32px; height: 32px; display: none; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.3); cursor: pointer; border: 2px solid #f59e0b;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </div>
            <div class="view-icon" style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); border-radius: 50%; width: 28px; height: 28px; display: none; align-items: center; justify-content: center; cursor: pointer;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
          </div>
          <style>
            .polaroid-marker:hover { 
              transform: rotate(0deg) scale(1.15) translateY(-8px); 
              z-index: 1000 !important; 
              box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            }
            .polaroid-marker:hover .edit-button { display: flex !important; }
            .polaroid-marker:hover .view-icon { display: flex !important; }
          </style>`
        : `<div class="polaroid-marker" style="width: 100px; background: white; padding: 8px; box-shadow: 0 6px 12px rgba(0,0,0,0.25); transform: rotate(-2deg); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;">
            <div style="width: 100%; height: 84px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); display: flex; align-items: center; justify-content: center; border-radius: 2px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div style="padding: 6px 2px; text-align: center; font-size: 12px; font-family: 'Caveat', cursive; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600;">${pin.location_name || "No photo"}</div>
          </div>
          <style>
            .polaroid-marker:hover { 
              transform: rotate(0deg) scale(1.12) translateY(-6px); 
              z-index: 1000 !important; 
              box-shadow: 0 16px 32px rgba(0,0,0,0.35);
            }
          </style>`

      return L.divIcon({
        className: "custom-polaroid-marker",
        html: htmlContent,
        iconSize: [140, 160],
        iconAnchor: [70, 80],
        popupAnchor: [0, -80],
      })
    }
  }, [L])

  useEffect(() => {
    const handleMarkerEdit = (e: any) => {
      if (e.target.closest(".edit-button")) {
        e.stopPropagation()
        const markerId = e.target.closest(".leaflet-marker-icon")?.getAttribute("data-pin-id")
        if (markerId) {
          const pin = pins.find((p) => p.id === markerId)
          if (pin) {
            handleEditPin(pin)
          }
        }
      } else if (e.target.closest(".view-icon")) {
        e.stopPropagation()
        const markerElement = e.target.closest(".leaflet-marker-icon")
        const img = markerElement?.querySelector("img")
        if (img) {
          const photoUrl = img.src
          const pinId = markerElement?.getAttribute("data-pin-id")
          const pin = pins.find((p) => p.id === pinId)
          setViewingPhoto({ url: photoUrl, pin })
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

      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
          <div className="relative bg-white p-8 rounded-lg shadow-2xl">
            <div className="bg-white p-4 shadow-xl" style={{ transform: "rotate(-1deg)" }}>
              {viewingPhoto && (
                <>
                  <img
                    src={viewingPhoto.url || "/placeholder.svg"}
                    alt={viewingPhoto.pin?.location_name || "Photo"}
                    className="w-full max-h-[70vh] object-contain"
                  />
                  <div className="mt-4 text-center font-['Caveat'] text-2xl text-gray-700">
                    {viewingPhoto.pin?.location_name || "Travel Memory"}
                  </div>
                  {viewingPhoto.pin?.visit_date && (
                    <div className="mt-1 text-center font-['Caveat'] text-lg text-gray-500">
                      {new Date(viewingPhoto.pin.visit_date).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
