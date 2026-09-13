import { CircleHelpIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Help">
          <CircleHelpIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How this works</DialogTitle>
          <DialogDescription>
            Your pack never leaves your browser. The only thing sent anywhere is a list of file hashes to
            Modrinth so it can identify the mods.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 text-sm leading-relaxed">
          <section className="space-y-1.5">
            <h3 className="font-medium">Checking a pack</h3>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Drop in a .mrpack file.</li>
              <li>Pick the Minecraft version and loader you want to move to.</li>
              <li>Check. Each mod, resource pack, shader and datapack is looked up on Modrinth.</li>
              <li>Build an updated .mrpack with every project that has a compatible build.</li>
            </ol>
          </section>
          <section className="space-y-1.5">
            <h3 className="font-medium">What ends up in the new pack</h3>
            <p className="text-muted-foreground">
              Every project with a Modrinth build for the target version, plus everything in your overrides
              folder. Projects without a build are left out. Fabric Carpet falls back to GitHub releases when
              Modrinth has nothing, but it is not written into the pack because the file is not on Modrinth.
            </p>
          </section>
          <section className="space-y-1.5">
            <h3 className="font-medium">Missing items</h3>
            <p className="text-muted-foreground">
              After a check you can remember the projects that had no build. They are stored in this browser and
              re-checked each time you open the page, so you find out when they catch up.
            </p>
          </section>
          <section className="space-y-1.5">
            <h3 className="font-medium">Limits</h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Only Modrinth .mrpack files.</li>
              <li>Best tested with Fabric. Other loaders work but see less use.</li>
              <li>Dependencies between mods are not resolved.</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
