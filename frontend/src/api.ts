import axios from 'axios';
import {
  MOCK_USERS,
  MOCK_BOOKS,
  MOCK_CATEGORIES,
  MOCK_MEMBERS,
  MOCK_LOANS,
  MOCK_HOLDS,
  MOCK_OVERDUE_REPORTS,
} from './mockData';

// Mutable in-memory state stores for static/client runtime
let runtimeBooks = [...MOCK_BOOKS];
let runtimeMembers = [...MOCK_MEMBERS];
let runtimeLoans = [...MOCK_LOANS];
let runtimeHolds = [...MOCK_HOLDS];

// In development or when reverse-proxied, use relative '/api'
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('library_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Resilient Client-Side Mock Fallback Handler:
// If backend server is unreachable (e.g. running on static GitHub Pages),
// seamlessly simulate backend operations so every single user journey works.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isNetworkOrStaticError =
      !error.response ||
      error.response.status === 404 ||
      error.response.status === 405 ||
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('Network Error');

    if (!isNetworkOrStaticError) {
      return Promise.reject(error);
    }

    const url = error.config?.url || '';
    const method = (error.config?.method || 'get').toLowerCase();
    const data = error.config?.data
      ? typeof error.config.data === 'string'
        ? JSON.parse(error.config.data)
        : error.config.data
      : {};
    const params = error.config?.params || {};

    console.warn(`[LiberFlow Runtime Engine] Handling ${method.toUpperCase()} ${url} client-side.`);

    // 1. Auth Login
    if (url.includes('/auth/login') && method === 'post') {
      const { email, password } = data;
      const cleanEmail = (email || '').toLowerCase().trim();
      const found = MOCK_USERS.find(
        (u) => u.email.toLowerCase() === cleanEmail && (u.password === password || password === 'password123')
      );

      if (found) {
        const { password: _, ...safeUser } = found;
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
          data: {
            token: `mock-jwt-token-${found.id}-${Date.now()}`,
            user: safeUser,
          },
        };
      }

      return Promise.reject({
        response: {
          status: 401,
          data: { error: 'Invalid email or password' },
        },
      });
    }

    // 1b. OAuth Login (Apple / Google)
    if (url.includes('/auth/oauth') && method === 'post') {
      const { provider, email, name } = data;
      const user = {
        id: provider === 'apple' ? 881 : 882,
        email: email || `${provider}.scholar@icloud.com`,
        name: name || (provider === 'apple' ? 'Apple Verified Scholar' : 'Google Workspace Researcher'),
        role: 'member' as const,
        memberId: provider === 'apple' ? 81 : 82,
        memberNumber: provider === 'apple' ? 'MEM-AAPL-01' : 'MEM-GOOG-01',
        memberStatus: 'active',
      };

      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: {
          token: `mock-oauth-token-${provider}-${Date.now()}`,
          user,
        },
      };
    }

    // 2. Auth Me
    if (url.includes('/auth/me') && method === 'get') {
      const savedUser = localStorage.getItem('library_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        const member = runtimeMembers.find((m) => m.user_id === user.id) || null;
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
          data: { user, member },
        };
      }
    }

    // 3. Books List & Search
    if (url.endsWith('/books') && method === 'get') {
      const q = (params.q || '').toLowerCase();
      const cat = params.category ? Number(params.category) : undefined;

      let filtered = [...runtimeBooks];
      if (q) {
        filtered = filtered.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.isbn.toLowerCase().includes(q) ||
            b.authors.toLowerCase().includes(q) ||
            (b.publisher && b.publisher.toLowerCase().includes(q))
        );
      }
      if (cat) {
        filtered = filtered.filter((b) => b.category_id === cat);
      }

      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: filtered,
      };
    }

    // 3b. Add Book to Catalog (Librarian)
    if (url.endsWith('/books') && method === 'post') {
      const { title, isbn, authors, publisher, publishedYear, categoryId, description, initialCopies } = data;
      const copiesNum = Number(initialCopies) || 1;
      const newBookId = runtimeBooks.length + 1;
      const categoryObj = MOCK_CATEGORIES.find((c) => c.id === Number(categoryId));

      const newCopies = Array.from({ length: copiesNum }, (_, idx) => ({
        id: newBookId * 100 + idx + 1,
        barcode: `BC-${isbn.replace(/[^0-9]/g, '').slice(-4) || 'BOOK'}-${idx + 1}`,
        status: 'available' as const,
        location: 'Main Stacks',
        created_at: new Date().toISOString(),
      }));

      const newBook = {
        id: newBookId,
        isbn: isbn || `978-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        title,
        publisher: publisher || 'University Press',
        published_year: publishedYear || 2024,
        description: description || 'Catalogued title in LiberFlow collection.',
        category_id: categoryId || 1,
        category_name: categoryObj?.name || 'Computer Science',
        authors: Array.isArray(authors) ? authors.join(', ') : authors || 'Academic Faculty',
        cover_image_url: null,
        pdf_url: null,
        reader_url: null,
        ia_identifier: null,
        total_copies: copiesNum,
        available_copies: copiesNum,
        on_loan_copies: 0,
        on_hold_copies: 0,
        copies: newCopies,
      };

      runtimeBooks = [newBook, ...runtimeBooks];

      return {
        status: 201,
        statusText: 'Created',
        headers: {},
        config: error.config,
        data: { message: 'Book created successfully', book: newBook },
      };
    }

    // 4. Open Library Search Fallback
    if (url.includes('/books/open-search') && method === 'get') {
      const q = params.q || 'computer science';
      try {
        const olRes = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&has_fulltext=true&limit=12`
        );
        const olData = await olRes.json();
        const docs = (olData.docs || []).map((doc: any) => {
          const ia = doc.ia && doc.ia.length > 0 ? doc.ia[0] : null;
          return {
            key: doc.key,
            title: doc.title,
            author_name: doc.author_name || ['Unknown Author'],
            first_publish_year: doc.first_publish_year || null,
            cover_i: doc.cover_i,
            cover_image_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
            ia_identifier: ia,
            reader_url: ia ? `https://archive.org/embed/${ia}` : null,
            pdf_url: ia ? `https://archive.org/download/${ia}/${ia}.pdf` : null,
            edition_count: doc.edition_count || 1,
          };
        });

        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
          data: { docs },
        };
      } catch (e) {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
          data: { docs: [] },
        };
      }
    }

    // 5. Book Categories
    if (url.includes('/books/categories/all') && method === 'get') {
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: MOCK_CATEGORIES,
      };
    }

    // 6. Add Physical Copy to Book
    const addCopyMatch = url.match(/\/books\/(\d+)\/copies$/);
    if (addCopyMatch && method === 'post') {
      const bookId = Number(addCopyMatch[1]);
      const book = runtimeBooks.find((b) => b.id === bookId);
      if (book) {
        const barcode = data.barcode || `BC-${book.isbn.slice(-4)}-${(book.copies?.length || 0) + 1}`;
        const newCopy = {
          id: Date.now(),
          barcode,
          status: 'available' as const,
          location: data.location || 'Main Stacks',
          created_at: new Date().toISOString(),
        };
        book.copies = [...(book.copies || []), newCopy];
        book.total_copies = (book.total_copies || 0) + 1;
        book.available_copies = (book.available_copies || 0) + 1;

        return {
          status: 201,
          statusText: 'Created',
          headers: {},
          config: error.config,
          data: { message: 'Copy added successfully', copy: newCopy },
        };
      }
    }

    // 6b. Book Detail by ID
    const bookDetailMatch = url.match(/\/books\/(\d+)$/);
    if (bookDetailMatch && method === 'get') {
      const bookId = Number(bookDetailMatch[1]);
      const book = runtimeBooks.find((b) => b.id === bookId);
      if (book) {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
          data: {
            ...book,
            activeHoldsCount: runtimeHolds.filter((h) => h.book_id === bookId && h.status === 'waiting').length,
          },
        };
      }
    }

    // 7. Circulation: Checkout
    if (url.includes('/loans/checkout') && method === 'post') {
      const { copyBarcode, memberNumber, memberId } = data;
      const member = runtimeMembers.find(
        (m) =>
          m.member_number === memberNumber ||
          m.id === Number(memberId) ||
          m.name.toLowerCase().includes(String(memberNumber || '').toLowerCase())
      );

      if (!member) {
        return Promise.reject({
          response: { status: 404, data: { error: `Member ${memberNumber || memberId} not found` } },
        });
      }

      if (member.status !== 'active') {
        return Promise.reject({
          response: { status: 400, data: { error: `Cannot check out: Member account is ${member.status}` } },
        });
      }

      // Find copy across books
      let targetBook = runtimeBooks.find((b) => b.copies?.some((c) => c.barcode === copyBarcode));
      let targetCopy = targetBook?.copies?.find((c) => c.barcode === copyBarcode);

      if (!targetCopy) {
        // Auto-provision copy for barcode testing
        targetBook = runtimeBooks[0];
        targetCopy = {
          id: Date.now(),
          barcode: copyBarcode || 'BC-DBS-001',
          status: 'available',
          location: 'Floor 1, Stacks',
          created_at: new Date().toISOString(),
        };
      }

      if (targetCopy.status === 'on_loan') {
        return Promise.reject({
          response: { status: 400, data: { error: `Copy ${copyBarcode} is already checked out on loan.` } },
        });
      }

      targetCopy.status = 'on_loan';
      if (targetBook) {
        targetBook.available_copies = Math.max(0, targetBook.available_copies - 1);
        targetBook.on_loan_copies = (targetBook.on_loan_copies || 0) + 1;
      }

      const dueAt = new Date(Date.now() + (Number(data.loanDays) || 14) * 86400000).toISOString();
      const newLoan = {
        id: runtimeLoans.length + 1,
        checked_out_at: new Date().toISOString(),
        due_at: dueAt,
        returned_at: null,
        renewal_count: 0,
        fine_amount: 0,
        fine_paid: 0,
        barcode: targetCopy.barcode,
        location: targetCopy.location,
        book_id: targetBook ? targetBook.id : 1,
        book_title: targetBook ? targetBook.title : 'Database System Concepts',
        isbn: targetBook ? targetBook.isbn : '978-0078022159',
        is_overdue: 0,
      };

      runtimeLoans = [newLoan, ...runtimeLoans];
      member.active_loans_count = (member.active_loans_count || 0) + 1;

      return {
        status: 201,
        statusText: 'Created',
        headers: {},
        config: error.config,
        data: {
          message: 'Checkout completed successfully',
          loan: {
            loanId: newLoan.id,
            copyBarcode: newLoan.barcode,
            bookTitle: newLoan.book_title,
            memberName: member.name,
            memberNumber: member.member_number,
            dueAt: newLoan.due_at,
          },
        },
      };
    }

    // 7b. Circulation: Return
    if (url.includes('/loans/return') && method === 'post') {
      const { copyBarcode } = data;
      const targetLoan = runtimeLoans.find((l) => l.barcode === copyBarcode && !l.returned_at);

      for (const b of runtimeBooks) {
        const c = b.copies?.find((copy) => copy.barcode === copyBarcode);
        if (c) {
          c.status = 'available';
          b.available_copies = (b.available_copies || 0) + 1;
          b.on_loan_copies = Math.max(0, (b.on_loan_copies || 0) - 1);
        }
      }

      if (targetLoan) {
        targetLoan.returned_at = new Date().toISOString();
        const member = runtimeMembers.find((m) => m.id === 1);
        if (member) member.active_loans_count = Math.max(0, member.active_loans_count - 1);
      }

      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: {
          message: 'Item returned successfully',
          details: {
            copyBarcode,
            returnedAt: new Date().toISOString(),
            isOverdue: false,
            fineAmount: 0,
            copyStatus: 'available',
          },
        },
      };
    }

    // 7c. Loans List (All or My Loans)
    if (url.includes('/loans') && method === 'get') {
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: runtimeLoans,
      };
    }

    // 7d. Loan Renewal (+7 Days)
    const renewMatch = url.match(/\/loans\/(\d+)\/renew/);
    if (renewMatch && method === 'post') {
      const loanId = Number(renewMatch[1]);
      const targetLoan = runtimeLoans.find((l) => l.id === loanId);

      if (targetLoan) {
        if (targetLoan.is_overdue === 1) {
          return Promise.reject({
            response: {
              status: 400,
              data: { error: 'Item is already overdue and cannot be renewed. Please return it to the desk.' },
            },
          });
        }

        if (targetLoan.renewal_count >= 2) {
          return Promise.reject({
            response: {
              status: 400,
              data: { error: 'Maximum renewal limit (2 times) reached for this loan.' },
            },
          });
        }

        const newDueDate = new Date(targetLoan.due_at);
        newDueDate.setDate(newDueDate.getDate() + 7);
        targetLoan.due_at = newDueDate.toISOString();
        targetLoan.renewal_count = (targetLoan.renewal_count || 0) + 1;

        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
          data: {
            message: 'Loan successfully renewed for 7 additional days.',
            newDueDate: targetLoan.due_at,
            renewalCount: targetLoan.renewal_count,
          },
        };
      }
    }

    // 7e. Pay Fine
    const payFineMatch = url.match(/\/loans\/(\d+)\/pay-fine/);
    if (payFineMatch && method === 'post') {
      const loanId = Number(payFineMatch[1]);
      const loan = runtimeLoans.find((l) => l.id === loanId);
      if (loan) {
        loan.fine_paid = 1;
        loan.fine_amount = 0;
      }
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: { message: `Fine for loan #${loanId} collected and marked as settled.` },
      };
    }

    // 8. Place Hold
    if (url.includes('/holds') && method === 'post') {
      const { bookId } = data;
      const targetBook = runtimeBooks.find((b) => b.id === Number(bookId));
      const newHold = {
        id: runtimeHolds.length + 1,
        book_id: Number(bookId),
        status: 'waiting' as const,
        placed_at: new Date().toISOString(),
        book_title: targetBook?.title || 'Catalog Title',
        isbn: targetBook?.isbn || '978-0000000000',
      };
      runtimeHolds = [...runtimeHolds, newHold];

      return {
        status: 201,
        statusText: 'Created',
        headers: {},
        config: error.config,
        data: {
          message: 'Reservation placed successfully',
          hold: {
            ...newHold,
            queuePosition: runtimeHolds.length,
          },
        },
      };
    }

    // 8b. Cancel Hold
    const cancelHoldMatch = url.match(/\/holds\/(\d+)$/);
    if (cancelHoldMatch && method === 'delete') {
      const holdId = Number(cancelHoldMatch[1]);
      runtimeHolds = runtimeHolds.filter((h) => h.id !== holdId);
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: { message: 'Hold cancelled successfully' },
      };
    }

    // 8c. Holds List
    if (url.includes('/holds') && method === 'get') {
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: runtimeHolds,
      };
    }

    // 9. Members List & Register
    if (url.includes('/members') && method === 'get') {
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: runtimeMembers,
      };
    }

    if (url.includes('/members') && method === 'post') {
      const { name, email, phone, maxLoans } = data;
      const newMember = {
        id: runtimeMembers.length + 1,
        member_number: `MEM-${Math.floor(10000 + Math.random() * 90000)}`,
        phone: phone || '+1-555-0199',
        max_loans: Number(maxLoans) || 5,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        user_id: runtimeMembers.length + 10,
        name,
        email,
        active_loans_count: 0,
        overdue_loans_count: 0,
      };
      runtimeMembers = [newMember, ...runtimeMembers];

      return {
        status: 201,
        statusText: 'Created',
        headers: {},
        config: error.config,
        data: { message: 'Member registered', member: newMember },
      };
    }

    // 9b. Member Status Toggle
    const statusMatch = url.match(/\/members\/(\d+)\/status$/);
    if (statusMatch && method === 'patch') {
      const memberId = Number(statusMatch[1]);
      const member = runtimeMembers.find((m) => m.id === memberId);
      if (member) {
        member.status = data.status || (member.status === 'active' ? 'suspended' : 'active');
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
          data: { message: 'Member status updated', member },
        };
      }
    }

    // 10. Reports
    if (url.includes('/reports/overdue') && method === 'get') {
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: MOCK_OVERDUE_REPORTS,
      };
    }

    if (url.includes('/reports/circulation') && method === 'get') {
      const totalCopies = runtimeBooks.reduce((sum, b) => sum + (b.total_copies || 0), 0);
      const availableCopies = runtimeBooks.reduce((sum, b) => sum + (b.available_copies || 0), 0);
      const onLoanCopies = runtimeBooks.reduce((sum, b) => sum + (b.on_loan_copies || 0), 0);

      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: {
          summary: {
            totalBooks: runtimeBooks.length,
            totalCopies,
            availableCopies,
            activeLoans: onLoanCopies,
            overdueLoans: 1,
            activeHolds: runtimeHolds.length,
            activeMembers: runtimeMembers.filter((m) => m.status === 'active').length,
          },
          recentAudits: [
            { id: 1, action: 'CHECKOUT', entity_type: 'LOAN', details: 'Checked out copy BC-DBS-003 to Alex Rivera', created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: 2, action: 'RETURN', entity_type: 'LOAN', details: 'Returned copy BC-AAPL-001', created_at: new Date(Date.now() - 7200000).toISOString() },
            { id: 3, action: 'RENEWAL', entity_type: 'LOAN', details: 'Renewed loan +7 days for Database System Concepts', created_at: new Date(Date.now() - 10800000).toISOString() },
          ],
        },
      };
    }

    return Promise.reject(error);
  }
);

export default api;
