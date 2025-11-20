"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, MapPin, Calendar } from "lucide-react"
import { format } from "date-fns"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface Photo {
  id: string
  photo_url: string
  caption: string | null
  created_at: string
}

interface Pin {
  id: string
  location_name: string | null
  visit_date: string | null
  notes: string | null
  pin_photos: Photo[]
}

export function PolaroidGallery({ pins }: { pins: Pin[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<{ photo: Photo; pin: Pin } | null>(null)

  // Flatten all photos from all pins
  const allPhotos = pins.flatMap((pin) => pin.pin_photos.map((photo) => ({ photo, pin })))

  if (allPhotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>No photos yet. Start pinning your adventures!</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 p-8">
        {allPhotos.map(({ photo, pin }, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
            className="relative cursor-pointer group"
            style={{ rotate: Math.random() * 6 - 3 }} // Random rotation for scattered look
            onClick={() => setSelectedPhoto({ photo, pin })}
          >
            <div className="bg-white p-4 pb-12 shadow-lg transition-shadow hover:shadow-xl">
              <div className="aspect-square overflow-hidden bg-gray-100 mb-4">
                <img
                  src={photo.photo_url || "/placeholder.svg"}
                  alt={photo.caption || "Travel memory"}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center px-4">
                <p className="font-handwriting text-lg text-gray-800 truncate">{photo.caption || pin.location_name}</p>
                {pin.visit_date && (
                  <p className="text-xs text-gray-500 font-mono mt-1">{format(new Date(pin.visit_date), "MMM yyyy")}</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl bg-transparent border-none shadow-none p-0 overflow-hidden">
          {selectedPhoto && (
            <div className="relative bg-white p-4 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="aspect-square relative bg-gray-100">
                  <img
                    src={selectedPhoto.photo.photo_url || "/placeholder.svg"}
                    alt={selectedPhoto.photo.caption || "Travel memory"}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="flex flex-col justify-center space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedPhoto.pin.location_name}</h2>
                    <div className="flex items-center text-muted-foreground space-x-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {selectedPhoto.pin.visit_date
                            ? format(new Date(selectedPhoto.pin.visit_date), "MMMM do, yyyy")
                            : "Date unknown"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedPhoto.pin.notes && (
                    <div className="prose prose-stone">
                      <h3 className="text-lg font-semibold mb-2">Memory Notes</h3>
                      <p className="text-gray-600 italic leading-relaxed">"{selectedPhoto.pin.notes}"</p>
                    </div>
                  )}

                  <div className="pt-6 border-t">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>
                        {selectedPhoto.pin.latitude.toFixed(4)}, {selectedPhoto.pin.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
