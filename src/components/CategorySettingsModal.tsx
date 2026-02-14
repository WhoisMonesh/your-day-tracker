import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Category, ICON_OPTIONS, COLOR_OPTIONS } from '@/types/task';
import { generateId } from '@/hooks/useTaskStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import React from 'react';
const icons = Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
const getIcon = (name: string) => icons[name] || icons['Star'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategorySettingsModal({ open, onOpenChange }: Props) {
  const { categories, addCategory, updateCategory, deleteCategory } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [isAdding, setIsAdding] = useState(false);

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setColor(cat.color);
    setIcon(cat.icon);
    setIsAdding(false);
  };

  const startAdd = () => {
    setEditingId(null);
    setName('');
    setColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
    setIcon(ICON_OPTIONS[0]);
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (isAdding) {
      addCategory({ name: name.trim(), color, icon });
    } else if (editingId) {
      updateCategory(editingId, { name: name.trim(), color, icon });
    }
    setIsAdding(false);
    setEditingId(null);
    setName('');
  };

  const handleDelete = (id: string) => {
    if (categories.length <= 1) return;
    deleteCategory(id);
    if (editingId === id) {
      setEditingId(null);
      setName('');
    }
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {React.createElement(getIcon('Settings'), { size: 18 })} Manage Categories
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {categories.map(cat => (
            <div
              key={cat.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                editingId === cat.id ? 'border-primary bg-accent/30' : 'border-border'
              )}
            >
              <div className="flex items-center gap-2 flex-1">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {React.createElement(getIcon(cat.icon), { size: 16, className: 'text-muted-foreground' })}
                <button onClick={() => startEdit(cat)} className="p-1 rounded hover:bg-accent text-muted-foreground">
                  {React.createElement(getIcon('Pencil'), { size: 14 })}
                </button>
              </div>
              <button
                onClick={() => handleDelete(cat.id)}
                className={cn(
                  'p-1 rounded hover:bg-destructive/10 text-muted-foreground',
                  categories.length <= 1 && 'opacity-30 cursor-not-allowed'
                )}
                disabled={categories.length <= 1}
              >
                {React.createElement(getIcon('Trash2'), { size: 14 })}
              </button>
            </div>
          ))}
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="space-y-3 pt-3 border-t border-border">
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Category name..."
                className="mt-1"
                autoFocus
              />
            </div>

            <div>
              <Label className="mb-2 block">Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-7 h-7 rounded-full transition-all flex items-center justify-center',
                      color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                    )}
                    style={{ background: c }}
                  >
                    {color === c && React.createElement(getIcon('Check'), { size: 12, className: 'text-white' })}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Icon</Label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map(ic => (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      className={cn(
                        'px-2 py-1 rounded transition-colors',
                        icon === ic ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground hover:bg-accent/80'
                      )}
                      title={ic}
                    >
                      {React.createElement(getIcon(ic), { size: 14 })}
                    </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" className="flex-1">
                {isAdding ? 'Add Category' : 'Save Changes'}
              </Button>
              <Button onClick={cancelEdit} size="sm" variant="outline">Cancel</Button>
            </div>
          </div>
        )}

        {!isAdding && !editingId && (
          <Button onClick={startAdd} variant="outline" className="w-full gap-2">
            {React.createElement(getIcon('Plus'), { size: 16 })} Add New Category
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
