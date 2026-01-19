import logo from '../assets/logo.png';
import React, { useMemo, useState } from 'react';
import { Expense, Staff, ActivityLog, UserRole } from '../types';
import { ICONS } from '../constants';
import { printHtml } from '../utils/printService';

interface ExpensesProps {
  expenses: Expense[];
  staff: Staff[];
  role: UserRole;
  notify: (msg: string, type?: 'SUCCESS' | 'WARNING' | 'ERROR') => void;
  onUpdateExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  onDeleteExpense: (id: string) => void;
  onUpdateStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  onAddStaff?: (name: string, salary: number) => void;
  addLog: (action: string, details: string, type: ActivityLog['type']) => void;
}

type SupplierGroup = {
  supplierName: string;
  operations: Expense[];
  purchasesTotal: number;
  returnsTotal: number;
  net: number;
};

const Expenses: React.FC<ExpensesProps> = ({
  expenses,
  staff,
  role,
  notify,
  onUpdateExpenses,
  onDeleteExpense,
  onUpdateStaff,
  onAddStaff,
  addLog
}) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'SUPPLIER' | 'STAFF'>('GENERAL');

  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseCategory, setExpenseCategory] = useState<Expense['category']>('GENERAL');
  const [expenseDesc, setExpenseDesc] = useState('');

  
  const [supplierName, setSupplierName] = useState('أم مروان');
  const [supplierItemName, setSupplierItemName] = useState('');
  const [supplierQuantity, setSupplierQuantity] = useState<number | ''>('');
  const [supplierUnitPrice, setSupplierUnitPrice] = useState<number | ''>('');
  const [supplierOperation, setSupplierOperation] = useState<'PURCHASE' | 'RETURN'>('PURCHASE');
  const [supplierViewMode, setSupplierViewMode] = useState<'GROUPED' | 'FLAT'>('GROUPED');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState<number | ''>('');
  const [withdrawalNote, setWithdrawalNote] = useState('');
  const [bonusAmount, setBonusAmount] = useState<number | ''>('');
  const [bonusType, setBonusType] = useState<'INCENTIVE' | 'OVERTIME'>('INCENTIVE');
  const [bonusNote, setBonusNote] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState<number | ''>('');
  const [penaltyNote, setPenaltyNote] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffSalary, setNewStaffSalary] = useState<number | ''>('');
  const [viewingStaffProfile, setViewingStaffProfile] = useState<Staff | null>(null);
  const isAdmin = role === UserRole.ADMIN;

  
  
  const getEgyptISOString = () => {
    const cairoDateTime = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date());
    
    return cairoDateTime.replace(' ', 'T');
  };

  const addExpense = () => {
    if (!expenseTitle.trim()) {
      notify('يرجى إدخال بيان المصروف أولاً', 'WARNING');
      return;
    }
    if (expenseAmount === '' || expenseAmount <= 0) {
      notify('يرجى إدخال مبلغ صحيح أكبر من صفر', 'WARNING');
      return;
    }
    const amount = Number(expenseAmount);
    const newExp: Expense = {
      id: Date.now().toString(),
      title: expenseTitle,
      amount: amount,
      date: getEgyptISOString(),
      category: expenseCategory,
      description: expenseDesc
    };
    onUpdateExpenses(prev => [newExp, ...prev]);
    addLog('تسجيل مصروف', `تم صرف ${amount} ج.م ببيان: ${expenseTitle}`, 'EXPENSE');
    notify(`تم تسجيل المصروف بنجاح`, 'SUCCESS');
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseDesc('');
  };

  
  const addSupplierPurchase = () => {
    if (!supplierName.trim()) {
      notify('يرجى كتابة اسم المورد أولاً', 'WARNING');
      return;
    }
    if (!supplierItemName.trim()) {
      notify('يرجى كتابة الصنف أولاً', 'WARNING');
      return;
    }
    if (supplierQuantity === '' || supplierQuantity <= 0) {
      notify('يرجى إدخال الكمية بشكل صحيح', 'WARNING');
      return;
    }
    if (supplierUnitPrice === '' || supplierUnitPrice <= 0) {
      notify('يرجى إدخال السعر بشكل صحيح', 'WARNING');
      return;
    }

    const qty = Number(supplierQuantity);
    const unit = Number(supplierUnitPrice);
    const total = qty * unit;
    
    const now = getEgyptISOString();

    const isReturn = supplierOperation === 'RETURN';
    const signedTotal = isReturn ? -total : total;

    const newExp: Expense = {
      id: Date.now().toString(),
      title: `${isReturn ? 'مرتجع' : 'توريد'} - ${supplierName}: ${supplierItemName}`,
      amount: signedTotal,
      date: now,
      category: 'SUPPLIER',
      description: isReturn ? 'مرتجع للمورد' : '',
      supplierName: supplierName.trim(),
      itemName: supplierItemName.trim(),
      quantity: qty,
      unitPrice: unit,
      totalPrice: signedTotal
    };

    onUpdateExpenses(prev => [newExp, ...prev]);
    addLog(
      isReturn ? 'مرتجع مورد' : 'توريد مورد',
      `${isReturn ? 'تم تسجيل مرتجع' : 'تم تسجيل توريد'} من/إلى ${supplierName} - صنف: ${supplierItemName} - كمية: ${qty} - قيمة: ${total.toLocaleString()} ج.م`,
      'EXPENSE'
    );
    notify(isReturn ? 'تم تسجيل المرتجع بنجاح' : 'تم تسجيل التوريد بنجاح', 'SUCCESS');

    setSupplierItemName('');
    setSupplierQuantity('');
    setSupplierUnitPrice('');
    setSupplierOperation('PURCHASE');
  };

  const handleDeleteExpenseItem = (id: string, title: string) => {
    if (window.confirm(`هل أنت متأكد من حذف العملية "${title}" نهائياً؟`)) {
      onDeleteExpense(id);
      notify('تم حذف العملية', 'SUCCESS');
    }
  };

  const addWithdrawal = () => {
    if (!selectedStaffId) {
      notify('يرجى اختيار موظف من القائمة أولاً', 'WARNING');
      return;
    }
    if (withdrawalAmount === '' || withdrawalAmount <= 0) {
      notify('يرجى إدخال مبلغ السحب', 'WARNING');
      return;
    }
    const amount = Number(withdrawalAmount);
    const withdrawalId = Date.now().toString();
    const now = getEgyptISOString();

    const staffMember = staff.find(s => s.id === selectedStaffId);
    const staffName = staffMember?.name || 'موظف';

    const newExp: Expense = {
      id: withdrawalId,
      title: `سلفة/سحب: ${staffName}`,
      amount: amount,
      date: now,
      category: 'STAFF',
      description: withdrawalNote,
      staffId: selectedStaffId
    };

    onUpdateExpenses(prev => [newExp, ...prev]);

    onUpdateStaff(prev =>
      prev.map(s => {
        if (s.id === selectedStaffId) {
          addLog('سحب موظف', `قام الموظف ${s.name} بسحب مبلغ ${amount} ج.م`, 'EXPENSE');
          return {
            ...s,
            withdrawals: [...s.withdrawals, { id: withdrawalId, amount: amount, date: now, note: withdrawalNote }]
          };
        }
        return s;
      })
    );

    notify(`تم تسجيل السحب بنجاح`, 'SUCCESS');
    setWithdrawalAmount('');
    setWithdrawalNote('');
    setSelectedStaffId('');
  };

  const addBonus = () => {
    if (!selectedStaffId) {
      notify('يرجى اختيار موظف لإضافة الحافز له', 'WARNING');
      return;
    }
    if (bonusAmount === '' || bonusAmount <= 0) {
      notify('يرجى إدخال قيمة المبلغ المراد إضافته', 'WARNING');
      return;
    }
    const amount = Number(bonusAmount);
    const typeLabel = bonusType === 'INCENTIVE' ? 'حافز' : 'أوفر تايم';

    onUpdateStaff(prev =>
      prev.map(s => {
        if (s.id === selectedStaffId) {
          addLog('إضافة مالي للموظف', `إضافة ${typeLabel} بمبلغ ${amount} ج.م للموظف ${s.name}`, 'SYSTEM');
          return {
            ...s,
            bonuses: [
              ...(s.bonuses || []),
              {
                id: Date.now().toString(),
                amount,
                type: bonusType,
                date: getEgyptISOString(),
                note: bonusNote
              }
            ]
          };
        }
        return s;
      })
    );

    notify(`تمت إضافة المبلغ للموظف بنجاح`, 'SUCCESS');
    setBonusAmount('');
    setBonusNote('');
    setSelectedStaffId('');
  };

  const addPenalty = () => {
    if (!selectedStaffId) {
      notify('يرجى اختيار موظف لتطبيق الخصم عليه', 'WARNING');
      return;
    }
    if (penaltyAmount === '' || penaltyAmount <= 0) {
      notify('يرجى إدخال مبلغ الخصم', 'WARNING');
      return;
    }
    const amount = Number(penaltyAmount);

    onUpdateStaff(prev =>
      prev.map(s => {
        if (s.id === selectedStaffId) {
          addLog('خصم من موظف', `تم تسجيل خصم/عقوبة بمبلغ ${amount} ج.م للموظف ${s.name}`, 'SYSTEM');
          return {
            ...s,
            penalties: [
              ...(s.penalties || []),
              {
                id: Date.now().toString(),
                amount,
                date: getEgyptISOString(),
                note: penaltyNote
              }
            ]
          };
        }
        return s;
      })
    );

    notify(`تم تسجيل الخصم بنجاح`, 'SUCCESS');
    setPenaltyAmount('');
    setPenaltyNote('');
    setSelectedStaffId('');
  };

  const handleAddStaff = () => {
    if (!newStaffName.trim()) {
      notify('يرجى إدخال اسم الموظف', 'WARNING');
      return;
    }
    if (newStaffSalary === '' || newStaffSalary <= 0) {
      notify('يرجى إدخال الراتب الأساسي', 'WARNING');
      return;
    }
    if (onAddStaff) {
      onAddStaff(newStaffName, Number(newStaffSalary));
      setNewStaffName('');
      setNewStaffSalary('');
      notify('تمت إضافة الموظف بنجاح', 'SUCCESS');
    }
  };

  
  const supplierExpensesAll = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    return expenses
      .filter(e => e.category === 'SUPPLIER')
      .filter(e => {
        if (!q) return true;
        const supplier = (e.supplierName || '').toLowerCase();
        const item = (e.itemName || '').toLowerCase();
        return supplier.includes(q) || item.includes(q);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, supplierSearch]);

  const supplierGroups = useMemo<SupplierGroup[]>(() => {
    const map: Record<string, Expense[]> = {};

    supplierExpensesAll.forEach(e => {
      const name = (e.supplierName || 'غير محدد').trim() || 'غير محدد';
      if (!map[name]) map[name] = [];
      map[name].push(e);
    });

    const groups: SupplierGroup[] = Object.keys(map).map(name => {
      const ops = map[name];
      let purchases = 0;
      let returns = 0;
      let net = 0;

      ops.forEach(o => {
        const amount = Number(o.amount || 0);
        net += amount;
        if (amount >= 0) purchases += amount;
        else returns += Math.abs(amount);
      });

      return { supplierName: name, operations: ops, purchasesTotal: purchases, returnsTotal: returns, net };
    });

    return groups.sort((a, b) => b.net - a.net);
  }, [supplierExpensesAll]);

  const supplierNetTotal = useMemo(() => {
    return supplierExpensesAll.reduce((s, e) => s + (e.amount || 0), 0);
  }, [supplierExpensesAll]);

  const printSingleSupplierReport = async (name: string) => {
    const group = supplierGroups.find(g => g.supplierName.trim() === name.trim());
    const ops = group?.operations || [];

    const rows =
      ops
        .map(e => {
          const dt = new Date(e.date);
          const isReturn = (e.amount || 0) < 0;
          return `
            <tr>
              <td>${dt.toLocaleDateString('ar-EG')}</td>
              <td>${dt.toLocaleTimeString('ar-EG')}</td>
              <td>${isReturn ? 'مرتجع' : 'توريد'}</td>
              <td>${e.itemName || ''}</td>
              <td style="text-align:center;">${(e.quantity ?? '').toString()}</td>
              <td style="text-align:center;">${(e.unitPrice ?? 0).toLocaleString()}</td>
              <td style="text-align:left;font-weight:900;${isReturn ? 'color:#16a34a;' : 'color:#ef4444;'}">
                ${isReturn ? '+' : '-'}${Math.abs(e.amount || 0).toLocaleString()} ج.م
              </td>
            </tr>
          `;
        })
        .join('') || `<tr><td colspan="7" style="text-align:center;padding:14px;">لا يوجد عمليات مسجلة</td></tr>`;

    const purchases = group?.purchasesTotal || 0;
    const returns = group?.returnsTotal || 0;
    const net = group?.net || 0;

    const html = `
      <html dir="rtl" lang="ar">
      <head>
        <title>كشف المورد - ${name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
          body { font-family: 'Tajawal', sans-serif; padding: 40px; }
          .header { text-align: center; border-bottom: 3px solid #8000FF; padding-bottom: 20px; margin-bottom: 30px; }
          .header img { display:block; margin:0 auto 10px; width:80px; height:auto; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f8f8f8; padding: 10px; text-align: right; border-bottom: 2px solid #8000FF; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          .cards { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 20px; }
          .card { border:1px solid #eee; border-radius:14px; padding: 12px; text-align:center; }
          .label { font-size:12px; color:#777; font-weight:700; }
          .value { font-size:18px; font-weight:900; margin-top:4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logo}" alt="Center Five" />
          <h1>سنتر فايف - كشف حساب المورد</h1>
          <h2>${name}</h2>
        </div>

        <div class="cards">
          <div class="card"><div class="label">إجمالي توريدات</div><div class="value" style="color:#ef4444;">${purchases.toLocaleString()} ج.م</div></div>
          <div class="card"><div class="label">إجمالي مرتجعات</div><div class="value" style="color:#16a34a;">${returns.toLocaleString()} ج.م</div></div>
          <div class="card"><div class="label">الصافي</div><div class="value" style="color:#111827;">${net.toLocaleString()} ج.م</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الوقت</th>
              <th>النوع</th>
              <th>الصنف</th>
              <th style="text-align:center;">الكمية</th>
              <th style="text-align:center;">السعر</th>
              <th style="text-align:left;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <script>window.onload = function() { window.print(); setTimeout(window.close, 700); };</script>
      </body>
      </html>
    `;    await printHtml({ html, title: 'مصروفات' });
  };

  const printAllSuppliersGroupedReport = async () => {

    const supplierSections =
      supplierGroups
        .map(group => {
          const rows =
            group.operations
              .map(e => {
                const dt = new Date(e.date);
                const isReturn = (e.amount || 0) < 0;

                return `
                  <tr>
                    <td>${dt.toLocaleDateString('ar-EG')}</td>
                    <td>${dt.toLocaleTimeString('ar-EG')}</td>
                    <td>${isReturn ? 'مرتجع' : 'توريد'}</td>
                    <td>${e.itemName || ''}</td>
                    <td style="text-align:center;">${(e.quantity ?? '').toString()}</td>
                    <td style="text-align:center;">${(e.unitPrice ?? 0).toLocaleString()}</td>
                    <td style="text-align:left;font-weight:900;${isReturn ? 'color:#16a34a;' : 'color:#ef4444;'}">
                      ${isReturn ? '+' : '-'}${Math.abs(e.amount || 0).toLocaleString()} ج.م
                    </td>
                  </tr>
                `;
              })
              .join('') || `<tr><td colspan="7" style="text-align:center;padding:14px;">لا يوجد عمليات</td></tr>`;

          return `
            <div class="supplierBox">
              <div class="supplierHeader">
                <div>
                  <div class="supplierTitle">${group.supplierName}</div>
                  <div class="supplierSub">توريدات: <span class="red">${group.purchasesTotal.toLocaleString()} ج.م</span> | مرتجعات: <span class="green">${group.returnsTotal.toLocaleString()} ج.م</span> | صافي: <span class="net">${group.net.toLocaleString()} ج.م</span></div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>الوقت</th>
                    <th>النوع</th>
                    <th>الصنف</th>
                    <th style="text-align:center;">الكمية</th>
                    <th style="text-align:center;">السعر</th>
                    <th style="text-align:left;">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `;
        })
        .join('') || `<p style="text-align:center;color:#999;">لا يوجد موردين</p>`;

    const html = `
      <html dir="rtl" lang="ar">
      <head>
        <title>كشف مجمع الموردين</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
          body { font-family: 'Tajawal', sans-serif; padding: 40px; }
          .header { text-align: center; border-bottom: 3px solid #8000FF; padding-bottom: 20px; margin-bottom: 30px; }
          .header img { display:block; margin:0 auto 10px; width:80px; height:auto; }
          .supplierBox { page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #eee; border-radius: 18px; padding: 16px; }
          .supplierHeader { display:flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
          .supplierTitle { font-size: 20px; font-weight: 900; color: #111827; }
          .supplierSub { font-size: 12px; font-weight: 900; color:#6b7280; margin-top: 6px; }
          .red { color:#ef4444; }
          .green { color:#16a34a; }
          .net { color:#111827; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #f8f8f8; padding: 10px; text-align: right; border-bottom: 2px solid #8000FF; font-size: 12px; }
          td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logo}" alt="Center Five" />
          <h1>سنتر فايف - كشف مجمع لكل الموردين</h1>
          <p style="margin:0;color:#777;font-weight:700;font-size:12px;">مرتب حسب المورد — والعمليات داخل كل مورد (الأحدث فوق)</p>
          <div style="margin-top:10px;font-weight:900;">صافي التوريدات الكلي: ${supplierNetTotal.toLocaleString()} ج.م</div>
        </div>

        ${supplierSections}

        <script>window.onload = function() { window.print(); setTimeout(window.close, 900); };</script>
      </body>
      </html>
    `;    await printHtml({ html, title: 'مصروفات' });
  };

  const printWithdrawalReceipt = async (staffName: string, amount: number, date: string, note: string) => {

    const html = `
      <html dir="rtl" lang="ar">
      <head>
        <title>سند سلفة - ${staffName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
          body { font-family: 'Tajawal', sans-serif; padding: 30px; border: 2px solid #000; margin: 20px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 20px; }
          .header img { display:block; margin:0 auto 10px; width:80px; height:auto; }
          .content { line-height: 2; font-size: 18px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; }
          .sign { text-align: center; width: 150px; border-top: 1px solid #000; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logo}" alt="Center Five" />
          <h2>سنتر فايف - CENTER FIVE</h2>
          <h3>سند سلفة موظف</h3>
        </div>
        <div class="content">
          <p><strong>التاريخ:</strong> ${new Date(date).toLocaleString('ar-EG')}</p>
          <p><strong>اسم الموظف:</strong> ${staffName}</p>
          <p><strong>المبلغ المسحوب:</strong> <span style="font-size: 24px; font-weight: 900;">${amount.toLocaleString()} ج.م</span></p>
          <p><strong>البيان:</strong> ${note || 'سحب نقدي من الراتب'}</p>
        </div>
        <div class="footer"><div class="sign">توقيع المستلم</div><div class="sign">توقيع الإدارة</div></div>
        <script>window.onload = function() { window.print(); setTimeout(window.close, 500); }</script>
      </body>
      </html>
    `;    await printHtml({ html, title: 'مصروفات' });
  };

  const printStaffProfile = async (employee: Staff) => {
    const totalBonuses = (employee.bonuses || []).reduce((sum, b) => sum + b.amount, 0);
    const totalPenalties = (employee.penalties || []).reduce((sum, p) => sum + p.amount, 0);
    const totalWithdrawals = employee.withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const remaining = employee.salary + totalBonuses - (totalWithdrawals + totalPenalties);
    const withdrawalsRows = employee.withdrawals
      .map(
        w =>
          `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(w.date).toLocaleDateString(
            'ar-EG'
          )}</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${w.note || 'سحب نقدي'}</td><td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left; font-weight: bold; color: #ef4444;">${w.amount.toLocaleString()} ج.م</td></tr>`
      )
      .join('');
    const bonusesRows = (employee.bonuses || [])
      .map(
        b =>
          `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(b.date).toLocaleDateString(
            'ar-EG'
          )}</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${
            b.type === 'INCENTIVE' ? 'حافز' : 'إضافي'
          } - ${b.note}</td><td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left; font-weight: bold; color: #10b981;">+${b.amount.toLocaleString()} ج.م</td></tr>`
      )
      .join('');
    const penaltiesRows = (employee.penalties || [])
      .map(
        p =>
          `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(p.date).toLocaleDateString(
            'ar-EG'
          )}</td><td style="padding: 10px; border-bottom: 1px solid #eee;">خصم/عقوبة - ${
            p.note
          }</td><td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left; font-weight: bold; color: #f97316;">-${p.amount.toLocaleString()} ج.م</td></tr>`
      )
      .join('');
    const html = `<html dir="rtl" lang="ar"><head><title>سجل الموظف - ${
      employee.name
    }</title><style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');body { font-family: 'Tajawal', sans-serif; padding: 40px; }.header { text-align: center; border-bottom: 3px solid #8000FF; padding-bottom: 20px; margin-bottom: 30px; }.header img { display:block; margin:0 auto 10px; width:80px; height:auto; }.summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }.card { padding: 15px; border: 1px solid #eee; border-radius: 10px; text-align: center; }table { width: 100%; border-collapse: collapse; margin-top: 20px; }th { background: #f8f8f8; padding: 10px; text-align: right; border-bottom: 2px solid #8000FF; }</style></head><body><div class="header"><img src="${logo}" alt="Center Five" /><h1>سنتر فايف - سجل الموظف المالي</h1><h2>${
      employee.name
    }</h2></div>${
      isAdmin
        ? `<div class="summary"><div class="card"><strong>الراتب + الحوافز</strong><br/>${(
            employee.salary + totalBonuses
          ).toLocaleString()} ج.م</div><div class="card"><strong>سلف + خصومات</strong><br/>${(
            totalWithdrawals + totalPenalties
          ).toLocaleString()} ج.م</div><div class="card" style="background: #FFD700;"><strong>المتبقي للتسليم</strong><br/>${remaining.toLocaleString()} ج.م</div></div>`
        : `<p style="text-align:center">سجل سحوبات الموظف</p>`
    }<h3>سجل السحوبات (السلف)</h3><table><thead><tr><th>التاريخ</th><th>البيان</th><th style="text-align: left;">المبلغ</th></tr></thead><tbody>${
      withdrawalsRows ||
      '<tr><td colspan="3" style="text-align:center; padding:10px;">لا يوجد سحوبات</td></tr>'
    }</tbody></table>${
      isAdmin
        ? `<h3>سجل الحوافز والأوفر تايم</h3><table><thead><tr><th>التاريخ</th><th>النوع والبيان</th><th style="text-align: left;">المبلغ</th></tr></thead><tbody>${
            bonusesRows ||
            '<tr><td colspan="3" style="text-align:center; padding:10px;">لا يوجد حوافز مسجلة</td></tr>'
          }</tbody></table><h3>سجل الخصومات والعقوبات</h3><table><thead><tr><th>التاريخ</th><th>البيان</th><th style="text-align: left;">المبلغ</th></tr></thead><tbody>${
            penaltiesRows ||
            '<tr><td colspan="3" style="text-align:center; padding:10px;">لا يوجد خصومات مسجلة</td></tr>'
          }</tbody></table>`
        : ''
    }<script>window.onload = function() { window.print(); setTimeout(window.close, 500); };</script></body></html>`;    await printHtml({ html, title: 'مصروفات' });
  };

  return (
    <div className="space-y-8 text-right">
      <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit no-print">
        <button
          onClick={() => setActiveTab('GENERAL')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeTab === 'GENERAL' ? 'bg-[#8000FF] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {ICONS.Expenses}
          <span>مصروفات عامة</span>
        </button>

        <button
          onClick={() => setActiveTab('SUPPLIER')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeTab === 'SUPPLIER' ? 'bg-[#8000FF] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {ICONS.Sales}
          <span>توريدات المورد</span>
        </button>

        <button
          onClick={() => setActiveTab('STAFF')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeTab === 'STAFF' ? 'bg-[#8000FF] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {ICONS.Debts}
          <span>سحوبات وشؤون الموظفين</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 no-print">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <span className="p-2 bg-[#8000FF]/10 text-[#8000FF] rounded-lg">{ICONS.Plus}</span>
              <span>
                {activeTab === 'GENERAL'
                  ? 'تسجيل مصروف'
                  : activeTab === 'SUPPLIER'
                  ? 'تسجيل توريد / مرتجع'
                  : 'إدارة الموظفين'}
              </span>
            </h3>

            {activeTab === 'GENERAL' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">بيان المصروف</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-right outline-none focus:ring-2 focus:ring-[#8000FF]/20"
                    placeholder="مثلاً: فاتورة كهرباء"
                    value={expenseTitle}
                    onChange={e => setExpenseTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">المبلغ</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-center outline-none focus:ring-2 focus:ring-[#8000FF]/20"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">التصنيف</label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-right font-bold outline-none"
                    value={expenseCategory}
                    onChange={e => setExpenseCategory(e.target.value as any)}
                  >
                    <option value="GENERAL">عام</option>
                    <option value="RAW_MATERIALS">خامات</option>
                    <option value="TOOLS">أدوات</option>
                  </select>
                </div>
                <button
                  onClick={addExpense}
                  className="w-full bg-[#8000FF] text-white py-4 rounded-xl font-bold mt-4 shadow-lg active:scale-95 transition-all"
                >
                  تأكيد العملية
                </button>
              </div>
            ) : activeTab === 'SUPPLIER' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">اسم المورد</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-right outline-none focus:ring-2 focus:ring-[#8000FF]/20"
                    value={supplierName}
                    onChange={e => setSupplierName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">الصنف</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-right outline-none focus:ring-2 focus:ring-[#8000FF]/20"
                    placeholder="مثلاً: ورق A4"
                    value={supplierItemName}
                    onChange={e => setSupplierItemName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold mb-1">الكمية</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-center outline-none focus:ring-2 focus:ring-[#8000FF]/20"
                      value={supplierQuantity}
                      onChange={e => setSupplierQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">السعر</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-center outline-none focus:ring-2 focus:ring-[#8000FF]/20"
                      value={supplierUnitPrice}
                      onChange={e => setSupplierUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#8000FF]/5 border border-[#8000FF]/10">
                  <div className="flex justify-between items-center font-black">
                    <span className="text-gray-500 text-sm">الإجمالي</span>
                    <span className={`${supplierOperation === 'RETURN' ? 'text-green-600' : 'text-[#8000FF]'} text-lg`}>
                      {(supplierQuantity !== '' && supplierUnitPrice !== '')
                        ? (Number(supplierQuantity) * Number(supplierUnitPrice)).toLocaleString()
                        : '0'}{' '}
                      ج.م
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSupplierOperation('PURCHASE')}
                    className={`flex-1 py-3 rounded-xl font-black transition-all ${
                      supplierOperation === 'PURCHASE'
                        ? 'bg-[#8000FF] text-white shadow-lg'
                        : 'bg-white border text-gray-500'
                    }`}
                  >
                    توريد
                  </button>

                  <button
                    type="button"
                    onClick={() => setSupplierOperation('RETURN')}
                    className={`flex-1 py-3 rounded-xl font-black transition-all ${
                      supplierOperation === 'RETURN'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-white border text-gray-500'
                    }`}
                  >
                    مرتجع
                  </button>
                </div>

                <button
                  onClick={addSupplierPurchase}
                  className={`w-full text-white py-4 rounded-xl font-bold mt-2 shadow-lg active:scale-95 transition-all ${
                    supplierOperation === 'RETURN' ? 'bg-green-600' : 'bg-[#8000FF]'
                  }`}
                >
                  {supplierOperation === 'RETURN' ? 'تسجيل المرتجع' : 'تسجيل التوريد'}
                </button>
              </div>
            ) : (
              
              <div className="space-y-6">
                {isAdmin && (
                  <div className="p-5 bg-[#8000FF]/5 rounded-2xl border-2 border-dashed border-[#8000FF]/20 space-y-3">
                    <label className="block text-xs font-black text-[#8000FF] uppercase">إضافة موظف جديد</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border rounded-xl text-sm"
                      placeholder="الاسم"
                      value={newStaffName}
                      onChange={e => setNewStaffName(e.target.value)}
                    />
                    <input
                      type="number"
                      className="w-full px-4 py-2 border rounded-xl text-sm text-center"
                      placeholder="الراتب"
                      value={newStaffSalary}
                      onChange={e => setNewStaffSalary(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                    <button
                      onClick={handleAddStaff}
                      className="w-full bg-[#8000FF] text-white py-2 rounded-xl text-xs font-bold"
                    >
                      إضافة
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-right font-bold"
                    value={selectedStaffId}
                    onChange={e => setSelectedStaffId(e.target.value)}
                  >
                    <option value="">-- اختر موظف من القائمة --</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <div className="p-4 bg-gray-50 rounded-2xl border space-y-3">
                    <label className="block text-xs font-bold text-gray-500">تسجيل سحب</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border rounded-xl text-center font-bold"
                      placeholder="المبلغ المسحوب"
                      value={withdrawalAmount}
                      onChange={e => setWithdrawalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                    <input
                      type="text"
                      className="w-full px-4 py-2 border rounded-xl text-sm"
                      placeholder="ملاحظة السحب"
                      value={withdrawalNote}
                      onChange={e => setWithdrawalNote(e.target.value)}
                    />
                    <button
                      onClick={addWithdrawal}
                      className="w-full bg-[#FFD700] text-gray-900 py-3 rounded-xl font-bold shadow-md active:scale-95"
                    >
                      تأكيد السحب
                    </button>
                  </div>

                  {isAdmin && (
                    <>
                      <div className="p-4 bg-[#8000FF]/5 rounded-2xl border border-[#8000FF]/20 space-y-3">
                        <label className="block text-xs font-bold text-[#8000FF]">إضافة حوافز / إضافي</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setBonusType('INCENTIVE')}
                            className={`flex-1 py-1 rounded text-[10px] font-bold ${
                              bonusType === 'INCENTIVE' ? 'bg-[#8000FF] text-white' : 'bg-white border text-gray-400'
                            }`}
                          >
                            حافز
                          </button>
                          <button
                            onClick={() => setBonusType('OVERTIME')}
                            className={`flex-1 py-1 rounded text-[10px] font-bold ${
                              bonusType === 'OVERTIME' ? 'bg-[#8000FF] text-white' : 'bg-white border text-gray-400'
                            }`}
                          >
                            أوفر تايم
                          </button>
                        </div>
                        <input
                          type="number"
                          className="w-full px-4 py-2 border rounded-xl text-center font-bold"
                          placeholder="المبلغ المضاف"
                          value={bonusAmount}
                          onChange={e => setBonusAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <input
                          type="text"
                          className="w-full px-4 py-2 border rounded-xl text-sm"
                          placeholder="السبب"
                          value={bonusNote}
                          onChange={e => setBonusNote(e.target.value)}
                        />
                        <button
                          onClick={addBonus}
                          className="w-full bg-[#8000FF] text-white py-3 rounded-xl font-bold shadow-md active:scale-95"
                        >
                          إضافة المبلغ
                        </button>
                      </div>

                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200 space-y-3">
                        <label className="block text-xs font-bold text-orange-600">خصومات وعقوبات</label>
                        <input
                          type="number"
                          className="w-full px-4 py-2 border rounded-xl text-center font-bold"
                          placeholder="مبلغ الخصم"
                          value={penaltyAmount}
                          onChange={e => setPenaltyAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <input
                          type="text"
                          className="w-full px-4 py-2 border rounded-xl text-sm"
                          placeholder="سبب الخصم"
                          value={penaltyNote}
                          onChange={e => setPenaltyNote(e.target.value)}
                        />
                        <button
                          onClick={addPenalty}
                          className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-md active:scale-95"
                        >
                          تطبيق الخصم
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'GENERAL' ? (
            expenses
              .filter(e => e.category !== 'STAFF')
              .map(exp => (
                <div key={exp.id} className="bg-white p-6 rounded-2xl border flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteExpenseItem(exp.id, exp.title)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {ICONS.Trash}
                      </button>
                    )}
                    <p className="text-xl font-black text-red-500">-{exp.amount.toLocaleString()} ج.م</p>
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-gray-800">{exp.title}</h4>
                    <p className="text-[10px] text-gray-400 font-bold">{new Date(exp.date).toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>
              ))
          ) : activeTab === 'SUPPLIER' ? (
            <div className="bg-white p-6 rounded-2xl border">
              {}
              <div className="flex justify-between items-center gap-3 mb-6 no-print">
                <div className="text-right shrink-0">
                  <h3 className="text-lg font-black">توريدات الموردين</h3>
                  <p className="text-xs text-gray-400 font-bold">
                    تجميع كل مورد + سجل كامل + بحث + طباعة
                  </p>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  <input
                    value={supplierSearch}
                    onChange={e => setSupplierSearch(e.target.value)}
                    placeholder="بحث باسم المورد أو الصنف..."
                    className="min-w-[260px] px-4 py-3 rounded-2xl border bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-[#8000FF]/20"
                  />

                  {supplierSearch.trim() !== '' && (
                    <button
                      onClick={() => setSupplierSearch('')}
                      className="whitespace-nowrap px-4 py-3 rounded-2xl border bg-white font-black text-gray-600 hover:bg-gray-100"
                    >
                      مسح البحث
                    </button>
                  )}

                  <button
                    onClick={() => setSupplierViewMode('GROUPED')}
                    className={`whitespace-nowrap px-4 py-3 rounded-2xl font-black border ${
                      supplierViewMode === 'GROUPED' ? 'bg-[#8000FF] text-white' : 'bg-white text-gray-500'
                    }`}
                  >
                    تجميع الموردين
                  </button>

                  <button
                    onClick={() => setSupplierViewMode('FLAT')}
                    className={`whitespace-nowrap px-4 py-3 rounded-2xl font-black border ${
                      supplierViewMode === 'FLAT' ? 'bg-[#8000FF] text-white' : 'bg-white text-gray-500'
                    }`}
                  >
                    سجل كامل
                  </button>

                  {}
                  <button
                    onClick={printAllSuppliersGroupedReport}
                    className="whitespace-nowrap bg-black text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl"
                  >
                    {ICONS.Print}
                    <span>طباعة كشف مجمع</span>
                  </button>
                </div>
              </div>

              <div className="mb-4 p-4 rounded-2xl bg-gray-50 border flex justify-between items-center">
                <span className="font-black text-gray-700">صافي التوريدات الكلي (بعد المرتجعات)</span>
                <span className="font-black text-[#8000FF] text-lg">{supplierNetTotal.toLocaleString()} ج.م</span>
              </div>

              {}
              {supplierViewMode === 'FLAT' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="p-3 text-right">التاريخ</th>
                        <th className="p-3 text-right">الوقت</th>
                        <th className="p-3 text-right">المورد</th>
                        <th className="p-3 text-right">النوع</th>
                        <th className="p-3 text-right">الصنف</th>
                        <th className="p-3 text-center">الكمية</th>
                        <th className="p-3 text-center">السعر</th>
                        <th className="p-3 text-left">الإجمالي</th>
                        {isAdmin && <th className="p-3 text-center no-print">حذف</th>}
                      </tr>
                    </thead>

                    <tbody>
                      {supplierExpensesAll.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 9 : 8} className="p-6 text-center text-gray-400 font-bold">
                            لا يوجد عمليات تطابق البحث
                          </td>
                        </tr>
                      ) : (
                        supplierExpensesAll.map(e => {
                          const dt = new Date(e.date);
                          const isReturn = (e.amount || 0) < 0;

                          return (
                            <tr key={e.id} className="border-t">
                              <td className="p-3 font-bold">{dt.toLocaleDateString('ar-EG')}</td>
                              <td className="p-3 text-gray-500 font-bold">{dt.toLocaleTimeString('ar-EG')}</td>
                              <td className="p-3 font-black text-gray-800">{e.supplierName || '—'}</td>

                              <td className="p-3 font-black">
                                {isReturn ? (
                                  <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-black">
                                    مرتجع
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-black">
                                    توريد
                                  </span>
                                )}
                              </td>

                              <td className="p-3 font-black text-gray-800">{e.itemName || '—'}</td>
                              <td className="p-3 text-center font-black">{e.quantity ?? '—'}</td>
                              <td className="p-3 text-center font-black">{(e.unitPrice ?? 0).toLocaleString()}</td>

                              <td className={`p-3 text-left font-black ${isReturn ? 'text-green-600' : 'text-red-500'}`}>
                                {isReturn ? '+' : '-'}
                                {Math.abs(e.amount || 0).toLocaleString()} ج.م
                              </td>

                              {isAdmin && (
                                <td className="p-3 text-center no-print">
                                  <button
                                    onClick={() => handleDeleteExpenseItem(e.id, e.title)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="حذف العملية بالكامل"
                                  >
                                    {ICONS.Trash}
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                
                <div className="space-y-4">
                  {supplierGroups.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 font-bold border rounded-2xl bg-gray-50">
                      لا يوجد موردين/توريدات مطابقة للبحث
                    </div>
                  ) : (
                    supplierGroups.map(group => (
                      <div key={group.supplierName} className="border rounded-3xl overflow-hidden">
                        <div className="p-5 bg-gray-50 border-b flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                          <div className="text-right">
                            <div className="text-xl font-black text-gray-900">{group.supplierName}</div>
                            <div className="text-xs font-bold text-gray-500 mt-1">
                              توريدات:{' '}
                              <span className="text-red-500">{group.purchasesTotal.toLocaleString()} ج.م</span> — مرتجعات:{' '}
                              <span className="text-green-600">{group.returnsTotal.toLocaleString()} ج.م</span> — صافي:{' '}
                              <span className="text-[#8000FF]">{group.net.toLocaleString()} ج.م</span>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => setSupplierName(group.supplierName)}
                              className="px-4 py-2 rounded-xl border font-black bg-white text-gray-600 hover:bg-gray-100"
                              title="تحديد اسم المورد في الفورم"
                            >
                              اختيار المورد
                            </button>

                            <button
                              onClick={() => printSingleSupplierReport(group.supplierName)}
                              className="px-4 py-2 rounded-xl font-black bg-black text-white flex items-center gap-2 hover:scale-105 transition-all active:scale-95"
                            >
                              {ICONS.Print}
                              طباعة كشف المورد
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-gray-500">
                                <th className="p-3 text-right">التاريخ</th>
                                <th className="p-3 text-right">الوقت</th>
                                <th className="p-3 text-right">النوع</th>
                                <th className="p-3 text-right">الصنف</th>
                                <th className="p-3 text-center">الكمية</th>
                                <th className="p-3 text-center">السعر</th>
                                <th className="p-3 text-left">الإجمالي</th>
                                {isAdmin && <th className="p-3 text-center no-print">حذف</th>}
                              </tr>
                            </thead>

                            <tbody>
                              {group.operations.map(e => {
                                const dt = new Date(e.date);
                                const isReturn = (e.amount || 0) < 0;

                                return (
                                  <tr key={e.id} className="border-t">
                                    <td className="p-3 font-bold">{dt.toLocaleDateString('ar-EG')}</td>
                                    <td className="p-3 text-gray-500 font-bold">{dt.toLocaleTimeString('ar-EG')}</td>

                                    <td className="p-3 font-black">
                                      {isReturn ? (
                                        <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-black">
                                          مرتجع
                                        </span>
                                      ) : (
                                        <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-black">
                                          توريد
                                        </span>
                                      )}
                                    </td>

                                    <td className="p-3 font-black text-gray-800">{e.itemName || '—'}</td>
                                    <td className="p-3 text-center font-black">{e.quantity ?? '—'}</td>
                                    <td className="p-3 text-center font-black">{(e.unitPrice ?? 0).toLocaleString()}</td>

                                    <td className={`p-3 text-left font-black ${isReturn ? 'text-green-600' : 'text-red-500'}`}>
                                      {isReturn ? '+' : '-'}
                                      {Math.abs(e.amount || 0).toLocaleString()} ج.م
                                    </td>

                                    {isAdmin && (
                                      <td className="p-3 text-center no-print">
                                        <button
                                          onClick={() => handleDeleteExpenseItem(e.id, e.title)}
                                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                          title="حذف العملية بالكامل"
                                        >
                                          {ICONS.Trash}
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            
            staff.map(member => {
              const totalBonuses = (member.bonuses || []).reduce((a, b) => a + b.amount, 0);
              const totalPenalties = (member.penalties || []).reduce((a, b) => a + b.amount, 0);
              const totalWithdrawals = member.withdrawals.reduce((a, b) => a + b.amount, 0);
              const remaining = member.salary + totalBonuses - (totalWithdrawals + totalPenalties);
              return (
                <div key={member.id} className="bg-white rounded-3xl border overflow-hidden mb-6">
                  <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                      {isAdmin && (
                        <div className="text-left">
                          <p className="text-[10px] text-gray-400 font-bold">المتبقي للتسليم</p>
                          <p className={`text-lg font-black ${remaining < 0 ? 'text-red-500' : 'text-[#8000FF]'}`}>
                            {remaining.toLocaleString()} ج.م
                          </p>
                        </div>
                      )}
                      <button
                        onClick={() => setViewingStaffProfile(member)}
                        className="bg-white text-gray-600 p-2 rounded-xl border hover:bg-[#8000FF] hover:text-white transition-all shadow-sm"
                      >
                        {isAdmin ? 'السجل المالي' : ICONS.Dashboard}
                      </button>
                    </div>
                    <div className="text-right">
                      <h4 className="font-black text-xl text-gray-800">{member.name}</h4>
                      {isAdmin && <p className="text-xs text-gray-400 font-bold">الراتب الأساسي: {member.salary.toLocaleString()} ج.م</p>}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {member.withdrawals.slice(0, 5).map(w => (
                      <div key={w.id} className="p-4 flex justify-between items-center hover:bg-gray-50 px-8">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => printWithdrawalReceipt(member.name, w.amount, w.date, w.note)}
                            className="text-gray-400 hover:text-[#8000FF] transition-colors"
                          >
                            {ICONS.Print}
                          </button>
                          <span className="font-black text-red-500">-{w.amount.toLocaleString()} ج.م</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-700">{w.note || 'سحب نقدي'}</p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(w.date).toLocaleDateString('ar-EG')} - {new Date(w.date).toLocaleTimeString('ar-EG')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {viewingStaffProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col text-right">
            <div className="p-8 border-b bg-[#8000FF] text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#FFD700] rounded-2xl flex items-center justify-center text-[#8000FF] text-3xl font-black">
                  {viewingStaffProfile.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black">{viewingStaffProfile.name}</h3>
                  <p className="text-[#FFD700] text-sm font-bold">السجل المالي الكامل</p>
                </div>
              </div>
              <button onClick={() => setViewingStaffProfile(null)} className="text-white text-3xl font-black transition-transform hover:rotate-90">
                ×
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto space-y-8">
              {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-6 rounded-3xl border text-center">
                    <p className="text-gray-400 text-xs font-bold mb-1">الراتب + الحوافز</p>
                    <p className="text-2xl font-black text-gray-800">
                      {(viewingStaffProfile.salary + (viewingStaffProfile.bonuses || []).reduce((a, b) => a + b.amount, 0)).toLocaleString()} ج.م
                    </p>
                  </div>
                  <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-center">
                    <p className="text-red-400 text-xs font-bold mb-1">إجمالي السلف والخصومات</p>
                    <p className="text-2xl font-black text-red-500">
                      {(viewingStaffProfile.withdrawals.reduce((a, b) => a + b.amount, 0) + (viewingStaffProfile.penalties || []).reduce((a, b) => a + b.amount, 0)).toLocaleString()} ج.م
                    </p>
                  </div>
                  <div className="bg-[#FFD700] p-6 rounded-3xl border border-[#FFD700]/20 text-center shadow-lg shadow-[#FFD700]/10">
                    <p className="text-gray-900 text-xs font-bold mb-1">المتبقي للتسليم</p>
                    <p className="text-2xl font-black text-gray-900">
                      {(viewingStaffProfile.salary + (viewingStaffProfile.bonuses || []).reduce((a, b) => a + b.amount, 0) - (viewingStaffProfile.withdrawals.reduce((a, b) => a + b.amount, 0) + (viewingStaffProfile.penalties || []).reduce((a, b) => a + b.amount, 0))).toLocaleString()} ج.م
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-black text-lg text-gray-800 border-r-4 border-red-500 pr-3">سجل السحوبات</h4>
                  {viewingStaffProfile.withdrawals.length === 0 ? (
                    <p className="text-gray-400 italic py-4">لا توجد سحوبات مسجلة</p>
                  ) : (
                    <div className="space-y-2">
                      {[...viewingStaffProfile.withdrawals].reverse().map(w => (
                        <div key={w.id} className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border hover:border-red-200 transition-colors">
                          <span className="text-red-500 font-black">-{w.amount.toLocaleString()} ج.م</span>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-800">{w.note || 'سحب نقدي'}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{new Date(w.date).toLocaleString('ar-EG')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="font-black text-lg text-gray-800 border-r-4 border-green-500 pr-3">سجل الإضافي والحوافز</h4>
                      {(viewingStaffProfile.bonuses || []).length === 0 ? (
                        <p className="text-gray-400 italic py-4">لا توجد حوافز مسجلة</p>
                      ) : (
                        <div className="space-y-2">
                          {[...(viewingStaffProfile.bonuses || [])].reverse().map(b => (
                            <div key={b.id} className="bg-green-50/50 p-4 rounded-2xl flex justify-between items-center border border-green-100 hover:border-green-300 transition-colors">
                              <span className="text-green-600 font-black">+{b.amount.toLocaleString()} ج.م</span>
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-800">
                                  <span className="text-green-600 ml-1">[{b.type === 'INCENTIVE' ? 'حافز' : 'إضافي'}]</span>
                                  {b.note}
                                </p>
                                <p className="text-[10px] text-gray-400 font-medium">{new Date(b.date).toLocaleString('ar-EG')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-black text-lg text-gray-800 border-r-4 border-orange-500 pr-3">سجل الخصومات والعقوبات</h4>
                      {(viewingStaffProfile.penalties || []).length === 0 ? (
                        <p className="text-gray-400 italic py-4">لا توجد خصومات مسجلة</p>
                      ) : (
                        <div className="space-y-2">
                          {[...(viewingStaffProfile.penalties || [])].reverse().map(p => (
                            <div key={p.id} className="bg-orange-50/50 p-4 rounded-2xl flex justify-between items-center border border-orange-100 hover:border-orange-300 transition-colors">
                              <span className="text-orange-600 font-black">-{p.amount.toLocaleString()} ج.م</span>
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-800">{p.note}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{new Date(p.date).toLocaleString('ar-EG')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t flex justify-center gap-4">
              <button
                onClick={() => printStaffProfile(viewingStaffProfile)}
                className="bg-black text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:scale-105 transition-all active:scale-95"
              >
                {ICONS.Print}
                <span>طباعة كشف حساب الموظف</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
