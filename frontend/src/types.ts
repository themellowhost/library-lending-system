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
  cover_image_url?: string | null;
  pdf_url?: string | null;
  reader_url?: string | null;
  ia_identifier?: string | null;
  total_copies: number;
  available_copies: number;
  on_loan_copies: number;
  on_hold_copies: number;
  copies?: Copy[];
  activeHoldsCount?: number;
}

export interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name: string[];
  first_publish_year?: number;
  cover_i?: number;
  cover_image_url?: string | null;
  ia_identifier?: string | null;
  reader_url?: string | null;
  pdf_url?: string | null;
  edition_count: number;
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
  extension_id?: number | null;
  extension_status?: 'pending' | 'approved' | 'rejected' | null;
  extension_requested_days?: number | null;
  extension_reason?: string | null;
  extension_review_notes?: string | null;
  extension_reviewed_at?: string | null;
  pending_extension_id?: number | null;
  pending_extension_days?: number | null;
  pending_extension_reason?: string | null;
}

export interface LoanExtension {
  id: number;
  loan_id: number;
  requested_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  due_at: string;
  renewal_count: number;
  barcode: string;
  location: string;
  book_title: string;
  isbn: string;
  member_id: number;
  member_number: string;
  member_name: string;
  member_email: string;
  waiting_holds_count: number;
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
