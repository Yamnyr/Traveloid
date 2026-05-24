"use client"

import React, { useState, useRef, useEffect } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Upload, X, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface PinPhoto {
  id: string
  photo_url: string
  caption: string
}

interface PinData {
  id: string
  location_name: string
  visit_date: string
  notes: string
  latitude: number
  longitude: number
  pin_photos: PinPhoto[]
  author_name?: string
}

interface CreatePinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  latitude: number
  longitude: number
  initialData?: PinData | null
  readOnly?: boolean
}

export function CreatePinDialog({
  open,
  onOpenChange,
  latitude,
  longitude,
  initialData,
  readOnly = false,
}: CreatePinDialogProps) {
  const [locationName, setLocationName] = useState("")
  const [visitDate, setVisitDate] = useState<Date | undefined>(new Date())
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<PinPhoto[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)

  // Track viewport size to dynamically toggle drawer vs dialog
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (open) {
      if (initialData) {
        setLocationName(initialData.location_name)
        setVisitDate(initialData.visit_date ? new Date(initialData.visit_date) : undefined)
        setNotes(initialData.notes || "")
        setExistingPhotos(initialData.pin_photos || [])
      } else {
        setLocationName("")
        setVisitDate(new Date())
        setNotes("")
        setExistingPhotos([])
      }
      setSelectedFiles([])
      setPreviews([])
    }
  }, [open, initialData])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setSelectedFiles((prev) => [...prev, ...newFiles])

      const newPreviews = newFiles.map((file) => URL.createObjectURL(file))
      setPreviews((prev) => [...prev, ...newPreviews])
    }
  }

  const removeFile = (index: number) => {
    if (readOnly) return
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const removeExistingPhoto = async (photoId: string, photoUrl: string) => {
    if (readOnly) return
    if (!confirm("Are you sure you want to delete this photo?")) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/photos?photoId=${photoId}&photoUrl=${encodeURIComponent(photoUrl)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete photo")
      }

      setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId))
      router.refresh()
    } catch (error) {
      console.error("Error deleting photo:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePin = async () => {
    if (readOnly || !initialData) return
    if (!confirm("Are you sure you want to delete this memory? This cannot be undone.")) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/pins?pinId=${initialData.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete pin")
      }

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Error deleting pin:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return

    setIsLoading(true)

    try {
      let pinId = initialData?.id

      if (initialData) {
        const response = await fetch("/api/pins", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pinId: initialData.id,
            locationName,
            visitDate: visitDate ? format(visitDate, "yyyy-MM-dd") : null,
            notes,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to update pin")
        }
      } else {
        const response = await fetch("/api/pins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude,
            longitude,
            locationName,
            visitDate: visitDate ? format(visitDate, "yyyy-MM-dd") : null,
            notes,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to create pin")
        }

        const pin = await response.json()
        pinId = pin.id
      }

      if (selectedFiles.length > 0 && pinId) {
        const uploadPromises = selectedFiles.map(async (file) => {
          const formData = new FormData()
          formData.append("file", file)

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          })

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload photo: ${file.name}`)
          }

          const uploadResult = await uploadResponse.json()
          const photoUrl = uploadResult.url

          const photoResponse = await fetch("/api/photos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pinId,
              photoUrl,
              caption: locationName,
            }),
          })

          if (!photoResponse.ok) {
            throw new Error("Failed to save photo record")
          }
        })

        await Promise.all(uploadPromises)
      }

      onOpenChange(false)
      router.refresh()

      if (!initialData) {
        setLocationName("")
        setNotes("")
        setVisitDate(new Date())
        setSelectedFiles([])
        setPreviews([])
      }
    } catch (error) {
      console.error("Error saving pin:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderFormContent = () => (
    <form onSubmit={handleSubmit} className="space-y-5 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="location" className="text-sm font-semibold">Location Name</Label>
        <Input
          id="location"
          placeholder="e.g., Eiffel Tower, Paris"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          required
          readOnly={readOnly}
          className={cn("rounded-xl border-border bg-card shadow-sm focus-visible:ring-primary", readOnly && "bg-muted text-muted-foreground")}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Visit Date</Label>
        {readOnly ? (
          <div className="flex h-10 w-full items-center rounded-xl border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground/75" />
            {visitDate ? format(visitDate, "PPP") : "No date"}
          </div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn("w-full justify-start text-left font-normal rounded-xl border-border shadow-sm", !visitDate && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground/75" />
                {visitDate ? format(visitDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border border-border bg-popover" align="start">
              <Calendar mode="single" selected={visitDate} onSelect={setVisitDate} initialFocus />
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-sm font-semibold">Notes & Memories</Label>
        <Textarea
          id="notes"
          placeholder="What made this moment special?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={cn("min-h-[100px] rounded-xl border-border bg-card shadow-sm resize-none focus-visible:ring-primary", readOnly && "bg-muted text-muted-foreground")}
          readOnly={readOnly}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Photos</Label>
        <div className="grid grid-cols-3 gap-3">
          {existingPhotos.map((photo) => (
            <div key={photo.id} className="relative aspect-square group rounded-xl overflow-hidden shadow-sm border border-border/80">
              <img
                src={photo.photo_url || "/placeholder.svg"}
                alt="Existing memory"
                className="w-full h-full object-cover"
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(photo.id, photo.photo_url)}
                  className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full p-1.5 shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {!readOnly &&
            previews.map((preview, index) => (
              <div key={`new-${index}`} className="relative aspect-square group rounded-xl overflow-hidden shadow-sm border border-border/80">
                <img
                  src={preview || "/placeholder.svg"}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full p-1.5 shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

          {!readOnly && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group/upload shadow-sm"
            >
              <Upload className="h-5 w-5 text-muted-foreground group-hover/upload:text-primary group-hover/upload:scale-110 transition-all duration-300 mb-1" />
              <span className="text-[11px] text-muted-foreground group-hover/upload:text-primary font-medium transition-colors">Add Photo</span>
            </div>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
        />
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-border/40 gap-3">
        {!readOnly && initialData ? (
          <Button type="button" variant="destructive" onClick={handleDeletePin} disabled={isLoading} className="rounded-xl px-4 py-2 hover:bg-destructive/90 transition-all">
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        ) : (
          <div></div>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl px-4 py-2 transition-all">
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="rounded-xl px-4 py-2 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-98 transition-all duration-200 glow-primary">
              {isLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {initialData ? "Save Changes" : "Create Pin"}
            </Button>
          )}
        </div>
      </div>
    </form>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <div className="overflow-y-auto px-6 pb-8 pt-2">
            <DrawerHeader className="px-0 pt-0 text-left">
              <DrawerTitle className="text-xl font-bold tracking-tight">
                {readOnly
                  ? `Memory by ${initialData?.author_name || "Traveler"}`
                  : initialData
                    ? "Edit Memory"
                    : "Add New Memory"}
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground/80 mt-1">
                {readOnly
                  ? `Viewing travel memory at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                  : initialData
                    ? "Update your travel memory details below."
                    : `Create a pin at coordinates ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
              </DrawerDescription>
            </DrawerHeader>
            {renderFormContent()}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto rounded-2xl border border-border p-6 shadow-2xl bg-card">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold tracking-tight">
            {readOnly
              ? `Memory by ${initialData?.author_name || "Traveler"}`
              : initialData
                ? "Edit Memory"
                : "Add New Memory"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground/80">
            {readOnly
              ? `Viewing travel memory at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
              : initialData
                ? "Update your travel memory details below."
                : `Create a pin at coordinates ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
          </DialogDescription>
        </DialogHeader>
        {renderFormContent()}
      </DialogContent>
    </Dialog>
  )
}
