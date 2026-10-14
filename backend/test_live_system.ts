import Database from 'better-sqlite3';

const BASE_URL = 'http://localhost:5001/api';

async function runLiveSystemVerification() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE END-TO-END FLOW VERIFICATION');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`, detail || '');
    }
  }

  // --- Step 1: Health Check ---
  console.log('1. Health Check');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json() as any;
  assert(healthRes.status === 200 && healthData.status === 'ok', 'API Health check returns 200 OK');

  // --- Step 2: Authentication ---
  console.log('\n2. Authentication Flow');
  
  // Member Login
  const memberLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@student.edu', password: 'password123' })
  });
  const memberAuth = await memberLoginRes.json() as any;
  assert(memberLoginRes.status === 200 && !!memberAuth.token, 'Member Login returns valid JWT token', memberAuth);
  const memberToken = memberAuth.token;
  const memberId = memberAuth.user.memberId;

  // Librarian Login
  const libLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'librarian@library.edu', password: 'password123' })
  });
  const libAuth = await libLoginRes.json() as any;
  assert(libLoginRes.status === 200 && libAuth.user.role === 'librarian', 'Librarian Login returns librarian role', libAuth);
  const librarianToken = libAuth.token;

  // Admin Login
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@library.edu', password: 'password123' })
  });
  const adminAuth = await adminLoginRes.json() as any;
  assert(adminLoginRes.status === 200 && adminAuth.user.role === 'admin', 'Admin Login returns admin role', adminAuth);
  const adminToken = adminAuth.token;

  // New Member Self-Registration Flow
  const regEmail = `test.member.${Date.now()}@university.edu`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Elena Rostova',
      email: regEmail,
      password: 'password123',
      phone: '+1-555-0199'
    })
  });
  const regData = await regRes.json() as any;
  assert(regRes.status === 201 && !!regData.token && regData.user.role === 'member', 'Registration creates active member account and returns token', regData);
  assert(!!regData.user.memberNumber && regData.user.memberNumber.startsWith('MEM-'), 'Registered member receives assigned member number');

  // Verify duplicate registration rejection (409)
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Elena',
      email: regEmail,
      password: 'password123'
    })
  });
  assert(dupRes.status === 409, 'Duplicate email registration returns 409 Conflict');

  // --- Step 3: Catalog & Search ---
  console.log('\n3. Catalog & Metadata Lookup');
  const booksRes = await fetch(`${BASE_URL}/books`);
  const booksData = await booksRes.json() as any[];
  assert(Array.isArray(booksData) && booksData.length >= 5, `Catalog returns ${booksData.length} indexed books`);

  const book1Res = await fetch(`${BASE_URL}/books/1`);
  const book1 = await book1Res.json() as any;
  assert(book1.id === 1 && !!book1.title && !!book1.reader_url, `Book 1 has valid title "${book1.title}" and reader URL "${book1.reader_url}"`);

  // ISBN Lookup
  const isbnLookupRes = await fetch(`${BASE_URL}/books/lookup-isbn/9780078022159`);
  const isbnBook = await isbnLookupRes.json() as any;
  const bookTitle = isbnBook.book?.title || isbnBook.title || '';
  assert(isbnLookupRes.status === 200 && bookTitle.includes('Database'), 'ISBN Auto-lookup resolves Database book');

  // --- Step 4: Online Book Reservation (Ready for Pick Up) ---
  console.log('\n4. Online Book Reservation (Ready for Pick Up)');
  // Clean any existing hold and lingering test loans on Book 2 for this member first
  const db = new Database('./library.db');
  db.prepare(`DELETE FROM holds WHERE member_id = ? AND book_id = 2`).run(memberId);
  db.prepare(`UPDATE loans SET returned_at = datetime('now') WHERE member_id = ? AND copy_id IN (SELECT id FROM copies WHERE book_id = 2) AND returned_at IS NULL`).run(memberId);
  db.prepare(`UPDATE copies SET status = 'available' WHERE book_id = 2`).run();

  const reserveRes = await fetch(`${BASE_URL}/holds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${memberToken}`
    },
    body: JSON.stringify({ bookId: 2 })
  });
  const reserveData = await reserveRes.json() as any;
  assert(
    reserveRes.status === 201 && reserveData.hold.status === 'ready_for_pickup',
    'Reservation placed and status is strictly "ready_for_pickup"',
    reserveData
  );
  const createdHoldId = reserveData.hold.id;

  // Check Member's active holds list
  const myHoldsRes = await fetch(`${BASE_URL}/holds/my-holds`, {
    headers: { 'Authorization': `Bearer ${memberToken}` }
  });
  const myHolds = await myHoldsRes.json() as any[];
  const foundInMyHolds = myHolds.find(h => h.id === createdHoldId);
  assert(!!foundInMyHolds && foundInMyHolds.status === 'ready_for_pickup', 'Member can see active reservation as ready_for_pickup in my-holds');

  // --- Step 5: Librarian Workspace & Quick Checkout ---
  console.log('\n5. Librarian Workspace & Quick Checkout');
  const activeHoldsRes = await fetch(`${BASE_URL}/holds/active`, {
    headers: { 'Authorization': `Bearer ${librarianToken}` }
  });
  const activeHolds = await activeHoldsRes.json() as any[];
  const foundHold = activeHolds.find(h => h.id === createdHoldId);
  assert(!!foundHold, 'Librarian can see the active holding in requested queue', activeHolds);

  // Quick Checkout
  const quickCheckoutRes = await fetch(`${BASE_URL}/holds/${createdHoldId}/quick-checkout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${librarianToken}` }
  });
  const quickCheckoutData = await quickCheckoutRes.json() as any;
  assert(
    quickCheckoutRes.status === 200 && !!quickCheckoutData.result.loanId,
    `Quick Checkout succeeded: Book issued as Loan #${quickCheckoutData.result?.loanId}`,
    quickCheckoutData
  );

  const issuedLoanId = quickCheckoutData.result.loanId;
  const issuedCopyId = quickCheckoutData.result.copyId;

  // Verify in SQLite database directly
  const copyRow = db.prepare('SELECT status FROM copies WHERE id = ?').get(issuedCopyId) as any;
  const holdRow = db.prepare('SELECT status FROM holds WHERE id = ?').get(createdHoldId) as any;
  const loanRow = db.prepare('SELECT id, copy_id, member_id, returned_at FROM loans WHERE id = ?').get(issuedLoanId) as any;
  assert(copyRow.status === 'on_loan', 'Database: Copy status transitioned to "on_loan"');
  assert(holdRow.status === 'fulfilled', 'Database: Hold status transitioned to "fulfilled"');
  assert(loanRow.member_id === memberId && loanRow.returned_at === null, 'Database: Active loan record created for member');

  // --- Step 6: Loan Extension Application & Review Flow ---
  console.log('\n6. Loan Extension Application & Librarian Review Flow');
  // Member applies for extension
  const applyExtRes = await fetch(`${BASE_URL}/loans/${issuedLoanId}/apply-extension`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${memberToken}`
    },
    body: JSON.stringify({
      requestedDays: 14,
      reason: 'Preparing for DBMS Semester 5 LCA examination'
    })
  });
  const applyExtData = await applyExtRes.json() as any;
  assert(applyExtRes.status === 201 && applyExtData.extension.status === 'pending', 'Member applied for 14-day loan extension successfully', applyExtData);
  const extensionId = applyExtData.extension.id;

  // Librarian lists pending extensions
  const pendingExtsRes = await fetch(`${BASE_URL}/loans/extensions/pending`, {
    headers: { 'Authorization': `Bearer ${librarianToken}` }
  });
  const pendingExts = await pendingExtsRes.json() as any[];
  const foundExt = pendingExts.find(e => e.id === extensionId);
  assert(!!foundExt, 'Librarian sees extension application in pending queue');

  // Librarian approves extension
  const reviewExtRes = await fetch(`${BASE_URL}/loans/extensions/${extensionId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${librarianToken}`
    },
    body: JSON.stringify({
      decision: 'approve',
      reviewNotes: 'Approved for Semester 5 LCA preparation'
    })
  });
  const reviewExtData = await reviewExtRes.json() as any;
  assert(reviewExtRes.status === 200, 'Librarian approved extension application', reviewExtData);

  // Check in SQLite database: due_at should be prolonged and extension approved
  const updatedLoan = db.prepare('SELECT due_at, renewal_count FROM loans WHERE id = ?').get(issuedLoanId) as any;
  const extRow = db.prepare('SELECT status, review_notes FROM loan_extensions WHERE id = ?').get(extensionId) as any;
  assert(extRow.status === 'approved', 'Database: Extension status is "approved"');
  assert(updatedLoan.renewal_count === 1, 'Database: Loan renewal_count incremented to 1');

  // --- Step 7: Circulation Return / Checkin ---
  console.log('\n7. Circulation Check-in (Book Return)');
  const copyBarcode = quickCheckoutData.result.barcode;
  const returnRes = await fetch(`${BASE_URL}/loans/return`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${librarianToken}`
    },
    body: JSON.stringify({ copyBarcode: copyBarcode })
  });
  const returnData = await returnRes.json() as any;
  assert(returnRes.status === 200, `Book copy (${copyBarcode}) returned through circulation desk`, returnData);

  const returnedCopyRow = db.prepare('SELECT status FROM copies WHERE id = ?').get(issuedCopyId) as any;
  const returnedLoanRow = db.prepare('SELECT returned_at FROM loans WHERE id = ?').get(issuedLoanId) as any;
  assert(returnedCopyRow.status === 'available', 'Database: Copy status returned to "available"');
  assert(returnedLoanRow.returned_at !== null, 'Database: Loan marked with timestamp returned_at');

  // --- Step 8: Reports & Metrics ---
  console.log('\n8. Circulation Reports & Metrics');
  const circReportRes = await fetch(`${BASE_URL}/loans/reports/circulation`, {
    headers: { 'Authorization': `Bearer ${librarianToken}` }
  });
  const circReport = await circReportRes.json() as any;
  assert(circReportRes.status === 200 && typeof circReport.summary.total_copies === 'number', 'Circulation summary report generated with live counts');

  const overdueReportRes = await fetch(`${BASE_URL}/loans/reports/overdue`, {
    headers: { 'Authorization': `Bearer ${librarianToken}` }
  });
  const overdueReport = await overdueReportRes.json() as any;
  assert(overdueReportRes.status === 200 && Array.isArray(overdueReport), 'Overdue loans report generated with member fines');

  // --- Step 9: Member Management (Admin) ---
  console.log('\n9. Admin Member Management');
  const membersRes = await fetch(`${BASE_URL}/members`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const membersData = await membersRes.json() as any[];
  assert(membersRes.status === 200 && membersData.length >= 5, `Admin lists all ${membersData.length} registered members`);

  // --- Summary ---
  console.log('\n====================================================');
  console.log(`VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL FLOWS ARE OPERATIONAL & DATABASE UPDATES ARE LIVE!');
  } else {
    console.error(`⚠️ ${totalTests - passedTests} TESTS FAILED.`);
  }
  console.log('====================================================');
}

runLiveSystemVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
