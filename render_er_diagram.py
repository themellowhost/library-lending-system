import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_er_diagram():
    fig, ax = plt.subplots(figsize=(19, 10.5), facecolor='#09090b')
    ax.set_facecolor('#09090b')
    ax.set_xlim(0, 19)
    ax.set_ylim(0, 10.5)
    ax.axis('off')

    # Color definitions
    HEADER_BLUE = '#0071e3'
    HEADER_PURPLE = '#8b5cf6'
    HEADER_EMERALD = '#10b981'
    HEADER_AMBER = '#f59e0b'
    CARD_BG = '#141416'
    BORDER_COLOR = '#27272a'
    TEXT_WHITE = '#ffffff'
    TEXT_MUTED = '#9ca3af'
    PK_COLOR = '#38bdf8'
    FK_COLOR = '#fbbf24'
    LINE_COLOR = '#52525b'

    entities = [
        # Col 0: Auth & Members
        {
            'name': 'users',
            'tag': 'Identity & Auth',
            'color': HEADER_BLUE,
            'pos': (0.8, 5.6, 3.4, 3.8),
            'attrs': [
                ('PK', 'id', 'INTEGER PRIMARY KEY'),
                ('  ', 'email', 'TEXT UNIQUE NOT NULL'),
                ('  ', 'password_hash', 'TEXT NOT NULL'),
                ('  ', 'name', 'TEXT NOT NULL'),
                ('  ', 'role', "CHECK IN ('member','librarian','admin')"),
                ('  ', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP')
            ]
        },
        {
            'name': 'members',
            'tag': 'Borrower Profile',
            'color': HEADER_BLUE,
            'pos': (0.8, 0.8, 3.4, 4.3),
            'attrs': [
                ('PK', 'id', 'INTEGER PRIMARY KEY'),
                ('FK', 'user_id', 'INTEGER UNIQUE -> users(id)'),
                ('  ', 'member_number', 'TEXT UNIQUE (MEM-XXXXX)'),
                ('  ', 'phone', 'TEXT'),
                ('  ', 'max_loans', 'INTEGER DEFAULT 5'),
                ('  ', 'status', "CHECK IN ('active','suspended','expired')"),
                ('  ', 'created_at', 'DATETIME')
            ]
        },

        # Col 1: Catalog & Taxonomy
        {
            'name': 'categories',
            'tag': 'Subject Hierarchy',
            'color': HEADER_PURPLE,
            'pos': (5.2, 7.0, 3.4, 2.4),
            'attrs': [
                ('PK', 'id', 'INTEGER PRIMARY KEY'),
                ('  ', 'name', 'TEXT UNIQUE NOT NULL'),
                ('  ', 'description', 'TEXT')
            ]
        },
        {
            'name': 'books',
            'tag': 'Title & Metadata Entity',
            'color': HEADER_PURPLE,
            'pos': (5.2, 0.8, 3.8, 5.8),
            'attrs': [
                ('PK', 'id', 'INTEGER PRIMARY KEY'),
                ('  ', 'isbn', 'TEXT UNIQUE NOT NULL'),
                ('  ', 'title', 'TEXT NOT NULL'),
                ('FK', 'category_id', 'INTEGER -> categories(id)'),
                ('  ', 'publisher', 'TEXT'),
                ('  ', 'published_year', 'INTEGER'),
                ('  ', 'description', 'TEXT'),
                ('  ', 'cover_image_url', 'TEXT'),
                ('  ', 'pdf_url', 'TEXT (Open Archive)'),
                ('  ', 'reader_url', 'TEXT (Embed Reader)'),
                ('  ', 'ia_identifier', 'TEXT')
            ]
        },

        # Junction Col 2
        {
            'name': 'authors',
            'tag': 'Author Authority',
            'color': HEADER_PURPLE,
            'pos': (10.0, 8.0, 3.4, 2.0),
            'attrs': [
                ('PK', 'id', 'INTEGER PRIMARY KEY'),
                ('  ', 'name', 'TEXT UNIQUE NOT NULL')
            ]
        },
        {
            'name': 'book_authors',
            'tag': 'M:N Junction',
            'color': HEADER_PURPLE,
            'pos': (10.0, 5.4, 3.4, 2.1),
            'attrs': [
                ('PK,FK', 'book_id', 'INTEGER -> books(id)'),
                ('PK,FK', 'author_id', 'INTEGER -> authors(id)')
            ]
        },
        {
            'name': 'copies',
            'tag': 'Physical Barcoded Items',
            'color': HEADER_EMERALD,
            'pos': (10.0, 0.8, 3.6, 3.8),
            'attrs': [
                ('PK', 'id', 'INTEGER PRIMARY KEY'),
                ('FK', 'book_id', 'INTEGER -> books(id)'),
                ('  ', 'barcode', 'TEXT UNIQUE NOT NULL'),
                ('  ', 'status', "CHECK ('available','on_loan','on_hold','lost')"),
                ('  ', 'location', 'TEXT (Shelf tier/Room)'),
                ('  ', 'created_at', 'DATETIME')
            ]
        },

        # Col 3: Transactions & Extensions
        {
            'name': 'loans',
            'tag': 'Circulation Ledger',
            'color': HEADER_AMBER,
            'pos': (14.6, 5.4, 3.8, 4.6),
            'attrs': [
                ('PK', 'id', 'INTEGER PRIMARY KEY'),
                ('FK', 'copy_id', 'INTEGER -> copies(id)'),
                ('FK', 'member_id', 'INTEGER -> members(id)'),
                ('  ', 'checked_out_at', 'DATETIME NOT NULL'),
                ('  ', 'due_at', 'DATETIME NOT NULL'),
                ('  ', 'returned_at', 'DATETIME NULLABLE'),
                ('  ', 'renewal_count', 'INTEGER DEFAULT 0'),
                ('  ', 'fine_amount', 'REAL DEFAULT 0.0'),
                ('  ', 'fine_paid', 'INTEGER DEFAULT 0')
            ]
        },
        {
            'name': 'loan_extensions',
            'tag': 'Renewal Review Queue',
            'color': HEADER_AMBER,
            'pos': (14.6, 2.7, 3.8, 2.4),
            'attrs': [
                ('PK', 'id', 'INTEGER PRIMARY KEY'),
                ('FK', 'loan_id', 'INTEGER -> loans(id)'),
                ('FK', 'member_id', 'INTEGER -> members(id)'),
                ('  ', 'requested_days', 'INTEGER DEFAULT 7'),
                ('  ', 'reason', 'TEXT NOT NULL'),
                ('  ', 'status', "('pending','approved','rejected')")
            ]
        },
        {
            'name': 'holds',
            'tag': 'Reservation Queue',
            'color': HEADER_EMERALD,
            'pos': (14.6, 0.4, 3.8, 2.0),
            'attrs': [
                ('PK', 'id', 'INTEGER PRIMARY KEY'),
                ('FK', 'book_id', 'INTEGER -> books(id)'),
                ('FK', 'member_id', 'INTEGER -> members(id)'),
                ('  ', 'status', "('waiting','ready_for_pickup','fulfilled')")
            ]
        }
    ]

    # Draw entity cards
    for ent in entities:
        x, y, w, h = ent['pos']

        # Card container box with rounded styling
        box = patches.FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0.06,rounding_size=0.15",
            facecolor=CARD_BG,
            edgecolor=BORDER_COLOR,
            linewidth=1.2,
            zorder=2
        )
        ax.add_patch(box)

        # Header bar
        header_height = 0.65
        header_box = patches.FancyBboxPatch(
            (x, y + h - header_height), w, header_height,
            boxstyle="round,pad=0.06,rounding_size=0.15",
            facecolor=ent['color'],
            edgecolor=ent['color'],
            alpha=0.2,
            zorder=3
        )
        ax.add_patch(header_box)

        # Entity Title
        ax.text(
            x + 0.15, y + h - 0.28,
            ent['name'].upper(),
            fontsize=11.5,
            fontweight='bold',
            color=TEXT_WHITE,
            zorder=4
        )
        # Entity Tag
        ax.text(
            x + 0.15, y + h - 0.52,
            ent['tag'],
            fontsize=8,
            fontweight='medium',
            color=ent['color'],
            zorder=4
        )

        # Draw Attributes
        cur_y = y + h - 0.95
        line_spacing = (h - 0.95) / max(len(ent['attrs']), 1)
        for key_type, col_name, col_type in ent['attrs']:
            # Key indicator
            if 'PK' in key_type:
                ax.text(x + 0.15, cur_y, 'PK', fontsize=8, fontweight='bold', color=PK_COLOR, zorder=4)
            elif 'FK' in key_type:
                ax.text(x + 0.15, cur_y, 'FK', fontsize=8, fontweight='bold', color=FK_COLOR, zorder=4)

            # Col name
            ax.text(x + 0.55, cur_y, col_name, fontsize=8.5, fontweight='semibold', color=TEXT_WHITE, zorder=4)

            # Col type
            display_type = col_type if len(col_type) < 26 else col_type[:24] + '…'
            ax.text(x + w - 0.12, cur_y, display_type, fontsize=7.2, color=TEXT_MUTED, ha='right', zorder=4)

            cur_y -= line_spacing

    # Draw Connecting Relationship Lines
    relationships = [
        # users (1) -> (1) members
        ((2.5, 5.8), (2.5, 5.0), '1 : 1'),
        # categories (1) -> (N) books
        ((6.9, 7.0), (6.9, 6.4), '1 : N'),
        # books (1) -> (N) book_authors
        ((9.0, 5.6), (10.0, 6.2), '1 : N'),
        # authors (1) -> (N) book_authors
        ((11.7, 7.8), (11.7, 7.3), '1 : N'),
        # books (1) -> (N) copies
        ((9.0, 2.8), (10.0, 2.8), '1 : N'),
        # copies (1) -> (N) loans
        ((13.6, 2.8), (14.6, 6.8), '1 : N'),
        # members (1) -> (N) loans
        ((4.2, 3.2), (14.6, 7.6), '1 : N'),
        # loans (1) -> (N) loan_extensions
        ((16.5, 5.2), (16.5, 4.9), '1 : N'),
        # books (1) -> (N) holds
        ((9.0, 1.4), (14.6, 1.4), '1 : N'),
    ]

    for start, end, label in relationships:
        ax.annotate(
            '',
            xy=end, xycoords='data',
            xytext=start, textcoords='data',
            arrowprops=dict(
                arrowstyle='-|>',
                color=LINE_COLOR,
                lw=1.5,
                shrinkA=5, shrinkB=5,
                connectionstyle="arc3,rad=-0.12" if start[0] != end[0] and start[1] != end[1] else "arc3,rad=0"
            ),
            zorder=1
        )

    # Title & Legend Watermark (Clean top bar)
    ax.text(0.8, 10.15, 'LiberFlow DBMS Relational Schema', fontsize=17, fontweight='bold', color=TEXT_WHITE)
    ax.text(0.8, 9.85, 'Entity-Relationship Architecture • Third Normal Form (3NF) • ACID Partial Unique Indexes', fontsize=9.5, color=TEXT_MUTED)

    # Legend at top right
    legend_x = 13.8
    ax.text(legend_x, 10.0, 'LEGEND:', fontsize=8.5, fontweight='bold', color=TEXT_MUTED)
    ax.text(legend_x + 1.2, 10.0, 'PK', fontsize=8.5, fontweight='bold', color=PK_COLOR)
    ax.text(legend_x + 1.6, 10.0, 'Primary Key', fontsize=8.5, color=TEXT_MUTED)
    ax.text(legend_x + 2.8, 10.0, 'FK', fontsize=8.5, fontweight='bold', color=FK_COLOR)
    ax.text(legend_x + 3.2, 10.0, 'Foreign Key', fontsize=8.5, color=TEXT_MUTED)

    plt.tight_layout()
    output_path = '/Users/akhshatkampassi/Documents/GitHub/DIV-21---B.TECH-ECE-AI-ML----Black-Box/Study/Labs/DBMS/Sem 5 LCA/er_diagram_dark.png'
    plt.savefig(output_path, dpi=300, facecolor='#09090b', bbox_inches='tight')
    plt.close()
    print(f"ER diagram rendered and saved to: {output_path}")

if __name__ == '__main__':
    draw_er_diagram()
