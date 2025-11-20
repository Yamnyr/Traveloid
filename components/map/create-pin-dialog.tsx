"use client"

import type React from "react"

import { useState, useRef } from "react"
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
import { CalendarIcon, Upload, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { upload } from "@vercel/blob/client"

interface CreatePinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  latitude: number
  longitude: number
}

export function CreatePinDialog({ open, onOpenChange, latitude, longitude }: CreatePinDialogProps) {
  const [locationName, setLocationName] = useState("")
  const [visitDate, setVisitDate] = useState<Date | undefined>(new Date())
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const supabase = createClient()

    try {
      // 1. Create the pin
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

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

      // 2. Upload photos and create photo records
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(async (file) => {
          // This handles the handshake with the /api/upload route automatically
          const newBlob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/upload",
          })

          // Create record in Supabase
          return supabase.from("pin_photos").insert({
            pin_id: pin.id,
            user_id: user.id,
            photo_url: newBlob.url,
            caption: locationName, // Default caption
          })
        })

        await Promise.all(uploadPromises)
      }

      onOpenChange(false)
      router.refresh()

      // Reset form
      setLocationName("")
      setNotes("")
      setVisitDate(new Date())
      setSelectedFiles([])
      setPreviews([])
    } catch (error) {
      console.error("Error creating pin:", error)
      // Ideally show toast error here
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Memory</DialogTitle>
          <DialogDescription>
            Create a pin at {latitude.toFixed(4)}, {longitude.toFixed(4)}
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
              {previews.map((preview, index) => (
                <div key={index} className="relative aspect-square group">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Pin
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
