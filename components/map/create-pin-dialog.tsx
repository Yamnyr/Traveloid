"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Upload, X, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { upload } from "@vercel/blob/client"

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
}

interface CreatePinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  latitude: number
  longitude: number
  initialData?: PinData | null
}

export function CreatePinDialog({ open, onOpenChange, latitude, longitude, initialData }: CreatePinDialogProps) {
  const [locationName, setLocationName] = useState("")
  const [visitDate, setVisitDate] = useState<Date | undefined>(new Date())
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<PinPhoto[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setSelectedFiles((prev) => [...prev, ...newFiles])

      const newPreviews = newFiles.map((file) => URL.createObjectURL(file))
      setPreviews((prev) => [...prev, ...newPreviews])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const removeExistingPhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      await fetch(`/api/photos/delete?url=${encodeURIComponent(photoUrl)}`, {
        method: "DELETE",
      })

      const { error } = await supabase.from("pin_photos").delete().eq("id", photoId)

      if (error) throw error

      setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId))
      router.refresh()
    } catch (error) {
      console.error("Error deleting photo:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePin = async () => {
    if (!initialData) return
    if (!confirm("Are you sure you want to delete this memory? This cannot be undone.")) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      await Promise.all(
        existingPhotos.map((photo) =>
          fetch(`/api/photos/delete?url=${encodeURIComponent(photo.photo_url)}`, {
            method: "DELETE",
          }),
        ),
      )

      const { error } = await supabase.from("travel_pins").delete().eq("id", initialData.id)

      if (error) throw error

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
    setIsLoading(true)
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      let pinId = initialData?.id

      if (initialData) {
        const { error } = await supabase
          .from("travel_pins")
          .update({
            location_name: locationName,
            visit_date: visitDate ? format(visitDate, "yyyy-MM-dd") : null,
            notes,
          })
          .eq("id", initialData.id)

        if (error) throw error
      } else {
        const { data: pin, error: pinError } = await supabase
          .from("travel_pins")
          .insert({
            user_id: user.id,
            latitude,
            longitude,
            location_name: locationName,
            visit_date: visitDate ? format(visitDate, "yyyy-MM-dd") : null,
            notes,
          })
          .select()
          .single()

        if (pinError) throw pinError
        pinId = pin.id
      }

      if (selectedFiles.length > 0 && pinId) {
        const uploadPromises = selectedFiles.map(async (file) => {
          const newBlob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/upload",
          })

          return supabase.from("pin_photos").insert({
            pin_id: pinId,
            user_id: user.id,
            photo_url: newBlob.url,
            caption: locationName,
          })
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Memory" : "Add New Memory"}</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update your travel memory"
              : `Create a pin at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location Name</Label>
            <Input
              id="location"
              placeholder="e.g., Eiffel Tower, Paris"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Visit Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !visitDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {visitDate ? format(visitDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={visitDate} onSelect={setVisitDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes & Memories</Label>
            <Textarea
              id="notes"
              placeholder="What made this moment special?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Photos</Label>
            <div className="grid grid-cols-3 gap-4">
              {existingPhotos.map((photo) => (
                <div key={photo.id} className="relative aspect-square group">
                  <img
                    src={photo.photo_url || "/placeholder.svg"}
                    alt="Existing memory"
                    className="w-full h-full object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(photo.id, photo.photo_url)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {previews.map((preview, index) => (
                <div key={`new-${index}`} className="relative aspect-square group">
                  <img
                    src={preview || "/placeholder.svg"}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">Add Photo</span>
              </div>
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

          <DialogFooter className="flex justify-between sm:justify-between">
            {initialData ? (
              <Button type="button" variant="destructive" onClick={handleDeletePin} disabled={isLoading}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            ) : (
              <div></div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Save Changes" : "Create Pin"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
