
import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { UserAccount, UserRole } from '../types';
import { ICONS } from '../constants';

interface LoginProps {
  onLogin: (role: UserRole, user?: UserAccount) => void;
  users: UserAccount[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    
    setTimeout(() => {
      
      if (username === 'osmanibrahimwahdan99@gmail.com' && password === '01093020321osman_') {
        onLogin(UserRole.ADMIN);
        return;
      }

      
      const matched = users.find(u => u.username === username && u.password === password);
      if (matched) {
        onLogin(matched.role, matched);
        return;
      }

      {
        setError('خطأ في اسم المستخدم أو كلمة المرور، يرجى المحاولة مرة أخرى.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#8000FF]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FFD700]/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md z-10">
        {}
        <div className="text-center mb-10">
        <div className="flex flex-col items-center gap-4 mb-1">
            <img
              src={logo}
              alt="سنتر فايف"
              className="h-44 w-44 object-contain"
            />
          </div>
          <h1 className="text-4xl font-black text-[#8000FF] mb-2">سنتر فايف</h1>
          <p className="text-gray-400 font-bold tracking-widest uppercase text-sm">Center Five Management System</p>
        </div>

        {}
        <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-[#8000FF]"></div>
          
          <h2 className="text-2xl font-black text-gray-800 mb-8 text-right">تسجيل الدخول للنظام</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-right">
              <label className="block text-sm font-bold text-gray-600 mr-2">اسم المستخدم أو البريد</label>
              <div className="relative">
                <input 
                  type="text"
                  required
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#8000FF] focus:bg-white rounded-2xl outline-none transition-all text-right font-bold"
                  placeholder="admin / email@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 text-right">
              <label className="block text-sm font-bold text-gray-600 mr-2">كلمة المرور</label>
              <div className="relative">
                <input 
                  type="password"
                  required
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#8000FF] focus:bg-white rounded-2xl outline-none transition-all text-right font-bold tracking-widest"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold text-right border border-red-100 animate-shake">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#8000FF] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-[#8000FF]/25 hover:shadow-[#8000FF]/40 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  دخول النظام
                  {ICONS.Arrow}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50 text-center">
            <p className="text-xs text-gray-400 font-bold mb-2">في حالة فقدان كلمة المرور يرجى التواصل مع</p>
            <a
              href="https://wa.me/201093020321"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#8000FF] font-black underline decoration-dashed underline-offset-4"
            >
              عثمان وهدان
            </a>
          </div>
        </div>

        <p className="text-center mt-10 text-gray-300 text-xs font-bold">
          © {new Date().getFullYear()} CENTER FIVE . ALL RIGHTS RESERVED
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Login;
