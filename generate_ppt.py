import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_slide_layout = prs.slide_layouts[6]

    # Color Palette (Dark Apple & Slate modern aesthetic)
    BG_DARK = RGBColor(10, 10, 11)        # Deep Apple Black
    BG_LIGHT = RGBColor(248, 250, 252)    # Slate 50
    CARD_BG = RGBColor(255, 255, 255)     # White
    CARD_BORDER = RGBColor(226, 232, 240) # Slate 200
    ACCENT_BLUE = RGBColor(0, 113, 227)   # Apple Blue (#0071E3)
    ACCENT_INDIGO = RGBColor(79, 70, 229) # Indigo 600
    TEXT_MAIN = RGBColor(15, 23, 42)      # Slate 900
    TEXT_MUTED = RGBColor(100, 116, 139)  # Slate 500
    TEXT_LIGHT = RGBColor(255, 255, 255)  # White
    EMERALD = RGBColor(16, 185, 129)      # Emerald 500
    PURPLE = RGBColor(157, 78, 221)       # Purple

    slides_data = [
        # SLIDE 1: Title
        {
            "type": "title",
            "tag": "DBMS SEMESTER 5 • LAB CONTINUOUS ASSESSMENT (LCA)",
            "title": "Library Lending System (LiberFlow)",
            "subtitle": "Relational Modeling, Partial Unique Indexes, ACID Transactions & Apple-Inspired UI",
            "footer": "Engineered with React 19 • Node.js/TypeScript • Relational SQLite (WAL Mode) • Enforced Foreign Keys"
        },
        # SLIDE 2: Problem Statement & Core Design Choice
        {
            "type": "content_2col",
            "tag": "SYSTEM REQUIREMENTS & CORE DOMAIN",
            "title": "Problem Statement & The Fundamental Design Choice",
            "left_title": "The Domain Challenge",
            "left_bullets": [
                "A library does not lend abstract titles; it lends individual physical items with barcodes.",
                "Naive library systems merge books and inventory, leading to severe data anomalies.",
                "Requirements encompass 3 distinct user roles: Member, Librarian, and Administrator.",
                "Circulation needs strict transactional enforcement to avoid concurrent double-booking."
            ],
            "right_title": "Key Design Choice: Title vs. Copy Separation",
            "right_bullets": [
                "Book Entity (Metadata): Title, ISBN, Publisher, Category, Authors (1-to-many relationship).",
                "Copy Entity (Physical Item): Barcode, Shelf Location, Lending Status ('available', 'on_loan', 'on_hold').",
                "Scalability: 1 title can have 10 physical copies across multiple library floors with independent circulation lifecycles.",
                "Queue Management: Holds are placed at the Title level, but fulfilled by individual available Copies."
            ]
        },
        # SLIDE 3: Tech Stack Selection & Justification
        {
            "type": "content_3card",
            "tag": "ARCHITECTURE DECISION RECORD (ADR)",
            "title": "Technology Stack: What We Used and Why",
            "cards": [
                {
                    "title": "Frontend: React 19 + Apple UI",
                    "subtitle": "Minimalist Luxury & Component Polish",
                    "points": [
                        "Apple Design Language: Dark frosted glass (.apple-glass), SF Pro fonts, and pill buttons.",
                        "Vite 8: Instant HMR with zero bundling latency for rapid prototyping.",
                        "Tailwind CSS v4: Ergonomic utility styling with custom blur filters.",
                        "Axios with Bearer Interceptors: Clean JWT auth propagation across all views."
                    ]
                },
                {
                    "title": "Backend: Node.js + Express + TS",
                    "subtitle": "Type Safety & Clean Micro-Service Boundaries",
                    "points": [
                        "Full TypeScript Stack: Shared data interfaces between client and server.",
                        "Express 5: Lightweight routing and modular separation of concerns.",
                        "Zod Validation: Runtime schema validation for barcodes and payloads.",
                        "Background Worker: Automatic 60s reaper for expired hold queues."
                    ]
                },
                {
                    "title": "DBMS: Relational Engine (WAL)",
                    "subtitle": "ACID Guarantees & Partial Unique Indexes",
                    "points": [
                        "Foreign Keys Enforced (PRAGMA foreign_keys = ON): Guaranteed referential integrity.",
                        "Write-Ahead Logging (WAL): Concurrency support for simultaneous reads and writes.",
                        "Partial Unique Indexes: True DBMS-level constraints (e.g. 1 active loan per copy).",
                        "Immutable Audit Log: Dedicated audit_logs table for all state transitions."
                    ]
                }
            ]
        },
        # SLIDE 4: Relational Schema & Entity-Relationship Architecture (NEW ER DIAGRAM SLIDE)
        {
            "type": "er_diagram",
            "tag": "RELATIONAL DATABASE DESIGN • ENTITY RELATIONSHIPS",
            "title": "Relational Schema & Entity-Relationship Architecture",
            "entities": [
                {
                    "table": "users & members (1 : 1)",
                    "desc": "users (id, email, password_hash, role) ───< members (id, user_id, member_number, max_loans, status)",
                    "constraint": "Foreign Key: user_id -> users(id) ON DELETE CASCADE"
                },
                {
                    "table": "books & categories (N : 1)",
                    "desc": "categories (id, name) ───< books (id, isbn, title, category_id, publisher, published_year)",
                    "constraint": "Foreign Key: category_id -> categories(id) ON DELETE SET NULL"
                },
                {
                    "table": "books & authors (M : N Junction)",
                    "desc": "books ───< book_authors (book_id, author_id) >─── authors (id, name)",
                    "constraint": "Composite Primary Key: (book_id, author_id) with CASCADE deletes"
                },
                {
                    "table": "books & copies (1 : N Inventory)",
                    "desc": "books (id) ───< copies (id, book_id, barcode, status, location)",
                    "constraint": "copies.barcode UNIQUE • status IN ('available','on_loan','on_hold')"
                },
                {
                    "table": "copies, members & loans (Circulation)",
                    "desc": "copies (id) + members (id) ───< loans (id, copy_id, member_id, due_at, returned_at, fine_amount)",
                    "constraint": "PARTIAL UNIQUE INDEX: unique_active_loan_per_copy WHERE returned_at IS NULL"
                },
                {
                    "table": "holds & audit_logs (Queues & Ledgers)",
                    "desc": "holds (book_id, member_id, allocated_copy_id, status) + audit_logs (action, details)",
                    "constraint": "PARTIAL UNIQUE INDEX: unique_active_hold_per_member_book"
                }
            ]
        },
        # SLIDE 5: Checkout Journey & ACID Concurrency
        {
            "type": "content_steps",
            "tag": "WORKFLOW IMPLEMENTATION • TRANSACTION 1",
            "title": "Journey 1: Transactional Checkout Workflow",
            "steps": [
                {
                    "num": "01",
                    "head": "Input & Validation",
                    "desc": "Librarian enters Member ID/Barcode and Copy Barcode. Zod validates payload format."
                },
                {
                    "num": "02",
                    "head": "Member Status Verification",
                    "desc": "Verifies member.status == 'active'. Suspended or expired members immediately rejected."
                },
                {
                    "num": "03",
                    "head": "Borrowing Limit Enforcement",
                    "desc": "Counts active loans. If active >= max_loans (e.g. 5), transaction aborts with informative error."
                },
                {
                    "num": "04",
                    "head": "Atomic Lock & Commit",
                    "desc": "Inserts record into loans, transitions copy status to 'on_loan', fulfills holds in one atomic db.transaction()."
                }
            ]
        },
        # SLIDE 6: Return Journey & Reservation Queue Re-allocation
        {
            "type": "content_steps",
            "tag": "WORKFLOW IMPLEMENTATION • TRANSACTION 2",
            "title": "Journey 2: Return Workflow & Hold Queue Promotion",
            "steps": [
                {
                    "num": "01",
                    "head": "Barcode Check-In",
                    "desc": "Librarian scans returned copy barcode. System locates active loan record where returned_at IS NULL."
                },
                {
                    "num": "02",
                    "head": "Dynamic Overdue Calculation",
                    "desc": "Calculates (returned_at - due_at). If positive, computes fine ($1.00/day) and persists fine_amount."
                },
                {
                    "num": "03",
                    "head": "Reservation Queue Check",
                    "desc": "Queries holds for next 'waiting' member ordered by placed_at ASC (First-Come, First-Served)."
                },
                {
                    "num": "04",
                    "head": "State Transition",
                    "desc": "If hold exists: copy status -> 'on_hold', hold -> 'ready_for_pickup' (3-day window). Else: copy -> 'available'."
                }
            ]
        },
        # SLIDE 7: Self-Service Renewal & Hold Lifecycle Worker
        {
            "type": "content_2col",
            "tag": "ADVANCED EXTENSIONS • RENEWALS & REAPERS",
            "title": "Self-Service Loan Renewal & Automated Hold Reaper",
            "left_title": "Conditional Self-Service Renewal (+7 Days)",
            "left_bullets": [
                "Endpoint: POST /api/loans/:id/renew with strict multi-condition transaction checks.",
                "Rule 1: Overdue Prohibition — If current date > due_at, renewal is blocked with late fee warning.",
                "Rule 2: Quota Limit — Maximum 2 renewals permitted per loan record (tracked via renewal_count).",
                "Rule 3: Queue Priority Protection — If other students have placed holds on the book title, renewal is rejected to prevent starvation."
            ],
            "right_title": "Automated Hold Expiration Background Worker",
            "right_bullets": [
                "Worker Function: reapExpiredHolds() executed every 60 seconds via background timer.",
                "Expiration Detection: Queries holds WHERE status = 'ready_for_pickup' AND datetime('now') > datetime(expires_at).",
                "Automatic Re-allocation: Transitions delinquent hold to 'expired' and immediately assigns the physical copy to the NEXT student in queue.",
                "Inventory Fallback: If no other student is waiting, copy status automatically reverts to 'available' on shelf."
            ]
        },
        # SLIDE 8: Member Experience & Librarian Administration
        {
            "type": "content_2col",
            "tag": "FRONTEND & USER EXPERIENCE",
            "title": "Apple Website UI: Member Portal & Circulation Desk",
            "left_title": "Member Experience Portal",
            "left_bullets": [
                "Hero Catalog Search: Instant debounced filtering across titles, authors, categories, and ISBNs.",
                "Active Loans & Renewal: Student can monitor due dates, overdue fines, and renew eligible books in 1 click.",
                "Hold Queue Visibility: Displays real-time queue position and 3-day pickup countdown window.",
                "Defensive Self-Service: Member can cancel waiting reservations at any time."
            ],
            "right_title": "Librarian Administration & Desk",
            "right_bullets": [
                "Segmented Circulation Desk: Instant macOS-style switching between barcode Checkout and Return.",
                "Fine Collection Terminal: One-click collection and receipt ledger marking fine_paid = 1.",
                "Member Enrollment & Status: Registration form auto-generating unique member numbers with toggleable suspension.",
                "Immutable Audit Trail: Live table streaming all system events (CHECKOUT, RETURN, RENEWAL, FINE_PAID)."
            ]
        },
        # SLIDE 9: Testing, Concurrency & Edge Cases
        {
            "type": "content_3card",
            "tag": "VERIFICATION & DEFENSIVE DESIGN",
            "title": "Edge Case Handling & Relational Integrity Tests",
            "cards": [
                {
                    "title": "Double Checkout Prevention",
                    "subtitle": "Partial Unique Index in Action",
                    "points": [
                        "Attempting to check out an already loaned barcode triggers immediate transaction abort.",
                        "Database-level partial unique index ensures zero race condition vulnerability.",
                        "Explicit error message returned to desk: 'Copy is already on loan to another borrower.'"
                    ]
                },
                {
                    "title": "Account & Quota Constraints",
                    "subtitle": "Enforcing Library Policy",
                    "points": [
                        "Suspended Member Test: System blocks checkout attempt with status warning.",
                        "Max Quota Reached: Member at 5/5 active loans blocked until a prior copy is checked back in.",
                        "Duplicate Hold Block: Rejects attempt to place simultaneous duplicate reservations on the same title."
                    ]
                },
                {
                    "title": "Idempotent Returns & Queue Progression",
                    "subtitle": "Safe Re-entry",
                    "points": [
                        "Returning an already returned item gracefully flags 'No active loan found for copy'.",
                        "Automatic hold promotion test: Returned copy instantly transitions to 'on_hold' for top waiting member.",
                        "Canceling a hold with allocated copy automatically releases inventory back to 'available'."
                    ]
                }
            ]
        },
        # SLIDE 10: Conclusion & Key Learnings
        {
            "type": "content_2col",
            "tag": "SUMMARY & FUTURE ENHANCEMENTS",
            "title": "Project Summary, Key Takeaways & Roadmap",
            "left_title": "Core DBMS Takeaways",
            "left_bullets": [
                "Domain Realism: Decoupling titles from physical copies is the golden standard for lending systems.",
                "ACID over Client-Side Checks: Enforcing consistency inside database transactions prevents phantom states.",
                "Indexes Matter: Partial unique indexes provide bulletproof business constraints without heavy table triggers.",
                "Full-Stack Synergy: TypeScript end-to-end creates reliable contracts between React UI and the SQL engine."
            ],
            "right_title": "Future Production Roadmap",
            "right_bullets": [
                "Automated Notification Workers: Background cron jobs with SendGrid/Twilio for pickup reminders.",
                "Hardware Integration: Direct USB HID barcode and RFID scanner integration for kiosk self-checkouts.",
                "Digital Fine Payments: Stripe webhook integration to clear overdue balances online.",
                "Multi-Branch Transfers: Extending copies table with branch_id for inter-library loan transit."
            ]
        }
    ]

    for data in slides_data:
        slide = prs.slides.add_slide(blank_slide_layout)
        
        # Background fill
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.line.fill.background()
        
        if data["type"] == "title":
            bg.fill.solid()
            bg.fill.fore_color.rgb = BG_DARK
            
            # Decorative top bar
            top_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1), Inches(1), Inches(1.5), Inches(0.08))
            top_bar.fill.solid()
            top_bar.fill.fore_color.rgb = ACCENT_BLUE
            top_bar.line.fill.background()
            
            # Title text box
            tb = slide.shapes.add_textbox(Inches(1), Inches(1.3), Inches(11.333), Inches(5))
            tf = tb.text_frame
            tf.word_wrap = True
            
            p_tag = tf.paragraphs[0]
            p_tag.text = data["tag"]
            p_tag.font.size = Pt(13)
            p_tag.font.bold = True
            p_tag.font.color.rgb = ACCENT_BLUE
            p_tag.space_after = Pt(20)
            
            p_title = tf.add_paragraph()
            p_title.text = data["title"]
            p_title.font.size = Pt(40)
            p_title.font.bold = True
            p_title.font.color.rgb = TEXT_LIGHT
            p_title.space_after = Pt(16)
            
            p_sub = tf.add_paragraph()
            p_sub.text = data["subtitle"]
            p_sub.font.size = Pt(20)
            p_sub.font.color.rgb = RGBColor(203, 213, 225) # Slate 300
            p_sub.space_after = Pt(40)
            
            p_foot = tf.add_paragraph()
            p_foot.text = data["footer"]
            p_foot.font.size = Pt(14)
            p_foot.font.bold = True
            p_foot.font.color.rgb = EMERALD
            
        else:
            bg.fill.solid()
            bg.fill.fore_color.rgb = BG_LIGHT
            
            # Header container
            header_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.733), Inches(1.1))
            htf = header_box.text_frame
            htf.word_wrap = True
            
            hp_tag = htf.paragraphs[0]
            hp_tag.text = data["tag"]
            hp_tag.font.size = Pt(11)
            hp_tag.font.bold = True
            hp_tag.font.color.rgb = ACCENT_BLUE
            hp_tag.space_after = Pt(4)
            
            hp_title = htf.add_paragraph()
            hp_title.text = data["title"]
            hp_title.font.size = Pt(24)
            hp_title.font.bold = True
            hp_title.font.color.rgb = TEXT_MAIN

            if data["type"] == "er_diagram":
                # Render 6 structured schema cards in 2x3 grid
                card_w = Inches(5.6)
                card_h = Inches(1.5)
                gap_x = Inches(0.4)
                gap_y = Inches(0.25)
                start_x = Inches(0.8)
                start_y = Inches(1.8)

                for i, ent in enumerate(data["entities"]):
                    row = i // 2
                    col = i % 2
                    cx = start_x + col * (card_w + gap_x)
                    cy = start_y + row * (card_h + gap_y)

                    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, card_w, card_h)
                    card.fill.solid()
                    card.fill.fore_color.rgb = CARD_BG
                    card.line.color.rgb = CARD_BORDER
                    card.line.width = Pt(1)

                    tb = slide.shapes.add_textbox(cx + Inches(0.2), cy + Inches(0.12), card_w - Inches(0.4), card_h - Inches(0.24))
                    tf = tb.text_frame
                    tf.word_wrap = True

                    pt = tf.paragraphs[0]
                    pt.text = ent["table"]
                    pt.font.size = Pt(13)
                    pt.font.bold = True
                    pt.font.color.rgb = ACCENT_BLUE
                    pt.space_after = Pt(2)

                    pd = tf.add_paragraph()
                    pd.text = ent["desc"]
                    pd.font.size = Pt(11)
                    pd.font.color.rgb = TEXT_MAIN
                    pd.space_after = Pt(2)

                    pc = tf.add_paragraph()
                    pc.text = "🔒 " + ent["constraint"]
                    pc.font.size = Pt(10)
                    pc.font.bold = True
                    pc.font.color.rgb = PURPLE
            
            elif data["type"] == "content_2col":
                col_width = Inches(5.6)
                col_height = Inches(5.0)
                
                # Left Card
                left_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), col_width, col_height)
                left_card.fill.solid()
                left_card.fill.fore_color.rgb = CARD_BG
                left_card.line.color.rgb = CARD_BORDER
                left_card.line.width = Pt(1)
                
                ltb = slide.shapes.add_textbox(Inches(1.1), Inches(2.0), col_width - Inches(0.6), col_height - Inches(0.4))
                ltf = ltb.text_frame
                ltf.word_wrap = True
                
                lp_h = ltf.paragraphs[0]
                lp_h.text = data["left_title"]
                lp_h.font.size = Pt(16)
                lp_h.font.bold = True
                lp_h.font.color.rgb = ACCENT_INDIGO
                lp_h.space_after = Pt(16)
                
                for b in data["left_bullets"]:
                    p = ltf.add_paragraph()
                    p.text = "•  " + b
                    p.font.size = Pt(13)
                    p.font.color.rgb = TEXT_MAIN
                    p.space_after = Pt(12)
                    
                # Right Card
                right_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), col_width, col_height)
                right_card.fill.solid()
                right_card.fill.fore_color.rgb = CARD_BG
                right_card.line.color.rgb = CARD_BORDER
                right_card.line.width = Pt(1)
                
                rtb = slide.shapes.add_textbox(Inches(7.1), Inches(2.0), col_width - Inches(0.6), col_height - Inches(0.4))
                rtf = rtb.text_frame
                rtf.word_wrap = True
                
                rp_h = rtf.paragraphs[0]
                rp_h.text = data["right_title"]
                rp_h.font.size = Pt(16)
                rp_h.font.bold = True
                rp_h.font.color.rgb = ACCENT_BLUE
                rp_h.space_after = Pt(16)
                
                for b in data["right_bullets"]:
                    p = rtf.add_paragraph()
                    p.text = "•  " + b
                    p.font.size = Pt(13)
                    p.font.color.rgb = TEXT_MAIN
                    p.space_after = Pt(12)

            elif data["type"] == "content_3card":
                card_width = Inches(3.68)
                card_height = Inches(5.0)
                card_gap = Inches(0.35)
                
                for i, c in enumerate(data["cards"]):
                    x_pos = Inches(0.8) + i * (card_width + card_gap)
                    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x_pos, Inches(1.8), card_width, card_height)
                    card.fill.solid()
                    card.fill.fore_color.rgb = CARD_BG
                    card.line.color.rgb = CARD_BORDER
                    card.line.width = Pt(1)
                    
                    tb = slide.shapes.add_textbox(x_pos + Inches(0.25), Inches(2.0), card_width - Inches(0.5), card_height - Inches(0.4))
                    tf = tb.text_frame
                    tf.word_wrap = True
                    
                    ph = tf.paragraphs[0]
                    ph.text = c["title"]
                    ph.font.size = Pt(14)
                    ph.font.bold = True
                    ph.font.color.rgb = ACCENT_BLUE
                    ph.space_after = Pt(4)
                    
                    ps = tf.add_paragraph()
                    ps.text = c["subtitle"]
                    ps.font.size = Pt(11)
                    ps.font.color.rgb = TEXT_MUTED
                    ps.space_after = Pt(16)
                    
                    for pt in c["points"]:
                        p = tf.add_paragraph()
                        p.text = "•  " + pt
                        p.font.size = Pt(12)
                        p.font.color.rgb = TEXT_MAIN
                        p.space_after = Pt(10)

            elif data["type"] == "content_steps":
                step_width = Inches(2.7)
                step_height = Inches(4.8)
                step_gap = Inches(0.31)
                
                for i, st in enumerate(data["steps"]):
                    x_pos = Inches(0.8) + i * (step_width + step_gap)
                    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x_pos, Inches(1.9), step_width, step_height)
                    card.fill.solid()
                    card.fill.fore_color.rgb = CARD_BG
                    card.line.color.rgb = CARD_BORDER
                    card.line.width = Pt(1)
                    
                    # Number circle
                    badge = slide.shapes.add_shape(MSO_SHAPE.OVAL, x_pos + Inches(0.3), Inches(2.2), Inches(0.6), Inches(0.6))
                    badge.fill.solid()
                    badge.fill.fore_color.rgb = ACCENT_BLUE
                    badge.line.fill.background()
                    badge.text_frame.text = st["num"]
                    badge.text_frame.paragraphs[0].font.size = Pt(12)
                    badge.text_frame.paragraphs[0].font.bold = True
                    badge.text_frame.paragraphs[0].font.color.rgb = TEXT_LIGHT
                    badge.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
                    
                    tb = slide.shapes.add_textbox(x_pos + Inches(0.25), Inches(3.0), step_width - Inches(0.5), Inches(3.4))
                    tf = tb.text_frame
                    tf.word_wrap = True
                    
                    ph = tf.paragraphs[0]
                    ph.text = st["head"]
                    ph.font.size = Pt(15)
                    ph.font.bold = True
                    ph.font.color.rgb = TEXT_MAIN
                    ph.space_after = Pt(12)
                    
                    pd = tf.add_paragraph()
                    pd.text = st["desc"]
                    pd.font.size = Pt(13)
                    pd.font.color.rgb = TEXT_MUTED

    output_path = "/Users/akhshatkampassi/Documents/GitHub/DIV-21---B.TECH-ECE-AI-ML----Black-Box/Study/Labs/DBMS/Sem 5 LCA/Library_Lending_System_Presentation.pptx"
    prs.save(output_path)
    print(f"Presentation saved successfully to: {output_path}")

if __name__ == "__main__":
    create_deck()
