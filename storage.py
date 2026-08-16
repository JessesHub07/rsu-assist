import os
import sqlite3
from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), "chatbot.db")

MIN_LEVEL = 100
MAX_LEVEL = 500


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_conn()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_type TEXT NOT NULL CHECK (user_type IN ('student', 'guest')),
            matric_number TEXT UNIQUE,
            password_hash TEXT,
            google_id TEXT UNIQUE,
            full_name TEXT NOT NULL,
            email TEXT,
            department TEXT,
            admission_year INTEGER,
            level_override INTEGER,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            filename TEXT NOT NULL,
            chunk_count INTEGER NOT NULL,
            uploaded_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            name TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'Planning',
            tags TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            item_type TEXT NOT NULL CHECK (item_type IN ('answer', 'chat', 'document', 'project')),
            reference_id TEXT,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    _migrate_add_user_id_columns(conn)
    _migrate_add_project_id_columns(conn)
    conn.close()


def _migrate_add_user_id_columns(conn):
    """Older databases (pre-auth) lack user_id on messages/documents. Add it
    in place rather than dropping real test data collected before auth existed."""
    for table in ("messages", "documents"):
        cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
        if "user_id" not in cols:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER REFERENCES users(id)")
    conn.commit()


def _migrate_add_project_id_columns(conn):
    """A message/document with project_id NULL belongs to the student's
    general chat/documents; a non-null value scopes it to that project only,
    same pattern as _migrate_add_user_id_columns above."""
    for table in ("messages", "documents"):
        cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
        if "project_id" not in cols:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN project_id INTEGER REFERENCES projects(id)")
    conn.commit()


def _now():
    return datetime.now(timezone.utc).isoformat()


def compute_level(admission_year, level_override=None, current_year=None):
    """Level is derived from admission year by default. A student can override
    it (e.g. after an ASUU-strike delay pushed their real level off the naive
    calculation), and the override sticks once set."""
    if level_override:
        return level_override
    if current_year is None:
        current_year = datetime.now().year
    level = (current_year - admission_year + 1) * 100
    return max(MIN_LEVEL, min(level, MAX_LEVEL))


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def create_student(matric_number, full_name, email, department, admission_year, password=None):
    """Admin-side provisioning: the department gives us matric number, name,
    email, and admission year. No password yet, that's set the first time
    the student actually signs up (see activate_student)."""
    conn = get_conn()
    password_hash = generate_password_hash(password) if password else None
    conn.execute(
        """
        INSERT INTO users (user_type, matric_number, password_hash, full_name, email,
                            department, admission_year, created_at)
        VALUES ('student', ?, ?, ?, ?, ?, ?, ?)
        """,
        (matric_number, password_hash, full_name, email,
         department, admission_year, _now()),
    )
    conn.commit()
    conn.close()


class SignupError(Exception):
    pass


def activate_student(matric_number, full_name, password):
    """First-time signup: a student can only set a password for a matric
    number that already exists in the pre-provisioned list, and only once.
    The name must also match what the department has on record, a second
    check so a guessed matric number alone isn't enough to claim an account."""
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM users WHERE user_type = 'student' AND matric_number = ?",
        (matric_number,),
    ).fetchone()

    if not row:
        conn.close()
        raise SignupError("We couldn't find that matric number. Enter a valid matric number, or contact your department if this is a mistake.")

    if row["password_hash"]:
        conn.close()
        raise SignupError("This account is already set up. Please sign in instead.")

    if full_name.strip().lower() != (row["full_name"] or "").strip().lower():
        conn.close()
        raise SignupError("That name doesn't match our records for this matric number.")

    conn.execute(
        "UPDATE users SET password_hash = ? WHERE matric_number = ?",
        (generate_password_hash(password), matric_number),
    )
    conn.commit()
    conn.close()
    return get_user(row["id"])


class LoginError(Exception):
    pass


def authenticate_student(identifier, full_name, password):
    """identifier can be a matric number or an email. full_name must match
    the name on record, same verification pattern as signup."""
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM users WHERE user_type = 'student' AND (matric_number = ? OR email = ?)",
        (identifier, identifier),
    ).fetchone()
    conn.close()

    if not row:
        raise LoginError("We couldn't find an account with that matric number or email.")

    if not row["password_hash"]:
        raise LoginError("This account hasn't been set up yet. Use Sign up to set your password first.")

    if full_name.strip().lower() != (row["full_name"] or "").strip().lower():
        raise LoginError("That name doesn't match our records for this account.")

    if not check_password_hash(row["password_hash"], password):
        raise LoginError("Incorrect password.")

    return dict(row)


class PasswordChangeError(Exception):
    pass


def change_password(user_id, current_password, new_password):
    conn = get_conn()
    row = conn.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,)).fetchone()

    if not row or not row["password_hash"]:
        conn.close()
        raise PasswordChangeError("This account doesn't have a password set.")

    if not check_password_hash(row["password_hash"], current_password):
        conn.close()
        raise PasswordChangeError("Current password is incorrect.")

    conn.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (generate_password_hash(new_password), user_id),
    )
    conn.commit()
    conn.close()


def get_or_create_guest(google_id, email, full_name):
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM users WHERE user_type = 'guest' AND google_id = ?", (google_id,)
    ).fetchone()
    if row:
        conn.close()
        return dict(row)
    cur = conn.execute(
        """
        INSERT INTO users (user_type, google_id, full_name, email, created_at)
        VALUES ('guest', ?, ?, ?, ?)
        """,
        (google_id, full_name, email, _now()),
    )
    conn.commit()
    user_id = cur.lastrowid
    conn.close()
    return get_user(user_id)


