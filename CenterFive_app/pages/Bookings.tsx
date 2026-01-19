import React, { useMemo, useState } from 'react';
import logo from '../assets/logo.png';
import {
  Booking,
  BookingItem,
  BookingItemType,
  BookingReceipt,
  ExternalBook,
  Teacher,
  UserAccount,
  UserRole,
} from '../types';
import { ICONS } from '../constants';


const getLocalISOString = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString();
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('ar-EG');
};

const generateBookingCode = (existing: Booking[]) => {
  const year = new Date().getFullYear();
  const countThisYear = existing.filter(b => new Date(b.createdAt).getFullYear() === year).length + 1;
  return `BK-${year}-${String(countThisYear).padStart(6, '0')}`;
};

type Props = {
  role: UserRole;
  currentUser: UserAccount | null;
  teachers: Teacher[];
  externalBooks: ExternalBook[];
  bookings: Booking[];
  bookingReceipts: BookingReceipt[];
  onUpdateExternalBooks: (list: ExternalBook[]) => void;
  onUpdateBookings: (list: Booking[]) => void;
  onUpdateBookingReceipts: (list: BookingReceipt[]) => void;
  onUpdateTeachers: (list: Teacher[]) => void;
  notify: (message: string, type: 'SUCCESS' | 'WARNING' | 'ERROR') => void;
  addLog: (action: string, details: string, type?: any) => void;
};

type CounterRow = {
  title: string;
  teacherName?: string;
  qty: number;
};

