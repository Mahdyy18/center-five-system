import React, { useState, useEffect, useRef } from 'react';
import logo from './assets/logo.png';
import {
  HashRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from 'react-router-dom';

import {
  UserAccount,
  UserRole,
  Service,
  Invoice,
  ClientDebt,
  Expense,
  Staff,
  ActivityLog,
  AppNotification,
  Teacher,
  ExternalBook,
  Booking,
  BookingReceipt,
} from './types';

import { ICONS, INITIAL_SERVICES } from './constants';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Menu,
  Clock,
} from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Debts from './pages/Debts';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Login from './pages/Login';
import ActivityLogs from './pages/ActivityLog';
import DataManagement from './pages/DataManagement';
import Teachers from './pages/Teachers';
import Cashiers from './pages/Cashiers';
import Bookings from './pages/Bookings';


const getEgyptNow = () =>
  new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' })
  );

const getLocalISOString = () => {
  const date = getEgyptNow();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString();
};

const LiveClock: React.FC = () => {
  const [time, setTime] = useState(getEgyptNow());

  useEffect(() => {
    const timer = setInterval(() => setTime(getEgyptNow()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-2 text-[#8000FF] font-black text-xl">
        <Clock size={20} className="animate-pulse" />
        <span suppressHydrationWarning>
          {time.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      </div>

      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
        {time.toLocaleDateString('ar-EG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const getSavedData = (key: string, defaultValue: any) => {
    const saved = localStorage.getItem(key);
    try {
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [role, setRole] = useState<UserRole>(UserRole.CASHIER);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notificationTimers = useRef<Record<string, any>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const returnLocksRef = useRef<Record<string, boolean>>({});

  const DEFAULT_USERS: UserAccount[] = [
    {
      id: 'cashier-default',
      username: 'admin',
      password: 'admin',
      role: UserRole.CASHIER,
      createdAt: getLocalISOString(),
    },
  ];

  const [users, setUsers] = useState<UserAccount[]>(() =>
    getSavedData('cf_users', DEFAULT_USERS)
  );

  const [services, setServices] = useState<Service[]>(() =>
    getSavedData('cf_services', INITIAL_SERVICES)
  );

  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    getSavedData('cf_invoices', [])
  );

  const [debts, setDebts] = useState<ClientDebt[]>(() =>
    getSavedData('cf_debts', [])
  );

  const [teachers, setTeachers] = useState<Teacher[]>(() =>
    getSavedData('cf_teachers', [])
  );

  const [expenses, setExpenses] = useState<Expense[]>(() =>
    getSavedData('cf_expenses', [])
  );

  const [externalBooks, setExternalBooks] = useState<ExternalBook[]>(() =>
    getSavedData('cf_external_books', [])
  );

  const [bookings, setBookings] = useState<Booking[]>(() =>
    getSavedData('cf_bookings', [])
  );

  const [bookingReceipts, setBookingReceipts] = useState<BookingReceipt[]>(() =>
    getSavedData('cf_booking_receipts', [])
  );

  useEffect(() => {
    setExpenses((prev) => {
      const seen = new Set<string>();
      const cleaned: Expense[] = [];

      for (const exp of prev) {
        const isFullReturn =
          typeof exp.title === 'string' &&
          exp.title.startsWith('مرتجع فاتورة #');

        const isPartialReturn =
          typeof exp.title === 'string' &&
          exp.title.startsWith('مرتجع جزئي فاتورة #');

        let key: string | null = null;

        if (isFullReturn) {
          key = exp.title; 
        } else if (isPartialReturn) {
          key = `${exp.title}__${exp.amount}`; 
        }

        if (key) {
          if (seen.has(key)) continue;
          seen.add(key);
        }

        cleaned.push(exp);
      }

      return cleaned;
    });
  }, []);

  const [staff, setStaff] = useState<Staff[]>(() =>
    getSavedData('cf_staff', [])
  );

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() =>
    getSavedData('cf_activity_logs', [])
  );

  useEffect(() => {
    localStorage.setItem('cf_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('cf_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('cf_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('cf_external_books', JSON.stringify(externalBooks));
  }, [externalBooks]);

  useEffect(() => {
    localStorage.setItem('cf_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('cf_booking_receipts', JSON.stringify(bookingReceipts));
  }, [bookingReceipts]);

  useEffect(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoff = sixMonthsAgo.getTime();

    setInvoices((prev) => {
      const pruned = prev.filter(
        (inv) => new Date(inv.date).getTime() >= cutoff
      );
      return pruned.length === prev.length ? prev : pruned;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('cf_debts', JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem('cf_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('cf_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('cf_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('cf_activity_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const backupData = {
          timestamp: new Date().toISOString(),
          services,
          invoices,
          debts,
          teachers,
          expenses,
          staff,
          activityLogs,
          externalBooks,
          bookings,
          bookingReceipts,
          users,
        };

        const response = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupData),
        });

        if (response.ok) {
          console.log('Auto-backup (local) completed at', new Date().toISOString());
        } else {
          console.error('Failed to save local backup');
        }

        const dropboxToken = (localStorage.getItem('dropbox_token') || '').trim();
        if (dropboxToken) {
          try {
            await fetch('https://content.dropboxapi.com/2/files/upload', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${dropboxToken}`,
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({
                  path: '/CenterFive/CenterFive_Backup.json',
                  mode: 'overwrite',
                  autorename: false,
                  mute: true,
                }),
              },
              body: JSON.stringify(backupData, null, 2),
            });

            console.log(
              'Auto-backup (Dropbox) completed at',
              new Date().toISOString()
            );
          } catch (e) {
            console.error('Auto-backup (Dropbox) failed', e);
          }
        }
      } catch (error) {
        console.error('Error during auto-backup:', error);
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [
    services,
    invoices,
    debts,
    teachers,
    expenses,
    staff,
    activityLogs,
    externalBooks,
    bookings,
    bookingReceipts,
    users,
  ]);

  const notify = (
    message: string,
    type: AppNotification['type'] = 'WARNING'
  ) => {
    const id = Date.now().toString();

    setNotifications((prev) => [...prev, { id, message, type }]);

    if (notificationTimers.current[id]) {
      clearTimeout(notificationTimers.current[id]);
    }

    notificationTimers.current[id] = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      delete notificationTimers.current[id];
    }, 4000);
  };

  const removeNotification = (id: string) => {
    if (notificationTimers.current[id]) {
      clearTimeout(notificationTimers.current[id]);
      delete notificationTimers.current[id];
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const addLog = (
    action: string,
    details: string,
    type: ActivityLog['type']
  ) => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      action,
      details,
      user:
        role === UserRole.ADMIN
          ? 'عثمان إبراهيم'
          : currentUser?.username || 'كاشير المحل',
      role,
      timestamp: getLocalISOString(),
      type,
    };

    setActivityLogs((prev) => [newLog, ...prev].slice(0, 1000));
  };

  const handleLogin = (userRole: UserRole, user?: UserAccount) => {
    setRole(userRole);

    if (userRole === UserRole.ADMIN && !user) {
      setCurrentUser({
        id: 'admin',
        username: 'المدير',
        password: '',
        role: UserRole.ADMIN,
        createdAt: getLocalISOString(),
      });
    } else {
      setCurrentUser(user || null);
    }

    setIsLoggedIn(true);

    addLog('تسجيل دخول', 'قام المستخدم بالدخول إلى النظام', 'SYSTEM');
    notify('تم تسجيل الدخول بنجاح', 'SUCCESS');
  };

  const handleLogout = () => {
    addLog('تسجيل خروج', 'قام المستخدم بالخروج من النظام', 'SYSTEM');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const handleImportData = (allData: any) => {
    if (!allData || typeof allData !== 'object') {
      alert('الملف غير صالح');
      return;
    }

    const safeSet = (key: string, value: any) =>
      localStorage.setItem(key, JSON.stringify(value ?? []));

    safeSet('cf_services', allData.services);
    safeSet('cf_invoices', allData.invoices);
    safeSet('cf_debts', allData.debts);
    safeSet('cf_teachers', allData.teachers);
    safeSet('cf_expenses', allData.expenses);
    safeSet('cf_staff', allData.staff);
    safeSet('cf_activity_logs', allData.activityLogs);

    setServices(allData.services || []);
    setInvoices(allData.invoices || []);
    setDebts(allData.debts || []);
    setTeachers(allData.teachers || []);
    setExpenses(allData.expenses || []);
    setStaff(allData.staff || []);
    setActivityLogs(allData.activityLogs || []);

    notify('تم استيراد النسخة الاحتياطية بنجاح', 'SUCCESS');
  };

  const handleResetAllData = () => {
    if (window.confirm('هل أنت متأكد من حذف كافة البيانات؟')) {
      localStorage.removeItem('cf_services');
      localStorage.removeItem('cf_invoices');
      localStorage.removeItem('cf_debts');
      localStorage.removeItem('cf_teachers');
      localStorage.removeItem('cf_expenses');
      localStorage.removeItem('cf_staff');
      localStorage.removeItem('cf_activity_logs');
      localStorage.removeItem('cf_external_books');
      localStorage.removeItem('cf_bookings');
      localStorage.removeItem('cf_booking_receipts');

      setServices([]);
      setInvoices([]);
      setDebts([]);
      setTeachers([]);
      setExpenses([]);
      setStaff([]);
      setActivityLogs([]);
      setExternalBooks([]);
      setBookings([]);
      setBookingReceipts([]);
      addLog('تصفير النظام', 'تم مسح كافة بيانات النظام', 'SYSTEM');
      notify('تم تصفير النظام بالكامل', 'SUCCESS');
    }
  };

  const handleDeleteTeacherCompletely = (teacherId: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    setServices((prev) => prev.filter((s) => (s as any).teacherId !== teacherId));

    addLog('حذف ملف مدرس', 'تم حذف ملف المدرس وجميع مذكراته من النظام', 'SYSTEM');
    notify('تم حذف المدرس وجميع مذكراته بنجاح', 'SUCCESS');
  };

  const updateInvoiceStatus = (id: string, status: 'PAID' | 'RETURNED') => {
    setInvoices((prev) => {
      const inv = prev.find((i) => i.id === id);
      if (!inv) return prev;
      if (status === 'RETURNED') {
        if (returnLocksRef.current[id]) return prev;
        returnLocksRef.current[id] = true;
      }
      if (status === 'RETURNED' && inv.status === 'RETURNED') {
        return prev;
      }
      if (inv.status === status) {
        return prev;
      }

      if (status === 'RETURNED') {
        setTeachers((tPrev) => {
          return tPrev.map((teacher) => {
            const itemsForThisTeacher = inv.items.filter(
              (item) => item.teacherId === teacher.id
            );

            if (itemsForThisTeacher.length === 0) return teacher;

            return {
              ...teacher,
              history: (teacher.history || []).filter(
                (h) => h.invoiceId !== inv.id
              ),
            };
          });
        });
        if (inv.isDebt) {
          setDebts((debtPrev) =>
            debtPrev.map((client) => {
              if (
                client.customerName.trim().toLowerCase() ===
                inv.customerName.trim().toLowerCase()
              ) {
                return {
                  ...client,
                  totalDebt: client.totalDebt - inv.total,
                  remainingAmount: client.remainingAmount - inv.total,
                  history: [
                    ...client.history,
                    {
                      service: `مرتجع فاتورة #${inv.id}`,
                      amount: -inv.total,
                      date: getLocalISOString(),
                      note: 'إلغاء مديونية بسبب مرتجع',
                    },
                  ],
                };
              }
              return client;
            })
          );
        }

        if (!inv.isDebt) {
          setExpenses((prevExp) => {
            const title = `مرتجع فاتورة #${inv.id}`;
            const alreadyExists = prevExp.some((exp) => exp.title === title);
            if (alreadyExists) return prevExp;

            const returnExpense: Expense = {
              id: `RETURN_${inv.id}`,
              title,
              amount: inv.total,
              date: getLocalISOString(),
              category: 'RETURNS',
              description: `خصم قيمة المرتجع النقدي من الخزينة (عميل: ${inv.customerName})`,
            };

            return [returnExpense, ...prevExp];
          });
        }
      }

      addLog(
        status === 'RETURNED' ? 'إرجاع فاتورة' : 'إعادة تفعيل فاتورة',
        `تعديل حالة الفاتورة رقم #${inv.id} الخاصة بـ ${inv.customerName}`,
        'SALE'
      );

      return prev.map((item) =>
        item.id === id ? { ...item, status } : item
      );
    });

    notify('تم تحديث الفاتورة بنجاح', 'SUCCESS');
  };

  const partialReturnInvoice = (
    invoiceId: string,
    returnedItems: { serviceId: string; quantity: number }[]
  ) => {
    if (returnLocksRef.current[invoiceId]) return;
    returnLocksRef.current[invoiceId] = true;

    setTimeout(() => {
      delete returnLocksRef.current[invoiceId];
    }, 800);

    setInvoices((prev) => {
      const inv = prev.find((i) => i.id === invoiceId);
      if (!inv) return prev;

      if (inv.status === 'RETURNED') {
        notify('لا يمكن عمل مرتجع جزئي لفاتورة مرتجعة بالكامل', 'WARNING');
        return prev;
      }

      const map = new Map(
        returnedItems.map((x) => [x.serviceId, Number(x.quantity || 0)])
      );

      if (map.size === 0) return prev;

      let refundAmount = 0;

      const newItems = inv.items
        .map((it) => {
          const q = map.get(it.serviceId) || 0;
          if (q <= 0) return it;

          const safeQ = Math.min(q, it.quantity);
          refundAmount += safeQ * Number(it.pricePerUnit || 0);

          const remainingQty = it.quantity - safeQ;

          return {
            ...it,
            quantity: remainingQty,
            total: remainingQty * Number(it.pricePerUnit || 0),
          };
        })
        .filter((it) => it.quantity > 0);

      if (refundAmount <= 0) {
        notify('لم يتم اختيار أي كمية صحيحة للمرتجع', 'WARNING');
        return prev;
      }

      const newTotal = Math.max(0, inv.total - refundAmount);

      setTeachers((tPrev) => {
        return tPrev.map((teacher) => {
          const hadAny = (inv.items || []).some(
            (i) => i.teacherId === teacher.id
          );

          if (!hadAny) return teacher;

          const cleaned = (teacher.history || []).filter(
            (h) => h.invoiceId !== inv.id
          );

          const remainingForTeacher = newItems.filter(
            (i) => i.teacherId === teacher.id
          );

          if (remainingForTeacher.length === 0) {
            return { ...teacher, history: cleaned };
          }

          const entryType = inv.isDebt ? 'DEBT' : 'NOTES';

          const rebuilt = remainingForTeacher.map((i) => ({
            id: Date.now().toString() + Math.random().toString(16).slice(2),
            invoiceId: inv.id,
            date: inv.date,
            serviceName: i.name,
            quantity: i.quantity,
            entryType,
          }));

          return { ...teacher, history: [...cleaned, ...rebuilt] };
        });
      });

      if (inv.isDebt) {
        setDebts((debtPrev) =>
          debtPrev.map((client) => {
            if (
              client.customerName.trim().toLowerCase() !==
              inv.customerName.trim().toLowerCase()
            )
              return client;

            return {
              ...client,
              totalDebt: client.totalDebt - refundAmount,
              remainingAmount: client.remainingAmount - refundAmount,
              history: [
                ...client.history,
                {
                  service: `مرتجع جزئي فاتورة #${inv.id}`,
                  amount: -refundAmount,
                  date: getLocalISOString(),
                  note: 'مرتجع جزئي',
                },
              ],
            };
          })
        );
      } else {
        setExpenses((prevExp) => {
          const title = `مرتجع جزئي فاتورة #${inv.id}`;
          const alreadyExists = prevExp.some(
            (exp) => exp.title === title && exp.amount === refundAmount
          );

          if (alreadyExists) return prevExp;

          const returnExpense: Expense = {
            id: `PARTIAL_RETURN_${inv.id}_${Math.floor(refundAmount)}`,
            title,
            amount: refundAmount,
            date: getLocalISOString(),
            category: 'RETURNS',
            description: `خصم قيمة المرتجع الجزئي من الخزينة (عميل: ${inv.customerName})`,
          };

          return [returnExpense, ...prevExp];
        });
      }

      addLog(
        'مرتجع جزئي',
        `تم عمل مرتجع جزئي للفاتورة #${inv.id} بقيمة ${refundAmount}`,
        'SALE'
      );

      notify('تم تنفيذ المرتجع الجزئي بنجاح', 'SUCCESS');

      return prev.map((x) =>
        x.id === inv.id ? { ...x, items: newItems, total: newTotal } : x
      );
    });
  };

  const handleDeleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    addLog('حذف فاتورة', `تم حذف الفاتورة رقم #${id} نهائياً`, 'SALE');
    notify('تم حذف الفاتورة نهائياً', 'SUCCESS');
  };

  const handleAddInvoice = (
    invoice: Invoice,
    isDebt: boolean,
    isTeacherDebt: boolean
  ) => {
    setInvoices((prev) => [{ ...invoice, status: 'PAID', isDebt }, ...prev]);

    addLog(
      'فاتورة جديدة',
      `إنشاء فاتورة #${invoice.id} بقيمة ${invoice.total} ج.م`,
      'SALE'
    );

    setTeachers((tPrev) => {
      return tPrev.map((teacher) => {
        const ownerNoteItems = (invoice.items || []).filter(
          (item: any) => item.teacherId === teacher.id
        );
        const debtTeacherItems = (invoice.items || []).filter(
          (item: any) => item.debtTeacherId === teacher.id
        );

        if (ownerNoteItems.length === 0 && debtTeacherItems.length === 0)
          return teacher;
        const notesHistory = ownerNoteItems.map((item: any) => ({
          invoiceId: invoice.id,
          serviceName: item.name,
          quantity: item.quantity,
          amount: 0,
          priced: false,
          date: invoice.date,
          entryType: 'NOTES' as const,
        }));
        const debtHistory = debtTeacherItems.map((item: any) => ({
          invoiceId: invoice.id,
          serviceName: item.name,
          ownerTeacherName: (item as any).ownerTeacherName || null,
          quantity: item.quantity,
          amount: 0,
          priced: false,
          date: invoice.date,
          entryType: 'DEBT' as const,
        }));
        const debtQty = debtTeacherItems.reduce((acc: number, item: any) => {
          const qty = Number(item.quantity) || 0;
          return acc + qty;
        }, 0);

        return {
          ...teacher,
          totalDebt: teacher.totalDebt + debtQty,
          remainingAmount: teacher.remainingAmount + debtQty,
          history: [...(teacher.history || []), ...notesHistory, ...debtHistory],
        };
      });
    });

    if (isDebt && !isTeacherDebt) {
      const cleanName = invoice.customerName.trim();

      setDebts((prev) => {
        const existingClient = prev.find(
          (d) =>
            d.customerName.trim().toLowerCase() === cleanName.toLowerCase()
        );

        const serviceSummary = invoice.items
          .map((i) => `${i.name} (${i.quantity})`)
          .join(' + ');

        if (existingClient) {
          return prev.map((d) =>
            d.id === existingClient.id
              ? {
                  ...d,
                  totalDebt: d.totalDebt + invoice.total,
                  remainingAmount: d.remainingAmount + invoice.total,
                  history: [
                    ...d.history,
                    {
                      service: `فاتورة #${invoice.id}: ${serviceSummary}`,
                      amount: invoice.total,
                      date: invoice.date,
                      note: 'ترحيل تلقائي من المبيعات',
                    },
                  ],
                }
              : d
          );
        } else {
          const newDebt: ClientDebt = {
            id: Date.now().toString(),
            customerName: cleanName,
            totalDebt: invoice.total,
            paidAmount: 0,
            remainingAmount: invoice.total,
            history: [
              {
                service: `فاتورة #${invoice.id}: ${serviceSummary}`,
                amount: invoice.total,
                date: invoice.date,
                note: 'عميل جديد - ترحيل آلي',
              },
            ],
            payments: [],
          };

          return [...prev, newDebt];
        }
      });
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} users={users} />;
  }

  return (
    <Router>
      <div className="min-h-screen flex bg-gray-50 overflow-hidden text-right" dir="rtl">
        {}
        <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3 w-full max-w-[320px] pointer-events-none no-print items-start">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="relative overflow-hidden group p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border border-gray-100 flex items-start gap-3 animate-notification pointer-events-auto w-full"
            >
              <div
                className={`mt-0.5 shrink-0 p-1.5 rounded-xl ${
                  n.type === 'SUCCESS'
                    ? 'bg-green-50 text-green-600'
                    : n.type === 'ERROR'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-amber-50 text-amber-600'
                }`}
              >
                {n.type === 'SUCCESS' ? (
                  <CheckCircle2 size={18} />
                ) : n.type === 'ERROR' ? (
                  <XCircle size={18} />
                ) : (
                  <AlertTriangle size={18} />
                )}
              </div>

              <div className="flex-1 pr-1">
                <p className="font-bold text-gray-800 text-sm leading-snug">
                  {n.message}
                </p>
                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tight">
                  نظام سنتر فايف
                </p>
              </div>

              <button
                onClick={() => removeNotification(n.id)}
                className="text-gray-300 hover:text-gray-500 transition-colors p-1"
              >
                <X size={14} />
              </button>

              <div className="absolute bottom-0 left-0 h-[3px] bg-gray-100 w-full">
                <div
                  className={`h-full animate-progress ${
                    n.type === 'SUCCESS'
                      ? 'bg-green-500'
                      : n.type === 'ERROR'
                        ? 'bg-red-500'
                        : 'bg-amber-500'
                  }`}
                  style={{ animationDuration: '4s' }}
                />
              </div>
            </div>
          ))}
        </div>

        {}
        {}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside
          className={
            "bg-white border-l border-gray-200 shadow-sm flex flex-col no-print z-50 " +
            "lg:w-64 lg:static lg:translate-x-0 " +
            "fixed top-0 right-0 h-screen w-64 transition-transform duration-200 " +
            (isSidebarOpen ? "translate-x-0" : "translate-x-full")
          }
        >
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <img
              src={logo}
              alt="Center Five Logo"
              className="w-10 h-10 object-contain shrink-0"
            />
            <div className="text-right">
              <h1 className="font-bold text-lg text-[#8000FF] leading-none">
                سنتر فايف
              </h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-wider mt-1">
                CENTER FIVE
              </p>
            </div>
          </div>

          <nav
            className="flex-1 p-4 space-y-1"
            onClick={() => setIsSidebarOpen(false)}
          >
            <SidebarLink to="/" icon={ICONS.Dashboard} label="لوحة التحكم" />
            <SidebarLink to="/sales" icon={ICONS.Sales} label="المبيعات" />
            <SidebarLink to="/bookings" icon={ICONS.Clipboard} label="الحجوزات" />

            {role === UserRole.ADMIN && (
              <SidebarLink
                to="/teachers"
                icon={ICONS.Teachers}
                label="شؤون المدرسين"
              />
            )}

            <SidebarLink
              to="/debts"
              icon={ICONS.Debts}
              label="المديونيات العامة"
            />
            <SidebarLink
              to="/expenses"
              icon={ICONS.Expenses}
              label="المصروفات"
            />

            {role === UserRole.ADMIN && (
              <>
                <SidebarLink
                  to="/reports"
                  icon={ICONS.Reports}
                  label="التقارير"
                />
                <SidebarLink
                  to="/activity"
                  icon={ICONS.History}
                  label="سجل النشاط"
                />
                <SidebarLink
                  to="/cashiers"
                  icon={ICONS.Cashiers}
                  label="حسابات الكاشير"
                />
                <SidebarLink
                  to="/data"
                  icon={ICONS.Database}
                  label="إدارة البيانات"
                />
              </>
            )}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2 text-right">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#8000FF]/10 rounded-lg text-[#8000FF] shrink-0 shadow-sm">
                  {ICONS.User}
                </div>

                <div className="text-right flex-1">
                  <p className="text-[10px] text-gray-400 font-bold">
                    المستخدم الحالي
                  </p>
                  <p className="text-sm font-bold text-gray-800 truncate">
                    {role === UserRole.ADMIN
                      ? 'عثمان إبراهيم'
                      : currentUser?.username || 'كاشير المحل'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full mt-2 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </aside>

        {}
        <main className="flex-1 overflow-y-auto relative h-screen">
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-3 px-3 md:p-4 md:px-8 flex justify-between items-center no-print">
            <div className="flex items-center gap-2">
              {}
              <button
                className="lg:hidden p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <span className="p-1.5 bg-[#8000FF]/10 text-[#8000FF] rounded-md shrink-0">
                <CurrentPageIcon />
              </span>
              <CurrentPageTitle />
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-gray-400 text-sm">النظام المحاسبي</span>
            </div>

            <LiveClock />
          </header>

          <div className="p-3 md:p-6 lg:p-8">
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    invoices={invoices}
                    debts={debts}
                    expenses={expenses}
                    bookingReceipts={bookingReceipts}
                    bookings={bookings}
                  />
                }
              />

              <Route
                path="/sales"
                element={
                  <Sales
                    services={services}
                    invoices={invoices}
                    debts={debts}
                    teachers={teachers}
                    notify={notify}
                    onAddInvoice={handleAddInvoice}
                    onUpdateInvoiceStatus={updateInvoiceStatus}
                    onPartialReturnInvoice={partialReturnInvoice}
                    onDeleteInvoice={handleDeleteInvoice}
                    role={role}
                    currentUser={currentUser}
                    onAddService={(s) => setServices((prev) => [...prev, s])}
                    onUpdateService={(s) =>
                      setServices((prev) =>
                        prev.map((item) => (item.id === s.id ? s : item))
                      )
                    }
                    onDeleteService={(id) =>
                      setServices((prev) => prev.filter((s) => s.id !== id))
                    }
                  />
                }
              />

              <Route
                path="/bookings"
                element={
                  <Bookings
                    role={role}
                    currentUser={currentUser}
                    teachers={teachers}
                    externalBooks={externalBooks}
                    bookings={bookings}
                    bookingReceipts={bookingReceipts}
                    onUpdateExternalBooks={setExternalBooks}
                    onUpdateBookings={setBookings}
                    onUpdateBookingReceipts={setBookingReceipts}
                    onUpdateTeachers={setTeachers}
                    notify={notify}
                    addLog={addLog}
                  />
                }
              />

              <Route
                path="/debts"
                element={
                  <Debts
                    debts={debts}
                    onUpdateDebts={setDebts}
                    onDeleteDebtClient={(id) =>
                      setDebts((prev) => prev.filter((d) => d.id !== id))
                    }
                    addLog={addLog}
                    notify={notify}
                    role={role}
                  />
                }
              />

              <Route
                path="/expenses"
                element={
                  <Expenses
                    expenses={expenses}
                    staff={staff}
                    role={role}
                    notify={notify}
                    onUpdateExpenses={setExpenses}
                    onUpdateStaff={setStaff}
                    onDeleteExpense={(id) =>
                      setExpenses((prev) => prev.filter((e) => e.id !== id))
                    }
                    onAddStaff={(name, salary) =>
                      setStaff((prev) => [
                        ...prev,
                        {
                          id: Date.now().toString(),
                          name,
                          salary,
                          withdrawals: [],
                          bonuses: [],
                          penalties: [],
                        },
                      ])
                    }
                    addLog={addLog}
                  />
                }
              />

              {role === UserRole.ADMIN ? (
                <>
                  <Route
                    path="/teachers"
                    element={
                      <Teachers
                        teachers={teachers}
                        onUpdateTeachers={setTeachers}
                        onDeleteTeacherCompletely={handleDeleteTeacherCompletely}
                        addLog={addLog}
                        notify={notify}
                      />
                    }
                  />

                  <Route
                    path="/cashiers"
                    element={
                      <Cashiers users={users} onUpdateUsers={setUsers} notify={notify} />
                    }
                  />

                  <Route
                    path="/reports"
                    element={
                      <Reports
                        invoices={invoices}
                        expenses={expenses}
                        debts={debts}
                        teachers={teachers}
                        bookings={bookings}
                        bookingReceipts={bookingReceipts}
                      />
                    }
                  />

                  <Route path="/activity" element={<ActivityLogs logs={activityLogs} />} />

                  <Route
                    path="/data"
                    element={
                      <DataManagement
                        data={{ services, invoices, debts, teachers, expenses, staff, activityLogs }}
                        onImport={handleImportData}
                        onReset={handleResetAllData}
                        notify={notify}
                        users={users}
                        onUpdateUsers={setUsers}
                      />
                    }
                  />
                </>
              ) : (
                <Route path="*" element={<Navigate to="/" />} />
              )}
            </Routes>
          </div>
        </main>

        <style>{`
          @keyframes notificationIn {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes progressShrink {
            from { width: 100%; }
            to { width: 0%; }
          }
          .animate-notification {
            animation: notificationIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }
          .animate-progress {
            animation-name: progressShrink;
            animation-timing-function: linear;
            animation-fill-mode: forwards;
          }
        `}</style>
      </div>
    </Router>
  );
};

const SidebarLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
}> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-[#8000FF] text-white shadow-lg shadow-[#8000FF]/20'
          : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <span className={isActive ? 'text-[#FFD700]' : ''}>{icon}</span>
      <span className="font-bold text-sm">{label}</span>
    </Link>
  );
};

const CurrentPageTitle: React.FC = () => {
  const location = useLocation();

  const titles: Record<string, string> = {
    '/': 'لوحة التحكم',
    '/sales': 'المبيعات',
    '/bookings': 'الحجوزات',
    '/teachers': 'شؤون المدرسين',
    '/debts': 'المديونيات العامة',
    '/expenses': 'المصروفات',
    '/reports': 'التقارير',
    '/activity': 'سجل النشاط',
    '/data': 'إدارة البيانات',
  };

  return (
    <span className="font-bold text-gray-800">
      {titles[location.pathname] || 'لوحة التحكم'}
    </span>
  );
};

const CurrentPageIcon: React.FC = () => {
  const location = useLocation();

  const icons: Record<string, React.ReactNode> = {
    '/': ICONS.Dashboard,
    '/sales': ICONS.Sales,
    '/bookings': ICONS.Clipboard,
    '/teachers': ICONS.Teachers,
    '/debts': ICONS.Debts,
    '/expenses': ICONS.Expenses,
    '/reports': ICONS.Reports,
    '/activity': ICONS.History,
    '/data': ICONS.Database,
  };

  return <>{icons[location.pathname] || ICONS.Dashboard}</>;
};

export default App;
