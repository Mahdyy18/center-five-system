
import logo from '../assets/logo.png';
import React, { useState, useMemo } from 'react';
import { Invoice, Expense, ClientDebt, Teacher, BookingReceipt, Booking } from '../types';
import { ICONS } from '../constants';
import { printHtml } from "../utils/printService";


interface ReportsProps {
  invoices: Invoice[];
  expenses: Expense[];
  debts: ClientDebt[];
  teachers: Teacher[];
  bookings?: Booking[];
  bookingReceipts?: BookingReceipt[];
}

const Reports: React.FC<ReportsProps> = ({ invoices, expenses, debts, teachers, bookings = [], bookingReceipts = [] }) => {
  
  
  const getEgyptDateString = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
  };

  const formatEgyptDate = (iso: string) => {
    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(iso));
  };

  const todayStr = getEgyptDateString();
  const currentMonthStr = todayStr.slice(0, 7);
  const [reportType, setReportType] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [cashierFilter, setCashierFilter] = useState<string>('ALL');
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const filteredData = useMemo(() => {
    let filterStr = reportType === 'DAILY' ? selectedDate : selectedMonth;
    const filteredInvoices = invoices.filter(inv => inv.date.startsWith(filterStr));
    const filteredExpenses = expenses.filter(exp => exp.date.startsWith(filterStr));
    const filteredBookings = bookings.filter(b => b.createdAt.startsWith(filterStr));
    const filteredBookingReceipts = bookingReceipts.filter(r => r.date.startsWith(filterStr));
    const debtCollections: { customerName: string; amount: number; date: string; note: string; type: string; cashierName?: string }[] = [];
    
    debts.forEach(debt => {
      (debt.payments || []).forEach(pay => {
        if (pay.date.startsWith(filterStr)) {
          debtCollections.push({
            customerName: debt.customerName,
            amount: pay.amount,
            date: pay.date,
            note: pay.note,
            type: 'عميل عام'
          });
        }
      });
    });

    teachers.forEach(teacher => {
      (teacher.payments || []).forEach(pay => {
        if (pay.date.startsWith(filterStr)) {
          debtCollections.push({
            customerName: teacher.name,
            amount: pay.amount,
            date: pay.date,
            note: pay.note,
            type: 'مدرس'
          });
        }
      });
    });

    return { 
      invoices: filteredInvoices, 
      expenses: filteredExpenses,
      bookings: filteredBookings,
      bookingReceipts: filteredBookingReceipts,
      debtCollections 
    };
  }, [reportType, selectedDate, selectedMonth, invoices, expenses, debts, teachers, bookings, bookingReceipts]);

  const stats = useMemo(() => {
    const paidInvoices = filteredData.invoices.filter(inv => inv.status !== 'RETURNED');
    const returnedInvoices = filteredData.invoices.filter(inv => inv.status === 'RETURNED');
    
    const cashSalesRevenue = paidInvoices.filter(i => !i.isDebt).reduce((sum, inv) => sum + inv.total, 0);
    const debtSalesValue = paidInvoices.filter(i => i.isDebt).reduce((sum, inv) => sum + inv.total, 0);
    const totalSalesValue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalCollections = filteredData.debtCollections.reduce((sum, col) => sum + col.amount, 0);
    const totalBookingReceipts = filteredData.bookingReceipts.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
    const totalAllCollections = totalCollections + totalBookingReceipts;
    
    const totalReturns = returnedInvoices.reduce((sum, inv) => sum + inv.total, 0);

const totalExpenses = filteredData.expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const totalCashIn = cashSalesRevenue + totalAllCollections;
    
    const productCounts: Record<string, { quantity: number; teacherName?: string }> = {};
    paidInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const key = item.teacherName ? `${item.name} [${item.teacherName}]` : item.name;
        if (!productCounts[key]) {
          productCounts[key] = { quantity: 0, teacherName: item.teacherName };
        }
        productCounts[key].quantity += item.quantity;
      });
    });

    return {
      totalSalesValue,
      cashSalesRevenue,
      debtSalesValue,
      totalCollections,
      totalBookingReceipts,
      totalAllCollections,
      totalCashIn,
      totalReturns,
      totalExpenses,
      netCashProfit: totalCashIn - totalExpenses,
      productCounts: Object.entries(productCounts).sort((a, b) => b[1].quantity - a[1].quantity),
      salesByCashier: paidInvoices.reduce((acc: Record<string, number>, inv) => {
        const key = inv.cashierName || 'غير محدد';
        acc[key] = (acc[key] || 0) + (inv.total || 0);
        return acc;
      }, {}),
      invoicesByCashier: paidInvoices.reduce((acc: Record<string, Invoice[]>, inv) => {
        const key = inv.cashierName || 'غير محدد';
        acc[key] = acc[key] || [];
        acc[key].push(inv);
        return acc;
      }, {}),
      countInvoices: paidInvoices.length,
      countDebtInvoices: paidInvoices.filter(i => i.isDebt).length,
      countReturns: returnedInvoices.length,
      countCollections: filteredData.debtCollections.length
    };
  }, [filteredData]);

  
  const cashierOptions = useMemo(() => {
    return Object.keys(stats.invoicesByCashier || {}).sort((a, b) => a.localeCompare(b));
  }, [stats.invoicesByCashier]);

  const filteredInvoicesByCashier = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();

    const baseEntries = Object.entries(stats.invoicesByCashier || {});
    const entriesAfterCashier = cashierFilter === 'ALL'
      ? baseEntries
      : baseEntries.filter(([cashier]) => cashier === cashierFilter);

    if (!q) return Object.fromEntries(entriesAfterCashier);

    const out: Record<string, Invoice[]> = {};
    entriesAfterCashier.forEach(([cashier, invs]) => {
      const invsFiltered = invs.filter(inv => {
        const customer = (inv.customerName || '').toLowerCase();
        const id = String(inv.id || '').toLowerCase();
        return customer.includes(q) || id.includes(q);
      });
      if (invsFiltered.length) out[cashier] = invsFiltered;
    });
    return out;
  }, [stats.invoicesByCashier, cashierFilter, invoiceSearch]);

  const handlePrint = async () => {

    const reportTitle = reportType === 'DAILY' ? `تقرير يومي - ${selectedDate}` : `تقرير شهري - ${selectedMonth}`;
    
    const productsHtml = stats.productCounts.map(([name, data]) => `
      <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
        <span>${name}</span>
        <span style="font-weight: bold;">${data.quantity} قطعة</span>
      </div>
    `).join('');

    const salesRows = filteredData.invoices.map(inv => [
      `#${inv.id}`,
      inv.customerName,
      inv.cashierName || 'غير محدد',
      inv.isDebt ? '<span style="color: #ef4444; font-weight: bold;">آجل</span>' : 'نقدي',
      inv.status === 'RETURNED' ? 'مرتجع' : 'مدفوع',
      inv.isDebt ? `<span style="color: #ef4444;">-${inv.total.toLocaleString()} ج.م</span>` : `${inv.total.toLocaleString()} ج.م`
    ]);

    const bookingRows = filteredData.bookings.map(booking => [
      `#${booking.code}`,
      booking.customerName,
      booking.createdByName || 'غير محدد',
      booking.status === 'DELIVERED' ? 'تم التسليم' : booking.status === 'CANCELED' ? 'ملغي' : 'قيد الانتظار',
      booking.totalAmount.toLocaleString(),
      booking.paidAmount.toLocaleString(),
      booking.remainingAmount.toLocaleString()
    ]);

    const bookingReceiptRows = filteredData.bookingReceipts.map(receipt => [
      `#${receipt.code}`,
      receipt.customerName,
      receipt.cashierName || 'غير محدد',
      formatEgyptDate(receipt.date),
      `<span style="color: #10b981;">+${receipt.paidAmount.toLocaleString()} ج.م</span>`
    ]);

    const collectionRows = filteredData.debtCollections.map(col => [
      col.customerName,
      col.type,
      formatEgyptDate(col.date),
      col.note || '-',
      `<span style="color: #10b981;">+${col.amount.toLocaleString()} ج.م</span>`
    ]);

    const expenseRows = filteredData.expenses.map(exp => [
      exp.title,
      exp.category === 'STAFF' ? 'موظفين' : 'عام',
      formatEgyptDate(exp.date),
      `<span style="color: #ef4444;">-${exp.amount.toLocaleString()} ج.م</span>`
    ]);

    const html = `
      <html dir="rtl" lang="ar">
      <head>
        <title>${reportTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
          body { font-family: 'Tajawal', sans-serif; padding: 30px; color: #333; }
          .header { text-align: center; border-bottom: 4px solid #8000FF; padding-bottom: 20px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 30px 0; }
          .stat-card { border: 1px solid #eee; padding: 15px; border-radius: 10px; text-align: center; }
          .stat-card b { display: block; font-size: 20px; margin-top: 5px; color: #8000FF; }
          .stat-card.negative b { color: #ef4444; }
          .table-container { margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; text-align: right; }
          th { background: #8000FF; color: white; padding: 12px; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          .liquidity-box { background: #8000FF; color: white; padding: 20px; border-radius: 15px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logo}" alt="Center Five" style="width:80px; height:auto; display:block; margin:0 auto 10px;" />
          <h1>سنتر فايف - CENTER FIVE</h1>
          <h2>${reportTitle}</h2>
          <p>تاريخ الاستخراج: ${new Date().toLocaleString('ar-EG')}</p>
        </div>

        <div class="summary">
          <div class="stat-card">إجمالي المبيعات (القيمة)<b>${stats.totalSalesValue.toLocaleString()} ج.م</b></div>
          <div class="stat-card negative">مديونيات مبيعات جديدة<b>-${stats.debtSalesValue.toLocaleString()} ج.م</b></div>
          <div class="stat-card">إجمالي التحصيلات (ديون)<b>+${stats.totalCollections.toLocaleString()} ج.م</b></div>
          <div class="stat-card negative">إجمالي المصروفات<b>-${stats.totalExpenses.toLocaleString()} ج.م</b></div>
          <div class="stat-card">مبيعات نقدية فورية<b>+${stats.cashSalesRevenue.toLocaleString()} ج.م</b></div>
        </div>

        <div class="liquidity-box">
          <h3 style="margin:0;">صافي السيولة النقدية المتوفرة بالخزينة</h3>
          <p style="font-size: 32px; font-weight: 900; margin: 10px 0;">${stats.netCashProfit.toLocaleString()} ج.م</p>
          <small>(المبيعات النقدية + كافة التحصيلات - كافة المصروفات)</small>
        </div>

        <div class="table-container">
          <h3 style="border-right: 5px solid #8000FF; padding-right: 10px;">الأصناف المباعة</h3>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin-top: 10px;">
            ${productsHtml || '<p style="text-align:center;">لا توجد أصناف مباعة</p>'}
          </div>
        </div>

        <div class="table-container">
          <h3 style="border-right: 5px solid #8000FF; padding-right: 10px;">تفاصيل المبيعات</h3>
          <table>
            <thead><tr><th>الرقم</th><th>العميل</th><th>النوع</th><th>الحالة</th><th>القيمة</th></tr></thead>
            <tbody>${salesRows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>

        <div class="table-container">
          <h3 style="border-right: 5px solid #10b981; padding-right: 10px;">تفاصيل الحجوزات</h3>
          <table>
            <thead><tr><th>كود الحجز</th><th>العميل</th><th>الكاشير</th><th>الحالة</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
            <tbody>${bookingRows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>

        <div class="table-container">
          <h3 style="border-right: 5px solid #10b981; padding-right: 10px;">تفاصيل تحصيلات الحجوزات</h3>
          <table>
            <thead><tr><th>كود الإيصال</th><th>العميل</th><th>الكاشير</th><th>التاريخ</th><th>المبلغ</th></tr></thead>
            <tbody>${bookingReceiptRows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>

        <div class="table-container">
          <h3 style="border-right: 5px solid #10b981; padding-right: 10px;">تفاصيل تحصيلات الديون (عملاء ومدرسين)</h3>
          <table>
            <thead><tr><th>اسم الطرف</th><th>النوع</th><th>التاريخ</th><th>ملاحظات</th><th>المبلغ</th></tr></thead>
            <tbody>${collectionRows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>

        <div class="table-container">
          <h3 style="border-right: 5px solid #ef4444; padding-right: 10px;">تفاصيل المصروفات</h3>
          <table>
            <thead><tr><th>البيان</th><th>التصنيف</th><th>التاريخ</th><th>القيمة</th></tr></thead>
            <tbody>${expenseRows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>

        <script>window.onload = function() { window.print(); setTimeout(window.close, 1000); };</script>
      </body>
      </html>
    `;

    
    await printHtml({ html, title: reportTitle });
  };

  return (
    <div className="space-y-8 text-right">
      {}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="p-3 bg-[#8000FF]/10 text-[#8000FF] rounded-2xl">{ICONS.Reports}</span>
          <div>
            <h2 className="text-2xl font-black text-black">مركز التقارير التحليلية</h2>
            <p className="text-xs text-gray-400 font-bold">تحليل المبيعات، كافة المديونيات، والسيولة النقدية</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setReportType('DAILY')} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${reportType === 'DAILY' ? 'bg-[#8000FF] text-white shadow-md' : 'text-gray-500'}`}>يومي</button>
            <button onClick={() => setReportType('MONTHLY')} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${reportType === 'MONTHLY' ? 'bg-[#8000FF] text-white shadow-md' : 'text-gray-500'}`}>شهري</button>
          </div>

          <input 
            type={reportType === 'DAILY' ? 'date' : 'month'} 
            className="px-4 py-2 bg-gray-50 border rounded-xl font-bold text-sm outline-none"
            value={reportType === 'DAILY' ? selectedDate : selectedMonth}
            onChange={(e) => reportType === 'DAILY' ? setSelectedDate(e.target.value) : setSelectedMonth(e.target.value)}
          />

          {}
          <select
            value={cashierFilter}
            onChange={(e) => setCashierFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 border rounded-xl font-bold text-sm outline-none"
          >
            <option value="ALL">كل الكاشير</option>
            {cashierOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {}
          <input
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            placeholder="بحث باسم العميل أو رقم الفاتورة..."
            className="px-4 py-2 bg-gray-50 border rounded-xl font-bold text-sm outline-none min-w-[220px]"
          />

          <button onClick={handlePrint} className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95">
            {ICONS.Print}<span>طباعة التقرير التفصيلي</span>
          </button>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportStatCard title="إجمالي قيمة المبيعات" value={stats.totalSalesValue} sub={`${stats.countInvoices} فاتورة`} color="#8000FF" />
        <ReportStatCard title="المديونيات الجديدة (سالب)" value={stats.debtSalesValue} sub={`${stats.countDebtInvoices} عملية آجل`} color="#ef4444" isMinus />
        <ReportStatCard title="كافة التحصيلات" value={stats.totalAllCollections} sub={`${stats.countCollections + filteredData.bookingReceipts.length} تحصيل نقدي`} color="#10b981" />
        <ReportStatCard title="صافي السيولة بالخزينة" value={stats.netCashProfit} sub="المتوفر نقداً حالياً" color="#8000FF" isHighlight />
      </div>

      {}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-black">
          {ICONS.User}<span>تقرير المبيعات حسب الكاشير</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.salesByCashier)
            .filter(([cashier]) => cashierFilter === 'ALL' || cashier === cashierFilter)
            .sort((a, b) => b[1] - a[1])
            .map(([cashier, total]) => (
              <div key={cashier} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                <span className="font-black text-gray-800 truncate">{cashier}</span>
                <span className="font-black text-[#8000FF]">{total.toLocaleString()} ج.م</span>
              </div>
            ))}
        </div>
      </div>

      {}
      <div className="space-y-6">
        {Object.entries(filteredInvoicesByCashier)
          .sort((a, b) => (stats.salesByCashier[b[0]] || 0) - (stats.salesByCashier[a[0]] || 0))
          .map(([cashier, invs]) => (
            <div key={cashier} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-gray-800">الكاشير: {cashier}</h3>
                <div className="text-sm font-black text-[#8000FF]">إجمالي المبيعات: {(stats.salesByCashier[cashier] || 0).toLocaleString()} ج.م</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-gray-50 text-gray-500 text-xs font-black">
                    <tr>
                      <th className="p-3">الفاتورة</th>
                      <th className="p-3">العميل</th>
                      <th className="p-3 text-center">النوع</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3">القيمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invs.map(inv => (
                      <tr key={inv.id} className={inv.status === 'RETURNED' ? 'bg-red-50/50' : ''}>
                        <td className="p-3 font-black text-[#8000FF]">#{inv.id}</td>
                        <td className="p-3 font-bold">{inv.customerName}</td>
                        <td className="p-3 text-center text-[10px] font-black">{inv.isDebt ? 'آجل' : 'نقدي'}</td>
                        <td className="p-3 text-center text-[10px] font-black">{inv.status === 'RETURNED' ? 'مرتجع' : 'مدفوع'}</td>
                        <td className={`p-3 text-left font-black ${inv.isDebt ? 'text-red-500' : 'text-gray-800'}`}>{inv.isDebt ? '-' : ''}{inv.total.toLocaleString()} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col h-fit">
          <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-[#8000FF]">
            {ICONS.Sales}<span>الأصناف المباعة</span>
          </h3>
          <div className="space-y-3">
            {stats.productCounts.map(([name, data]) => (
              <div key={name} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                <span className="font-bold text-gray-700">{name}</span>
                <span className="bg-[#FFD700] text-gray-900 px-4 py-1 rounded-full font-black text-sm">{data.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {}
        <div className="lg:col-span-2 space-y-8">
          {}
          <ReportSectionTable title="سجل المبيعات" headers={['الفاتورة', 'العميل', 'الكاشير', 'النوع', 'الحالة', 'القيمة']}>
            {filteredData.invoices.map(inv => (
              <tr key={inv.id} className={inv.status === 'RETURNED' ? 'bg-red-50/50' : ''}>
                <td className="p-4 font-black text-[#8000FF]">#{inv.id}</td>
                <td className="p-4 font-bold">{inv.customerName}</td>
                <td className="p-4 font-black text-gray-700">{inv.cashierName || '-'}</td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black ${inv.isDebt ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{inv.isDebt ? 'آجل' : 'نقدي'}</span>
                </td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black ${inv.status === 'RETURNED' ? 'text-red-500' : 'text-gray-400'}`}>{inv.status === 'RETURNED' ? 'مرتجع' : 'مدفوع'}</span>
                </td>
                <td className={`p-4 text-left font-black ${inv.isDebt ? 'text-red-500' : 'text-gray-800'}`}>
                  {inv.isDebt ? '-' : ''}{inv.total.toLocaleString()} ج.م
                </td>
              </tr>
            ))}
          </ReportSectionTable>

          {}
          <ReportSectionTable title="سجل الحجوزات" headers={['كود الحجز', 'العميل', 'الكاشير', 'الحالة', 'الإجمالي', 'المدفوع', 'المتبقي']}>
            {filteredData.bookings.map(booking => {
              const statusColor = booking.status === 'DELIVERED' 
                ? 'bg-green-100 text-green-700' 
                : booking.status === 'CANCELED' 
                ? 'bg-red-100 text-red-700' 
                : 'bg-orange-100 text-orange-700';
              const statusText = booking.status === 'DELIVERED' 
                ? 'تم التسليم' 
                : booking.status === 'CANCELED' 
                ? 'ملغي' 
                : 'قيد الانتظار';
              
              return (
                <tr key={booking.id} className={booking.status === 'CANCELED' ? 'bg-red-50/50' : ''}>
                  <td className="p-4 font-black text-[#8000FF]">#{booking.code}</td>
                  <td className="p-4 font-bold">{booking.customerName}</td>
                  <td className="p-4 font-black text-gray-700">{booking.createdByName || '-'}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${statusColor}`}>
                      {statusText}
                    </span>
                  </td>
                  <td className="p-4 text-left font-black text-gray-800">{booking.totalAmount.toLocaleString()} ج.م</td>
                  <td className="p-4 text-left font-black text-green-600">{booking.paidAmount.toLocaleString()} ج.م</td>
                  <td className="p-4 text-left font-black text-orange-600">{booking.remainingAmount.toLocaleString()} ج.م</td>
                </tr>
              );
            })}
          </ReportSectionTable>

          {}
          <ReportSectionTable title="تحصيلات الحجوزات" headers={['كود الإيصال', 'العميل', 'الكاشير', 'التاريخ', 'المبلغ']}>
            {filteredData.bookingReceipts.map(receipt => (
              <tr key={receipt.id}>
                <td className="p-4 font-black text-[#8000FF]">#{receipt.code}</td>
                <td className="p-4 font-bold">{receipt.customerName}</td>
                <td className="p-4 font-black text-gray-700">{receipt.cashierName || '-'}</td>
                <td className="p-4 text-center text-xs text-gray-400 font-bold">{new Date(receipt.date).toLocaleDateString('ar-EG')} {new Date(receipt.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="p-4 text-left font-black text-[#10b981]">+{receipt.paidAmount.toLocaleString()} ج.م</td>
              </tr>
            ))}
          </ReportSectionTable>

          {}
          <ReportSectionTable title="تحصيلات الديون (عام ومدرسين)" headers={['الطرف', 'النوع', 'التاريخ', 'ملاحظات', 'المبلغ']}>
            {filteredData.debtCollections.map((col, idx) => (
              <tr key={idx}>
                <td className="p-4 font-bold">{col.customerName}</td>
                <td className="p-4 text-center text-[10px] font-black">{col.type}</td>
                <td className="p-4 text-center text-xs text-gray-400 font-bold">{new Date(col.date).toLocaleDateString('ar-EG')}</td>
                <td className="p-4 text-xs font-bold text-gray-500">{col.note || '-'}</td>
                <td className="p-4 text-left font-black text-[#10b981]">+{col.amount.toLocaleString()} ج.م</td>
              </tr>
            ))}
          </ReportSectionTable>

          {}
          <ReportSectionTable title="سجل المصروفات" headers={['البيان', 'التصنيف', 'التاريخ', 'القيمة']}>
            {filteredData.expenses.map(exp => (
              <tr key={exp.id}>
                <td className="p-4 font-bold">{exp.title}</td>
                <td className="p-4 text-center font-bold text-[10px] text-gray-400 uppercase">{exp.category === 'STAFF' ? 'موظفين' : 'عام'}</td>
                <td className="p-4 text-center text-xs text-gray-400 font-bold">{new Date(exp.date).toLocaleDateString('ar-EG')}</td>
                <td className="p-4 text-left font-black text-red-500">-{exp.amount.toLocaleString()} ج.م</td>
              </tr>
            ))}
          </ReportSectionTable>
        </div>
      </div>
    </div>
  );
};

const ReportSectionTable: React.FC<{ title: string; headers: string[]; children: React.ReactNode }> = ({ title, headers, children }) => (
  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="p-6 bg-gray-50 border-b">
      <h3 className="font-black text-gray-800">{title}</h3>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-right text-sm">
        <thead>
          <tr className="bg-gray-100/30 text-gray-400 font-bold">
            {headers.map(h => <th key={h} className="p-4">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {children}
        </tbody>
      </table>
    </div>
  </div>
);

const ReportStatCard: React.FC<{ title: string; value: number; sub: string; color: string; isMinus?: boolean; isHighlight?: boolean }> = ({ title, value, color, isMinus, isHighlight, sub }) => (
  <div className={`bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm transition-all hover:scale-[1.02] ${isHighlight ? 'shadow-xl shadow-[#8000FF]/10 ring-2 ring-[#8000FF]/5' : ''}`}>
    <p className="text-gray-400 text-xs font-bold mb-2">{title}</p>
    <div className="flex items-baseline gap-1 mb-1">
      <span className={`text-2xl font-black ${isMinus && value !== 0 ? 'text-red-500' : 'text-gray-800'}`} style={(!isMinus && !isHighlight) ? {} : isHighlight ? { color } : {}}>
        {isMinus && value > 0 ? '-' : ''}{value.toLocaleString()}
      </span>
      <span className="text-xs font-bold text-gray-400">ج.م</span>
    </div>
    <p className="text-[10px] text-gray-400 font-black">{sub}</p>
  </div>
);

export default Reports;
