export const ensureArray = <T,>(v: any): T[] => Array.isArray(v) ? v : [];
export const ensureNumber = (v: any, d = 0): number => (typeof v === 'number' && !Number.isNaN(v)) ? v : d;
export const ensureString = (v: any, d = ''): string => (typeof v === 'string') ? v : d;

export function normalizeImportedData(raw: any) {
  const data = raw && typeof raw === 'object' ? raw : {};

  
  return {
    ...data,
    students: ensureArray(data.students),
    teachers: ensureArray(data.teachers),
    invoices: ensureArray(data.invoices),
    clientDebts: ensureArray(data.clientDebts),
    cashiers: ensureArray(data.cashiers),
    activityLogs: ensureArray(data.activityLogs),
    services: ensureArray(data.services),
  };
}