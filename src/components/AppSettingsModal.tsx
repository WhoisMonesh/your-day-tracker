import { useApp } from '@/contexts/AppContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Category, Priority } from '@/types/task';
import { useMemo } from 'react';

export function AppSettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { settings, updateSetting, categories } = useApp();

  const defaultCatExists = useMemo(() => categories.some(c => c.id === settings.defaultCategoryId), [categories, settings.defaultCategoryId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>App Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>24-hour time</Label>
              <p className="text-xs text-muted-foreground">Display times in 24-hour format</p>
            </div>
            <Switch
              checked={settings.use24h}
              onCheckedChange={(v) => updateSetting('use24h', v ? 'true' : 'false')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Use OPFS persistence</Label>
              <p className="text-xs text-muted-foreground">Store DB snapshot in Origin Private File System</p>
            </div>
            <Switch
              checked={settings.opfsEnabled}
              onCheckedChange={(v) => updateSetting('opfsEnabled', v ? 'true' : 'false')}
            />
          </div>

          <div>
            <Label>Default Priority</Label>
            <Select value={settings.defaultPriority} onValueChange={(v) => updateSetting('defaultPriority', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">🔴 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Default Category</Label>
            <Select value={defaultCatExists ? settings.defaultCategoryId : categories[0]?.id || 'personal'} onValueChange={(v) => updateSetting('defaultCategoryId', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat: Category) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Default Reminder</Label>
            <Select value={settings.defaultReminderType} onValueChange={(v) => updateSetting('defaultReminderType', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="30sec">30 sec</SelectItem>
                <SelectItem value="5min">5 min</SelectItem>
                <SelectItem value="15min">15 min</SelectItem>
                <SelectItem value="30min">30 min</SelectItem>
                <SelectItem value="1hour">1 hour</SelectItem>
                <SelectItem value="1day">1 day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Reminder Sound</Label>
            <Select value={settings.reminderSound} onValueChange={(v) => updateSetting('reminderSound', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beep">Beep</SelectItem>
                <SelectItem value="chime">Chime</SelectItem>
                <SelectItem value="none">Silent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
