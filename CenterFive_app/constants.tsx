
import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Wallet, 
  BarChart3, 
  Settings,
  Plus,
  Trash2,
  Printer,
  ChevronLeft,
  Search,
  History,
  Database,
  Download,
  Upload,
  Cloud,
  RotateCcw,
  
  GraduationCap,
  UserRound,
  ClipboardList
} from 'lucide-react';

export const COLORS = {
  primary: '#8000FF',
  secondary: '#FFD700',
  background: '#FFFFFF',
  text: '#000000'
};

export const INITIAL_SERVICES = [];

export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Sales: <ShoppingCart size={20} />,
  Debts: <Users size={20} />,
  Expenses: <Wallet size={20} />,
  Reports: <BarChart3 size={20} />,
  Settings: <Settings size={20} />,
  Plus: <Plus size={20} />,
  Trash: <Trash2 size={20} />,
  Print: <Printer size={20} />,
  Arrow: <ChevronLeft size={20} />,
  Search: <Search size={20} />,
  History: <History size={20} />,
  Database: <Database size={20} />,
  Download: <Download size={20} />,
  Upload: <Upload size={20} />,
  Cloud: <Cloud size={20} />,
  Reset: <RotateCcw size={20} />,
  Clipboard: <ClipboardList size={20} />,
  
  Teachers: <GraduationCap size={20} />,
  User: <UserRound size={20} />,
  Cashiers: <Users size={20} />
};
