import { useState } from 'react';
import './App.css'
import { Button } from "./components/ui/button"
import { Textarea } from "./components/ui/textarea"
import { cn } from './lib/utils'
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Run_ai } from './lib/ai';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}


function App() {

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [input, setInput] = useState<string>("")
  const [elements, setElements] = useState<Array<any> | null>(null)

  // Add lasso
  const handleAddLasso = async () => {
    const [tabs] = await chrome.tabs.query({ currentWindow: true, active: true })
    const tabId = tabs.id || 1
    try {
      // sends action message to the content for activating 
      // the lasso in the current content page
      const response = await chrome.tabs.sendMessage(tabId, { action: "startLasso" })
      console.log("content.js [startLasso]", response)
      toast.success("Lasso added to page successfully")
    } catch (err: any) {
      throw Error(err.toString())
    }
  }

  async function cropImage(dataUrl: string, rect: Rect): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(
          img,
          rect.x + window.scrollX,
          rect.y + window.scrollY,
          rect.width,
          rect.height,
          0,
          0,
          rect.width,
          rect.height
        );

        resolve(canvas.toDataURL("image/png"));
      };
      img.src = dataUrl;
    });
  }

  chrome.runtime.onMessage.addListener(async (msg: any) => {
    if (msg.action === "tabScreenshot" && msg.dataUrl && msg.rect) {
      console.log("app [action]", msg.action);
      const response = await cropImage(msg.dataUrl, msg.rect)
      setImageUrl(response)
      return;
    }
  });

  chrome.runtime.onMessage.addListener((msg: any) => {
    if (msg.action == "selectionDone") {
      console.log("app [action]", msg.action)
      setElements(msg.elements)

    }
  })

  const handleRemoveLasso = async () => {
    const [tabs] = await chrome.tabs.query({ currentWindow: true, active: true })
    const tabId = tabs.id || 1
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: "removeLasso" })
      console.log("content.js [startLasso]", response)
      toast.success("Lasso removed from page successfully")
    } catch (err: any) {
      throw Error(err.toString())
    }
  }


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()
      const [tab] = await chrome.tabs.query({ currentWindow: true, active: true })
      const tabId = tab.id ?? 1

      const aiPromise = Run_ai(imageUrl as string, input, elements as Array<any>)

      toast.promise(aiPromise, {
        loading: "Generating with AI",
        success: () => `Elements generated successfully`,
        error: "AI generation failed",
      })

      const aiResponse = await aiPromise

      const messagePromise = new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabId,
          { action: "AI", response: aiResponse },
          (res) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError.message)
            } else {
              resolve(res)
            }
          }
        )
      })

      toast.promise(messagePromise, {
        loading: "Replacing elements...",
        success: () => `Elements replaced successfully`,
        error: "Failed to send message to tab",
      })

      await messagePromise
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className='min-h-screen bg-zinc-900 text-amber-100 text-lg font-semibold'>
      <div className="max-w-4xl flex flex-col gap-x-3 items-center justify-center mx-auto w-full min-h-screen">
        <div className='w-full gap-x-3 flex items-center justify-center'>
          <Button className={cn(
            'text-black font-semibold',
            'bg-pink-300 border-2 border-zinc-600',
            'hover:bg-neutral-700 hover:text-white'
          )}
            onClick={handleAddLasso}>
            Add Lasso
          </Button>
          <Button className={cn(
            'text-black font-semibold',
            'bg-white border-2 border-zinc-600',
            'hover:bg-neutral-700 hover:text-white'
          )}
            onClick={handleRemoveLasso}>
            Remove Lasso
          </Button>
          {
            imageUrl &&
            <a download href={imageUrl as string} className='w-auto border-1 border-zinc-600 hover:text-white text-black bg-pink-300 rounded-sm p-2 hover:bg-neutral-700'>
              <Download className='text-sm size-5' />
            </a>
          }
        </div>
        {imageUrl &&
          <div className="w-full p-5 flex flex-col gap-y-3 items-center justify-center">
            <img
              src={imageUrl}
              className="w-full h-full object-cover border-1 border-zinc-600 rounded-lg"
            />
            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
              <div className="w-full h-auto min-w-[400px]">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type something..."
                />
              </div>

              <Button
                className={cn(
                  "text-black font-semibold mt-2",
                  "bg-pink-300 border-2 border-zinc-600",
                  "hover:bg-neutral-700 hover:text-white"
                )}
                type="submit"
              >
                Submit
              </Button>
            </form>
          </div>
        }
      </div>
    </div >
  )
}

export default App
