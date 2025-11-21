"use client"

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Plus, X, Edit } from "lucide-react"
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
    return () =>
      L.divIcon({
        className: "custom-polaroid-icon",
        html: `<div class="w-8 h-8 bg-white border-2 border-white shadow-lg transform -rotate-6 hover:rotate-0 transition-transform duration-300 flex items-center justify-center overflow-hidden">
    <div class="w-full h-full bg-primary/20 flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="text-primary"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>
  </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
  }, [L])

  if (!L || !defaultIcon) return null

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

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={true} className="h-full w-full z-0" minZoom={2}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEvents onMapClick={handleMapClick} isAddingPin={isAddingPin} />

        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.latitude, pin.longitude]} icon={createPolaroidIcon()}>
            <Popup className="polaroid-popup">
              <div className="text-center relative group">
                <h3 className="font-bold">{pin.location_name || "Visited Location"}</h3>
                <p className="text-xs text-muted-foreground">{new Date(pin.visit_date).toLocaleDateString()}</p>
                {pin.pin_photos?.[0] && (
                  <div className="mt-2 w-32 h-32 bg-white p-1 shadow-sm rotate-2">
                    <img
                      src={pin.pin_photos[0].photo_url || "/placeholder.svg"}
                      alt={pin.location_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditPin(pin)
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </Popup>
          </Marker>
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
