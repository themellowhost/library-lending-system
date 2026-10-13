export type UserRole = 'member' | 'librarian' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  memberId?: number;
  memberNumber?: string;
  memberStatus?: string;
}

export interface Book {
  id: number;
  isbn: string;
  title: string;
  publisher?: string;
  published_year?: number;
  description?: string;
  category_id?: number;
  category_name?: string;
  authors: string;
  total_copies: number;
  available_copies: number;
  on_loan_copies: number;
  on_hold_copies: number;
  copies?: Copy[];
  activeHoldsCount?: number;
}

export interface Copy {
  id: number;
  barcode: string;
  status: 'available' | 'on_loan' | 'on_hold' | 'maintenance' | 'lost';
  location: string;
  created_at: string;
}

export interface Loan {
  id: number;
  checked_out_at: string;
  due_at: string;
  returned_at?: string | null;
  renewal_count: number;
  fine_amount: number;
  fine_paid: number;
  barcode: string;
  location: string;
  book_id: number;
  book_title: string;
  isbn: string;
  is_overdue: number;
}

export interface Hold {
  id: number;
  book_id: number;
  status: 'waiting' | 'ready_for_pickup' | 'fulfilled' | 'cancelled' | 'expired';
  placed_at: string;
  ready_at?: string;
  expires_at?: string;
  book_title: string;
  isbn: string;
  pickup_barcode?: string;
  pickup_location?: string;
}

export interface Member {
  id: number;
  member_number: string;
  phone?: string;
  max_loans: number;
  status: 'active' | 'suspended' | 'expired';
  created_at: string;
  user_id: number;
  name: string;
  email: string;
  active_loans_count: number;
  overdue_loans_count: number;
}

export interface OverdueReportItem {
  loan_id: number;
  checked_out_at: string;
  due_at: string;
  fine_amount: number;
  fine_paid: number;
  barcode: string;
  book_title: string;
  member_id: number;
  member_number: string;
  member_name: string;
  member_email: string;
  days_overdue: number;
}
