
import React, { useState } from 'react';
import { ActivityLog, UserRole } from '../types';
import { ICONS } from '../constants';

interface ActivityLogsProps {
  logs: ActivityLog[];
}

const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs }) => {
  const [filter, setFilter] = useState<ActivityLog['type'] | 'ALL'>('ALL');

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.type === filter);

  
  const getTypeColor = (type: ActivityLog['type']) => {
    switch (type) {
      case 'SALE': return 'bg-[#8000FF]';
      case 'DEBT': return 'bg-[#FFD700]';
      case 'EXPENSE': return 'bg-red-500';
      case 'SYSTEM': return 'bg-gray-800';
      case 'TEACHER': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  
  const getTypeLabel = (type: ActivityLog['type']) => {
    switch (type) {
      case 'SALE': return 'مبيعات';
      case 'DEBT': return 'ديون';
      case 'EXPENSE': return 'مصاريف';
      case 'SYSTEM': return 'نظام';
      case 'TEACHER': return 'مدرسين';
      default: return type;
    }
  };

  return (
    <div className="space-y-8 text-right">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-[#8000FF]/10 text-[#8000FF] rounded-lg">{ICONS.History}</span>
          <h2 className="text-2xl font-black text-black">سجل نشاطات النظام</h2>
        </div>
        
        <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-100 shadow-sm">
          {}
          {(['ALL', 'SALE', 'DEBT', 'EXPENSE', 'SYSTEM', 'TEACHER'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filter === t ? 'bg-[#8000FF] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t === 'ALL' ? 'الكل' : getTypeLabel(t)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8">
          {filteredLogs.length === 0 ? (
            <div className="py-20 text-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-2xl">
              لا توجد نشاطات مسجلة حالياً ضمن هذا التصنيف
            </div>
          ) : (
            <div className="relative">
              {}
              <div className="absolute top-0 bottom-0 right-4 w-1 bg-gray-50 rounded-full"></div>

              <div className="space-y-8">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="relative pr-12 group">
                    {}
                    <div className={`absolute top-1 right-2 w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 transition-transform group-hover:scale-125 ${getTypeColor(log.type)}`}></div>
                    
                    <div className="bg-gray-50 p-6 rounded-2xl group-hover:bg-white group-hover:shadow-lg group-hover:shadow-[#8000FF]/5 transition-all border border-transparent group-hover:border-[#8000FF]/10">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-left">
                          <span className="text-[10px] font-black text-gray-400 bg-white px-2 py-1 rounded-lg border border-gray-100">
                            {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="block text-[10px] text-gray-400 mt-1">
                            {new Date(log.timestamp).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                        <div className="text-right">
                          <h4 className="font-black text-gray-800 text-lg">{log.action}</h4>
                          <div className="flex gap-2 mt-1 justify-end items-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${getTypeColor(log.type)}`}>
                              {getTypeLabel(log.type)}
                            </span>
                            <span className="text-[10px] font-bold text-[#8000FF] bg-[#8000FF]/5 px-2 py-0.5 rounded-full">
                              بواسطة: {log.user} ({log.role === UserRole.ADMIN ? 'مدير' : 'كاشير'})
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 font-medium leading-relaxed bg-white/50 p-3 rounded-xl border border-gray-100/50">
                        {log.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;
