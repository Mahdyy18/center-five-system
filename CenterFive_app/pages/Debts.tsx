
import logo from '../assets/logo.png';
import React, { useState } from 'react';
import { ClientDebt, DebtPayment, ActivityLog, UserRole } from '../types';
import { ICONS } from '../constants';
import { printHtml } from '../utils/printService';

interface DebtsProps {
  debts: ClientDebt[];
  role: UserRole;
  notify: (msg: string, type?: 'SUCCESS' | 'WARNING' | 'ERROR') => void;
  onUpdateDebts: React.Dispatch<React.SetStateAction<ClientDebt[]>>;
  onDeleteDebtClient: (id: string) => void;
  addLog: (action: string, details: string, type: ActivityLog['type']) => void;
}

const Debts: React.FC<DebtsProps> = ({ debts, role, notify, onUpdateDebts, onDeleteDebtClient, addLog }) => {
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  
  const [selectedClientForPayment, setSelectedClientForPayment] = useState<ClientDebt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentNote, setPaymentNote] = useState('');

  const [debtModalClientId, setDebtModalClientId] = useState<string | null>(null);
  const [debtServiceName, setDebtServiceName] = useState('');
  const [debtAmount, setDebtAmount] = useState<number | ''>('');
  const [debtNote, setDebtNote] = useState('');

  const [viewingClientHistory, setViewingClientHistory] = useState<ClientDebt | null>(null);

  
  const [searchClientName, setSearchClientName] = useState('');

  const isAdmin = role === UserRole.ADMIN;

  const filteredDebts = debts.filter((c) =>
    c.customerName.toLowerCase().includes(searchClientName.trim().toLowerCase())
  );

  
  const getLocalISOString = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString();
  };

  const addClient = () => {
    if (!newClientName.trim()) {
      notify('يرجى إدخل اسم العميل أولاً', 'WARNING');
      return;
    }
    const newClient: ClientDebt = {
      id: Date.now().toString(),
      customerName: newClientName,
      totalDebt: 0,
      paidAmount: 0,
      remainingAmount: 0,
      history: [],
      payments: []
    };
    onUpdateDebts(prev => [...prev, newClient]);
    addLog('عميل آجل جديد', `تم تسجيل العميل: ${newClientName} في نظام الآجل`, 'DEBT');
    notify(`تم تسجيل العميل ${newClientName} بنجاح`, 'SUCCESS');
    setNewClientName('');
    setShowAddClient(false);
  };

  const handleDeleteClientItem = (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف ملف العميل "${name}" بالكامل؟ سيتم مسح كافة سجلاته المالية.`)) {
      onDeleteDebtClient(id);
      addLog('حذف عميل آجل', `تم حذف العميل: ${name} نهائياً`, 'DEBT');
      notify('تم حذف العميل بنجاح', 'SUCCESS');
    }
  };

  const handleAddDebtSubmit = () => {
    if (!debtModalClientId) return;
    if (!debtServiceName.trim()) {
      notify('يرجى إدخال بيان الشغل (مثلاً: تصوير ورق)', 'WARNING');
      return;
    }
    if (debtAmount === '' || debtAmount <= 0) {
      notify('يرجى إدخال مبلغ صحيح أكبر من صفر', 'WARNING');
      return;
    }
    
    onUpdateDebts(prev => prev.map(client => {
      if (client.id === debtModalClientId) {
        const amount = Number(debtAmount);
        const newTotal = client.totalDebt + amount;
        const now = getLocalISOString();
        
        addLog(
          'مديونية جديدة', 
          `تسجيل شغل يدوي "${debtServiceName}" بقيمة ${amount} ج.م للعميل ${client.customerName}`, 
          'DEBT'
        );

        notify(`تم تسجيل المديونية بنجاح`, 'SUCCESS');

        return {
          ...client,
          totalDebt: newTotal,
          remainingAmount: newTotal - client.paidAmount,
          history: [...client.history, { 
            service: debtServiceName, 
            amount: amount, 
            date: now,
            note: debtNote 
          }]
        };
      }
      return client;
    }));

    setDebtModalClientId(null);
    setDebtServiceName('');
    setDebtAmount('');
    setDebtNote('');
  };

  const recordPayment = (clientId: string) => {
    if (paymentAmount === '' || paymentAmount <= 0) {
      notify('يرجى إدخال المبلغ المحصل بشكل صحيح', 'WARNING');
      return;
    }
    const amount = Number(paymentAmount);
    
    const client = debts.find(c => c.id === clientId);
    if (!client) return;
    
    if (amount > client.remainingAmount) {
      notify(`المبلغ المدخل (${amount.toLocaleString()} ج.م) أكبر من المتبقي (${client.remainingAmount.toLocaleString()} ج.م)`, 'ERROR');
      return;
    }
    
    onUpdateDebts(prev => prev.map(c => {
      if (c.id === clientId) {
        const newPaid = c.paidAmount + amount;
        const newRemaining = c.totalDebt - newPaid;
        const newPayment: DebtPayment = {
          id: Date.now().toString(),
          amount: amount,
          date: getLocalISOString(),
          note: paymentNote
        };
        addLog('تحصيل مديونية', `تم استلام دفعة ${amount.toLocaleString()} ج.م من العميل ${c.customerName}، المتبقي: ${newRemaining.toLocaleString()} ج.م`, 'DEBT');
        notify(newRemaining > 0 ? `تم تحصيل ${amount.toLocaleString()} ج.م، المتبقي: ${newRemaining.toLocaleString()} ج.م` : 'تم تحصيل المبلغ بالكامل', 'SUCCESS');
        return {
          ...c,
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          payments: [...c.payments, newPayment]
        };
      }
      return c;
    }));
    setPaymentAmount('');
    setPaymentNote('');
    setSelectedClientForPayment(null);
  };

  const printAccountStatement = async (client: ClientDebt) => {    const allEvents = [...client.history.map(h => ({ ...h, type: 'DEBT' })), ...client.payments.map(p => ({ service: 'دفعة نقدية', amount: -p.amount, date: p.date, note: p.note, type: 'PAYMENT' }))].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const tableRows = allEvents.map(event => `<tr><td style="padding: 12px; border-bottom: 1px solid #eee;">${new Date(event.date).toLocaleDateString('ar-EG')}</td><td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">${event.service}</td><td style="padding: 12px; border-bottom: 1px solid #eee; color: #666; font-size: 12px;">${event.note || '-'}</td><td style="padding: 12px; border-bottom: 1px solid #eee; text-align: left; font-weight: 900; color: ${event.amount > 0 ? '#333' : '#10b981'};">${event.amount > 0 ? `+${event.amount.toLocaleString()}` : event.amount.toLocaleString()} ج.م</td></tr>`).join('');
    const content = `<style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');body { font-family: 'Tajawal', sans-serif; padding: 40px; color: #333; line-height: 1.6; }.header { text-align: center; border-bottom: 4px solid #8000FF; padding-bottom: 20px; margin-bottom: 30px; }.header h1 { color: #8000FF; margin: 0; font-size: 36px; font-weight: 900; }.title-box { background: #f8f8f8; padding: 15px; border-radius: 15px; text-align: center; margin-bottom: 30px; border: 1px solid #eee; }.title-box h2 { margin: 0; color: #8000FF; font-size: 24px; }.summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }.summary-card { padding: 20px; border-radius: 20px; border: 1px solid #eee; text-align: center; }.summary-card.gold { background: #FFD700; border-color: #e6c200; }.label { font-size: 12px; color: #666; font-weight: bold; margin-bottom: 5px; }.value { font-size: 22px; font-weight: 900; }table { width: 100%; border-collapse: collapse; margin-top: 20px; }th { background: #8000FF; color: #fff; padding: 15px; text-align: right; font-weight: 700; }.footer { margin-top: 50px; text-align: center; border-top: 2px solid #eee; padding-top: 20px; color: #aaa; font-weight: bold; }</style><div class="header"><h1>سنتر فايف - CENTER FIVE</h1><p>للطباعة والخدمات الطلابية والآجل</p></div><div class="title-box"><h2>كشف حساب مديونية: ${client.customerName}</h2></div><div class="summary"><div class="summary-card"><div class="label">إجمالي المسحوبات</div><div class="value">${client.totalDebt.toLocaleString()} ج.م</div></div><div class="summary-card"><div class="label">إجمالي المسدد</div><div class="value" style="color: #10b981;">${client.paidAmount.toLocaleString()} ج.م</div></div><div class="summary-card gold"><div class="label" style="color: #000;">المتبقي للدفع</div><div class="value" style="color: #000;">${client.remainingAmount.toLocaleString()} ج.م</div></div></div><table><thead><tr><th>التاريخ</th><th>البيان / الخدمة</th><th>ملاحظات</th><th style="text-align: left;">القيمة</th></tr></thead><tbody>${tableRows}</tbody></table><div class="footer"><p>هذا الكشف صادر من النظام المحاسبي لسنتر فايف</p></div>`;
    await printHtml({ html: content, title: `كشف حساب - ${client.customerName}` });
  };

  return (
    <div className="space-y-8 text-right">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-[#8000FF]/10 text-[#8000FF] rounded-lg">{ICONS.Debts}</span>
          <h2 className="text-2xl font-black text-black">إدارة مديونيات العملاء</h2>
        </div>
        <button onClick={() => setShowAddClient(true)} className="flex items-center gap-2 bg-[#8000FF] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#8000FF]/20 hover:-translate-y-1 transition-all">
          {ICONS.Plus}<span>إضافة عميل آجل</span>
        </button>
      </div>

      {}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <label className="block text-xs font-bold text-gray-500 mb-2">بحث باسم العميل</label>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{ICONS.Search}</span>
          <input
            type="text"
            className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#8000FF]/20"
            placeholder="اكتب اسم العميل..."
            value={searchClientName}
            onChange={(e) => setSearchClientName(e.target.value)}
          />
        </div>
        <p className="text-[11px] text-gray-400 font-bold mt-2">النتائج: {filteredDebts.length} عميل</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDebts.map(client => (
          <div key={client.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow group relative">
            {isAdmin && (
              <button onClick={() => handleDeleteClientItem(client.id, client.customerName)} className="absolute top-4 left-4 z-10 p-2 bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white">
                {ICONS.Trash}
              </button>
            )}
            <div className="p-6 border-b border-gray-50 flex justify-between items-start">
              <div className="text-right flex-1">
                <h3 onClick={() => setViewingClientHistory(client)} className="font-bold text-xl mb-1 text-[#8000FF] hover:underline cursor-pointer flex items-center gap-2">
                  {client.customerName}
                  <span className="text-[10px] bg-[#8000FF]/10 px-2 py-0.5 rounded-full font-bold">عرض السجل</span>
                </h3>
                <p className="text-xs text-gray-400">سجل النشاط: {client.history.length + client.payments.length} عمليات</p>
              </div>
              <div className="p-2 bg-[#FFD700]/10 text-[#FFD700] rounded-xl shrink-0">{ICONS.Debts}</div>
            </div>
            <div className="p-6 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl"><p className="text-[10px] text-gray-500 font-bold uppercase mb-1">إجمالي المديونية</p><p className="text-lg font-black">{client.totalDebt.toLocaleString()} ج.م</p></div>
                <div className="p-3 bg-[#8000FF]/5 rounded-xl"><p className="text-[10px] text-[#8000FF] font-bold uppercase mb-1">المبلغ المتبقي</p><p className="text-lg font-black text-[#8000FF]">{client.remainingAmount.toLocaleString()} ج.م</p></div>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden"><div className="bg-[#FFD700] h-full" style={{ width: `${client.totalDebt > 0 ? (client.paidAmount / client.totalDebt) * 100 : 0}%` }} /></div>
            </div>
            <div className="p-4 bg-gray-50 grid grid-cols-2 gap-3">
              <button onClick={() => setSelectedClientForPayment(client)} className="bg-[#8000FF] text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">{ICONS.Dashboard}<span>تسديد دفعة</span></button>
              <button onClick={() => setDebtModalClientId(client.id)} className="bg-white border text-gray-700 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">{ICONS.Plus}<span>شغل جديد</span></button>
            </div>
          </div>
        ))}
      </div>

      {viewingClientHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col text-right">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#8000FF] text-white"><div className="flex items-center gap-4"><div className="w-16 h-16 bg-[#FFD700] rounded-2xl flex items-center justify-center text-[#8000FF] text-3xl font-black">{viewingClientHistory.customerName.charAt(0)}</div><div><h3 className="text-3xl font-black">{viewingClientHistory.customerName}</h3><p className="text-[#FFD700] font-bold">بروفايل العميل والنشاط التاريخي</p></div></div><button onClick={() => setViewingClientHistory(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white font-black text-2xl">×</button></div>
            <div className="p-8 flex-1 overflow-y-auto"><div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"><div className="bg-gray-50 p-6 rounded-3xl border border-gray-100"><p className="text-gray-400 text-xs font-bold mb-1">إجمالي المسحوبات</p><p className="text-2xl font-black text-gray-800">{viewingClientHistory.totalDebt.toLocaleString()} ج.م</p></div><div className="bg-[#8000FF]/5 p-6 rounded-3xl border border-[#8000FF]/10"><p className="text-[#8000FF] text-xs font-bold mb-1">إجمالي المدفوعات</p><p className="text-2xl font-black text-[#8000FF]">{viewingClientHistory.paidAmount.toLocaleString()} ج.م</p></div><div className="bg-[#FFD700] p-6 rounded-3xl border border-[#FFD700]/20 shadow-lg shadow-[#FFD700]/20"><p className="text-gray-900 text-xs font-bold mb-1">المبلغ المتبقي حالياً</p><p className="text-2xl font-black text-gray-900">{viewingClientHistory.remainingAmount.toLocaleString()} ج.م</p></div></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-10"><div className="space-y-4"><div className="flex items-center gap-2 pb-2 border-b-2 border-gray-100"><span className="text-[#8000FF]">{ICONS.Sales}</span><h4 className="font-black text-lg">سجل الأعمال (الشغل)</h4></div>{viewingClientHistory.history.length === 0 ? <p className="text-gray-400 text-center py-10">لا يوجد سجل أعمال متاح</p> : <div className="space-y-3">{[...viewingClientHistory.history].reverse().map((item, idx) => (<div key={idx} className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border border-transparent hover:border-[#8000FF]/20 transition-all"><div className="text-right"><p className="font-bold text-gray-800">{item.service}</p><p className="text-[10px] text-gray-400 font-bold">{new Date(item.date).toLocaleDateString('ar-EG')} - {new Date(item.date).toLocaleTimeString('ar-EG')}</p>{item.note && <p className="text-[10px] text-gray-500 mt-1 italic">{item.note}</p>}</div><p className={`font-black text-lg ${item.amount < 0 ? 'text-green-500' : 'text-gray-800'}`}>{item.amount > 0 ? `+${item.amount.toLocaleString()}` : item.amount.toLocaleString()} ج.م</p></div>))}</div>}</div><div className="space-y-4"><div className="flex items-center gap-2 pb-2 border-b-2 border-[#FFD700]"><span className="text-[#FFD700]">{ICONS.Dashboard}</span><h4 className="font-black text-lg">سجل المدفوعات (التحصيل)</h4></div>{viewingClientHistory.payments.length === 0 ? <p className="text-gray-400 text-center py-10">لا توجد دفعات محصلة بعد</p> : <div className="space-y-3">{[...viewingClientHistory.payments].reverse().map((pay, idx) => (<div key={idx} className="bg-[#FFD700]/5 p-4 rounded-2xl flex justify-between items-center border border-transparent hover:border-[#FFD700]/50 transition-all"><div className="text-right"><p className="font-bold text-[#8000FF]">دفعة نقدية</p><p className="text-[10px] text-gray-400 font-bold">{new Date(pay.date).toLocaleDateString('ar-EG')} - {new Date(pay.date).toLocaleTimeString('ar-EG')}</p>{pay.note && <p className="text-[10px] text-gray-500 mt-1">{pay.note}</p>}</div><p className="font-black text-lg text-[#8000FF]">-{pay.amount.toLocaleString()} ج.م</p></div>))}</div>}</div></div></div>
            <div className="p-8 bg-gray-50 border-t flex justify-center no-print"><button onClick={() => printAccountStatement(viewingClientHistory)} className="bg-black text-white px-10 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95">{ICONS.Print}<span>طباعة كشف حساب</span></button></div>
          </div>
        </div>
      )}

      {showAddClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-right"><h3 className="text-2xl font-bold mb-6">إضافة عميل جديد</h3><input autoFocus type="text" placeholder="اسم العميل الكامل" className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold text-right outline-none focus:ring-2 focus:ring-[#8000FF]/20" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} /><div className="flex gap-4 mt-6"><button onClick={addClient} className="flex-1 bg-[#8000FF] text-white py-3 rounded-xl font-bold">إضافة</button><button onClick={() => setShowAddClient(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">إلغاء</button></div></div></div>
      )}

      {debtModalClientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl text-right">
            <h3 className="text-2xl font-black text-[#8000FF] mb-6">تسجيل شغل جديد (آجل)</h3>
            <div className="space-y-4">
              <input autoFocus type="text" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-bold text-right outline-none focus:ring-2 focus:ring-[#8000FF]/20" placeholder="اسم الخدمة أو المنتج" value={debtServiceName} onChange={(e) => setDebtServiceName(e.target.value)} />
              <div className="grid grid-cols-2 gap-4"><input type="number" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-black text-center text-xl text-[#8000FF] outline-none focus:ring-2 focus:ring-[#8000FF]/20" placeholder="المبلغ" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value === '' ? '' : Number(e.target.value))} /><div className="w-full px-5 py-4 bg-gray-100 border rounded-2xl text-center text-gray-500 font-bold flex items-center justify-center">{new Date().toLocaleDateString('ar-EG')}</div></div>
              <textarea className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-medium text-right h-24 resize-none outline-none focus:ring-2 focus:ring-[#8000FF]/20" placeholder="ملاحظات إضافية..." value={debtNote} onChange={(e) => setDebtNote(e.target.value)}></textarea>
              <div className="flex gap-4 pt-4"><button onClick={handleAddDebtSubmit} className="flex-1 bg-[#8000FF] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-[#8000FF]/20 flex items-center justify-center gap-2 transition-transform active:scale-95">{ICONS.Plus}<span>تأكيد المديونية</span></button><button onClick={() => setDebtModalClientId(null)} className="px-8 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold">إلغاء</button></div>
            </div>
          </div>
        </div>
      )}

      {selectedClientForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-right">
            <h3 className="text-2xl font-bold mb-2">تسجيل دفعة نقدية</h3>
            <p className="text-sm text-gray-600 font-bold mb-4">
              عميل: <span className="text-[#8000FF]">{selectedClientForPayment.customerName}</span>
            </p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
              <div className="flex justify-between font-bold text-sm"><span>إجمالي المديونية</span><span>{selectedClientForPayment.totalDebt.toLocaleString()} ج.م</span></div>
              <div className="flex justify-between font-bold text-sm"><span>المدفوع</span><span>{selectedClientForPayment.paidAmount.toLocaleString()} ج.م</span></div>
              <div className="flex justify-between font-black text-sm text-green-700"><span>المتبقي</span><span>{selectedClientForPayment.remainingAmount.toLocaleString()} ج.م</span></div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-black text-gray-700 mb-2">المبلغ المراد تحصيله</label>
              <input 
                autoFocus 
                type="number" 
                min={0}
                max={selectedClientForPayment.remainingAmount}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-2xl font-black text-center outline-none focus:ring-2 ${
                  paymentAmount !== '' && Number(paymentAmount) > selectedClientForPayment.remainingAmount 
                    ? 'border-red-500 focus:ring-red-500/20' 
                    : 'focus:ring-[#8000FF]/20'
                }`} 
                placeholder="المبلغ المحصل" 
                value={paymentAmount} 
                onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))} 
              />
              {paymentAmount !== '' && Number(paymentAmount) > selectedClientForPayment.remainingAmount && (
                <p className="text-red-600 text-xs font-bold mt-2">
                  المبلغ المدخل ({Number(paymentAmount).toLocaleString()} ج.م) أكبر من المتبقي ({selectedClientForPayment.remainingAmount.toLocaleString()} ج.م)
                </p>
              )}
              <button
                onClick={() => setPaymentAmount(selectedClientForPayment.remainingAmount)}
                className="mt-2 text-xs text-[#8000FF] font-black hover:underline"
              >
                تحصيل المتبقي بالكامل ({selectedClientForPayment.remainingAmount.toLocaleString()} ج.م)
              </button>
            </div>
            
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-right mt-4 outline-none focus:ring-2 focus:ring-[#8000FF]/20" 
              value={paymentNote} 
              onChange={(e) => setPaymentNote(e.target.value)} 
              placeholder="ملاحظات الدفع" 
            />
            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => {
                  setSelectedClientForPayment(null);
                  setPaymentAmount('');
                  setPaymentNote('');
                }} 
                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold"
              >
                إلغاء
              </button>
              <button 
                onClick={() => recordPayment(selectedClientForPayment.id)} 
                disabled={paymentAmount === '' || Number(paymentAmount) <= 0 || Number(paymentAmount) > selectedClientForPayment.remainingAmount}
                className="flex-1 bg-[#FFD700] text-gray-900 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                تأكيد الدفع {paymentAmount !== '' ? `(${Number(paymentAmount).toLocaleString()} ج.م)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Debts;
