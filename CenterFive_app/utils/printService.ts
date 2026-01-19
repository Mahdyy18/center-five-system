


export type PrintMode = 'thermal' | 'a4';

export type PrintPayload = {
  html: string;
  title?: string;
  mode?: PrintMode;
};

function isTauriRuntime() {
  return Boolean((window as any).__TAURI_INTERNALS__);
}


export async function printHtml(payload: PrintPayload) {
  const { html, title = 'print' } = payload;

  
  
  if (isTauriRuntime()) {
    
    return webPrint(html, title);
  }

  return webPrint(html, title);
}

function webPrint(html: string, title: string) {
  const w = window.open('', '_blank', 'width=900,height=650');
  if (!w) throw new Error('Popup blocked. Please allow popups to print.');

  w.document.open();
  w.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          @page { margin: 0; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function(){ window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
