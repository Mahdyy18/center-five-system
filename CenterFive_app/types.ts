
export enum UserRole {
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER'
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  category: 'A4' | 'A3' | 'Banner' | 'Other';
  teacherId?: string; 
  teacherName?: string; 
}

export interface InvoiceItem {
  serviceId: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
  teacherId?: string; 
  teacherName?: string; 
}

export interface Invoice {
  id: string;
  customerName: string;
  cashierName: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  total: number;
  status?: 'PAID' | 'RETURNED';
  isDebt?: boolean;
}

export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  note: string;
}

export interface ClientDebt {
  id: string;
  customerName: string;
  totalDebt: number;
  paidAmount: number;
  remainingAmount: number;
  history: {
    service: string;
    amount: number;
    date: string;
    note?: string;
  }[];
  payments: DebtPayment[];
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: 'RAW_MATERIALS' | 'TOOLS' | 'PURCHASES' | 'STAFF' | 'GENERAL' | 'SUPPLIER';
  description: string;
  staffId?: string;

  
  supplierName?: string; 
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface Staff {
  id: string;
  name: string;
  salary: number;
  bonuses: {
    id: string;
    amount: number;
    date: string;
    type: 'INCENTIVE' | 'OVERTIME';
    note: string;
  }[];
  penalties: {
    id: string;
    amount: number;
    date: string;
    note: string;
  }[];
  withdrawals: {
    id: string;
    amount: number;
    date: string;
    note: string;
  }[];
}

export interface TeacherService {
  id: string;
  name: string;
  price: number;
}

export interface TeacherHistoryItem {
  invoiceId: string;
  serviceName: string;
  quantity: number;
  amount: number;
  date: string;
  
  priced?: boolean;
  
  entryType?: 'DEBT' | 'NOTES';
}

export interface Teacher {
  id: string;
  name: string;
  code: string;
  services: TeacherService[];
  totalDebt: number;
  paidAmount: number;
  remainingAmount: number;
  history: TeacherHistoryItem[];
  payments: DebtPayment[];
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  user: string;
  role: UserRole;
  timestamp: string;
  type: 'SALE' | 'DEBT' | 'EXPENSE' | 'SYSTEM' | 'TEACHER';
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'SUCCESS' | 'WARNING' | 'ERROR';
}





export interface ExternalBook {
  id: string;
  title: string;
  price: number;
  isActive: boolean;
  createdAt: string;
}

export type BookingStatus = 'PENDING' | 'DELIVERED' | 'CANCELED';

export enum BookingItemType {
  EXTERNAL_BOOK = 'EXTERNAL_BOOK',
  TEACHER_NOTE = 'TEACHER_NOTE',
}

export interface BookingItem {
  id: string;
  bookingId: string;
  type: BookingItemType;
  title: string;
  teacherId?: string;
  teacherName?: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface BookingReceipt {
  id: string;
  bookingId: string;
  code: string; 
  customerName: string;
  customerPhone: string;
  cashierName: string;
  date: string;
  items: BookingItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

export interface Booking {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  createdById: string;
  createdByName: string;
  status: BookingStatus;
  deliveredAt?: string;
  deliveredByName?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  items: BookingItem[];
  receiptId: string;
}
