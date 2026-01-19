import logo from '../assets/logo.png';
import React, { useState, useMemo } from 'react';
import { Service, Invoice, InvoiceItem, UserRole, ClientDebt, Teacher } from '../types';
import { ICONS } from '../constants';
import { printHtml } from '../utils/printService';

interface SalesProps {
  services: Service[];
  invoices: Invoice[];
  debts: ClientDebt[];
  teachers: Teacher[];
  notify: (msg: string, type?: 'SUCCESS' | 'WARNING' | 'ERROR') => void;
  onAddInvoice: (invoice: Invoice, isDebt: boolean, isTeacherDebt: boolean) => void;
  onUpdateInvoiceStatus: (id: string, status: 'PAID' | 'RETURNED') => void;
  onPartialReturnInvoice: (invoiceId: string, returnedItems: { serviceId: string; quantity: number }[]) => void;
  onDeleteInvoice: (id: string) => void;
  onAddService: (service: Service) => void;
  onUpdateService: (service: Service) => void;
  onDeleteService: (id: string) => void;
  role: UserRole;
  currentUser?: { username: string } | null;
}

const Sales: React.FC<SalesProps> = ({
  services,
  invoices,
  debts,
  teachers,
  notify,
  onAddInvoice,
  onUpdateInvoiceStatus,
  onPartialReturnInvoice,
  onDeleteInvoice,
  onAddService,
  onUpdateService,
  onDeleteService,
  role,
  currentUser
}) => {
  const getEgyptISOString = () => {
    
    
    const dt = new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' });
    return dt.replace(' ', 'T');
  };
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [returnProcessingMap, setReturnProcessingMap] = useState<Record<string, boolean>>({});

  const safeReturnAction = (invoiceId: string, fn: () => void) => {
    if (returnProcessingMap[invoiceId]) return;
    setReturnProcessingMap(prev => ({ ...prev, [invoiceId]: true }));
    try {
      fn();
    } finally {
      setTimeout(() => {
        setReturnProcessingMap(prev => ({ ...prev, [invoiceId]: false }));
      }, 600);
    }
  };

  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('FIXED');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [isDebtPayment, setIsDebtPayment] = useState(false);
  const [isTeacherDebt, setIsTeacherDebt] = useState(false);
  const [selectedTeacherForDebt, setSelectedTeacherForDebt] = useState<Teacher | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [sName, setSName] = useState('');
  const [sPrice, setSPrice] = useState<number | ''>('');
  const [sCategory, setSCategory] = useState<Service['category']>('A4');
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceDateFrom, setInvoiceDateFrom] = useState<string>('');
  const [invoiceDateTo, setInvoiceDateTo] = useState<string>('');
  const [partialReturnInvoice, setPartialReturnInvoice] = useState<Invoice | null>(null);
  const [partialReturnQty, setPartialReturnQty] = useState<Record<string, number>>({});
  const isAdmin = role === UserRole.ADMIN;

  const PARTIAL_RETURN_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 1 1 0 12h-2" />
      <path d="M14 13v-2" />
      <path d="M14 19v-2" />
    </svg>
  );

  const allCustomerNames = useMemo(() => {
    const customers = debts.map(d => ({ name: d.customerName, type: 'DEBT' as const }));
    const teacherCustomers = teachers.map(t => ({ name: t.name, type: 'TEACHER' as const }));
    return [...customers, ...teacherCustomers];
  }, [debts, teachers]);

  const syncTeacherSelectionFromCustomerName = (name: string) => {
    const clean = name.trim().toLowerCase();
    const teacher = teachers.find(t => t.name.trim().toLowerCase() === clean) || null;

    if (teacher && isDebtPayment) {
      setIsTeacherDebt(true);
      setSelectedTeacherForDebt(teacher);
    } else if (teacher && !isDebtPayment) {
      setSelectedTeacherForDebt(teacher);
      setIsTeacherDebt(false);
    } else {
      setIsTeacherDebt(false);
      setSelectedTeacherForDebt(null);
    }
  };

  const selectTeacherFromSection = (teacher: Teacher) => {
    setSelectedTeacherForDebt(teacher);
    setCustomerName(teacher.name);

    if (isDebtPayment) setIsTeacherDebt(true);
    else setIsTeacherDebt(false);

    notify(`تم اختيار المدرس: ${teacher.name}`, 'SUCCESS');
  };

  const clearTeacherSelection = () => {
    setSelectedTeacherForDebt(null);
    setIsTeacherDebt(false);
    notify('تم إلغاء اختيار المدرس', 'SUCCESS');
  };

  const handleOpenServiceModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setSName(service.name);
      setSPrice(service.price);
      setSCategory(service.category);
    } else {
      setEditingService(null);
      setSName('');
      setSPrice('');
      setSCategory('A4');
    }
    setShowServiceModal(true);
  };

  const handleSaveService = () => {
    if (!sName.trim() || sPrice === '') {
      notify('يرجى إدخال اسم الخدمة والسعر', 'WARNING');
      return;
    }

    const newService: Service = {
      id: editingService ? editingService.id : Date.now().toString(),
      name: sName,
      price: Number(sPrice),
      category: sCategory
    };

    if (editingService) {
      onUpdateService(newService);
      notify('تم تحديث الخدمة بنجاح', 'SUCCESS');
    } else {
      onAddService(newService);
      notify('تم إضافة الخدمة بنجاح', 'SUCCESS');
    }

    setShowServiceModal(false);
  };

  const handleDeleteService = (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف "${name}"؟`)) {
      onDeleteService(id);
      notify('تم حذف الخدمة بنجاح', 'SUCCESS');
    }
  };

  const combinedServices = useMemo(() => {
    const teacherServices = teachers.flatMap(teacher =>
      (teacher.services || []).map(service => ({
        ...service,
        teacherId: teacher.id,
        teacherName: teacher.name,
        category: 'Other' as const
      }))
    );

    return [...services, ...teacherServices];
  }, [services, teachers]);

  const filteredServices = combinedServices.filter((s: any) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.teacherName && s.teacherName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addToCart = (service: any) => {
    const teacherDebtMode = isDebtPayment && isTeacherDebt && selectedTeacherForDebt;

    const serviceKey = service.id + (teacherDebtMode ? `__TEACHER_DEBT_${selectedTeacherForDebt?.id}` : '');

    const existingItem = cart.find(item => item.serviceId === serviceKey);
    if (existingItem) {
      updateQuantity(serviceKey, existingItem.quantity + 1);
      return;
    }

    const isTeacherNoteService = Boolean(service.teacherId);
    const shouldRemovePricing = teacherDebtMode && !isTeacherNoteService;

    const pricePerUnit = shouldRemovePricing ? 0 : Number(service.price || 0);

    const newItem: InvoiceItem = {
      serviceId: serviceKey,
      name: service.name,
      quantity: 1,
      pricePerUnit,
      total: pricePerUnit * 1,

      teacherId: isTeacherNoteService
        ? service.teacherId
        : (teacherDebtMode ? selectedTeacherForDebt!.id : undefined),

      teacherName: isTeacherNoteService
        ? service.teacherName
        : (teacherDebtMode ? selectedTeacherForDebt!.name : undefined),
    };

    setCart(prev => [...prev, newItem]);
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) return;
    setCart(prev =>
      prev.map(item =>
        item.serviceId === id
          ? { ...item, quantity: qty, total: item.pricePerUnit * qty }
          : item
      )
    );
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.serviceId !== id));

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const discountVal = discountValue === '' ? 0 : discountValue;

  const discountAmount =
    discountType === 'PERCENT'
      ? (subtotal * discountVal) / 100
      : discountVal;

  const total = Math.max(0, subtotal - discountAmount);

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    const from = invoiceDateFrom ? new Date(invoiceDateFrom + 'T00:00:00').getTime() : null;
    const to = invoiceDateTo ? new Date(invoiceDateTo + 'T23:59:59').getTime() : null;

    return invoices.filter(inv => {
      const invTime = new Date(inv.date).getTime();
      if (from !== null && invTime < from) return false;
      if (to !== null && invTime > to) return false;
      if (!q) return true;
      return inv.id.toLowerCase().includes(q) || (inv.customerName || '').toLowerCase().includes(q);
    });
  }, [invoices, invoiceSearch, invoiceDateFrom, invoiceDateTo]);

  const handleHardDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من الحذف النهائي لهذه الفاتورة؟')) {
      onDeleteInvoice(id);
      notify('تم حذف الفاتورة نهائياً', 'SUCCESS');
    }
  };

  const handleCreateAndPrint = async () => {
    if (cart.length === 0) {
      notify('السلة فارغة', 'WARNING');
      return;
    }

    if (isDebtPayment && !customerName.trim()) {
      notify('يرجى إدخال اسم العميل / المدرس في حالة الآجل', 'WARNING');
      return;
    }

    setIsProcessing(true);

    const today = new Date();
    const prefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const todaysInvoices = invoices.filter(inv => inv.id.startsWith(prefix));
    const nextSeq = todaysInvoices.length + 1;
    const invoiceId = `${prefix}-${String(nextSeq).padStart(3, '0')}`; 
    const itemsForInvoice: InvoiceItem[] = isTeacherDebt && selectedTeacherForDebt
      ? cart.map(i => {
          
          const ownerTeacher = (i as any).teacherId
            ? teachers.find(t => t.id === (i as any).teacherId)
            : null;

          return {
            ...(i as any),
            debtTeacherId: selectedTeacherForDebt.id,
            debtTeacherName: selectedTeacherForDebt.name,
            ownerTeacherName: ownerTeacher?.name || null,
          } as any;
        })
      : cart;

    const newInvoice: Invoice = {
      id: invoiceId,
      date: getEgyptISOString(),
      customerName: customerName || 'عميل نقدي',
      items: itemsForInvoice,
      subtotal,
      discountType,
      discountValue: discountValue === '' ? 0 : discountValue,
      total,
      status: 'PAID',
      isDebt: isDebtPayment,
      cashierName: isAdmin ? 'المدير' : (currentUser?.username || 'كاشير المحل'),
    };

    onAddInvoice(newInvoice, isDebtPayment, isTeacherDebt);
    printInvoice(newInvoice);

    setCart([]);
    setCustomerName('');
    setIsDebtPayment(false);
    setIsTeacherDebt(false);
    setSelectedTeacherForDebt(null);
    setDiscountValue('');
    setIsProcessing(false);

    notify('تم إنشاء الفاتورة بنجاح', 'SUCCESS');
  };

  const printInvoice = async (invoice: Invoice) => {
    const discountAmount = invoice.discountType === 'PERCENT'
      ? (invoice.subtotal * (invoice.discountValue || 0)) / 100
      : (invoice.discountValue || 0);

    const itemsHtml = invoice.items
      .map(item => `
      <tr>
        <td class="item-name">
          ${item.name}
          ${item.teacherName ? `<div class="teacher-tag">[${item.teacherName}]</div>` : ''}
        </td>
        <td class="item-qty">${item.quantity}</td>
        <td class="item-price">${item.total.toLocaleString()}</td>
      </tr>
    `)
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>فاتورة</title>
<style>
  /* ✅ Thermal printer receipt size (80mm) - unified sizing */
  @page { size: 80mm auto; margin: 0; }
  body { font-family: Arial, sans-serif; margin: 0 auto; padding: 4mm 2mm; width: 68mm; }
  .container { padding: 6px; }
  .header { text-align: center; margin-bottom: 10px; }
  .header img { width: 70px; height: 70px; margin-bottom: 6px; }
  .header h2 { margin: 0; font-size: 18px; }
  .header p { margin: 3px 0; font-size: 12px; }
  .info { font-size: 12px; margin-bottom: 10px; }
  .info div { display: flex; justify-content: space-between; margin-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 4px 0; }
  th { border-bottom: 1px dashed #000; font-weight: bold; }
  .item-name { width: 55%; }
  .item-qty { width: 15%; text-align: center; }
  .item-price { width: 30%; text-align: left; }
  .teacher-tag { font-size: 10px; font-weight: 900; color: #8000FF; margin-top: 2px; }
  hr { border: 0; border-top: 1px dashed #000; margin: 10px 0; }
  .total-box { text-align: center; font-weight: bold; margin-top: 10px; }
  .total-box .total-amount { font-size: 18px; }
  .footer { text-align: center; margin-top: 10px; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
<div class="header">
  <img src="${logo}" alt="logo" />
  <h2>سنتر فايف</h2>
  <p>للطباعة والخدمات الطلابية</p>
</div>
<div class="info">
  <div><span>رقم الفاتورة:</span><span>${invoice.id.slice(-6)}</span></div>
  <div><span>التاريخ:</span><span>${new Date(invoice.date).toLocaleString('ar-EG')}</span></div>
  <div><span>الكاشير:</span><span>${invoice.cashierName || '-'}</span></div>
</div>
<table>
<thead>
<tr><th>الصنف</th><th style="text-align:center;">كمية</th><th style="text-align:left;">إجمالي</th></tr>
</thead>
<tbody>
${itemsHtml}
</tbody>
</table>
<hr/>
<div class="total-box">
  ${(invoice.discountValue && invoice.discountValue > 0) ? `
    <div style="font-size:12px;color:#666;">قبل الخصم: ${invoice.subtotal.toLocaleString()} ج.م</div>
    <div style="font-size:12px;color:#10b981;font-weight:900;">
      خصم: -${discountAmount.toLocaleString()} ج.م
    </div>
  ` : ''}
  <div>إجمالي المطلوب</div>
  <div class="total-amount">${invoice.total.toLocaleString()} ج.م</div>
</div>
<div class="footer">
  ${invoice.isDebt ? '<div style="font-weight:900;">حالة الدفع: آجل</div>' : ''}
  <div>شكراً لتعاملكم معنا</div>
</div>
</div>
</body>
</html>
    `;

    await printHtml({ html: htmlContent, title: 'invoice' });
  };

  return (
    <div className="space-y-6 text-right">
      <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit no-print">
        <button onClick={() => setActiveTab('NEW')} className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'NEW' ? 'bg-[#8000FF] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
          {ICONS.Plus}<span>فاتورة جديدة</span>
        </button>
        <button onClick={() => setActiveTab('HISTORY')} className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-[#8000FF] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
          {ICONS.Dashboard}<span>سجل الفواتير</span>
        </button>
      </div>

      {activeTab === 'NEW' ? (
        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-260px)] no-print">
          {}
          <div className="lg:w-2/3 flex flex-col">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col gap-6 overflow-hidden">
              <div className="flex gap-4 items-center w-full">
                <div className="relative flex-1 text-right">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{ICONS.Search}</span>
                  <input
                    type="text"
                    placeholder="البحث في الخدمات أو المدرسين..."
                    className="w-full pr-12 pl-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#8000FF]/20 text-right font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleOpenServiceModal()}
                    className="bg-[#8000FF] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#6c00d9] transition-all whitespace-nowrap shadow-lg shadow-[#8000FF]/20"
                  >
                    {ICONS.Plus}<span>إضافة صنف عام</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2">
                {filteredServices.map((service: any) => (
                  <div
                    key={service.id + (service.teacherId || '')}
                    className={`relative group bg-gray-50 rounded-2xl border-2 transition-all overflow-hidden shadow-sm hover:shadow-md ${service.teacherId ? 'border-dashed border-gray-200' : 'border-transparent'} hover:border-[#8000FF]`}
                  >
                    {isAdmin && !service.teacherId && (
                      <div className="absolute top-2 left-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleOpenServiceModal(service); }} className="p-1.5 bg-white text-blue-500 rounded-lg shadow-sm hover:bg-blue-50 transition-colors">{ICONS.Settings}</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id, service.name); }} className="p-1.5 bg-white text-red-500 rounded-lg shadow-sm hover:bg-red-50 transition-colors">{ICONS.Trash}</button>
                      </div>
                    )}

                    <div className="p-4 cursor-pointer" onClick={() => addToCart(service)}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#8000FF] group-hover:bg-[#8000FF] group-hover:text-white transition-colors shadow-sm">{ICONS.Plus}</div>
                        {service.teacherId ? (
                          <span className="text-[10px] bg-[#FFD700] text-gray-900 px-2 py-1 rounded-full font-black flex items-center gap-1">
                            {ICONS.Teachers} {service.teacherName}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-white px-2 py-1 rounded-full font-bold text-gray-400 border border-gray-100 uppercase">{service.category}</span>
                        )}
                      </div>

                      <h4 className="font-bold text-gray-800 mb-1 truncate">{service.name}</h4>

                      <p className="text-lg font-black text-[#8000FF]">
                        {(isDebtPayment && isTeacherDebt && selectedTeacherForDebt && !service.teacherId)
                          ? `—`
                          : `${Number(service.price || 0).toLocaleString()} ج.م`
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-[#8000FF]/5 text-right font-bold text-xl text-[#8000FF] flex items-center gap-2">
                {ICONS.Sales}<span>الفاتورة الحالية</span>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                {}
                {teachers.length > 0 && (
                  <div className="mb-4 bg-white border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-black text-[#8000FF] flex items-center gap-2">
                        {ICONS.Teachers}
                        <span>اختيار مدرس</span>
                      </div>

                      {selectedTeacherForDebt && (
                        <button
                          type="button"
                          onClick={() => {
                            clearTeacherSelection();
                          }}
                          className="text-xs font-black px-3 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          مسح
                        </button>
                      )}
                    </div>

                    {selectedTeacherForDebt ? (
                      <div className="mb-3 bg-[#8000FF]/10 border border-[#8000FF]/15 rounded-2xl px-4 py-3">
                        <div className="text-[11px] text-gray-600 font-black mb-1">المدرس المختار</div>
                        <div className="flex items-center justify-between">
                          <div className="font-black text-gray-900 text-sm truncate">
                            {selectedTeacherForDebt.name}
                          </div>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                            isDebtPayment ? 'bg-[#FFD700] text-gray-900' : 'bg-white text-[#8000FF]'
                          }`}>
                            {isDebtPayment ? 'آجل' : 'نقدي'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3 text-[11px] text-gray-500 font-bold">
                        اختر مدرس، ثم اختر (نقدي) أو (آجل).
                      </div>
                    )}

                    {}
                    <select
                      value={selectedTeacherForDebt?.id || ''}
                      onChange={(e) => {
                        const teacherId = e.target.value;
                        if (!teacherId) {
                          clearTeacherSelection();
                          return;
                        }
                        const teacher = teachers.find(t => t.id === teacherId);
                        if (teacher) selectTeacherFromSection(teacher);
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#8000FF]/20"
                    >
                      <option value="">-- اختر مدرس --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {}
                <div className="mb-4 text-right">
                  <label className="block text-sm font-bold text-gray-600 mb-2">اسم العميل</label>
                  <input
                    type="text"
                    list="all-customers-list"
                    placeholder={isDebtPayment ? "اختر اسم العميل أو المدرس" : "اسم العميل (اختياري)"}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#8000FF]/20 text-right font-bold"
                    value={customerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerName(val);
                      syncTeacherSelectionFromCustomerName(val);
                    }}
                  />
                  <datalist id="all-customers-list">
                    {allCustomerNames.map((c, idx) => (
                      <option key={idx} value={c.name}>
                        {c.type === 'TEACHER' ? 'مدرس' : 'عميل مديونية'}
                      </option>
                    ))}
                  </datalist>
                </div>

                {}
                <div className="mb-4 text-right">
                  <label className="block text-sm font-bold text-gray-600 mb-2">خصم على الفاتورة (اختياري)</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="قيمة الخصم"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#8000FF]/20 text-right font-bold"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setDiscountType('FIXED')}
                        className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${
                          discountType === 'FIXED' ? 'bg-[#8000FF] text-white shadow-md' : 'text-gray-500'
                        }`}
                      >
                        ج.م
                      </button>

                      <button
                        type="button"
                        onClick={() => setDiscountType('PERCENT')}
                        className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${
                          discountType === 'PERCENT' ? 'bg-[#8000FF] text-white shadow-md' : 'text-gray-500'
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  {(discountVal > 0) && (
                    <p className="text-xs text-green-600 mt-1 font-bold">
                      الخصم المطبق: {discountAmount.toLocaleString()} ج.م
                    </p>
                  )}
                </div>

                {}
                <div className="flex flex-col gap-2 mb-6 no-print">
                  <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
                    {}
                    <button
                      onClick={() => {
                        setIsDebtPayment(false);
                        setIsTeacherDebt(false);

                        
                        if (selectedTeacherForDebt) {
                          setCustomerName(selectedTeacherForDebt.name);
                          notify('تم تفعيل: نقدي (مدرس)', 'SUCCESS');
                        }
                      }}
                      className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${!isDebtPayment ? 'bg-[#8000FF] text-white shadow-md' : 'text-gray-500'}`}
                    >
                      نقدي
                    </button>

                    {}
                    <button
                      onClick={() => {
                        setIsDebtPayment(true);

                        
                        if (selectedTeacherForDebt) {
                          setIsTeacherDebt(true);
                          setCustomerName(selectedTeacherForDebt.name);
                          notify('تم تفعيل: آجل (مديونية مدرس)', 'SUCCESS');
                        } else {
                          syncTeacherSelectionFromCustomerName(customerName);
                        }
                      }}
                      className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${isDebtPayment ? 'bg-[#FFD700] text-gray-900 shadow-md' : 'text-gray-500'}`}
                    >
                      آجل
                    </button>
                  </div>

                  {(isDebtPayment && isTeacherDebt && selectedTeacherForDebt) && (
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                      <div className="text-orange-700 font-black text-sm flex items-center gap-2">
                        {ICONS.Warning}
                        <span>مديونية مدرس</span>
                      </div>
                      <div className="text-[11px] text-orange-700 font-bold mt-1">
                        سيتم تسجيل الخدمات العامة داخل ملف المدرس: {selectedTeacherForDebt.name}
                      </div>
                    </div>
                  )}
                </div>

                {}
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.serviceId} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl text-right animate-slide-up">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 text-sm">{item.name}</span>

                          {item.teacherId && (
                            <span className="text-[10px] text-gray-500 font-black">
                              {item.teacherName ? `[${item.teacherName}]` : ''}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.serviceId)}
                          className="text-red-400 p-1 hover:bg-red-50 rounded-md transition-colors"
                        >
                          {ICONS.Trash}
                        </button>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <button onClick={() => updateQuantity(item.serviceId, item.quantity + 1)} className="px-3 py-1 text-[#8000FF] font-black hover:bg-gray-50">+</button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.serviceId, parseInt(e.target.value || '1'))}
                            className="w-12 text-center font-black text-[#8000FF] bg-transparent outline-none"
                          />
                          <button onClick={() => updateQuantity(item.serviceId, item.quantity - 1)} className="px-3 py-1 text-gray-400 font-black hover:bg-gray-50">-</button>
                        </div>

                        <span className="font-bold text-[#8000FF]">{item.total.toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {}
              <div className="p-6 bg-gray-50 space-y-4 border-t border-gray-100 text-right">
                <div className="flex justify-between font-black text-xl text-[#8000FF]">
                  <span>المطلوب:</span>
                  <span>{total.toLocaleString()} ج.م</span>
                </div>

                <button
                  onClick={handleCreateAndPrint}
                  disabled={isProcessing}
                  className={`w-full ${isDebtPayment ? 'bg-[#FFD700] text-gray-900' : 'bg-[#8000FF] text-white'} py-4 rounded-xl font-black text-lg shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all`}
                >
                  {isProcessing ? 'جاري المعالجة...' : <><span className="shrink-0">{ICONS.Print}</span><span>حفظ وطباعة الفاتورة</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-right">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-black text-gray-400 mr-2">بحث في سجل الفواتير</label>
                <input
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="ابحث باسم العميل أو رقم الفاتورة..."
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#8000FF] focus:bg-white rounded-2xl text-right font-bold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 mr-2">من</label>
                <input
                  type="date"
                  value={invoiceDateFrom}
                  onChange={(e) => setInvoiceDateFrom(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#8000FF] focus:bg-white rounded-2xl text-right font-bold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 mr-2">إلى</label>
                <input
                  type="date"
                  value={invoiceDateTo}
                  onChange={(e) => setInvoiceDateTo(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#8000FF] focus:bg-white rounded-2xl text-right font-bold outline-none"
                />
              </div>

              <div className="md:col-span-4 flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setInvoiceSearch(''); setInvoiceDateFrom(''); setInvoiceDateTo(''); }}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-black text-xs hover:bg-gray-200 transition-colors"
                >
                  مسح الفلاتر
                </button>
                <div className="px-4 py-2 rounded-xl bg-[#8000FF]/10 text-[#8000FF] font-black text-xs">
                  إجمالي النتائج: {filteredInvoices.length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-500 text-sm font-bold border-b">
                <tr>
                  <th className="p-4">رقم الفاتورة</th>
                  <th className="p-4">التاريخ والوقت</th>
                  <th className="p-4">العميل</th>
                  <th className="p-4">الكاشير</th>
                  <th className="p-4 text-center">النوع</th>
                  <th className="p-4">المبلغ</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${inv.status === 'RETURNED' ? 'bg-red-50/50' : ''}`}>
                    <td className="p-4 font-bold text-[#8000FF]">#{inv.id}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-600">{new Date(inv.date).toLocaleDateString('ar-EG')}</span>
                        <span className="text-[10px] text-gray-400 font-bold">{new Date(inv.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="p-4 font-bold">{inv.customerName}</td>
                    <td className="p-4 font-black text-gray-700">{inv.cashierName || '-'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${inv.isDebt ? 'bg-[#FFD700] text-gray-900' : 'bg-[#8000FF] text-white'}`}>
                        {inv.isDebt ? 'آجل' : 'نقدي'}
                      </span>
                    </td>
                    <td className="p-4 font-black">{inv.total.toLocaleString()} ج.م</td>
                    <td className="p-4 flex justify-center gap-2">
                      <button onClick={() => printInvoice(inv)} title="طباعة" className="p-2 bg-white text-[#8000FF] rounded-lg border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors">{ICONS.Print}</button>
                      {inv.status !== 'RETURNED' && (
                        <>
                          <button
                            onClick={() => safeReturnAction(inv.id, () => onUpdateInvoiceStatus(inv.id, 'RETURNED'))}
                            title="مرتجع كامل"
                            className="p-2 bg-white text-orange-500 rounded-lg border border-gray-100 shadow-sm hover:bg-orange-50 transition-colors"
                          >
                            {ICONS.History}
                          </button>

                          <button
                            onClick={() => safeReturnAction(inv.id, () => {
                              setPartialReturnInvoice(inv);
                              const init: Record<string, number> = {};
                              (inv.items || []).forEach(it => { init[it.serviceId] = 0; });
                              setPartialReturnQty(init);
                            })}
                            title="مرتجع جزئي"
                            className="p-2 bg-white text-red-600 rounded-lg border border-gray-100 shadow-sm hover:bg-red-50 transition-colors"
                          >
                            {PARTIAL_RETURN_ICON}
                          </button>
                        </>
                      )}
                      {isAdmin && <button type="button" onClick={() => handleHardDelete(inv.id)} title="حذف نهائي" className="p-2 bg-white text-red-500 rounded-lg border border-gray-100 shadow-sm hover:bg-red-50 transition-colors">{ICONS.Trash}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {}
      {partialReturnInvoice && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-right">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 bg-red-600 text-white flex justify-between items-center">
              <div className="text-lg font-black">مرتجع جزئي — فاتورة #{partialReturnInvoice.id}</div>
              <button
                type="button"
                onClick={() => setPartialReturnInvoice(null)}
                className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl font-black text-sm"
              >
                إغلاق
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm font-black text-gray-700">
                اختر الأصناف والكميات التي تريد إرجاعها (يمكن إرجاع جزء من الفاتورة فقط).
              </div>

              <div className="space-y-3">
                {(partialReturnInvoice.items || []).map(it => (
                  <div key={it.serviceId} className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-black text-gray-900">{it.name}</div>
                      <div className="text-xs font-black text-gray-500 mt-1">
                        الكمية بالفاتورة: {it.quantity} — السعر: {Number(it.pricePerUnit || 0).toLocaleString()} ج.م
                      </div>
                    </div>

                    <input
                      type="number"
                      min={0}
                      max={it.quantity}
                      value={partialReturnQty[it.serviceId] ?? 0}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        setPartialReturnQty(prev => ({ ...prev, [it.serviceId]: Math.max(0, Math.min(it.quantity, v)) }));
                      }}
                      className="w-28 text-center px-3 py-2 rounded-xl bg-white border-2 border-transparent focus:border-red-600 font-black outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const items = Object.entries(partialReturnQty)
                      .map(([serviceId, quantity]) => ({ serviceId, quantity: Number(quantity || 0) }))
                      .filter(x => x.quantity > 0);

                    onPartialReturnInvoice(partialReturnInvoice.id, items);
                    setPartialReturnInvoice(null);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-black"
                >
                  تنفيذ المرتجع الجزئي
                </button>

                <button
                  type="button"
                  onClick={() => setPartialReturnInvoice(null)}
                  className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-2xl font-black"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {showServiceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-right">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-slide-up overflow-hidden text-right">
            <div className="p-8 bg-[#8000FF] text-white">
              <h3 className="text-2xl font-black">{editingService ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد'}</h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">اسم الخدمة</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#8000FF] focus:bg-white rounded-2xl text-right font-black outline-none"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">السعر (ج.م)</label>
                  <input
                    type="number"
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#8000FF] focus:bg-white rounded-2xl text-center font-black outline-none"
                    value={sPrice}
                    onChange={(e) => setSPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">التصنيف</label>
                  <select
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#8000FF] focus:bg-white rounded-2xl text-right font-bold outline-none"
                    value={sCategory}
                    onChange={(e) => setSCategory(e.target.value as any)}
                  >
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Banner">بانر</option>
                    <option value="Other">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSaveService}
                  className="flex-[2] bg-[#8000FF] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-[#8000FF]/20"
                >
                  تأكيد
                </button>
                <button
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
