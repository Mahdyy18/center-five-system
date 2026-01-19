import React, { useMemo, useState } from 'react';
import { Teacher, Service, ActivityLog } from '../types';
import { ICONS } from '../constants';
import { printHtml } from '../utils/printService';

interface TeachersProps {
  teachers: Teacher[];
  onUpdateTeachers: (teachers: Teacher[]) => void;
  onDeleteTeacherCompletely: (teacherId: string) => void;
  addLog: (action: string, details: string, type: ActivityLog['type']) => void;
  notify: (msg: string, type?: 'SUCCESS' | 'WARNING' | 'ERROR') => void;
}

type ViewFilter = 'ALL' | 'NOTES' | 'DEBT';

const Teachers: React.FC<TeachersProps> = ({
  teachers,
  onUpdateTeachers,
  onDeleteTeacherCompletely,
  addLog,
  notify
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('ALL');

  
  const [searchTeacher, setSearchTeacher] = useState('');

  
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [tName, setTName] = useState('');
  const [tPhone, setTPhone] = useState('');

  
  const [selectedTeacherForServices, setSelectedTeacherForServices] = useState<Teacher | null>(null);
  const [editingTeacherService, setEditingTeacherService] = useState<Service | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number | ''>('');

  const selectedTeacher = useMemo(
    () => teachers.find(t => t.id === selectedTeacherId) || null,
    [teachers, selectedTeacherId]
  );

  
  const filteredTeachers = useMemo(() => {
    const q = searchTeacher.trim().toLowerCase();
    if (!q) return teachers;

    return teachers.filter(t =>
      (t.name || '').toLowerCase().includes(q)
    );
  }, [teachers, searchTeacher]);

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('ar-EG'); }
    catch { return iso; }
  };

  const normalizeDayKey = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('ar-EG'); }
    catch { return iso; }
  };

  
  
  
  const aggregate = (teacher: Teacher, entryType: 'NOTES' | 'DEBT') => {
    const list = (teacher.history || []).filter((h: any) => h.entryType === entryType);

    const byService: Record<string, number> = {};
    const byDay: Record<string, Record<string, number>> = {};

    for (const h of list) {
      
      
      let service = h.serviceName || 'غير محدد';

      if (entryType === 'DEBT' && h.ownerTeacherName) {
        service = `${service} — صاحب المذكرة: ${h.ownerTeacherName}`;
      }
      const qty = Number(h.quantity || 0);

      byService[service] = (byService[service] || 0) + qty;

      const dayKey = normalizeDayKey(h.date);
      if (!byDay[dayKey]) byDay[dayKey] = {};
      byDay[dayKey][service] = (byDay[dayKey][service] || 0) + qty;
    }

    const totalQty = list.reduce((acc: number, h: any) => acc + Number(h.quantity || 0), 0);
    return { totalQty, byService, byDay, list };
  };

  
  
  
  const handleAddTeacher = () => {
    if (!tName.trim()) {
      notify('يرجى إدخال اسم المدرس', 'WARNING');
      return;
    }

    const newTeacher: Teacher = {
      id: Date.now().toString(),
      name: tName.trim(),
      phone: tPhone.trim(),
      totalDebt: 0,          
      remainingAmount: 0,    
      services: [],
      history: []
    };

    onUpdateTeachers([...teachers, newTeacher]);
    addLog('إضافة مدرس', `تم إضافة مدرس جديد: ${newTeacher.name}`, 'SYSTEM');
    notify('تم إضافة المدرس بنجاح', 'SUCCESS');

    setShowAddTeacher(false);
    setTName('');
    setTPhone('');
  };

  
  
  
  const handleDeleteTeacherFile = (teacher: Teacher) => {
    const ok = window.confirm(
      `⚠️ تحذير!\nهل أنت متأكد من حذف ملف المدرس "${teacher.name}" نهائيًا؟\nسيتم حذف:\n- ملف المدرس\n- جميع المذكرات الخاصة به\n- سجل الحركات بالكامل`
    );
    if (!ok) return;

    onDeleteTeacherCompletely(teacher.id);
    setSelectedTeacherId(null);
  };

  
  
  
  const handlePrintTeacherReport = async (teacher: Teacher) => {
    const notes = aggregate(teacher, 'NOTES');
    const debt = aggregate(teacher, 'DEBT');

    const toAggTable = (title: string, byService: Record<string, number>) => {
      const rows = Object.entries(byService).sort((a, b) => b[1] - a[1]);
      if (!rows.length) {
        return `<div class="empty">لا يوجد بيانات.</div>`;
      }
      return `
        <div class="section-title">${title}</div>
        <table class="tbl">
          <thead><tr><th>الصنف</th><th style="width:160px;text-align:center;">إجمالي العدد</th></tr></thead>
          <tbody>
            ${rows
              .map(
                ([name, qty]) => `
              <tr>
                <td>${name}</td>
                <td style="text-align:center;font-weight:900;">${qty}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    };

    const toDailyBlocks = (title: string, byDay: Record<string, Record<string, number>>) => {
      const days = Object.keys(byDay);
      if (!days.length) return `<div class="empty">لا يوجد بيانات يومية.</div>`;

      return `
        <div class="section-title">${title}</div>
        ${days
          .map((day) => {
            const rows = Object.entries(byDay[day]).sort((a, b) => b[1] - a[1]);
            const dayTotal = rows.reduce((acc, [, q]) => acc + q, 0);
            return `
            <div class="daybox">
              <div class="dayheader">
                <div>${day}</div>
                <div>إجمالي اليوم: ${dayTotal}</div>
              </div>
              <table class="tbl mini">
                <thead><tr><th>الصنف</th><th style="width:120px;text-align:center;">العدد</th></tr></thead>
                <tbody>
                  ${rows
                    .map(
                      ([name, qty]) => `
                    <tr><td>${name}</td><td style="text-align:center;font-weight:900;">${qty}</td></tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `;
          })
          .join('')}
      `;
    };

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>تقرير المدرس - ${teacher.name}</title>
        <style>
          @page{ size:A4; margin:10mm; }
          body{ font-family: Arial, sans-serif; color:#111; }
          .header{ border-bottom:2px solid #8000FF; padding-bottom:10px; margin-bottom:16px; display:flex; justify-content:space-between; }
          .title{ font-size:22px; font-weight:900; color:#8000FF; }
          .sub{ font-size:12px; font-weight:800; color:#666; margin-top:4px; }
          .badge{ display:inline-block; background:#8000FF10; color:#8000FF; padding:6px 12px; border-radius:999px; font-weight:900; font-size:11px; }
          .grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
          .card{ border:1px solid #eee; border-radius:14px; padding:12px; }
          .card h3{ margin:0; font-size:13px; font-weight:900; color:#444; }
          .big{ font-weight:900; font-size:24px; margin-top:10px; }
          .section{ border:1px solid #eee; border-radius:16px; padding:14px; margin-top:14px; }
          .section-title{ font-weight:900; margin:10px 0; }
          .tbl{ width:100%; border-collapse:collapse; margin-top:6px; }
          .tbl th,.tbl td{ border:1px solid #ddd; padding:8px; font-size:12px; }
          .tbl th{ background:#f7f7f7; }
          .daybox{ border:1px solid #eee; border-radius:14px; padding:10px; margin-top:10px; }
          .dayheader{ display:flex; justify-content:space-between; font-weight:900; font-size:12px; margin-bottom:8px; }
          .empty{ padding:10px; font-size:12px; font-weight:900; color:#777; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">تقرير المدرس: ${teacher.name}</div>
            <div class="sub">التقرير مبني على “الأعداد” (بدون فلوس)</div>
          </div>
          <div style="text-align:left;">
            <div class="badge">شؤون المدرسين</div>
            <div style="margin-top:8px;font-weight:900;font-size:12px;color:#555;">${new Date().toLocaleString(
              'ar-EG'
            )}</div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h3>إجمالي المذكرات المباعة</h3>
            <div class="big">${notes.totalQty}</div>
          </div>
          <div class="card">
            <h3>إجمالي مديونية المدرس (آجل)</h3>
            <div class="big">${debt.totalQty}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title" style="color:#0f766e;">أولاً: المذكرات المباعة (NOTES)</div>
          ${toAggTable("تجميع كامل لكل صنف (كل الأيام)", notes.byService)}
          ${toDailyBlocks("تجميع يومي", notes.byDay)}
        </div>

        <div class="section">
          <div class="section-title" style="color:#b45309;">ثانياً: مديونية المدرس (DEBT)</div>
          ${toAggTable("تجميع كامل لكل صنف (كل الأيام)", debt.byService)}
          ${toDailyBlocks("تجميع يومي", debt.byDay)}
        </div>
      </body>
      </html>
    `;

    await printHtml({ html, title: `teacher-report-${teacher.name}` });
  };

  
  
  
  const openTeacherServices = (teacher: Teacher) => {
    setSelectedTeacherForServices(teacher);
    setEditingTeacherService(null);
    setNewServiceName('');
    setNewServicePrice('');
  };

  const handleAddOrUpdateServiceToTeacher = () => {
    if (!selectedTeacherForServices) return;

    if (!newServiceName.trim() || newServicePrice === '') {
      notify('يرجى إدخال اسم المذكرة والسعر', 'WARNING');
      return;
    }

    const updatedTeachers = teachers.map(t => {
      if (t.id !== selectedTeacherForServices.id) return t;

      const servicesList = t.services || [];

      
      if (editingTeacherService) {
        return {
          ...t,
          services: servicesList.map(s =>
            s.id === editingTeacherService.id
              ? { ...s, name: newServiceName.trim(), price: Number(newServicePrice) }
              : s
          )
        };
      }

      
      const newService: Service = {
        id: Date.now().toString(),
        name: newServiceName.trim(),
        price: Number(newServicePrice),
        category: 'Other'
      };

      return { ...t, services: [...servicesList, newService] };
    });

    onUpdateTeachers(updatedTeachers);

    notify(editingTeacherService ? 'تم تعديل المذكرة بنجاح' : 'تم إضافة المذكرة بنجاح', 'SUCCESS');
    addLog(
      'تعديل مذكرات مدرس',
      `تم ${editingTeacherService ? 'تعديل' : 'إضافة'} مذكرة للمدرس: ${selectedTeacherForServices.name}`,
      'SYSTEM'
    );

    setEditingTeacherService(null);
    setNewServiceName('');
    setNewServicePrice('');
  };

  const handleDeleteTeacherService = (serviceId: string) => {
    if (!selectedTeacherForServices) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه المذكرة؟')) return;

    const updatedTeachers = teachers.map(t => {
      if (t.id !== selectedTeacherForServices.id) return t;
      return { ...t, services: (t.services || []).filter(s => s.id !== serviceId) };
    });

    onUpdateTeachers(updatedTeachers);
    notify('تم حذف المذكرة بنجاح', 'SUCCESS');
  };

  const renderAggRows = (byService: Record<string, number>, emptyText: string) => {
    const rows = Object.entries(byService).sort((a, b) => b[1] - a[1]);
    if (!rows.length) {
      return <div className="text-sm text-gray-500 font-bold mt-3">{emptyText}</div>;
    }

    return (
      <div className="mt-3 space-y-2">
        {rows.map(([name, qty]) => (
          <div key={name} className="bg-white rounded-xl border border-gray-100 p-3 flex justify-between items-center">
            <div className="font-black text-gray-900">{name}</div>
            <div className="font-black text-[#8000FF]">{qty} عدد</div>
          </div>
        ))}
      </div>
    );
  };

  const renderDailyAgg = (byDay: Record<string, Record<string, number>>, emptyText: string) => {
    const days = Object.keys(byDay);
    if (!days.length) {
      return <div className="text-sm text-gray-500 font-bold mt-3">{emptyText}</div>;
    }

    return (
      <div className="mt-3 space-y-4">
        {days.map(day => {
          const rows = Object.entries(byDay[day]).sort((a, b) => b[1] - a[1]);
          const dayTotal = rows.reduce((acc, [, q]) => acc + q, 0);

          return (
            <div key={day} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex justify-between items-center">
                <div className="font-black text-gray-900">{day}</div>
                <div className="text-xs font-black text-gray-500">إجمالي اليوم: {dayTotal}</div>
              </div>
              <div className="mt-3 space-y-2">
                {rows.map(([name, qty]) => (
                  <div key={`${day}-${name}`} className="bg-gray-50 rounded-xl border border-gray-100 p-3 flex justify-between">
                    <div className="font-black text-gray-800">{name}</div>
                    <div className="font-black text-[#8000FF]">{qty} عدد</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 text-right">
      {}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[#8000FF] font-black text-2xl">
          {ICONS.Teachers}
          <span>شؤون المدرسين</span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddTeacher(true)}
          className="bg-[#8000FF] text-white px-5 py-3 rounded-xl font-black text-sm hover:bg-[#6c00d9] transition-colors flex items-center gap-2"
        >
          {ICONS.Plus}
          إضافة مدرس جديد
        </button>
      </div>

      {}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-sm font-black text-gray-700 whitespace-nowrap">
            بحث باسم المدرس:
          </div>

          <input
            value={searchTeacher}
            onChange={(e) => setSearchTeacher(e.target.value)}
            placeholder="اكتب اسم المدرس..."
            className="flex-1 min-w-[220px] px-4 py-3 bg-gray-50 rounded-xl font-black outline-none border-2 border-transparent focus:border-[#8000FF]"
          />

          {searchTeacher.trim() && (
            <button
              type="button"
              onClick={() => setSearchTeacher('')}
              className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 font-black text-sm hover:bg-gray-200 transition-colors"
            >
              مسح
            </button>
          )}
        </div>

        <div className="mt-2 text-xs font-black text-gray-500">
          النتائج: {filteredTeachers.length} / {teachers.length}
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map(teacher => {
          const notes = aggregate(teacher, 'NOTES');
          const debt = aggregate(teacher, 'DEBT');

          return (
            <div
              key={teacher.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all ${
                selectedTeacherId === teacher.id ? 'border-[#8000FF]' : 'border-gray-100'
              }`}
            >
              <button
                className="w-full text-right"
                onClick={() => {
                  setSelectedTeacherId(teacher.id);
                  setViewFilter('ALL');
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-gray-900">{teacher.name}</div>
                    <div className="text-[11px] text-gray-400 font-bold mt-1">{teacher.phone || '—'}</div>
                  </div>
                  <div className="px-3 py-1 rounded-full text-[10px] font-black bg-[#8000FF]/10 text-[#8000FF]">
                    مدرس
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-500">إجمالي المذكرات المباعة</span>
                    <span className="text-gray-900">{notes.totalQty}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-500">مديونية مدرس (آجل)</span>
                    <span className="text-orange-600 font-black">{debt.totalQty}</span>
                  </div>
                </div>
              </button>

              {}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => openTeacherServices(teacher)}
                  className="flex-1 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-black text-xs hover:bg-gray-200 transition-colors"
                >
                  إدارة المذكرات
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteTeacherFile(teacher)}
                  className="px-3 py-2 rounded-xl bg-red-50 text-red-600 font-black text-xs hover:bg-red-100 transition-colors"
                >
                  حذف
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {}
      {selectedTeacher && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xl font-black text-gray-900">
              كشف حساب: <span className="text-[#8000FF]">{selectedTeacher.name}</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handlePrintTeacherReport(selectedTeacher)}
                className="px-4 py-2 rounded-xl bg-[#8000FF] text-white font-black text-xs hover:bg-[#6c00d9] transition-colors flex items-center gap-2"
              >
                {ICONS.Print}
                طباعة تقرير المدرس
              </button>

              <button
                type="button"
                onClick={() => handleDeleteTeacherFile(selectedTeacher)}
                className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-black text-xs hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                {ICONS.Trash}
                حذف ملف المدرس
              </button>

              <button
                type="button"
                onClick={() => setSelectedTeacherId(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-black text-xs hover:bg-gray-200 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>

          {}
          <div className="mt-4 flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setViewFilter('ALL')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                viewFilter === 'ALL' ? 'bg-[#8000FF] text-white shadow' : 'text-gray-600'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('NOTES')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                viewFilter === 'NOTES' ? 'bg-green-600 text-white shadow' : 'text-gray-600'
              }`}
            >
              مذكرات
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('DEBT')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                viewFilter === 'DEBT' ? 'bg-orange-600 text-white shadow' : 'text-gray-600'
              }`}
            >
              مديونية مدرس
            </button>
          </div>

          {(() => {
            const notes = aggregate(selectedTeacher, 'NOTES');
            const debt = aggregate(selectedTeacher, 'DEBT');

            return (
              <>
                {(viewFilter === 'ALL' || viewFilter === 'NOTES') && (
                  <div className="mt-6 rounded-2xl border border-green-100 bg-green-50/40 p-5">
                    <div className="flex items-center justify-between">
                      <div className="font-black text-green-700 flex items-center gap-2">
                        {ICONS.FileText}
                        <span>المذكرات المباعة</span>
                      </div>
                      <div className="text-[11px] font-black text-green-700">
                        إجمالي الأعداد: {notes.totalQty}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-black text-gray-600">تجميع كامل (كل الأيام)</div>
                      {renderAggRows(notes.byService, 'لا توجد مذكرات مباعة بعد.')}
                    </div>

                    <div className="mt-6">
                      <div className="text-xs font-black text-gray-600">تجميع يومي</div>
                      {renderDailyAgg(notes.byDay, 'لا توجد بيانات يومية للمذكرات.')}
                    </div>
                  </div>
                )}

                {(viewFilter === 'ALL' || viewFilter === 'DEBT') && (
                  <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/40 p-5">
                    <div className="flex items-center justify-between">
                      <div className="font-black text-orange-700 flex items-center gap-2">
                        {ICONS.Warning}
                        <span>مديونية المدرس</span>
                      </div>
                      <div className="text-[11px] font-black text-orange-700">
                        إجمالي القطع: {debt.totalQty}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-black text-gray-600">تجميع كامل (كل الأيام)</div>
                      {renderAggRows(debt.byService, 'لا توجد مديونية مدرس مسجلة.')}
                    </div>

                    <div className="mt-6">
                      <div className="text-xs font-black text-gray-600">تجميع يومي</div>
                      {renderDailyAgg(debt.byDay, 'لا توجد بيانات يومية للمديونية.')}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {}
          <div className="mt-6">
            <div className="font-black text-gray-700 mb-3">سجل الحركات (للحذف عند الحاجة)</div>
            <div className="space-y-2">
              {(selectedTeacher.history || []).map((h: any, idx: number) => {
                if (viewFilter !== 'ALL' && h.entryType !== viewFilter) return null;

                return (
                  <div
                    key={idx}
                    className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 flex justify-between items-center"
                  >
                    <div className="flex flex-col">
                      <div className="font-black text-gray-900">
                        {h.serviceName}{' '}
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full mr-2 ${
                            h.entryType === 'NOTES' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {h.entryType === 'NOTES' ? 'مذكرات' : 'مديونية مدرس'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 font-bold">
                        تاريخ: {formatDate(h.date)} — كمية: {h.quantity}
                        {h.entryType === 'DEBT' && h.ownerTeacherName ? ` — صاحب المذكرة: ${h.ownerTeacherName}` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateTeachers(
                          teachers.map(t => {
                            if (t.id !== selectedTeacher.id) return t;
                            const newHistory = [...(t.history || [])];
                            newHistory.splice(idx, 1);
                            return { ...t, history: newHistory };
                          })
                        );

                        addLog('حذف حركة مدرس', 'تم حذف حركة من كشف حساب المدرس', 'SYSTEM');
                        notify('تم حذف الحركة بنجاح', 'SUCCESS');
                      }}
                      className="px-3 py-2 rounded-xl bg-red-50 text-red-600 font-black text-xs hover:bg-red-100 transition-colors"
                    >
                      حذف
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {}
      {showAddTeacher && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-right">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 bg-[#8000FF] text-white">
              <h3 className="text-2xl font-black">إضافة مدرس جديد</h3>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">اسم المدرس</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#8000FF] focus:bg-white rounded-2xl text-right font-black outline-none"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">رقم الهاتف (اختياري)</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#8000FF] focus:bg-white rounded-2xl text-right font-black outline-none"
                  value={tPhone}
                  onChange={(e) => setTPhone(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleAddTeacher}
                  className="flex-[2] bg-[#8000FF] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-[#8000FF]/20"
                >
                  تأكيد
                </button>
                <button
                  onClick={() => setShowAddTeacher(false)}
                  className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {selectedTeacherForServices && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-right">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 bg-[#8000FF] text-white flex justify-between items-center">
              <div className="text-xl font-black">
                إدارة مذكرات: {selectedTeacherForServices.name}
              </div>
              <button
                onClick={() => setSelectedTeacherForServices(null)}
                className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl font-black text-sm"
              >
                إغلاق
              </button>
            </div>

            <div className="p-6 space-y-5">
              {}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  placeholder="اسم المذكرة"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="px-4 py-3 bg-gray-50 rounded-xl font-black outline-none border-2 border-transparent focus:border-[#8000FF]"
                />
                <input
                  placeholder="السعر (ج.م)"
                  type="number"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="px-4 py-3 bg-gray-50 rounded-xl font-black outline-none border-2 border-transparent focus:border-[#8000FF] text-center"
                />
                <button
                  onClick={handleAddOrUpdateServiceToTeacher}
                  className="bg-[#8000FF] hover:bg-[#6c00d9] text-white rounded-xl font-black"
                >
                  {editingTeacherService ? 'تعديل المذكرة' : 'إضافة مذكرة'}
                </button>
              </div>

              {}
              <div className="space-y-2">
                {(selectedTeacherForServices.services || []).length === 0 ? (
                  <div className="text-sm text-gray-500 font-black">لا يوجد مذكرات لهذا المدرس.</div>
                ) : (
                  (selectedTeacherForServices.services || []).map((s) => (
                    <div
                      key={s.id}
                      className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-black text-gray-900">{s.name}</div>
                        <div className="text-xs font-black text-gray-500 mt-1">
                          السعر في المبيعات: {Number(s.price || 0).toLocaleString()} ج.م
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTeacherService(s);
                            setNewServiceName(s.name);
                            setNewServicePrice(Number(s.price || 0));
                          }}
                          className="px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm text-blue-600 font-black text-xs hover:bg-blue-50"
                        >
                          تعديل
                        </button>

                        <button
                          onClick={() => handleDeleteTeacherService(s.id)}
                          className="px-3 py-2 rounded-xl bg-red-50 text-red-600 font-black text-xs hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="text-[11px] font-black text-gray-500">
                ملحوظة: سعر المذكرة يظهر في صفحة المبيعات للطلاب، لكن لا يتم احتسابه كفلوس/مديونية على المدرس، فقط “أعداد”.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
