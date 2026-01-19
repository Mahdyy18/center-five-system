import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('UI Crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-lg w-full text-right">
            <div className="text-xl font-black text-red-600">حدث خطأ غير متوقع</div>
            <div className="mt-2 text-sm font-bold text-gray-600">
              تم منع التطبيق من إظهار صفحة بيضاء. جرب تحديث الصفحة، أو ارجع للصفحة السابقة.
            </div>
            <div className="mt-4 flex gap-3 flex-wrap">
              <button
                className="bg-[#8000FF] text-white px-5 py-3 rounded-xl font-black text-sm"
                onClick={() => window.location.reload()}
              >
                تحديث الصفحة
              </button>
              <button
                className="bg-gray-100 text-gray-700 px-5 py-3 rounded-xl font-black text-sm"
                onClick={() => window.history.back()}
              >
                رجوع
              </button>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-black text-gray-500">تفاصيل فنية</summary>
              <pre className="mt-2 text-[11px] whitespace-pre-wrap text-gray-600">
                {String(this.state.error?.message || this.state.error || '')}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}