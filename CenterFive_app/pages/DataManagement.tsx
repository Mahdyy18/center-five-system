import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ICONS } from '../constants';
import { normalizeImportedData } from '../utils/normalize';
import * as XLSX from 'xlsx';

interface DataManagementProps {
  data: any;
  onImport: (data: any) => void;
  onReset: () => void;
  notify: (msg: string, type?: 'SUCCESS' | 'WARNING' | 'ERROR') => void;
}

const SectionHeader: React.FC<{ title: string; subtitle?: string; icon?: any }> = ({ title, subtitle, icon }) => (
  <div className="flex items-start justify-between">
    <div className="flex items-start gap-3">
      {icon && <span className="p-3 bg-[#8000FF]/10 text-[#8000FF] rounded-2xl">{icon}</span>}
      <div className="text-right">
        <h2 className="text-2xl font-black text-gray-800">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 font-bold mt-1">{subtitle}</p>}
      </div>
    </div>
  </div>
);

const Card: React.FC<{
  title: string;
  desc: string;
  icon: any;
  actions: React.ReactNode;
  tone?: 'default' | 'dropbox' | 'danger';
}> = ({ title, desc, icon, actions, tone = 'default' }) => {
  const toneClasses = useMemo(() => {
    if (tone === 'danger') return 'border-red-100 bg-red-50';
    if (tone === 'dropbox') return 'border-blue-100 bg-blue-50';
    return 'border-gray-100 bg-white';
  }, [tone]);

  return (
    <div className={`p-7 rounded-[2rem] border shadow-sm hover:shadow-xl transition-all ${toneClasses}`}>
      <div className="flex items-center justify-between mb-5">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white border border-gray-100 shadow-sm">
          {icon}
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-gray-800">{title}</div>
          <div className="text-xs font-bold text-gray-400 mt-1 max-w-[320px]">{desc}</div>
        </div>
      </div>
      <div>{actions}</div>
    </div>
  );
};

const Pill: React.FC<{ label: string; value?: string; tone?: 'default' | 'ok' | 'warn' }> = ({
  label,
  value,
  tone = 'default',
}) => {
  const cls =
    tone === 'ok'
      ? 'bg-green-50 text-green-700 border-green-100'
      : tone === 'warn'
      ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
      : 'bg-gray-50 text-gray-600 border-gray-100';

  return (
    <div className={`px-3 py-2 rounded-xl border text-[11px] font-black ${cls}`}>
      <span className="opacity-70">{label}: </span>
      <span className="font-black">{value || '—'}</span>
    </div>
  );
};

