import React, { useState, useEffect } from 'react';
import { Invoice, ClientDebt, Expense, BookingReceipt, Booking } from '../types';
import { COLORS, ICONS } from '../constants';

interface DashboardProps {
  invoices: Invoice[];
  debts: ClientDebt[];
  expenses: Expense[];
  bookingReceipts?: BookingReceipt[];
  bookings?: Booking[];
}

const Dashboard: React.FC<DashboardProps> = ({ invoices, debts, expenses, bookingReceipts = [], bookings = [] }) => {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  
  useEffect(() => {
    setLastUpdate(new Date());
  }, [invoices, debts, expenses, bookingReceipts, bookings]);

  const todayInvoices = invoices.filter(inv => inv.date.startsWith(today) && inv.status !== 'RETURNED');

  
  const cashSalesRevenue = todayInvoices
    .filter(inv => !inv.isDebt)
    .reduce((acc, curr) => acc + curr.total, 0);

  
  const todayBookingCashIn = bookingReceipts
    .filter(r => r.date.startsWith(today))
    .reduce((acc, r) => acc + (Number(r.paidAmount) || 0), 0);

  
  const todayDebtCollections = debts
    .flatMap(d => (d.payments || []))
    .filter(p => p.date.startsWith(today))
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  
  const dailyRevenue = cashSalesRevenue + todayDebtCollections + todayBookingCashIn;
  
  const totalDebts = debts.reduce((acc, curr) => acc + curr.remainingAmount, 0);

  
  const dailyExpenses = expenses
    .filter(exp => exp.date.startsWith(today) && exp.category !== 'RETURNS')
    .reduce((acc, curr) => acc + curr.amount, 0);

  
  
  const netProfit = dailyRevenue - dailyExpenses;

  return (
    <div className="space-y-8 text-right">
      <div className="flex justify-between items-end mb-2">
        <div className="text-right">
          <h2 className="text-2xl font-black text-gray-800">نظرة عامة على البيانات</h2>
          <p className="text-xs text-gray-400 font-bold mt-1">
            آخر مزامنة للبيانات: {lastUpdate.toLocaleTimeString('ar-EG')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="إيرادات اليوم" 
          value={`${dailyRevenue.toLocaleString()} ج.م`} 
          icon={ICONS.Sales} 
          color="#8000FF" 
        />
        <StatCard 
          title="إجمالي المديونيات" 
          value={`${totalDebts.toLocaleString()} ج.م`} 
          icon={ICONS.Debts} 
          color="#FFD700"
          isGold 
        />
        <StatCard 
          title="مصروفات اليوم" 
          value={`${dailyExpenses.toLocaleString()} ج.م`} 
          icon={ICONS.Expenses} 
          color="#000000" 
        />
        <StatCard 
          title="صافي الربح اليومي" 
          value={`${netProfit.toLocaleString()} ج.م`} 
          icon={ICONS.Dashboard} 
          color={netProfit >= 0 ? '#10b981' : '#ef4444'} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
            <span className="p-2 bg-[#8000FF]/10 text-[#8000FF] rounded-lg">{ICONS.Sales}</span>
            <span>آخر الفواتير اللحظية</span>
          </h3>
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <p className="text-gray-400 text-center py-10">لا توجد فواتير مسجلة اليوم</p>
            ) : (
              invoices.slice(0, 5).map(inv => (
                <div key={inv.id} className={`flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors ${inv.status === 'RETURNED' ? 'opacity-60 grayscale' : ''}`}>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{inv.customerName || 'عميل نقدي'}</p>
                    <p className="text-[10px] text-gray-500 font-bold">
                      {new Date(inv.date).toLocaleDateString('ar-EG')} | {new Date(inv.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      {inv.status === 'RETURNED' && <span className="mr-2 text-red-500 font-bold">(مرتجع)</span>}
                    </p>
                  </div>
                  <p className={`font-bold ${inv.status === 'RETURNED' ? 'text-red-400 line-through' : 'text-[#8000FF]'}`}>
                    {inv.total.toLocaleString()} ج.م
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
            <span className="p-2 bg-[#10b981]/10 text-[#10b981] rounded-lg">{ICONS.Clipboard}</span>
            <span>آخر عمليات الحجوزات</span>
          </h3>
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <p className="text-gray-400 text-center py-10">لا توجد حجوزات مسجلة</p>
            ) : (
              bookings
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map(booking => {
                  const statusColor = booking.status === 'DELIVERED' 
                    ? 'text-green-600' 
                    : booking.status === 'CANCELED' 
                    ? 'text-red-600' 
                    : 'text-orange-600';
                  const statusText = booking.status === 'DELIVERED' 
                    ? 'تم التسليم' 
                    : booking.status === 'CANCELED' 
                    ? 'ملغي' 
                    : 'قيد الانتظار';
                  
                  return (
                    <div key={booking.id} className={`flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors ${booking.status === 'CANCELED' ? 'opacity-60 grayscale' : ''}`}>
                      <div className="text-right flex-1">
                        <p className="font-bold text-gray-800">{booking.customerName}</p>
                        <p className="text-[10px] text-gray-500 font-bold">
                          {new Date(booking.createdAt).toLocaleDateString('ar-EG')} | {new Date(booking.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor} bg-opacity-10`}>
                            {statusText}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">#{booking.code}</span>
                        </div>
                      </div>
                      <div className="text-left ml-3">
                        <p className="font-bold text-[#8000FF]">{booking.totalAmount.toLocaleString()} ج.م</p>
                        {booking.remainingAmount > 0 && (
                          <p className="text-[10px] text-orange-600 font-bold">متبقي: {booking.remainingAmount.toLocaleString()} ج.م</p>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
            <span className="p-2 bg-[#FFD700]/10 text-[#FFD700] rounded-lg">{ICONS.Debts}</span>
            <span>مديونيات مستحقة</span>
          </h3>
          <div className="space-y-4">
            {debts.filter(d => d.remainingAmount > 0).length === 0 ? (
              <p className="text-gray-400 text-center py-10">لا توجد مديونيات متأخرة</p>
            ) : (
              debts.filter(d => d.remainingAmount > 0).slice(0, 5).map(debt => (
                <div key={debt.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{debt.customerName}</p>
                    <p className="text-[10px] text-gray-500 font-bold">متبقي: {debt.remainingAmount.toLocaleString()} ج.م</p>
                  </div>
                  <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#FFD700] h-full" 
                      style={{ width: `${(debt.paidAmount / debt.totalDebt) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; isGold?: boolean }> = ({ title, value, icon, color, isGold }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-right">
    <div className="flex justify-between items-start mb-4">
      <div 
        className="p-3 rounded-xl" 
        style={{ backgroundColor: `${color}15`, color: color }}
      >
        {icon}
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-400 font-bold">{title}</p>
        <p className={`text-2xl font-black mt-1 ${isGold ? 'text-black' : 'text-gray-800'}`}>{value}</p>
      </div>
    </div>
  </div>
);

export default Dashboard;