const Bookings: React.FC<Props> = ({
  role,
  currentUser,
  teachers,
  externalBooks,
  bookings,
  bookingReceipts,
  onUpdateExternalBooks,
  onUpdateBookings,
  onUpdateBookingReceipts,
  onUpdateTeachers,
  notify,
  addLog,
}) => {
  const [tab, setTab] = useState<'EXT' | 'NOTES' | 'PENDING' | 'DELIVERED' | 'ADMIN'>('EXT');
  const [collectModalBookingId, setCollectModalBookingId] = useState<string | null>(null);
  const [collectAmount, setCollectAmount] = useState<number | ''>('');
  
  const [openActionsFor, setOpenActionsFor] = useState<string | null>(null);

  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  
  const activeBooks = useMemo(() => externalBooks.filter(b => b.isActive), [externalBooks]);
  const [extSelectedBookId, setExtSelectedBookId] = useState<string>('');
  const [extQty, setExtQty] = useState<number>(1);
  const [bookSearchInput, setBookSearchInput] = useState<string>('');
  const [showBookDropdown, setShowBookDropdown] = useState<boolean>(false);

  
  const filteredBooks = useMemo(() => {
    if (!bookSearchInput.trim()) return activeBooks.slice(0, 10); 
    return activeBooks
      .filter(book => book.title.toLowerCase().includes(bookSearchInput.toLowerCase()))
      .slice(0, 10); 
  }, [activeBooks, bookSearchInput]);
  const [items, setItems] = useState<BookingItem[]>([]);

  
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const selectedTeacher = useMemo(
    () => teachers.find(t => t.id === selectedTeacherId) || null,
    [teachers, selectedTeacherId],
  );
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [noteQty, setNoteQty] = useState<number>(1);

  
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookPrice, setNewBookPrice] = useState<number>(0);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  
  const [search, setSearch] = useState('');
  
  const [bookFilter, setBookFilter] = useState<string>('ALL');

  const allBookTitles = useMemo(() => {
    const titles = new Set<string>();
    bookings.forEach(b => b.items.forEach(it => titles.add(it.title)));
    return Array.from(titles).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [bookings]);

  const totalAmount = useMemo(() => items.reduce((sum, it) => sum + it.total, 0), [items]);
  const remainingAmount = useMemo(() => Math.max(totalAmount - (paidAmount || 0), 0), [totalAmount, paidAmount]);

  const canSubmitBooking = useMemo(() => {
    
    return customerName.trim().length >= 2 && items.length > 0;
  }, [customerName, items]);

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setPaidAmount(0);
    setItems([]);
    setExtSelectedBookId('');
    setExtQty(1);
    setBookSearchInput('');
    setSelectedTeacherId('');
    setSelectedNoteId('');
    setNoteQty(1);
  };

  
  
  const printHtml = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.setAttribute('aria-hidden', 'true');

    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!doc || !win) return;

    let printed = false;

    doc.open();
    doc.write(html);
    doc.close();

    const doPrintOnce = () => {
      if (printed) return;
      printed = true;

      try {
        win.focus();
        win.print();
      } finally {
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 1000);
      }
    };

    iframe.onload = doPrintOnce;
    setTimeout(doPrintOnce, 700);
  };

  const selectBookFromDropdown = (book: ExternalBook) => {
    setBookSearchInput(book.title);
    setShowBookDropdown(false);
  };

  const addExternalBookItem = () => {
    if (!bookSearchInput.trim()) {
      notify('اكتب اسم الكتاب أولاً', 'WARNING');
      return;
    }

    
    let book = activeBooks.find(b => b.title.toLowerCase() === bookSearchInput.toLowerCase());
    if (!book) {
      book = activeBooks.find(b => b.title.toLowerCase().includes(bookSearchInput.toLowerCase()));
    }

    if (!book) {
      notify('لم يتم العثور على كتاب بهذا الاسم', 'WARNING');
      return;
    }

    if (extQty <= 0) {
      notify('الكمية غير صحيحة', 'WARNING');
      return;
    }

    const it: BookingItem = {
      id: `${Date.now()}-${Math.random()}`,
      type: BookingItemType.EXTERNAL_BOOK,
      title: book.title,
      qty: extQty,
      unitPrice: book.price,
      total: book.price * extQty,
    };
    setItems(prev => [...prev, it]);
    setBookSearchInput('');
    setShowBookDropdown(false);
    setExtQty(1);
  };

  const addTeacherNoteItem = () => {
    if (!selectedTeacher) {
      notify('اختر المدرس أولاً', 'WARNING');
      return;
    }
    const note = selectedTeacher.services.find(s => s.id === selectedNoteId);
    if (!note) {
      notify('اختر المذكرة أولاً', 'WARNING');
      return;
    }
    if (noteQty <= 0) {
      notify('الكمية غير صحيحة', 'WARNING');
      return;
    }

    const it: BookingItem = {
      id: `${Date.now()}-${Math.random()}`,
      type: BookingItemType.TEACHER_NOTE,
      title: note.name,
      teacherId: selectedTeacher.id,
      teacherName: selectedTeacher.name,
      qty: noteQty,
      unitPrice: note.price,
      total: note.price * noteQty,
    };
    setItems(prev => [...prev, it]);
    setSelectedNoteId('');
    setNoteQty(1);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const printBookingReceipt = (receipt: BookingReceipt) => {
    const isCollectionReceipt = receipt.code.includes('-COL');
    const isDeliveryReceipt = receipt.code.includes('-DEL');
    const isFullReceipt = receipt.code.includes('-FULL'); 

    const fullMeta = receipt as any; 

    const itemsHtml =
      receipt.items.length > 0
        ? receipt.items
            .map(item => {
              const name =
                item.type === BookingItemType.TEACHER_NOTE
                  ? `${item.title} (مذكرة - ${item.teacherName || ''})`
                  : `${item.title} (كتاب خارجي)`;
              return `
                <tr>
                  <td class="item-name">${name}</td>
                  <td class="item-qty">${item.qty}</td>
                  <td class="item-price">${item.total.toLocaleString()}</td>
                </tr>
              `;
            })
            .join('')
        : `
            <tr>
              <td class="item-name" colspan="3" style="text-align:center; padding:20px;">
                ${isCollectionReceipt ? 'تحصيل المبلغ المتبقي' : 'لا توجد عناصر'}
              </td>
            </tr>
          `;

    const headerTitle = isFullReceipt
      ? 'فاتورة تحصيل نهائي + تسليم'
      : isDeliveryReceipt
        ? 'إيصال تسليم'
        : isCollectionReceipt
          ? 'إيصال تحصيل'
          : 'إيصال حجز';

    const totalBoxHtml = (() => {
      
      if (isFullReceipt) {
        const prevPaid = Number(fullMeta.prevPaid || 0);
        const collectedNow = Number(fullMeta.collectedNow || 0);
        const afterPaid = prevPaid + collectedNow;

        return `
          <div style="font-size:12px;color:#666;">إجمالي الحجز: ${receipt.totalAmount.toLocaleString()} ج.م</div>
          <div style="font-size:12px;color:#10b981;font-weight:900;">
            المدفوع سابقًا: ${prevPaid.toLocaleString()} ج.م
          </div>
          <div style="font-size:12px;color:#111827;font-weight:900;">
            المحصل الآن: ${collectedNow.toLocaleString()} ج.م
          </div>
          <div style="font-size:12px;color:#10b981;font-weight:900;">
            إجمالي المدفوع: ${afterPaid.toLocaleString()} ج.م
          </div>
          <div style="font-size:12px;color:#ef4444;font-weight:900;">
            المتبقي: 0 ج.م
          </div>
          <div style="margin-top:8px;font-weight:900;">إجمالي العملية</div>
          <div class="total-amount">${collectedNow.toLocaleString()} ج.م</div>
        `;
      }

      
      if (!isCollectionReceipt && receipt.items.length > 0) {
        return `
          <div style="font-size:12px;color:#666;">إجمالي الحجز: ${receipt.totalAmount.toLocaleString()} ج.م</div>
          <div style="font-size:12px;color:#10b981;font-weight:900;">
            المدفوع: ${receipt.paidAmount.toLocaleString()} ج.م
          </div>
          ${
            receipt.remainingAmount > 0
              ? `
            <div style="font-size:12px;color:#FFD700;font-weight:900;">
              المتبقي: ${receipt.remainingAmount.toLocaleString()} ج.م
            </div>
          `
              : ''
          }
          <div style="margin-top:8px;font-weight:900;">إجمالي المطلوب</div>
          <div class="total-amount">${receipt.paidAmount.toLocaleString()} ج.م</div>
        `;
      }

      
      if (isCollectionReceipt) {
        return `
          <div style="margin-top:8px;font-weight:900;">المبلغ المحصل</div>
          <div class="total-amount">${receipt.paidAmount.toLocaleString()} ج.م</div>
        `;
      }

      
      return `
        <div style="margin-top:8px;font-weight:900;">إجمالي</div>
        <div class="total-amount">${receipt.paidAmount.toLocaleString()} ج.م</div>
      `;
    })();

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<style>
@page { size: 80mm auto; margin: 0; }
body { width: 68mm; margin: 0 auto; padding: 4mm 2mm; font-family: Arial; font-size: 13px; }
.header { text-align:center; margin-bottom:10px; }
.store-name { font-size: 18px; font-weight: bold; }
hr { border:none; border-top:1px dashed #000; margin:8px 0; }
table { width:100%; border-collapse:collapse; }
th { border-bottom:1px solid #000; text-align:right; font-size:12px; padding:5px 0; }
td { padding:6px 0; vertical-align:top; }
.item-name { width:60%; font-weight:bold; }
.item-qty { width:15%; text-align:center; }
.item-price { width:25%; text-align:left; }
.total-box { border:1px solid #000; padding:8px; text-align:center; margin-top:10px; }
.total-amount { font-size:18px; font-weight:900; }
.footer { text-align:center; margin-top:10px; font-size:11px; }
</style>
</head>
<body>
<div class="header">
  <img src="${logo}" style="width:70px;margin:0 auto 6px;display:block;" />
  <div class="store-name">CENTER FIVE</div>
  <div style="font-size:11px;">سنتر فايف لخدمات الطباعة</div>
</div>

<div style="font-size:11px;">
  <div>${headerTitle}: <b>${receipt.code}</b></div>
  <div>التاريخ: ${new Date(receipt.date).toLocaleDateString('ar-EG')} - ${new Date(receipt.date).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    })}</div>
  <div>العميل: ${receipt.customerName}</div>
  ${receipt.customerPhone ? `<div>التليفون: ${receipt.customerPhone}</div>` : ''}
  <div>الكاشير: <b>${receipt.cashierName || '-'}</b></div>
</div>

<hr/>

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
  ${totalBoxHtml}
</div>

<div class="footer">
  ${isFullReceipt ? '<div style="font-weight:900;">تحصيل نهائي + تسليم</div>' : ''}
  ${isCollectionReceipt && !isFullReceipt ? '<div style="font-weight:900;">تحصيل المبلغ المتبقي</div>' : ''}
  <div>شكراً لتعاملكم معنا</div>
</div>

</body>
</html>
    `;

    printHtml(html);
  };

  const submitBooking = () => {
    if (!canSubmitBooking) {
      notify('من فضلك أكمل بيانات العميل وأضف عناصر للحجز', 'WARNING');
      return;
    }
    if (!currentUser) {
      notify('لا يوجد مستخدم مسجل دخول', 'ERROR');
      return;
    }

    const code = generateBookingCode(bookings);
    const id = `booking-${Date.now()}`;
    const receiptId = `receipt-${Date.now()}`;
    const createdAt = getLocalISOString();

    const booking: Booking = {
      id,
      code,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      createdAt,
      createdById: currentUser.id,
      createdByName: currentUser.username,
      status: 'PENDING',
      totalAmount,
      paidAmount: paidAmount || 0,
      remainingAmount,
      items,
      receiptId,
    };

    const receipt: BookingReceipt = {
      id: receiptId,
      bookingId: id,
      code,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      cashierName: booking.createdByName,
      date: createdAt,
      items: booking.items,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      remainingAmount: booking.remainingAmount,
    };

    
    const noteItems = booking.items.filter(i => i.type === BookingItemType.TEACHER_NOTE && i.teacherId);
    if (noteItems.length > 0) {
      const updatedTeachers = teachers.map(t => {
        const related = noteItems.filter(i => i.teacherId === t.id);
        if (related.length === 0) return t;
        const newHistory = [...t.history];
        related.forEach(i => {
          newHistory.push({
            invoiceId: booking.id,
            serviceName: `حجز مذكرة: ${i.title}`,
            quantity: i.qty,
            amount: 0,
            date: createdAt,
            priced: false,
            entryType: 'NOTES',
          });
        });
        return { ...t, history: newHistory };
      });
      onUpdateTeachers(updatedTeachers);
    }

    onUpdateBookings([booking, ...bookings]);
    onUpdateBookingReceipts([receipt, ...bookingReceipts]);

    addLog('إضافة حجز', `تم إنشاء حجز جديد #${booking.code} باسم ${booking.customerName}`, 'SYSTEM');
    notify('تم إنشاء الحجز بنجاح', 'SUCCESS');
    printBookingReceipt(receipt);
    resetForm();
    setTab('PENDING');
  };

  const deliverBooking = (bookingId: string) => {
    if (!currentUser) return;
    const b = bookings.find(x => x.id === bookingId);
    if (!b) return;
    if (b.remainingAmount > 0) {
      notify('لا يمكن التسليم قبل تحصيل المبلغ المتبقي', 'WARNING');
      return;
    }
    const now = getLocalISOString();
    const updated = { ...b, status: 'DELIVERED' as const, deliveredAt: now, deliveredByName: currentUser.username };
    onUpdateBookings(bookings.map(x => (x.id === bookingId ? updated : x)));

    addLog('تسليم حجز', `تم تسليم الحجز ${updated.code}`, 'SYSTEM');
    notify('تم التسليم بنجاح', 'SUCCESS');
  };

  
  const collectRemaining = (bookingId: string, amountToCollect?: number) => {
    if (!currentUser) return;
    const b = bookings.find(x => x.id === bookingId);
    if (!b) return;

    const remainingToCollect = amountToCollect !== undefined ? amountToCollect : b.remainingAmount;

    if (remainingToCollect > b.remainingAmount) {
      notify('المبلغ المدخل أكبر من المبلغ المتبقي', 'ERROR');
      return;
    }

    if (remainingToCollect <= 0) {
      notify('المبلغ المدخل غير صحيح', 'ERROR');
      return;
    }

    const now = getLocalISOString();
    const newPaidAmount = b.paidAmount + remainingToCollect;
    const newRemainingAmount = b.totalAmount - newPaidAmount;

    const updated = {
      ...b,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
    };

    onUpdateBookings(bookings.map(x => (x.id === bookingId ? updated : x)));

    
    notify(`تم تحصيل ${remainingToCollect.toLocaleString()} ج.م، المتبقي: ${newRemainingAmount.toLocaleString()} ج.م`, 'SUCCESS');
    addLog(
      'تحصيل جزئي حجز',
      `تم تحصيل ${remainingToCollect.toLocaleString()} ج.م من الحجز ${b.code}، المتبقي: ${newRemainingAmount.toLocaleString()} ج.م`,
      'SYSTEM',
    );

    const collectionReceipt: BookingReceipt = {
      id: `${Date.now()}-${Math.random()}`,
      bookingId: updated.id,
      code: `${updated.code}-COL`,
      customerName: updated.customerName,
      customerPhone: updated.customerPhone,
      cashierName: currentUser.username,
      date: now,
      items: [],
      totalAmount: remainingToCollect,
      paidAmount: remainingToCollect,
      remainingAmount: 0,
    };

    onUpdateBookingReceipts([collectionReceipt, ...bookingReceipts]);
    printBookingReceipt(collectionReceipt);
  };

  const cancelBooking = (bookingId: string) => {
    onUpdateBookings(bookings.map(b => (b.id === bookingId ? { ...b, status: 'CANCELED' } : b)));
    notify('تم إلغاء الحجز', 'WARNING');
  };

  const filteredPending = useMemo(() => {
    return bookings
      .filter(b => b.status === 'PENDING')
      .filter(b => {
        if (!search.trim()) return true;
        const s = search.trim();
        return b.customerName.includes(s) || b.customerPhone.includes(s) || b.code.includes(s);
      })
      .filter(b => {
        if (bookFilter === 'ALL') return true;
        return b.items.some(it => it.title === bookFilter);
      });
  }, [bookings, search, bookFilter]);

  const filteredDelivered = useMemo(() => {
    return bookings
      .filter(b => b.status === 'DELIVERED')
      .filter(b => {
        if (!search.trim()) return true;
        const s = search.trim();
        return b.customerName.includes(s) || b.customerPhone.includes(s) || b.code.includes(s);
      })
      .filter(b => {
        if (bookFilter === 'ALL') return true;
        return b.items.some(it => it.title === bookFilter);
      });
  }, [bookings, search, bookFilter]);

  
  const pendingBookCounters = useMemo<CounterRow[]>(() => {
    const map = new Map<string, CounterRow>();

    bookings
      .filter(b => b.status === 'PENDING')
      .forEach(b => {
        b.items.forEach(it => {
          const key =
            it.type === BookingItemType.TEACHER_NOTE
              ? `${it.title}__${it.teacherName || ''}`
              : it.title;

          const prev = map.get(key);
          if (prev) {
            map.set(key, { ...prev, qty: prev.qty + (it.qty || 0) });
          } else {
            map.set(key, {
              title: it.title,
              teacherName: it.type === BookingItemType.TEACHER_NOTE ? it.teacherName : undefined,
              qty: it.qty || 0,
            });
          }
        });
      });

    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [bookings]);

  const pendingCountersTotals = useMemo(() => {
    const externalQty = pendingBookCounters.filter(r => !r.teacherName).reduce((sum, r) => sum + r.qty, 0);
    const notesQty = pendingBookCounters.filter(r => !!r.teacherName).reduce((sum, r) => sum + r.qty, 0);
    const grandQty = externalQty + notesQty;
    return { externalQty, notesQty, grandQty };
  }, [pendingBookCounters]);

  const getMissingItemsText = (b: Booking) => {
    return b.items
      .map(it => `${it.title} (${it.qty})`)
      .join('، ');
  };

  const printBookingsReport = (status: 'PENDING' | 'DELIVERED') => {
    const list = status === 'PENDING' ? filteredPending : filteredDelivered;

    const counters: CounterRow[] =
      status === 'PENDING'
        ? pendingBookCounters
        : (() => {
            const map = new Map<string, CounterRow>();
            bookings
              .filter(b => b.status === 'DELIVERED')
              .forEach(b => {
                b.items.forEach(it => {
                  const key =
                    it.type === BookingItemType.TEACHER_NOTE
                      ? `${it.title}__${it.teacherName || ''}`
                      : it.title;

                  const prev = map.get(key);
                  if (prev) {
                    map.set(key, { ...prev, qty: prev.qty + (it.qty || 0) });
                  } else {
                    map.set(key, {
                      title: it.title,
                      teacherName: it.type === BookingItemType.TEACHER_NOTE ? it.teacherName : undefined,
                      qty: it.qty || 0,
                    });
                  }
                });
              });

            return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
          })();

    const now = new Date();
    const reportTitle = status === 'PENDING' ? 'كشف الحجوزات غير المُسلمة' : 'كشف الحجوزات المُسلمة';

    const bookingsHtml =
      list.length === 0
        ? `<div style="padding:20px;text-align:center;font-weight:800;">لا توجد حجوزات</div>`
        : list
            .map((b, idx) => {
              const itemsHtml = b.items
                .map(it => {
                  const typeText =
                    it.type === BookingItemType.EXTERNAL_BOOK
                      ? 'كتاب خارجي'
                      : `مذكرة - ${it.teacherName || ''}`;

                  return `
                    <tr>
                      <td style="padding:8px;border:1px solid #ddd;font-weight:800;">${it.title}</td>
                      <td style="padding:8px;border:1px solid #ddd;">${typeText}</td>
                      <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:900;">${it.qty}</td>
                      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${it.unitPrice.toLocaleString()} ج.م</td>
                      <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:900;">${it.total.toLocaleString()} ج.م</td>
                    </tr>
                  `;
                })
                .join('');

              return `
                <div style="margin:18px 0; border:1px solid #ddd; border-radius:12px; overflow:hidden;">
                  <div style="padding:12px; background:#f8fafc; border-bottom:1px solid #ddd;">
                    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
                      <div style="font-weight:900;font-size:16px;">
                        ${idx + 1}) ${b.code}
                      </div>
                      <div style="font-weight:800;color:#555;">
                        ${new Date(b.createdAt).toLocaleDateString('ar-EG')} - ${new Date(b.createdAt).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div style="margin-top:6px;font-weight:800;">
                      العميل: ${b.customerName} ${b.customerPhone ? `- ${b.customerPhone}` : ''}
                    </div>
                  </div>

                  <div style="padding:12px;">
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                      <thead>
                        <tr style="background:#111827;color:#fff;">
                          <th style="padding:8px;border:1px solid #111827;text-align:right;">الصنف</th>
                          <th style="padding:8px;border:1px solid #111827;text-align:right;">النوع</th>
                          <th style="padding:8px;border:1px solid #111827;text-align:center;">الكمية</th>
                          <th style="padding:8px;border:1px solid #111827;text-align:center;">سعر الوحدة</th>
                          <th style="padding:8px;border:1px solid #111827;text-align:center;">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>

                    <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;font-weight:900;">
                      <div style="padding:8px 12px;border:1px solid #ddd;border-radius:10px;">
                        إجمالي الحجز: ${b.totalAmount.toLocaleString()} ج.م
                      </div>
                      <div style="padding:8px 12px;border:1px solid #10b981;color:#10b981;border-radius:10px;">
                        المدفوع: ${b.paidAmount.toLocaleString()} ج.م
                      </div>
                      <div style="padding:8px 12px;border:1px solid #f59e0b;color:#f59e0b;border-radius:10px;">
                        المتبقي: ${b.remainingAmount.toLocaleString()} ج.م
                      </div>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('');

    const countersHtml =
      counters.length === 0
        ? ''
        : `
        <div style="margin-top:30px;border-top:2px dashed #000;padding-top:16px;">
          <h3 style="margin:0 0 10px 0;font-weight:900;">إجمالي النسخ حسب الصنف</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#8000FF;color:#fff;">
                <th style="padding:8px;border:1px solid #8000FF;text-align:right;">الصنف</th>
                <th style="padding:8px;border:1px solid #8000FF;text-align:center;">عدد النسخ</th>
              </tr>
            </thead>
            <tbody>
              ${counters
                .map(row => {
                  const displayName = row.teacherName ? `${row.title} (${row.teacherName})` : row.title;
                  return `
                    <tr>
                      <td style="padding:8px;border:1px solid #ddd;font-weight:900;">${displayName}</td>
                      <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:900;">${row.qty}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      `;

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>${reportTitle}</title>
<style>
  @page { size: A4; margin: 10mm; }
  body { font-family: Arial; padding: 0; margin: 0; color: #111; }
  .wrap { padding: 14px; }
  .header { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; }
  .title { font-weight:900; font-size:20px; }
  .meta { font-weight:800; color:#555; font-size:12px; }
  .logoBox { display:flex; align-items:center; gap:10px; }
  .logoBox img { width:48px; height:auto; }
  .badge { padding:6px 10px; border-radius:10px; background:#111827; color:#fff; font-weight:900; font-size:12px; }
  .sub { font-weight:800; color:#555; margin-top:4px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="logoBox">
        <img src="${logo}" />
        <div>
          <div class="title">CENTER FIVE</div>
          <div class="sub">${reportTitle}</div>
        </div>
      </div>
      <div style="text-align:left;">
        <div class="badge">${status === 'PENDING' ? 'PENDING' : 'DELIVERED'}</div>
        <div class="meta">تاريخ الطباعة: ${now.toLocaleDateString('ar-EG')} - ${now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        })}</div>
        <div class="meta">عدد الحجوزات: ${list.length}</div>
      </div>
    </div>

    ${bookingsHtml}

    ${countersHtml}
  </div>
</body>
</html>
    `;

    printHtml(html);
  };

  const addExternalBook = () => {
    if (role !== UserRole.ADMIN) return;
    if (newBookTitle.trim().length < 2 || newBookPrice <= 0) {
      notify('اكتب اسم كتاب صحيح وسعر صحيح', 'WARNING');
      return;
    }

    if (editingBookId) {
      const existingBook = externalBooks.find(b => b.id === editingBookId);
      if (!existingBook) return;

      const updatedBook: ExternalBook = {
        ...existingBook,
        title: newBookTitle.trim(),
        price: newBookPrice,
      };
      onUpdateExternalBooks(externalBooks.map(b => (b.id === editingBookId ? updatedBook : b)));
      setEditingBookId(null);
      setNewBookTitle('');
      setNewBookPrice(0);
      notify('تم تحديث الكتاب', 'SUCCESS');
      addLog('تعديل كتاب خارجي', `تم تحديث الكتاب: ${updatedBook.title}`, 'SYSTEM');
    } else {
      const book: ExternalBook = {
        id: `book-${Date.now()}`,
        title: newBookTitle.trim(),
        price: newBookPrice,
        isActive: true,
        createdAt: getLocalISOString(),
      };
      onUpdateExternalBooks([book, ...externalBooks]);
      setNewBookTitle('');
      setNewBookPrice(0);
      notify('تم إضافة الكتاب', 'SUCCESS');
      addLog('إضافة كتاب خارجي', `تم إضافة الكتاب: ${book.title}`, 'SYSTEM');
    }
  };

  const editExternalBook = (bookId: string) => {
    const book = externalBooks.find(b => b.id === bookId);
    if (!book) return;
    setEditingBookId(bookId);
    setNewBookTitle(book.title);
    setNewBookPrice(book.price);
  };

  const cancelEdit = () => {
    setEditingBookId(null);
    setNewBookTitle('');
    setNewBookPrice(0);
  };

  const deleteExternalBook = (bookId: string) => {
    const book = externalBooks.find(b => b.id === bookId);
    if (!book) return;

    const hasActiveBookings = bookings.some(
      b => b.status === 'PENDING' && b.items.some(item => item.title === book.title),
    );

    if (hasActiveBookings) {
      notify('لا يمكن حذف الكتاب لأنه مستخدم في حجوزات قائمة', 'WARNING');
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف "${book.title}"؟`)) {
      onUpdateExternalBooks(externalBooks.filter(b => b.id !== bookId));
      notify('تم حذف الكتاب', 'SUCCESS');
      addLog('حذف كتاب خارجي', `تم حذف الكتاب: ${book.title}`, 'SYSTEM');
    }
  };

  const toggleBookActive = (id: string) => {
    if (role !== UserRole.ADMIN) return;
    onUpdateExternalBooks(externalBooks.map(b => (b.id === id ? { ...b, isActive: !b.isActive } : b)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">الحجوزات</h1>
          <p className="text-gray-500 font-bold mt-1">حجز كتب خارجية / مذكرات مدرسين + متابعة التسليم</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('EXT')}
            className={`px-4 py-2 rounded-xl font-black text-sm min-w-[120px]
              flex items-center justify-center gap-2
              ${tab === 'EXT' ? 'bg-[#8000FF] text-white shadow-sm' : 'bg-white border hover:bg-gray-50'}
            `}
          >
            <span className="text-base">{ICONS.Book}</span>
            <span>كتب خارجية</span>
          </button>

          <button
            onClick={() => setTab('NOTES')}
            className={`px-4 py-2 rounded-xl font-black text-sm min-w-[120px]
              flex items-center justify-center gap-2
              ${tab === 'NOTES' ? 'bg-[#8000FF] text-white shadow-sm' : 'bg-white border hover:bg-gray-50'}
            `}
          >
            <span className="text-base">{ICONS.Note}</span>
            <span>مذكرات مدرسين</span>
          </button>

          <button
            onClick={() => setTab('PENDING')}
            className={`px-4 py-2 rounded-xl font-black text-sm min-w-[110px]
              flex items-center justify-center gap-2
              ${tab === 'PENDING' ? 'bg-[#8000FF] text-white shadow-sm' : 'bg-white border hover:bg-gray-50'}
            `}
          >
            <span className="text-base">{ICONS.Clock}</span>
            <span>غير مُسلم</span>
          </button>

          <button
            onClick={() => setTab('DELIVERED')}
            className={`px-4 py-2 rounded-xl font-black text-sm min-w-[110px]
              flex items-center justify-center gap-2
              ${tab === 'DELIVERED' ? 'bg-[#8000FF] text-white shadow-sm' : 'bg-white border hover:bg-gray-50'}
            `}
          >
            <span className="text-base">{ICONS.Check}</span>
            <span>تم التسليم</span>
          </button>

          {role === UserRole.ADMIN && (
            <button
              onClick={() => setTab('ADMIN')}
              className={`px-4 py-2 rounded-xl font-black text-sm min-w-[110px]
                flex items-center justify-center gap-2
                ${tab === 'ADMIN' ? 'bg-black text-white shadow-sm' : 'bg-white border hover:bg-gray-50'}
              `}
            >
              <span className="text-base">{ICONS.Settings}</span>
              <span>إدارة الكتب</span>
            </button>
          )}
        </div>
      </div>

      {(tab === 'EXT' || tab === 'NOTES') && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900">بيانات الحجز</h2>
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-xl font-black text-xs bg-gray-50 hover:bg-gray-100 border flex items-center justify-center"
              >
                مسح
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-gray-700 mb-1">اسم العميل</label>
                <input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full p-3 rounded-2xl border bg-gray-50 font-bold"
                  placeholder="اسم العميل"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-700 mb-1">رقم التليفون</label>
                <input
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full p-3 rounded-2xl border bg-gray-50 font-bold"
                  placeholder="01xxxxxxxxx"
                />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-black text-gray-900 mb-3">إضافة بنود للحجز</h3>

              {tab === 'EXT' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <div className="relative">
                      <input
                        value={bookSearchInput}
                        onChange={e => {
                          setBookSearchInput(e.target.value);
                          setShowBookDropdown(true);
                        }}
                        onFocus={() => setShowBookDropdown(true)}
                        onBlur={() => {
                          
                          setTimeout(() => setShowBookDropdown(false), 200);
                        }}
                        className="w-full p-3 rounded-2xl border bg-gray-50 font-black pr-10"
                        placeholder="اكتب اسم الكتاب..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowBookDropdown(!showBookDropdown)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <span className={`text-sm transition-transform ${showBookDropdown ? 'rotate-180' : ''}`}>▼</span>
                      </button>
                    </div>

                    {showBookDropdown && filteredBooks.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-60 overflow-y-auto">
                        {filteredBooks.map(book => (
                          <button
                            key={book.id}
                            type="button"
                            onClick={() => selectBookFromDropdown(book)}
                            className="w-full text-right px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl font-black text-sm"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-green-600">{book.price.toLocaleString()} ج.م</span>
                              <span>{book.title}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="number"
                    min={1}
                    value={extQty}
                    onChange={e => setExtQty(Number(e.target.value))}
                    className="p-3 rounded-2xl border bg-gray-50 font-black"
                    placeholder="الكمية"
                  />

                  <button
                    onClick={addExternalBookItem}
                    className="bg-black text-white rounded-2xl font-black p-3 hover:bg-gray-800 flex items-center justify-center gap-2"
                  >
                    <span>{ICONS.Plus}</span>
                    <span>إضافة</span>
                  </button>
                </div>
              )}

              {tab === 'NOTES' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select
                    value={selectedTeacherId}
                    onChange={e => setSelectedTeacherId(e.target.value)}
                    className="p-3 rounded-2xl border bg-gray-50 font-black"
                  >
                    <option value="">اختر مدرس</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedNoteId}
                    onChange={e => setSelectedNoteId(e.target.value)}
                    className="p-3 rounded-2xl border bg-gray-50 font-black"
                    disabled={!selectedTeacher}
                  >
                    <option value="">اختر مذكرة</option>
                    {selectedTeacher?.services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} - {s.price.toLocaleString()} ج.م
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={noteQty}
                    onChange={e => setNoteQty(Number(e.target.value))}
                    className="p-3 rounded-2xl border bg-gray-50 font-black"
                    placeholder="الكمية"
                  />

                  <button
                    onClick={addTeacherNoteItem}
                    className="bg-black text-white rounded-2xl font-black p-3 hover:bg-gray-800 flex items-center justify-center gap-2"
                  >
                    <span>{ICONS.Plus}</span>
                    <span>إضافة</span>
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="font-black text-gray-900 mb-3">عناصر الحجز</h3>

              {items.length === 0 ? (
                <div className="p-6 bg-gray-50 rounded-3xl border text-center text-gray-500 font-black">لا يوجد عناصر بعد</div>
              ) : (
                <div className="space-y-2">
                  {items.map(it => (
                    <div key={it.id} className="p-4 rounded-3xl border bg-white flex items-center justify-between">
                      <div>
                        <div className="font-black text-gray-900">
                          {it.title}{' '}
                          <span className="text-xs text-gray-400 font-black">
                            ({it.type === BookingItemType.EXTERNAL_BOOK ? 'كتاب خارجي' : `مذكرة - ${it.teacherName || ''}`})
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 font-bold">
                          {it.qty} × {it.unitPrice.toLocaleString()} = {it.total.toLocaleString()} ج.م
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(it.id)}
                        className="p-2 rounded-2xl bg-red-50 text-red-600 font-black hover:bg-red-100"
                      >
                        {ICONS.Trash}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-black text-gray-900 mb-4">الإجماليات</h2>

            <div className="space-y-3">
              <div className="p-4 rounded-3xl border bg-gray-50 flex justify-between font-black">
                <span>الإجمالي</span>
                <span>{totalAmount.toLocaleString()} ج.م</span>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-1">المدفوع الآن</label>
                <input
                  type="number"
                  min={0}
                  value={paidAmount}
                  onChange={e => setPaidAmount(Number(e.target.value))}
                  className="w-full p-3 rounded-2xl border bg-gray-50 font-black"
                />
              </div>

              <div className="p-4 rounded-3xl border bg-[#FFD700]/50 flex justify-between font-black">
                <span>المتبقي عند التسليم</span>
                <span>{remainingAmount.toLocaleString()} ج.م</span>
              </div>
            </div>

            <button
              onClick={submitBooking}
              disabled={!canSubmitBooking}
              className="w-full mt-6 py-4 rounded-3xl bg-[#8000FF] text-white font-black text-lg hover:bg-[#6a00d6] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>{ICONS.Print}</span>
              <span>تأكيد الحجز + طباعة الإيصال</span>
            </button>
          </div>
        </div>
      )}

      {(tab === 'PENDING' || tab === 'DELIVERED') && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-xl font-black text-gray-900">
              {tab === 'PENDING' ? 'الحجوزات غير المُسلمة' : 'الحجوزات المُسلمة'}
            </h2>

            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={() => printBookingsReport(tab === 'PENDING' ? 'PENDING' : 'DELIVERED')}
                className="px-4 py-3 rounded-2xl bg-black text-white font-black text-xs hover:bg-gray-800 flex items-center justify-center gap-2"
                title="طباعة كشف كامل"
              >
                <span>{ICONS.Print}</span>
                <span>طباعة كشف</span>
              </button>

              <select
                value={bookFilter}
                onChange={e => setBookFilter(e.target.value)}
                className="p-3 rounded-2xl border bg-gray-50 font-black"
                title="فلترة بنوع الكتاب"
              >
                <option value="ALL">كل الكتب</option>
                {allBookTitles.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{ICONS.Search}</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-80 max-w-full pr-11 p-3 rounded-2xl border bg-gray-50 font-black"
                  placeholder="بحث بالاسم / التليفون / كود الحجز"
                />
              </div>
            </div>
          </div>

          {tab === 'PENDING' && pendingBookCounters.length > 0 && (
            <div className="mb-5 p-5 rounded-3xl border bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-gray-900">إجمالي النسخ المحجوزة لكل صنف</h3>
                <div className="text-sm font-black text-gray-500">إجمالي الأصناف: {pendingBookCounters.length}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="p-4 rounded-2xl bg-white border font-black flex justify-between">
                  <span>إجمالي الكتب الخارجية</span>
                  <span className="text-[#8000FF]">{pendingCountersTotals.externalQty}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border font-black flex justify-between">
                  <span>إجمالي المذكرات</span>
                  <span className="text-[#8000FF]">{pendingCountersTotals.notesQty}</span>
                </div>
                <div className="p-4 rounded-2xl bg-black text-white font-black rounded-2xl flex justify-between">
                  <span>الإجمالي الكلي للنسخ</span>
                  <span>{pendingCountersTotals.grandQty}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-right text-xs text-gray-500 font-black border-b">
                      <th className="p-3">الصنف</th>
                      <th className="p-3 text-center">عدد النسخ المحجوزة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBookCounters.map(row => (
                      <tr key={`${row.title}-${row.teacherName || ''}`} className="border-b last:border-b-0">
                        <td className="p-3 font-black text-gray-900">
                          {row.title}
                          {row.teacherName ? (
                            <span className="text-xs text-gray-500 font-black"> ({row.teacherName})</span>
                          ) : null}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-3 py-1 rounded-2xl bg-[#8000FF]/10 text-[#8000FF] font-black text-sm">{row.qty}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-right text-xs text-gray-500 font-black">
                  <th className="p-3">كود</th>
                  <th className="p-3">العميل</th>
                  <th className="p-3">التليفون</th>
                  <th className="p-3">تفاصيل الحجز</th>
                  {tab === 'PENDING' && <th className="p-3">الناقص</th>}
                  <th className="p-3">عدد البنود</th>
                  <th className="p-3">الإجمالي</th>
                  <th className="p-3">المدفوع</th>
                  <th className="p-3">المتبقي</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {(tab === 'PENDING' ? filteredPending : filteredDelivered).map(b => (
                  <tr key={b.id} className="border-t">
                    <td className="p-3 font-black text-[#8000FF]">{b.code}</td>
                    <td className="p-3 font-black">{b.customerName}</td>
                    <td className="p-3 font-bold text-gray-600">{b.customerPhone}</td>

                    <td className="p-3 font-bold text-gray-700 max-w-[420px]">
                      <div className="text-xs leading-6 space-y-1">
                        {b.items.map((it, idx) => (
                          <div key={idx} className="border-b last:border-b-0 pb-1 last:pb-0">
                            <div className="font-black text-gray-900">
                              {it.title}
                              <span className="text-[11px] text-gray-500 font-black">
                                {' '}
                                ({it.type === BookingItemType.EXTERNAL_BOOK ? 'كتاب خارجي' : `مذكرة - ${it.teacherName || ''}`})
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-600 font-bold">
                              الكمية: {it.qty} | الإجمالي: {it.total.toLocaleString()} ج.م
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>

                    {tab === 'PENDING' && (
                      <td className="p-3 font-bold text-gray-700 max-w-[360px]">
                        <div className="text-xs leading-6">{getMissingItemsText(b) || '—'}</div>
                      </td>
                    )}

                    <td className="p-3 font-black">{b.items.length}</td>
                    <td className="p-3 font-black">{b.totalAmount.toLocaleString()}</td>
                    <td className="p-3 font-black text-green-600">{b.paidAmount.toLocaleString()}</td>
                    <td className="p-3 font-black text-orange-600">{b.remainingAmount.toLocaleString()}</td>
                    <td className="p-3 font-bold text-gray-600">{formatDateTime(b.createdAt)}</td>

                    <td className="p-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            const receipt = bookingReceipts.find(r => r.id === b.receiptId);
                            if (receipt) printBookingReceipt(receipt);
                            else notify('لم يتم العثور على الإيصال', 'ERROR');
                          }}
                          className="px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50 font-black text-xs flex items-center justify-center gap-2 whitespace-nowrap"
                          title="طباعة إيصال الحجز"
                        >
                          <span className="text-gray-600">{ICONS.Print}</span>
                          <span>طباعة</span>
                        </button>

                        {tab === 'PENDING' && (
                          <>
                            <button
                              onClick={() => setCollectModalBookingId(b.id)}
                              disabled={b.remainingAmount <= 0}
                              className="px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50 font-black text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                              title="تحصيل المتبقي"
                            >
                              <span className="text-green-600">●</span>
                              <span>تحصيل</span>
                            </button>

                            <button
                              onClick={() => deliverBooking(b.id)}
                              disabled={b.remainingAmount > 0}
                              className="px-3 py-2 rounded-2xl border bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                              title="تسليم الحجز"
                            >
                              <span className="text-blue-700">{ICONS.Check}</span>
                              <span>تسليم</span>
                            </button>

                            <button
                              onClick={() => cancelBooking(b.id)}
                              className="px-3 py-2 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-black text-xs flex items-center justify-center gap-2 whitespace-nowrap"
                              title="إلغاء الحجز"
                            >
                              <span className="text-red-700">{ICONS.Trash}</span>
                              <span>إلغاء</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {}
      {tab === 'ADMIN' && role === UserRole.ADMIN && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-black text-gray-900 mb-4">{editingBookId ? 'تعديل كتاب خارجي' : 'إضافة كتاب خارجي'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={newBookTitle}
                onChange={e => setNewBookTitle(e.target.value)}
                className="p-3 rounded-2xl border bg-gray-50 font-black"
                placeholder="اسم الكتاب"
              />
              <input
                type="number"
                min={0}
                value={newBookPrice}
                onChange={e => setNewBookPrice(Number(e.target.value))}
                className="p-3 rounded-2xl border bg-gray-50 font-black"
                placeholder="السعر"
              />
              <div className="flex gap-2">
                <button
                  onClick={addExternalBook}
                  className="flex-1 bg-black text-white rounded-2xl font-black p-3 hover:bg-gray-800 flex items-center justify-center gap-2"
                >
                  <span>{editingBookId ? ICONS.Check : ICONS.Plus}</span>
                  <span>{editingBookId ? 'تحديث' : 'إضافة'}</span>
                </button>
                {editingBookId && (
                  <button
                    onClick={cancelEdit}
                    className="px-4 bg-gray-100 text-gray-700 rounded-2xl font-black hover:bg-gray-200 flex items-center justify-center"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-black text-gray-900 mb-4">قائمة الكتب الخارجية</h2>
            {externalBooks.length === 0 ? (
              <div className="p-6 bg-gray-50 rounded-3xl border text-center text-gray-500 font-black">لا يوجد كتب</div>
            ) : (
              <div className="space-y-2">
                {externalBooks.map(b => (
                  <div key={b.id} className="p-4 rounded-3xl border flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-black">{b.title}</div>
                      <div className="text-sm text-gray-500 font-bold">{b.price.toLocaleString()} ج.م</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editExternalBook(b.id)}
                        className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-black text-xs flex items-center justify-center gap-1"
                        title="تعديل"
                      >
                        <span>{ICONS.Settings}</span>
                        <span>تعديل</span>
                      </button>
                      <button
                        onClick={() => deleteExternalBook(b.id)}
                        className="px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-black text-xs flex items-center justify-center gap-1"
                        title="حذف"
                      >
                        <span>{ICONS.Trash}</span>
                        <span>حذف</span>
                      </button>
                      <button
                        onClick={() => toggleBookActive(b.id)}
                        className={`px-3 py-2 rounded-xl font-black text-xs flex items-center justify-center ${
                          b.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                        title={b.isActive ? 'تعطيل' : 'تفعيل'}
                      >
                        {b.isActive ? 'متاح' : 'غير متاح'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {}
      {collectModalBookingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-right">
            {(() => {
              const b = bookings.find(x => x.id === collectModalBookingId);
              if (!b) return null;
              const amountValue = collectAmount === '' ? b.remainingAmount : Number(collectAmount);
              const isValidAmount = amountValue > 0 && amountValue <= b.remainingAmount;

              return (
                <>
                  <h3 className="text-lg font-black text-gray-800 mb-2">تأكيد التحصيل</h3>
                  <p className="text-sm text-gray-600 font-bold mb-4">
                    حجز <span className="text-[#8000FF]">{b.code}</span>
                  </p>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
                    <div className="flex justify-between font-bold text-sm">
                      <span>العميل</span>
                      <span>{b.customerName}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm">
                      <span>المدفوع</span>
                      <span>{b.paidAmount.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-green-700">
                      <span>المتبقي</span>
                      <span>{b.remainingAmount.toLocaleString()} ج.م</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-black text-gray-700 mb-2">المبلغ المراد تحصيله</label>
                    <input
                      type="number"
                      min={0}
                      max={b.remainingAmount}
                      value={collectAmount === '' ? b.remainingAmount : collectAmount}
                      onChange={e => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setCollectAmount(val);
                      }}
                      className="w-full p-3 rounded-xl border bg-gray-50 font-black text-right"
                      placeholder="أدخل المبلغ"
                    />
                    {collectAmount !== '' && !isValidAmount && (
                      <p className="text-red-600 text-xs font-bold mt-2">
                        {amountValue > b.remainingAmount
                          ? `المبلغ المدخل (${amountValue.toLocaleString()} ج.م) أكبر من المتبقي (${b.remainingAmount.toLocaleString()} ج.م)`
                          : 'المبلغ المدخل غير صحيح'}
                      </p>
                    )}
                    <button
                      onClick={() => setCollectAmount(b.remainingAmount)}
                      className="mt-2 text-xs text-[#8000FF] font-black hover:underline"
                    >
                      تحصيل المتبقي بالكامل ({b.remainingAmount.toLocaleString()} ج.م)
                    </button>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => {
                        setCollectModalBookingId(null);
                        setCollectAmount('');
                      }}
                      className="flex-1 px-4 py-2 rounded-xl border font-black text-sm bg-white hover:bg-gray-50 flex items-center justify-center"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
                        if (!isValidAmount) {
                          notify('المبلغ المدخل غير صحيح', 'ERROR');
                          return;
                        }
                        collectRemaining(b.id, amountValue);
                        setCollectModalBookingId(null);
                        setCollectAmount('');
                      }}
                      disabled={!isValidAmount}
                      className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white font-black text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      تحصيل {amountValue.toLocaleString()} ج.م
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