def get_user(user_id):
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def set_level_override(user_id, level):
    conn = get_conn()
    conn.execute("UPDATE users SET level_override = ? WHERE id = ?", (level, user_id))
    conn.commit()
    conn.close()


def update_profile(user_id, full_name, email):
    """Students and guests can edit their own name/email, nothing else,
    matric number/department/level stay fixed to prevent a student from
    spoofing the data their content scoping relies on."""
    conn = get_conn()
    conn.execute(
        "UPDATE users SET full_name = ?, email = ? WHERE id = ?",
        (full_name, email, user_id),
    )
    conn.commit()
    conn.close()
    return get_user(user_id)


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

def save_message(session_id, role, content, user_id=None, project_id=None):
    conn = get_conn()
    conn.execute(
        "INSERT INTO messages (user_id, session_id, role, content, created_at, project_id) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, session_id, role, content, _now(), project_id),
    )
    conn.commit()
    conn.close()


def get_history(session_id, limit=10):
    conn = get_conn()
    rows = conn.execute(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ?",
        (session_id, limit),
    ).fetchall()
    conn.close()
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]


def get_sessions_for_user(user_id, limit=20):
    """One row per past general (non-project) conversation, most recently
    active first, with the first message in that session as a preview.
    Project chats live on the project's own page instead, see
    get_sessions_for_project."""
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT session_id,
               MIN(created_at) AS started_at,
               MAX(created_at) AS last_active_at,
               (SELECT content FROM messages m2
                WHERE m2.session_id = m1.session_id AND m2.role = 'user'
                ORDER BY m2.id ASC LIMIT 1) AS preview
        FROM messages m1
        WHERE user_id = ? AND project_id IS NULL
        GROUP BY session_id
        ORDER BY last_active_at DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_sessions_for_project(project_id, user_id, limit=50):
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT session_id,
               MIN(created_at) AS started_at,
               MAX(created_at) AS last_active_at,
               (SELECT content FROM messages m2
                WHERE m2.session_id = m1.session_id AND m2.role = 'user'
                ORDER BY m2.id ASC LIMIT 1) AS preview
        FROM messages m1
        WHERE user_id = ? AND project_id = ?
        GROUP BY session_id
        ORDER BY last_active_at DESC
        LIMIT ?
        """,
        (user_id, project_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_session_messages(session_id, user_id):
    """Full thread for one session, scoped to the requesting user so nobody
    can read another student's conversation by guessing a session id."""
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT role, content, created_at FROM messages
        WHERE session_id = ? AND user_id = ?
        ORDER BY id ASC
        """,
        (session_id, user_id),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

def save_document(filename, chunk_count, user_id=None, project_id=None):
    conn = get_conn()
    conn.execute(
        "INSERT INTO documents (user_id, filename, chunk_count, uploaded_at, project_id) VALUES (?, ?, ?, ?, ?)",
        (user_id, filename, chunk_count, _now(), project_id),
    )
    conn.commit()
    conn.close()


def get_documents_for_user(user_id):
    """General (non-project) documents only, same split as get_sessions_for_user."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM documents WHERE user_id = ? AND project_id IS NULL ORDER BY id DESC", (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_documents_for_project(project_id, user_id):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM documents WHERE user_id = ? AND project_id = ? ORDER BY id DESC", (user_id, project_id)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

def create_project(user_id, name, description="", status="Planning", tags=""):
    conn = get_conn()
    now = _now()
    cur = conn.execute(
        """
        INSERT INTO projects (user_id, name, description, status, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, name, description, status, tags, now, now),
    )
    conn.commit()
    project_id = cur.lastrowid
    conn.close()
    return project_id


def get_projects_for_user(user_id):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC", (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_project(project_id, user_id):
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?", (project_id, user_id)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def update_project(project_id, user_id, name, description, status, tags):
    conn = get_conn()
    conn.execute(
        """
        UPDATE projects SET name = ?, description = ?, status = ?, tags = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
        """,
        (name, description, status, tags, _now(), project_id, user_id),
    )
    conn.commit()
    conn.close()
    return get_project(project_id, user_id)


def delete_project(project_id, user_id):
    """Deleting a project un-scopes its chats and documents back to the
    student's general history rather than destroying them, only the
    project record itself is removed."""
    conn = get_conn()
    conn.execute(
        "UPDATE messages SET project_id = NULL WHERE project_id = ? AND user_id = ?",
        (project_id, user_id),
    )
    conn.execute(
        "UPDATE documents SET project_id = NULL WHERE project_id = ? AND user_id = ?",
        (project_id, user_id),
    )
    conn.execute("DELETE FROM projects WHERE id = ? AND user_id = ?", (project_id, user_id))
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Bookmarks
# ---------------------------------------------------------------------------

def add_bookmark(user_id, item_type, reference_id, title):
    conn = get_conn()
    conn.execute(
        """
        INSERT INTO bookmarks (user_id, item_type, reference_id, title, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, item_type, reference_id, title, _now()),
    )
    conn.commit()
    conn.close()


def get_bookmarks_for_user(user_id):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM bookmarks WHERE user_id = ? ORDER BY id DESC", (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_bookmark(bookmark_id, user_id):
    conn = get_conn()
    conn.execute("DELETE FROM bookmarks WHERE id = ? AND user_id = ?", (bookmark_id, user_id))
    conn.commit()
    conn.close()
