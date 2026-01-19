import React, { useState } from 'react';

interface CashiersProps {
  users: any[];
  onUpdateUsers: (u: any[]) => void;
  notify: (msg: string, type?: 'SUCCESS' | 'WARNING' | 'ERROR') => void;
}

const Cashiers: React.FC<CashiersProps> = ({ users, onUpdateUsers, notify }) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [confirmEditId, setConfirmEditId] = useState<string | null>(null);

  const addUser = () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      notify('من فضلك أدخل اسم مستخدم وكلمة مرور', 'WARNING');
      return;
    }
    if (users.some((u) => u.username === newUsername.trim())) {
      notify('اسم المستخدم موجود بالفعل', 'ERROR');
      return;
    }
    const updated = [
      ...users,
      {
        id: Date.now().toString(),
        username: newUsername.trim(),
        password: newPassword.trim(),
        role: 'CASHIER',
        createdAt: new Date().toISOString(),
      },
    ];
    onUpdateUsers(updated);
    setNewUsername('');
    setNewPassword('');
    notify('تم إضافة حساب كاشير بنجاح', 'SUCCESS');
  };

  const deleteUser = (id: string) => {
    const updated = users.filter((u) => u.id !== id);
    onUpdateUsers(updated);
    notify('تم حذف حساب الكاشير', 'SUCCESS');
  };

  const startEdit = (u: any) => {
    setConfirmEditId(u.id);
    setEditUsername(u.username);
    setEditPassword(u.password);
  };

  const confirmStartEdit = () => {
    if (!confirmEditId) return;
    setEditingId(confirmEditId);
    setConfirmEditId(null);
    notify('تم تفعيل وضع التعديل', 'SUCCESS');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditUsername('');
    setEditPassword('');
    notify('تم إلغاء التعديل', 'WARNING');
  };

  const saveEdit = () => {
    if (!editingId) return;
    if (!editUsername.trim() || !editPassword.trim()) {
      notify('من فضلك أدخل اسم مستخدم وكلمة مرور', 'WARNING');
      return;
    }
    if (users.some((u) => u.id !== editingId && u.username === editUsername.trim())) {
      notify('اسم المستخدم موجود بالفعل', 'ERROR');
      return;
    }
    const updated = users.map((u) => (u.id === editingId ? { ...u, username: editUsername.trim(), password: editPassword.trim() } : u));
    onUpdateUsers(updated);
    setEditingId(null);
    notify('تم حفظ التعديل بنجاح', 'SUCCESS');
  };

  return (
    <div className="space-y-8 animate-slide-up text-right">
      {confirmEditId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 bg-black text-white">
              <h3 className="text-xl font-black">تأكيد التعديل</h3>
              <p className="text-white/80 text-sm font-bold mt-1">هل أنت متأكد أنك تريد تفعيل وضع التعديل لهذا الكاشير؟</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <button onClick={confirmStartEdit} className="flex-1 bg-[#8000FF] text-white py-3 rounded-2xl font-black active:scale-95 transition-all">نعم، تعديل</button>
                <button onClick={() => setConfirmEditId(null)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-black active:scale-95 transition-all">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="p-3 bg-[#8000FF]/10 text-[#8000FF] rounded-2xl">👤</span>
          <div>
            <h2 className="text-2xl font-black text-gray-800">إدارة حسابات الكاشير</h2>
            <p className="text-sm text-gray-400 font-bold">إضافة / حذف / تعديل حسابات الكاشير</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="اسم المستخدم"
              className="px-5 py-3 rounded-2xl border-2 border-transparent focus:border-[#8000FF] outline-none font-bold text-right"
            />
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="كلمة المرور"
              className="px-5 py-3 rounded-2xl border-2 border-transparent focus:border-[#8000FF] outline-none font-bold text-right"
            />
            <button
              onClick={addUser}
              className="bg-[#8000FF] text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-[#8000FF]/20 active:scale-95 transition-all"
            >
              إضافة كاشير
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="text-gray-500 text-sm font-black">
                <th className="p-3">اليوزر</th>
                <th className="p-3">الباسورد</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="p-3">
                    <input
                      value={editingId === u.id ? editUsername : u.username}
                      onChange={(e) => editingId === u.id && setEditUsername(e.target.value)}
                      disabled={editingId !== u.id}
                      className={`w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 font-bold text-right ${editingId !== u.id ? 'opacity-70' : ''}`}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      value={editingId === u.id ? editPassword : u.password}
                      onChange={(e) => editingId === u.id && setEditPassword(e.target.value)}
                      disabled={editingId !== u.id}
                      className={`w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 font-bold text-right ${editingId !== u.id ? 'opacity-70' : ''}`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {editingId === u.id ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="bg-[#8000FF] text-white px-6 py-2 rounded-xl font-black shadow-md shadow-[#8000FF]/20 active:scale-95 transition-all"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-xl font-black active:scale-95 transition-all"
                          >
                            إلغاء
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEdit(u)}
                          className="bg-black text-white px-6 py-2 rounded-xl font-black active:scale-95 transition-all"
                        >
                          تعديل
                        </button>
                      )}

                      <button
                        onClick={() => deleteUser(u.id)}
                        className="bg-red-600 text-white px-6 py-2 rounded-xl font-black shadow-md shadow-red-200 active:scale-95 transition-all"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Cashiers;
