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
// If the backend server is unreachable (e.g. running on static GitHub Pages),
// seamlessly simulate backend operations so login, search, borrowing, and e-reader always function.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isNetworkOr404 =
      !error.response ||
      error.response.status === 404 ||
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('Network Error');

    if (!isNetworkOr404) {
      return Promise.reject(error);
    }

    const url = error.config?.url || '';
    const method = (error.config?.method || 'get').toLowerCase();
    const data = error.config?.data ? (typeof error.config.data === 'string' ? JSON.parse(error.config.data) : error.config.data) : {};
    const params = error.config?.params || {};

    console.warn(`[LiberFlow Network Fallback] Backend not reachable for ${method.toUpperCase()} ${url}. Serving from local resilient mock store.`);

    // 1. Auth Login
    if (url.includes('/auth/login') && method === 'post') {
      const { email, password } = data;
      const found = MOCK_USERS.find(
        (u) => u.email.toLowerCase() === (email || '').toLowerCase() && u.password === password
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

    // 2. Auth Me
    if (url.includes('/auth/me') && method === 'get') {
      const savedUser = localStorage.getItem('library_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        const member = MOCK_MEMBERS.find((m) => m.user_id === user.id) || null;
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

      let filtered = [...MOCK_BOOKS];
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

    // 4. Open Library Search Fallback (Directly hits Open Library API on client if backend proxy fails)
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

    // 6. Book Detail by ID
    const bookDetailMatch = url.match(/\/books\/(\d+)$/);
    if (bookDetailMatch && method === 'get') {
      const bookId = Number(bookDetailMatch[1]);
      const book = MOCK_BOOKS.find((b) => b.id === bookId);
      if (book) {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
          data: {
            ...book,
            activeHoldsCount: 0,
          },
        };
      }
    }

    // 7. Loans
    if (url.includes('/loans') && method === 'get') {
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: MOCK_LOANS,
      };
    }

    // 8. Holds
    if (url.includes('/holds') && method === 'get') {
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: MOCK_HOLDS,
      };
    }

    // 9. Members List
    if (url.includes('/members') && method === 'get') {
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: MOCK_MEMBERS,
      };
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

    if (url.includes('/reports/summary') && method === 'get') {
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        data: {
          totalBooks: MOCK_BOOKS.length,
          totalCopies: 11,
          availableCopies: 8,
          activeLoans: 2,
          overdueLoans: 1,
          activeHolds: 0,
          activeMembers: 3,
        },
      };
    }

    return Promise.reject(error);
  }
);

export default api;
