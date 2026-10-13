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
    BG_DARK = RGBColor(10, 10, 11)        # Deep Apple Black (#0a0a0b)
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
            "subtitle": "Relational Modeling, Open-Access E-Reader, Federated OAuth & Apple-Inspired UI",
            "footer": "Engineered with React 19 • Node.js/TypeScript • SQLite (WAL Mode) • Open Library API • Deployed to GitHub Pages"
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
                "Book Entity (Metadata): Title, ISBN, Publisher, Category, Authors, Digital Reader/PDF URLs.",
                "Copy Entity (Physical Item): Barcode, Shelf Location, Lending Status ('available', 'on_loan', 'on_hold').",
                "Scalability: 1 title can have 10 physical copies across multiple library floors with independent circulation lifecycles.",
                "Digital Hybrid: Physical copies circulate via barcode transactions while digital editions stream via online readers."
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
                    "subtitle": "Apple Dark Glass & Interactive E-Reader",
                    "points": [
                        "Apple Design Language: Dark frosted glass (.apple-glass), SF Pro fonts, and pill buttons.",
                        "Interactive Digital E-Reader: Fast-embedded 2-page reader canvas with theater fullscreen mode.",
                        "Federated OAuth: One-click Sign In with Apple and Google with official brand SVGs.",
                        "Dual-Mode Resilience: Instant client-side fallback store enabling seamless static GitHub Pages hosting."
                    ]
                },
                {
                    "title": "Backend: Node.js + Express + TS",
                    "subtitle": "Type Safety & Open API Integration",
                    "points": [
                        "Full TypeScript Stack: Shared data interfaces between client and server.",
                        "Open Library Integration: Live search proxy querying millions of public-domain books.",
                        "Bcrypt & JWT Auth: Industry-standard 10-round salted password hashing with signed tokens.",
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
                        "Immutable Audit Log: Dedicated audit_logs table for all checkout, return, and renewal actions."
                    ]
                }
            ]
        },
        # SLIDE 4: Relational Schema & Entity-Relationship Architecture
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
                    "desc": "categories (id, name) ───< books (id, isbn, title, category_id, cover_image_url, pdf_url, reader_url)",
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
                    "constraint": "copies.barcode UNIQUE • status IN ('available','on_loan','on_hold','lost')"
                },
                {
                    "table": "copies, members & loans (Circulation)",
                    "desc": "copies (id) + members (id) ───< loans (id, copy_id, member_id, due_at, renewal_count, fine_amount)",
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
        # SLIDE 7: Self-Service Renewal & Automated Background Reaper
        {
            "type": "content_2col",
            "tag": "ADVANCED EXTENSIONS • RENEWALS & REAPERS",
            "title": "Self-Service Loan Renewal & Automated Hold Reaper",
            "left_title": "Operational Self-Service Renewal (+7 Days)",
            "left_bullets": [
                "Endpoint & UI: POST /api/loans/:id/renew with optimistic real-time UI state updates.",
                "Rule 1: Overdue Prohibition — If current date > due_at, renewal is blocked with late fee warning.",
                "Rule 2: Quota Limit — Maximum 2 renewals permitted per loan record (tracked via renewal_count).",
                "Rule 3: Queue Priority Protection — If other students have placed holds on the book title, renewal is rejected to prevent starvation."
            ],
            "right_title": "Automated Hold Expiration Background Worker",
            "right_bullets": [
                "Worker Function: reapExpiredHolds() executed every 60 seconds via background timer.",
                "Expiration Detection: Queries holds WHERE status = 'ready_for_pickup' AND datetime('now') > datetime(expires_at).",
                "Automatic Re-allocation: Transitions delinquent hold to 'expired' and immediately assigns physical copy to the NEXT student.",
                "Inventory Fallback: If no other student is waiting, copy status automatically reverts to 'available' on shelf."
            ]
        },
        # SLIDE 8: Multi-User Role Architecture & View Differentiation
        {
            "type": "content_3card",
            "tag": "ROLE-BASED ACCESS CONTROL (RBAC)",
            "title": "User Role Architecture: Distinct Views for Every User",
            "cards": [
                {
                    "title": "Member View (Students)",
                    "subtitle": "Self-Service Circulation & Reader",
                    "points": [
                        "Dedicated Portal: 'My Borrowed & Holds' showing due dates, fine alerts, and queue rank.",
                        "One-Click Renewal: Operational +7 day loan renewal with instant live due date updates.",
                        "Reservation Management: Place or cancel waiting holds on high-demand titles.",
                        "Open E-Library: Browse public-domain digital books and open full-screen readers."
                    ]
                },
                {
                    "title": "Librarian View (Desk Staff)",
                    "subtitle": "Real-Time Inventory & Circulation",
                    "points": [
                        "Librarian Dashboard: Real-time tracking of Copies On Shelf (Available) vs. Currently Borrowed.",
                        "Circulation Desk: High-speed barcode scanning interface for atomic Checkouts and Returns.",
                        "Inventory Minting: Add new titles to the catalog and generate unique physical barcodes.",
                        "Catalog Control: Real-time copy breakdown and shelf location inspection."
                    ]
                },
                {
                    "title": "Administrator View (IT/Admin)",
                    "subtitle": "System Governance & Audit Trail",
                    "points": [
                        "Member Account Management: Provision student accounts, assign quotas, suspend/activate.",
                        "Circulation Analytics: Overdue delinquency reports and fine collection tracking.",
                        "Security Oversight: Role-based authorization rules and user credential auditing.",
                        "Audit Ledger: Complete historical trail of all checkout, return, and fine events."
                    ]
                }
            ]
        },
        # SLIDE 9: Open-Access E-Reader & Digital Library Architecture
        {
            "type": "content_2col",
            "tag": "DIGITAL EXTENSION • OPEN SOURCE INTEGRATION",
            "title": "Open-Access E-Reader & Global Archive Integration",
            "left_title": "Internet Archive & Open Library Integration",
            "left_bullets": [
                "Live Open-Search Proxy: Queries Open Library API with full-text filter across millions of free works.",
                "Quick Topic Exploration: One-click preset filters for Operating Systems, Relational Databases, AI, and Algorithms.",
                "Automatic Catalog Bridge: When local stacks have 0 copies, automatically prompts to search in the Open E-Library.",
                "Direct PDF Downloads: Provides verified direct links to public domain digital volumes."
            ],
            "right_title": "High-Performance Interactive E-Reader",
            "right_bullets": [
                "Fast-Embed Optimization: Embeds clean viewer with ?ui=embed, stripping redundant web wrapper overhead.",
                "Widescreen Viewing (86vh): Dynamically expands layout to 1550px max width for reading 2-page spreads at a glance.",
                "Theater / Fullscreen Mode: One-click toggle expands the book reader to 100% viewport dimensions.",
                "Fallback Streaming: Dual reader tabs support interactive 2-page flipbook mode and fullscreen PDF mode."
            ]
        },
        # SLIDE 10: Conclusion, GitHub Deployment & Key Takeaways
        {
            "type": "content_2col",
            "tag": "DEPLOYMENT & PROJECT SUMMARY",
            "title": "Deployment, Key DBMS Learnings & Verification",
            "left_title": "Core DBMS Takeaways",
            "left_bullets": [
                "Domain Realism: Decoupling titles from physical copies is the golden standard for lending systems.",
                "ACID over Client-Side Checks: Enforcing consistency inside database transactions prevents phantom states.",
                "Indexes Matter: Partial unique indexes provide bulletproof business constraints without heavy table triggers.",
                "Full-Stack Synergy: TypeScript end-to-end creates reliable contracts between React UI and the SQL engine."
            ],
            "right_title": "Native Hosting & Reproducibility",
            "right_bullets": [
                "GitHub Repository: Fully version-controlled codebase hosted at themellowhost/library-lending-system.",
                "GitHub Pages Live Deployment: Automated GitHub Actions CI/CD workflow deploying frontend directly on git push.",
                "Dual-Engine Execution: Seamlessly operates connected to local SQLite server OR standalone on GitHub Pages via resilient mock engine.",
                "Dockerized Environment: Single-command deployment via Docker Compose with volume-mounted databases."
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

            # Text frame for title
            txBox = slide.shapes.add_textbox(Inches(1), Inches(1.4), Inches(11.3), Inches(4.5))
            tf = txBox.text_frame
            tf.word_wrap = True

            p_tag = tf.paragraphs[0]
            p_tag.text = data["tag"]
            p_tag.font.size = Pt(13)
            p_tag.font.bold = True
            p_tag.font.color.rgb = ACCENT_BLUE
            p_tag.space_after = Pt(20)

            p_title = tf.add_paragraph()
            p_title.text = data["title"]
            p_title.font.size = Pt(44)
            p_title.font.bold = True
            p_title.font.color.rgb = TEXT_LIGHT
            p_title.space_after = Pt(16)

            p_sub = tf.add_paragraph()
            p_sub.text = data["subtitle"]
            p_sub.font.size = Pt(20)
            p_sub.font.color.rgb = RGBColor(161, 161, 170)
            p_sub.space_after = Pt(36)

            p_foot = tf.add_paragraph()
            p_foot.text = data["footer"]
            p_foot.font.size = Pt(12)
            p_foot.font.color.rgb = RGBColor(113, 113, 122)

        elif data["type"] == "content_2col":
            bg.fill.solid()
            bg.fill.fore_color.rgb = BG_LIGHT

            # Header Area
            add_header(slide, data["tag"], data["title"], ACCENT_BLUE, TEXT_MAIN)

            # Left Card
            add_card_with_bullets(
                slide,
                x=Inches(0.8),
                y=Inches(1.8),
                w=Inches(5.7),
                h=Inches(5.1),
                card_bg=CARD_BG,
                card_border=CARD_BORDER,
                header_text=data["left_title"],
                bullets=data["left_bullets"],
                accent_color=ACCENT_BLUE,
                text_color=TEXT_MAIN,
                muted_color=TEXT_MUTED
            )

            # Right Card
            add_card_with_bullets(
                slide,
                x=Inches(6.8),
                y=Inches(1.8),
                w=Inches(5.7),
                h=Inches(5.1),
                card_bg=CARD_BG,
                card_border=CARD_BORDER,
                header_text=data["right_title"],
                bullets=data["right_bullets"],
                accent_color=ACCENT_INDIGO,
                text_color=TEXT_MAIN,
                muted_color=TEXT_MUTED
            )

        elif data["type"] == "content_3card":
            bg.fill.solid()
            bg.fill.fore_color.rgb = BG_LIGHT

            add_header(slide, data["tag"], data["title"], ACCENT_BLUE, TEXT_MAIN)

            card_w = Inches(3.75)
            gap = Inches(0.25)
            start_x = Inches(0.8)

            for i, card_info in enumerate(data["cards"]):
                cx = start_x + (i * (card_w + gap))
                cy = Inches(1.8)
                ch = Inches(5.1)

                add_card_with_points(
                    slide,
                    x=cx,
                    y=cy,
                    w=card_w,
                    h=ch,
                    card_bg=CARD_BG,
                    card_border=CARD_BORDER,
                    title=card_info["title"],
                    subtitle=card_info["subtitle"],
                    points=card_info["points"],
                    accent_color=ACCENT_BLUE if i == 0 else (ACCENT_INDIGO if i == 1 else EMERALD),
                    text_color=TEXT_MAIN,
                    muted_color=TEXT_MUTED
                )

        elif data["type"] == "er_diagram":
            bg.fill.solid()
            bg.fill.fore_color.rgb = BG_LIGHT

            add_header(slide, data["tag"], data["title"], ACCENT_BLUE, TEXT_MAIN)

            # 2 rows x 3 columns grid for the 6 entity groups
            grid_w = Inches(3.75)
            grid_h = Inches(2.4)
            gap_x = Inches(0.25)
            gap_y = Inches(0.25)
            start_x = Inches(0.8)
            start_y = Inches(1.8)

            for i, ent in enumerate(data["entities"]):
                row = i // 3
                col = i % 3
                ex = start_x + (col * (grid_w + gap_x))
                ey = start_y + (row * (grid_h + gap_y))

                add_er_entity_card(
                    slide,
                    x=ex,
                    y=ey,
                    w=grid_w,
                    h=grid_h,
                    card_bg=CARD_BG,
                    card_border=CARD_BORDER,
                    table_name=ent["table"],
                    desc=ent["desc"],
                    constraint=ent["constraint"],
                    accent_color=ACCENT_BLUE if i in [0, 3] else (ACCENT_INDIGO if i in [1, 4] else PURPLE),
                    text_color=TEXT_MAIN,
                    muted_color=TEXT_MUTED
                )

        elif data["type"] == "content_steps":
            bg.fill.solid()
            bg.fill.fore_color.rgb = BG_LIGHT

            add_header(slide, data["tag"], data["title"], ACCENT_BLUE, TEXT_MAIN)

            step_w = Inches(2.78)
            gap = Inches(0.2)
            start_x = Inches(0.8)

            for i, st in enumerate(data["steps"]):
                sx = start_x + (i * (step_w + gap))
                sy = Inches(1.8)
                sh = Inches(5.1)

                add_step_card(
                    slide,
                    x=sx,
                    y=sy,
                    w=step_w,
                    h=sh,
                    card_bg=CARD_BG,
                    card_border=CARD_BORDER,
                    step_num=st["num"],
                    head=st["head"],
                    desc=st["desc"],
                    accent_color=ACCENT_BLUE if i == 0 else (ACCENT_INDIGO if i in [1, 2] else EMERALD),
                    text_color=TEXT_MAIN,
                    muted_color=TEXT_MUTED
                )

    output_path = "/Users/akhshatkampassi/Documents/GitHub/DIV-21---B.TECH-ECE-AI-ML----Black-Box/Study/Labs/DBMS/Sem 5 LCA/Library_Lending_System_Presentation.pptx"
    prs.save(output_path)
    print(f"Presentation saved successfully to: {output_path}")

def add_header(slide, tag_text, title_text, accent_color, text_color):
    txBox = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(1.1))
    tf = txBox.text_frame
    tf.word_wrap = True

    p_tag = tf.paragraphs[0]
    p_tag.text = tag_text
    p_tag.font.size = Pt(11)
    p_tag.font.bold = True
    p_tag.font.color.rgb = accent_color
    p_tag.space_after = Pt(4)

    p_title = tf.add_paragraph()
    p_title.text = title_text
    p_title.font.size = Pt(25)
    p_title.font.bold = True
    p_title.font.color.rgb = text_color

def add_card_with_bullets(slide, x, y, w, h, card_bg, card_border, header_text, bullets, accent_color, text_color, muted_color):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    card.fill.solid()
    card.fill.fore_color.rgb = card_bg
    card.line.color.rgb = card_border
    card.line.width = Pt(1)

    top_stripe = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, Inches(0.08))
    top_stripe.fill.solid()
    top_stripe.fill.fore_color.rgb = accent_color
    top_stripe.line.fill.background()

    tb = slide.shapes.add_textbox(x + Inches(0.35), y + Inches(0.3), w - Inches(0.7), h - Inches(0.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p_head = tf.paragraphs[0]
    p_head.text = header_text
    p_head.font.size = Pt(17)
    p_head.font.bold = True
    p_head.font.color.rgb = text_color
    p_head.space_after = Pt(16)

    for bullet in bullets:
        p = tf.add_paragraph()
        p.text = "• " + bullet
        p.font.size = Pt(12)
        p.font.color.rgb = muted_color
        p.space_after = Pt(11)

def add_card_with_points(slide, x, y, w, h, card_bg, card_border, title, subtitle, points, accent_color, text_color, muted_color):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    card.fill.solid()
    card.fill.fore_color.rgb = card_bg
    card.line.color.rgb = card_border
    card.line.width = Pt(1)

    top_stripe = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, Inches(0.08))
    top_stripe.fill.solid()
    top_stripe.fill.fore_color.rgb = accent_color
    top_stripe.line.fill.background()

    tb = slide.shapes.add_textbox(x + Inches(0.3), y + Inches(0.25), w - Inches(0.6), h - Inches(0.4))
    tf = tb.text_frame
    tf.word_wrap = True

    p_title = tf.paragraphs[0]
    p_title.text = title
    p_title.font.size = Pt(15)
    p_title.font.bold = True
    p_title.font.color.rgb = text_color
    p_title.space_after = Pt(2)

    p_sub = tf.add_paragraph()
    p_sub.text = subtitle
    p_sub.font.size = Pt(10)
    p_sub.font.bold = True
    p_sub.font.color.rgb = accent_color
    p_sub.space_after = Pt(14)

    for pt in points:
        p = tf.add_paragraph()
        p.text = "• " + pt
        p.font.size = Pt(11)
        p.font.color.rgb = muted_color
        p.space_after = Pt(9)

def add_er_entity_card(slide, x, y, w, h, card_bg, card_border, table_name, desc, constraint, accent_color, text_color, muted_color):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    card.fill.solid()
    card.fill.fore_color.rgb = card_bg
    card.line.color.rgb = card_border
    card.line.width = Pt(1)

    # Accent left badge
    left_badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(0.08), h)
    left_badge.fill.solid()
    left_badge.fill.fore_color.rgb = accent_color
    left_badge.line.fill.background()

    tb = slide.shapes.add_textbox(x + Inches(0.25), y + Inches(0.2), w - Inches(0.4), h - Inches(0.3))
    tf = tb.text_frame
    tf.word_wrap = True

    p_title = tf.paragraphs[0]
    p_title.text = table_name
    p_title.font.size = Pt(13)
    p_title.font.bold = True
    p_title.font.color.rgb = text_color
    p_title.space_after = Pt(6)

    p_desc = tf.add_paragraph()
    p_desc.text = desc
    p_desc.font.size = Pt(10)
    p_desc.font.color.rgb = muted_color
    p_desc.space_after = Pt(8)

    p_const = tf.add_paragraph()
    p_const.text = "Constraint: " + constraint
    p_const.font.size = Pt(9)
    p_const.font.bold = True
    p_const.font.color.rgb = accent_color

def add_step_card(slide, x, y, w, h, card_bg, card_border, step_num, head, desc, accent_color, text_color, muted_color):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    card.fill.solid()
    card.fill.fore_color.rgb = card_bg
    card.line.color.rgb = card_border
    card.line.width = Pt(1)

    tb = slide.shapes.add_textbox(x + Inches(0.25), y + Inches(0.3), w - Inches(0.5), h - Inches(0.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p_num = tf.paragraphs[0]
    p_num.text = step_num
    p_num.font.size = Pt(30)
    p_num.font.bold = True
    p_num.font.color.rgb = accent_color
    p_num.space_after = Pt(12)

    p_head = tf.add_paragraph()
    p_head.text = head
    p_head.font.size = Pt(15)
    p_head.font.bold = True
    p_head.font.color.rgb = text_color
    p_head.space_after = Pt(12)

    p_desc = tf.add_paragraph()
    p_desc.text = desc
    p_desc.font.size = Pt(11.5)
    p_desc.font.color.rgb = muted_color
    p_desc.line_spacing = 1.2

if __name__ == "__main__":
    create_deck()
