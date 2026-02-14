import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Task } from '@/types/task';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileSpreadsheet, FileText, Database, Upload, Shield, CalendarDays } from 'lucide-react';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, format, isWithinInterval,
} from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RangeType = 'this-week' | 'this-month' | 'this-year' | 'last-month' | 'last-year' | 'all';

export function ExportModal({ open, onOpenChange }: Props) {
  const { tasks, categories, addTask, settings } = useApp();
  const [rangeType, setRangeType] = useState<RangeType>('this-month');
  const [includeCompleted, setIncludeCompleted] = useState(true);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    let result = tasks;

    if (!includeCompleted) {
      result = result.filter(t => t.status !== 'completed');
    }

    if (rangeType === 'all') return result;

    let start: Date, end: Date;
    switch (rangeType) {
      case 'this-week': {
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      }
      case 'this-month': {
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      }
      case 'this-year': {
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      }
      case 'last-month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      }
      case 'last-year': {
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        start = startOfYear(lastYear);
        end = endOfYear(lastYear);
        break;
      }
      default: {
        return result;
      }
    }

    return result.filter(t => {
      const dueDate = new Date(t.dueDate);
      return isWithinInterval(dueDate, { start, end });
    });
  }, [tasks, rangeType, includeCompleted]);

  const getCategoryName = (catId: string) => {
    return categories.find(c => c.id === catId)?.name || 'Unknown';
  };

  const rangeLabel = () => {
    const labels: Record<RangeType, string> = {
      'this-week': 'This Week',
      'this-month': 'This Month',
      'this-year': 'This Year',
      'last-month': 'Last Month',
      'last-year': 'Last Year',
      'all': 'All Time',
    };
    return labels[rangeType];
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const data = filteredTasks.map(t => ({
      Title: t.title,
      Description: t.description,
      'Due Date': t.dueDate,
      'Due Time': t.dueTime || '-',
      Priority: t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
      Status: t.status === 'in-progress' ? 'In Progress' : t.status === 'todo' ? 'To Do' : 'Completed',
      Category: getCategoryName(t.categoryId),
      'Created At': format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm'),
      'Completed At': t.completedAt ? format(new Date(t.completedAt), 'yyyy-MM-dd HH:mm') : '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, { wch: 40 }, { wch: 12 }, { wch: 8 },
      { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Tasks - ${rangeLabel()}`);
    XLSX.writeFile(wb, `YourDayTracker_${rangeType}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(13, 148, 136);
    doc.text('Your Day Tracker Report', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${rangeLabel()}  |  Generated: ${format(new Date(), 'PPP')}`, 14, 30);
    doc.text(`Total: ${filteredTasks.length} tasks  |  Completed: ${filteredTasks.filter(t => t.status === 'completed').length}`, 14, 36);

    // Table
    autoTable(doc, {
      startY: 44,
      head: [['Title', 'Due Date', 'Priority', 'Status', 'Category']],
      body: filteredTasks.map(t => [
        t.title,
        t.dueDate,
        t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
        t.status === 'in-progress' ? 'In Progress' : t.status === 'todo' ? 'To Do' : 'Completed',
        getCategoryName(t.categoryId),
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [13, 148, 136],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 28 },
        2: { cellWidth: 22 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
      },
    });

    doc.save(`YourDayTracker_${rangeType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const backupDB = async () => {
    const { exportSnapshotBlob } = await import('@/db/sqlite');
    const blob = await exportSnapshotBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `YourDayTracker_${format(new Date(), 'yyyy-MM-dd')}.sqlite`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const restoreDB = async (file: File) => {
    const { importSnapshot } = await import('@/db/sqlite');
    const buf = await file.arrayBuffer();
    await importSnapshot(buf);
  };

  const backupEncrypted = async () => {
    const pass = window.prompt('Enter passphrase');
    if (!pass) return;
    const { exportSnapshotBlob } = await import('@/db/sqlite');
    const { encryptSnapshot } = await import('@/db/crypto');
    const blob = await exportSnapshotBlob();
    const enc = await encryptSnapshot(new Uint8Array(await blob.arrayBuffer()), pass);
    const url = URL.createObjectURL(enc);
    const a = document.createElement('a');
    a.href = url;
    a.download = `YourDayTracker_${format(new Date(), 'yyyy-MM-dd')}.sqlite.enc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const restoreEncrypted = async (file: File) => {
    const pass = window.prompt('Enter passphrase');
    if (!pass) return;
    const { decryptSnapshot } = await import('@/db/crypto');
    const { importSnapshot } = await import('@/db/sqlite');
    const dec = await decryptSnapshot(file, pass);
    await importSnapshot(dec);
  };

  const exportCSV = async () => {
    type Row = Record<string, string>;
    const rows: Row[] = filteredTasks.map(t => ({
      Title: String(t.title),
      Description: String(t.description || ''),
      DueDate: String(t.dueDate),
      DueTime: String(t.dueTime || ''),
      Priority: String(t.priority),
      Status: String(t.status),
      Category: String(getCategoryName(t.categoryId)),
      CreatedAt: format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm'),
      CompletedAt: t.completedAt ? format(new Date(t.completedAt), 'yyyy-MM-dd HH:mm') : '',
    }));
    const headers = Object.keys(rows[0] || { Title: '', Description: '' });
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => esc(r[h] ?? '')).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `YourDayTracker_${rangeLabel()}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportJSON = async () => {
    const rows = filteredTasks.map(t => ({
      title: t.title,
      description: t.description,
      dueDate: t.dueDate,
      dueTime: t.dueTime || '',
      priority: t.priority,
      status: t.status,
      category: getCategoryName(t.categoryId),
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `YourDayTracker_${rangeLabel()}_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportICS = async () => {
    const lines: string[] = [];
    lines.push("BEGIN:VCALENDAR");
    lines.push("VERSION:2.0");
    lines.push("PRODID:-//YourDayTracker//EN");
    filteredTasks.forEach(t => {
      const date = t.dueDate;
      const time = t.dueTime || "09:00";
      const dt = new Date(`${date}T${time}`);
      const dtstamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
      const dtstart = format(dt, "yyyyMMdd'T'HHmmss");
      const uid = t.id;
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART:${dtstart}`);
      lines.push(`SUMMARY:${t.title.replace(/\r?\n/g," ")}`);
      if (t.description) lines.push(`DESCRIPTION:${t.description.replace(/\r?\n/g," ")}`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `YourDayTracker_${rangeLabel()}_${format(new Date(), 'yyyy-MM-dd')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importICS = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    let inEvent = false;
    let summary = '';
    let description = '';
    let dtstartRaw = '';
    let pendingCategory: string | null = null;
    let pendingPriority: 'high' | 'medium' | 'low' | null = null;
    const makeDate = (raw: string) => {
      const m = raw.match(/(\d{8})(T(\d{6})Z?)?/);
      if (!m) return { date: '', time: '' };
      const d = m[1];
      const t = m[3];
      const yyyy = d.slice(0,4), mm = d.slice(4,6), dd = d.slice(6,8);
      if (t) {
        const hh = t.slice(0,2), min = t.slice(2,4);
        return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
      }
      return { date: `${yyyy}-${mm}-${dd}`, time: '' };
    };
    const parseRRule = (line: string) => {
      const freq = /FREQ=([A-Z]+)/.exec(line)?.[1] || '';
      const interval = /INTERVAL=(\d+)/.exec(line)?.[1];
      let repeatType: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom' = 'none';
      let repeatInterval: number | undefined = undefined;
      if (freq === 'DAILY') repeatType = 'daily';
      else if (freq === 'WEEKLY') repeatType = 'weekly';
      else if (freq === 'MONTHLY') repeatType = 'monthly';
      if (interval) {
        repeatType = 'custom';
        repeatInterval = parseInt(interval, 10);
      }
      return { repeatType, repeatInterval };
    };
    let pendingRepeat: { repeatType: 'none'|'daily'|'weekly'|'monthly'|'custom'; repeatInterval?: number } = { repeatType: 'none' };
    for (const line of lines) {
      if (line.startsWith('BEGIN:VEVENT')) {
        inEvent = true;
        summary = '';
        description = '';
        dtstartRaw = '';
        pendingCategory = null;
        pendingPriority = null;
        pendingRepeat = { repeatType: 'none' };
        continue;
      }
      if (line.startsWith('END:VEVENT')) {
        if (summary && dtstartRaw) {
          const { date, time } = makeDate(dtstartRaw);
          let catId = settings.defaultCategoryId || categories[0]?.id || 'personal';
          if (pendingCategory) {
            const name = pendingCategory.toLowerCase();
            const match = categories.find(c => c.name.toLowerCase() === name || c.id.toLowerCase() === name);
            if (match) catId = match.id;
          }
          const pr = pendingPriority || settings.defaultPriority;
          addTask({
            title: summary,
            description,
            dueDate: date || new Date().toISOString().slice(0,10),
            dueTime: time,
            priority: pr,
            status: 'todo',
            categoryId: catId,
            reminder: { type: settings.defaultReminderType, notified: false },
            repeatType: pendingRepeat.repeatType,
            repeatInterval: pendingRepeat.repeatInterval,
          });
        }
        inEvent = false;
        continue;
      }
      if (!inEvent) continue;
      if (line.startsWith('SUMMARY:')) {
        summary = line.slice(8).trim();
      } else if (line.startsWith('DESCRIPTION:')) {
        description = line.slice(12).trim();
      } else if (line.startsWith('DTSTART')) {
        const parts = line.split(':');
        dtstartRaw = parts[1]?.trim() || '';
      } else if (line.startsWith('RRULE:')) {
        pendingRepeat = parseRRule(line);
      } else if (line.startsWith('CATEGORIES:')) {
        const cats = line.slice(11).trim().split(/[;,]/).map(s => s.trim()).filter(Boolean);
        pendingCategory = cats[0] || null;
      } else if (line.startsWith('PRIORITY:')) {
        const val = parseInt(line.slice(9).trim(), 10);
        pendingPriority = val <= 2 ? 'high' : val <= 6 ? 'medium' : 'low';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={18} /> Export Tasks
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Time Range</Label>
            <Select value={rangeType} onValueChange={v => setRangeType(v as RangeType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeCompleted"
              checked={includeCompleted}
              onChange={e => setIncludeCompleted(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="includeCompleted" className="text-sm cursor-pointer">
              Include completed tasks
            </Label>
          </div>

          <div className="p-3 rounded-lg bg-accent/50 text-sm text-muted-foreground">
            <strong className="text-foreground">{filteredTasks.length}</strong> tasks will be exported
            ({filteredTasks.filter(t => t.status === 'completed').length} completed)
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={exportExcel}
              variant="outline"
              className="gap-2"
              disabled={filteredTasks.length === 0}
            >
              <FileSpreadsheet size={16} className="text-success" />
              Export Excel
            </Button>
            <Button
              onClick={exportPDF}
              variant="outline"
              className="gap-2"
              disabled={filteredTasks.length === 0}
            >
              <FileText size={16} className="text-destructive" />
              Export PDF
            </Button>
          </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button onClick={exportCSV} variant="outline" className="gap-2" disabled={filteredTasks.length === 0}>
            <Download size={16} />
            Export CSV
          </Button>
          <Button onClick={exportJSON} variant="outline" className="gap-2" disabled={filteredTasks.length === 0}>
            <Download size={16} />
            Export JSON
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button onClick={exportICS} variant="outline" className="gap-2" disabled={filteredTasks.length === 0}>
            <CalendarDays size={16} />
            Export ICS
          </Button>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer">
            <Upload size={16} />
            Import ICS
            <input
              type="file"
              accept=".ics"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importICS(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="mt-6 border-t pt-4">
          <p className="text-sm font-semibold mb-2">Database Backup</p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={backupDB} variant="outline" className="gap-2">
              <Database size={16} />
              Backup DB
            </Button>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer">
              <Upload size={16} />
              Restore DB
              <input
                type="file"
                accept=".sqlite,.db"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) restoreDB(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button onClick={backupEncrypted} variant="outline" className="gap-2">
              <Shield size={16} />
              Encrypted Backup
            </Button>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer">
              <Shield size={16} />
              Restore Encrypted
              <input
                type="file"
                accept=".enc"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) restoreEncrypted(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