const DataManagement: React.FC<DataManagementProps> = ({ data, onImport, onReset, notify }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoringDropbox, setIsRestoringDropbox] = useState(false);
  const [showDropboxPanel, setShowDropboxPanel] = useState(false);
  const [showToken, setShowToken] = useState(false);

  
  const [dropboxToken, setDropboxToken] = useState<string>(() => localStorage.getItem('dropbox_token') || '');

  const DROPBOX_BACKUP_PATH = '/CenterFive/CenterFive_Backup.json';

  const [dropboxMeta, setDropboxMeta] = useState<{ size?: number; server_modified?: string } | null>(() => {
    try {
      const raw = localStorage.getItem('dropbox_backup_meta');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const saveDropboxMeta = (meta: any) => {
    setDropboxMeta(meta);
    localStorage.setItem('dropbox_backup_meta', JSON.stringify(meta));
  };

  useEffect(() => {
    localStorage.setItem('dropbox_token', dropboxToken);
  }, [dropboxToken]);

  
  const [lastDropboxBackupAt, setLastDropboxBackupAt] = useState<string>(() => localStorage.getItem('last_dropbox_backup_at') || '');
  const [lastLocalBackupAt, setLastLocalBackupAt] = useState<string>(() => localStorage.getItem('last_local_backup_at') || '');

  const saveLastDropboxBackup = (iso: string) => {
    setLastDropboxBackupAt(iso);
    localStorage.setItem('last_dropbox_backup_at', iso);
  };
  const saveLastLocalBackup = (iso: string) => {
    setLastLocalBackupAt(iso);
    localStorage.setItem('last_local_backup_at', iso);
  };

  
  const uploadToDropbox = async (accessToken: string, silent = false) => {
    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: DROPBOX_BACKUP_PATH,
          mode: 'overwrite',
          autorename: false,
          mute: true,
        }),
      },
      body: new Blob([JSON.stringify({ timestamp: new Date().toISOString(), ...data }, null, 2)], {
        type: 'application/json',
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const msg = `Dropbox upload failed: ${response.status} ${text || ''}`.trim();
      if (!silent) console.error(msg);
      throw new Error(msg);
    }

    
    const metaRes = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: DROPBOX_BACKUP_PATH }),
    });

    if (metaRes.ok) {
      const meta = await metaRes.json();
      saveDropboxMeta({
        size: meta?.size,
        server_modified: meta?.server_modified,
      });
    }
  };

  const handleImmediateDropboxBackup = async () => {
    setIsBackingUp(true);
    try {
      const token = dropboxToken.trim();
      if (!token) {
        notify('يرجى إدخال Dropbox Token أولاً', 'WARNING');
        setShowDropboxPanel(true);
        return;
      }

      await uploadToDropbox(token, false);
      const nowIso = new Date().toISOString();
      saveLastDropboxBackup(nowIso);

      notify('تم إنشاء ورفع النسخة الاحتياطية إلى Dropbox بنجاح', 'SUCCESS');
    } catch (error: any) {
      console.error('Backup error:', error);
      notify(`فشل رفع النسخة على Dropbox: ${error?.message || 'تحقق من التوكن والاتصال'}`, 'ERROR');
    } finally {
      setIsBackingUp(false);
    }
  };

  
  useEffect(() => {
    const id = setInterval(() => {
      
      try {
        const payload = { timestamp: new Date().toISOString(), ...data };
        localStorage.setItem('centerfive_auto_backup', JSON.stringify(payload));
        saveLastLocalBackup(new Date().toISOString());
      } catch {
        
      }

      
      if (dropboxToken.trim()) {
        uploadToDropbox(dropboxToken.trim(), true)
          .then(() => saveLastDropboxBackup(new Date().toISOString()))
          .catch(() => {});
      }
    }, 2 * 60 * 60 * 1000);

    return () => clearInterval(id);
  }, [dropboxToken, data]);

  
  const handleExportJSON = () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `CenterFive_Backup_${timestamp}.json`;
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      notify('تم تصدير نسخة JSON بنجاح', 'SUCCESS');
    } catch (err) {
      console.error(err);
      notify('حدث خطأ أثناء تصدير JSON', 'ERROR');
    }
  };

  
  const parseNested = (arr: any[]) => {
    if (!arr || !Array.isArray(arr)) return [];
    return arr.map((item) => {
      const parsed = { ...item };
      Object.keys(parsed).forEach((key) => {
        const val = parsed[key];
        if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
          try {
            parsed[key] = JSON.parse(val);
          } catch {
            
          }
        }
      });
      return parsed;
    });
  };

  
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.json')) {
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (imported && typeof imported === 'object') {
            if (window.confirm('سيتم استبدال كافة بيانات الموقع الحالية بالنسخة الموجودة في الملف. هل أنت متأكد؟')) {
              onImport(imported);
              notify('تم استيراد البيانات من الملف بنجاح', 'SUCCESS');
            }
          } else {
            notify('محتوى ملف JSON غير صالح كنسخة احتياطية', 'ERROR');
          }
        } catch {
          notify('خطأ في تحليل ملف JSON', 'ERROR');
        }
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      reader.onload = (event) => {
        try {
          const buffer = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(buffer, { type: 'array' });
          const importedData: any = {};

          const sheetMapping: Record<string, string> = {
            'الخدمات العامة': 'services',
            'سجل الفواتير': 'invoices',
            'المديونيات العامة': 'debts',
            'شؤون المدرسين': 'teachers',
            'سجل المصروفات': 'expenses',
            'بيانات الموظفين': 'staff',
            'سجل النشاط': 'activityLogs',
          };

          workbook.SheetNames.forEach((sheetName) => {
            const key = sheetMapping[sheetName.trim()];
            if (key) {
              const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
              importedData[key] = parseNested(rawRows as any[]);
            }
          });

          const hasAnyData = Object.values(importedData).some((arr: any) => (arr || []).length > 0);

          if (!hasAnyData) {
            notify('الملف لا يحتوي على صفحات بيانات النظام الصحيحة', 'ERROR');
            return;
          }

          if (window.confirm('تم العثور على بيانات النظام داخل ملف Excel. هل تريد بدء الاستعادة الشاملة؟')) {
            onImport(importedData);
            notify('تم استيراد البيانات من Excel بنجاح', 'SUCCESS');
          }
        } catch (err) {
          console.error('XLSX Parse Error:', err);
          notify('خطأ في قراءة ملف الإكسيل، قد يكون التنسيق غير مدعوم', 'ERROR');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      notify('صيغة الملف غير مدعومة. استخدم .json أو .xlsx', 'WARNING');
    }

    
    e.target.value = '';
  };

  
  const importFromDropbox = async () => {
    setIsRestoringDropbox(true);
    try {
      const token = dropboxToken.trim();
      if (!token) {
        notify('يرجى إدخال Dropbox Token أولاً', 'WARNING');
        setShowDropboxPanel(true);
        return;
      }

      if (!window.confirm('سيتم استبدال كافة بيانات الموقع الحالية بآخر نسخة موجودة على Dropbox. هل أنت متأكد؟')) {
        return;
      }

      const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Dropbox-API-Arg': JSON.stringify({ path: DROPBOX_BACKUP_PATH }),
        },
      });

      if (!response.ok) {
        const t = await response.text().catch(() => '');
        notify(`فشل تحميل النسخة من Dropbox: ${response.status} ${t || ''}`.trim(), 'ERROR');
        return;
      }

      const text = await response.text();
      const imported = JSON.parse(text);
      onImport(imported);
      notify('تم استيراد البيانات من Dropbox بنجاح', 'SUCCESS');
    } catch (err) {
      console.error(err);
      notify('تعذر استيراد البيانات من Dropbox', 'ERROR');
    } finally {
      setIsRestoringDropbox(false);
    }
  };

  const tokenStatus = useMemo(() => (dropboxToken.trim() ? 'موجود' : 'غير موجود'), [dropboxToken]);

  const dropboxSizeLabel = useMemo(() => {
    if (typeof dropboxMeta?.size !== 'number') return '';
    const kb = dropboxMeta.size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }, [dropboxMeta]);

  return (
    <div className="space-y-10 animate-slide-up text-right">
      <div className="flex items-center justify-between border-b border-gray-100 pb-5">
        <SectionHeader
          title="إدارة البيانات والنسخ الاحتياطي"
          subtitle="تصدير واستعادة شاملة + Dropbox Backup"
          icon={ICONS.Database}
        />
        <button
          onClick={() => setShowDropboxPanel((v) => !v)}
          className={`transition-all px-4 py-2 rounded-2xl text-sm font-black border ${
            showDropboxPanel ? 'bg-[#8000FF] text-white border-[#8000FF]' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          إعدادات Dropbox
        </button>
      </div>

      {}
      <div className="flex flex-wrap gap-3 justify-end">
        <Pill label="Dropbox Token" value={tokenStatus} tone={dropboxToken.trim() ? 'ok' : 'warn'} />
        <Pill
          label="آخر Dropbox Backup"
          value={lastDropboxBackupAt ? new Date(lastDropboxBackupAt).toLocaleString() : ''}
          tone={lastDropboxBackupAt ? 'ok' : 'warn'}
        />
        <Pill
          label="آخر Local Backup"
          value={lastLocalBackupAt ? new Date(lastLocalBackupAt).toLocaleString() : ''}
          tone={lastLocalBackupAt ? 'ok' : 'warn'}
        />

        {dropboxMeta?.server_modified && (
          <Pill
            label="Dropbox Verified"
            value={new Date(dropboxMeta.server_modified).toLocaleString()}
            tone="ok"
          />
        )}

        {dropboxSizeLabel && <Pill label="حجم نسخة Dropbox" value={dropboxSizeLabel} tone="ok" />}
      </div>

      {}
      {showDropboxPanel && (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-right">
              <h3 className="text-lg font-black text-gray-800">إعدادات Dropbox</h3>
              <p className="text-xs text-gray-400 font-bold mt-1">
                الصق Access Token الخاص بـ Dropbox. (مهم: لا تشاركه مع أي شخص)
              </p>
              <p className="text-[11px] text-gray-400 font-bold mt-2">
                مسار النسخة: <span className="font-mono">{DROPBOX_BACKUP_PATH}</span>
              </p>
            </div>
            <button
              onClick={() => setShowDropboxPanel(false)}
              className="px-4 py-2 rounded-2xl border border-gray-200 text-gray-600 font-black text-sm"
            >
              إغلاق
            </button>
          </div>

          <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div>
              <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase">Dropbox Token</label>
              <input
                type={showToken ? 'text' : 'password'}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-left font-mono text-xs outline-none focus:border-[#8000FF]"
                value={dropboxToken}
                onChange={(e) => setDropboxToken(e.target.value)}
                placeholder="sl.B..."
              />
            </div>

            <button
              onClick={() => setShowToken((v) => !v)}
              className="px-6 py-3 rounded-xl border border-gray-200 font-black text-sm bg-white"
            >
              {showToken ? 'إخفاء' : 'إظهار'}
            </button>

            <button
              onClick={() => notify('تم حفظ التوكن', 'SUCCESS')}
              className="px-8 py-3 rounded-xl font-black text-sm bg-[#8000FF] text-white shadow-lg shadow-[#8000FF]/15"
            >
              حفظ
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setDropboxToken('');
                localStorage.removeItem('dropbox_token');
                notify('تم مسح التوكن', 'WARNING');
              }}
              className="px-6 py-2 rounded-xl font-black text-sm border border-red-200 bg-red-50 text-red-700"
            >
              مسح التوكن
            </button>
          </div>
        </div>
      )}

      {}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-800">Backup</h3>
          <span className="text-xs font-black text-gray-400">إنشاء نسخة احتياطية الآن</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card
            title="Backup to Dropbox"
            desc="رفع نسخة احتياطية كاملة إلى Dropbox على نفس الملف (Overwrite) + Verify."
            icon={<span className="text-blue-700">{ICONS.Cloud}</span>}
            tone="dropbox"
            actions={
              <div className="space-y-3">
                <button
                  onClick={handleImmediateDropboxBackup}
                  disabled={isBackingUp}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-60"
                >
                  {isBackingUp ? 'جاري الرفع...' : 'رفع إلى Dropbox الآن'}
                </button>

                <button
                  onClick={() => setShowDropboxPanel(true)}
                  className="w-full py-3 rounded-2xl font-black border border-blue-200 text-blue-700 bg-white"
                >
                  إعدادات Dropbox
                </button>
              </div>
            }
          />

          <Card
            title="Download JSON"
            desc="تنزيل نسخة JSON كاملة (أفضل صيغة استعادة)"
            icon={<div className="text-[#8000FF] font-black text-xl">JSON</div>}
            actions={
              <button
                onClick={handleExportJSON}
                className="w-full bg-[#8000FF] text-white py-4 rounded-2xl font-black shadow-lg shadow-[#8000FF]/20 active:scale-95 transition-all"
              >
                تنزيل ملف JSON
              </button>
            }
          />
        </div>
      </div>

      {}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-800">Restore</h3>
          <span className="text-xs font-black text-gray-400">استعادة بيانات النظام</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card
            title="Restore from file"
            desc="استيراد نسخة JSON أو Excel (يفضل JSON)"
            icon={<span className="text-[#8000FF]">{ICONS.Upload}</span>}
            actions={
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileImport}
                  accept=".json,.xlsx,.xls"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-[#8000FF] text-white py-4 rounded-2xl font-black shadow-lg shadow-[#8000FF]/20 active:scale-95 transition-all"
                >
                  اختر ملف الاستعادة
                </button>
              </>
            }
          />

          <Card
            title="Restore from Dropbox"
            desc="تحميل آخر نسخة من Dropbox ثم استبدال بيانات النظام بها."
            icon={<span className="text-blue-700">{ICONS.Cloud}</span>}
            tone="dropbox"
            actions={
              <button
                onClick={importFromDropbox}
                disabled={isRestoringDropbox}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-60"
              >
                {isRestoringDropbox ? 'جاري التحميل...' : 'استيراد من Dropbox'}
              </button>
            }
          />
        </div>
      </div>

      {}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-red-600">Danger Zone</h3>
          <span className="text-xs font-black text-red-400">إجراءات لا يمكن التراجع عنها</span>
        </div>

        <Card
          title="Reset System"
          desc="مسح كافة البيانات من المتصفح نهائيًا. تأكد من وجود نسخة احتياطية أولاً."
          icon={<span className="text-red-600">{ICONS.Reset}</span>}
          tone="danger"
          actions={
            <button
              onClick={onReset}
              className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all"
            >
              تصفير النظام بالكامل
            </button>
          }
        />
      </div>
    </div>
  );
};

export default DataManagement;
