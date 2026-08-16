import base64
import json
import os
import uuid
from datetime import timedelta

import pdfplumber
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for

load_dotenv()

from llm import generate_reply  # noqa: E402  (must run after load_dotenv)
from rag import KB_PATH, get_store, is_visible  # noqa: E402
from storage import (  # noqa: E402
    LoginError,
    SignupError,
    activate_student,
    authenticate_student,
    compute_level,
    get_documents_for_user,
    get_history,
    get_or_create_guest,
    get_session_messages,
    get_sessions_for_user,
    get_user,
    init_db,
    save_document,
    save_message,
    update_profile,
)

app = Flask(__name__)
app.secret_key = os.environ["SECRET_KEY"]
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
ALLOWED_EXTENSIONS = {".pdf"}

ATTACHMENT_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

init_db()

from seed_students import main as seed_demo_students  # noqa: E402
seed_demo_students()

# Loading the embedding model and seeding the vector store is the one
# expensive, CPU-bound step in this app, and CPU-bound work can hold the
# GIL long enough to stall every other request even under threaded workers
# (confirmed: a login request queued behind an in-flight /chat request on a
# fresh deploy). Running it in a background thread at boot, instead of
# lazily on whichever request calls get_store() first, means that cost
# lands during the deploy's idle settling time rather than during a real
# user's first message, without blocking gunicorn from binding the port.
import threading  # noqa: E402

threading.Thread(target=get_store, daemon=True).start()

oauth = OAuth(app)
oauth.register(
    name="google",
    client_id=os.environ["GOOGLE_CLIENT_ID"],
    client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def current_user():
    """Returns the logged-in user's record (with a computed `level` field
    added for students), or None if browsing anonymously/as a guest."""
    user_id = session.get("user_id")
    if not user_id:
        return None
    user = get_user(user_id)
    if not user:
        session.clear()
        return None
    if user["user_type"] == "student":
        user["level"] = compute_level(user["admission_year"], user["level_override"])
    return user


@app.route("/")
def signin():
    return render_template("signin.html")


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    full_name = (data.get("full_name") or "").strip()
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""

    if not full_name:
        return jsonify({"error": "Enter your full name."}), 400

    try:
        user = authenticate_student(identifier, full_name, password)
    except LoginError as e:
        return jsonify({"error": str(e)}), 401

    session.permanent = True
    session["user_id"] = user["id"]
    return jsonify({"success": True, "redirect": "/chat-ui"})


@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(force=True)
    full_name = (data.get("full_name") or "").strip()
    matric_number = (data.get("matric_number") or "").strip()
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    if not full_name:
        return jsonify({"error": "Enter your full name."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if password != confirm_password:
        return jsonify({"error": "Passwords don't match."}), 400

    try:
        user = activate_student(matric_number, full_name, password)
    except SignupError as e:
        return jsonify({"error": str(e)}), 400

    session.permanent = True
    session["user_id"] = user["id"]
    return jsonify({"success": True, "redirect": "/chat-ui"})


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "redirect": "/"})


@app.route("/auth/google")
def auth_google():
    redirect_uri = os.environ["GOOGLE_REDIRECT_URI"]
    return oauth.google.authorize_redirect(redirect_uri)


@app.route("/auth/google/callback")
def auth_google_callback():
    token = oauth.google.authorize_access_token()
    userinfo = token.get("userinfo") or oauth.google.parse_id_token(token)

    user = get_or_create_guest(
        google_id=userinfo["sub"],
        email=userinfo.get("email"),
        full_name=userinfo.get("name") or userinfo.get("email"),
    )
    session.permanent = True
    session["user_id"] = user["id"]
    return redirect("/chat-ui")


@app.route("/me")
def me():
    user = current_user()
    if not user:
        return jsonify({"user": None})
    return jsonify({
        "user": {
            "id": user["id"],
            "user_type": user["user_type"],
            "full_name": user["full_name"],
            "email": user.get("email"),
            "matric_number": user.get("matric_number"),
            "department": user.get("department"),
            "level": user.get("level"),
        }
    })


@app.route("/home-ui")
def home_ui():
    return render_template("home.html", active="home")


@app.route("/settings-ui")
def settings_ui():
    return render_template("settings.html", active="settings")


@app.route("/profile", methods=["POST"])
def profile():
    user = current_user()
    if not user:
        return jsonify({"error": "Sign in to update your profile."}), 401

    data = request.get_json(force=True)
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip()

    if not full_name:
        return jsonify({"error": "Full name can't be empty."}), 400

    updated = update_profile(user["id"], full_name, email)
    return jsonify({
        "success": True,
        "user": {"full_name": updated["full_name"], "email": updated["email"]},
    })


@app.route("/chat-ui")
def chat_ui():
    return render_template("index.html", active="chat")


@app.route("/faqs-ui")
def faqs_ui():
    return render_template("faqs.html", active="faqs")


def _format_question(pattern):
    text = pattern.strip()
    text = text[0].upper() + text[1:]
    if not text.endswith("?"):
        text += "?"
    return text


@app.route("/faqs")
def faqs():
    user = current_user()
    department = user.get("department") if user else None
    level = user.get("level") if user else None

    with open(KB_PATH, encoding="utf-8") as f:
        kb = json.load(f)

    categories = {}
    for intent in kb.get("intents", []):
        if not intent.get("faq", True):
            continue
        if not is_visible(intent.get("department"), intent.get("level"), department, level):
            continue
        category = intent.get("category") or "General"
        patterns = intent.get("patterns") or []
        if not patterns:
            continue
        item = {
            "tag": intent["tag"],
            "question": _format_question(patterns[0]),
            "answer": " ".join(intent.get("responses", [])),
        }
        categories.setdefault(category, []).append(item)

    ordered_names = ["About the Department", "Courses & Curriculum", "Registration & Exams",
                      "SIWES & Final Year Project", "Graduation"]
    result = [
        {"category": name, "items": categories[name]}
        for name in ordered_names if name in categories
    ]
    for name, items in categories.items():
        if name not in ordered_names:
            result.append({"category": name, "items": items})

    return jsonify({"categories": result})


@app.route("/history")
def history():
    user = current_user()
    if not user:
        return jsonify({"sessions": []})
    return jsonify({"sessions": get_sessions_for_user(user["id"])})


@app.route("/session/<session_id>")
def session_thread(session_id):
    user = current_user()
    if not user:
        return jsonify({"error": "Not signed in."}), 401
    return jsonify({"messages": get_session_messages(session_id, user["id"])})


def _build_attachment(file_storage):
    """Turns an in-request file upload into the one-off attachment dict
    llm.generate_reply expects, or raises ValueError with a user-facing
    message if the file can't be used."""
    file_storage.seek(0, os.SEEK_END)
    size = file_storage.tell()
    file_storage.seek(0)
    if size > MAX_ATTACHMENT_BYTES:
        raise ValueError("That file is too large (max 5MB).")

    content_type = file_storage.content_type or ""
    ext = os.path.splitext(file_storage.filename or "")[1].lower()

    if content_type in ATTACHMENT_IMAGE_TYPES:
        data = base64.b64encode(file_storage.read()).decode("ascii")
        return {"type": "image", "media_type": content_type, "data": data}

    if ext == ".pdf":
        text = ""
        with pdfplumber.open(file_storage) as pdf:
            for page in pdf.pages:
                text += (page.extract_text() or "") + "\n"
        if not text.strip():
            raise ValueError("Couldn't read any text from that PDF.")
        return {"type": "text", "filename": file_storage.filename, "text": text}

    raise ValueError("Attachments must be an image (PNG/JPEG/WebP/GIF) or a PDF.")


@app.route("/chat", methods=["POST"])
def chat():
    message = (request.form.get("message") or "").strip()
    session_id = request.form.get("session_id") or str(uuid.uuid4())
    attachment_file = request.files.get("attachment")

    attachment = None
    if attachment_file and attachment_file.filename:
        try:
            attachment = _build_attachment(attachment_file)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    if not message and not attachment:
        return jsonify({"error": "message is required"}), 400

    saved_message = message or f"[Attached: {attachment_file.filename}]"

    user = current_user()
    user_id = user["id"] if user else None
    department = user.get("department") if user else None
    level = user.get("level") if user else None

    store = get_store()
    retrieved = store.search(message, department=department, level=level, user_id=user_id) if message else []
    history = get_history(session_id)

    reply = generate_reply(
        message or "What can you tell me about this attachment?",
        retrieved, history, attachment=attachment, viewer=user,
    )

    save_message(session_id, "user", saved_message, user_id=user_id)
    save_message(session_id, "assistant", reply, user_id=user_id)

    return jsonify({"reply": reply, "session_id": session_id})


@app.route("/documents-ui")
def documents_ui():
    return render_template("documents.html", active="documents")


@app.route("/documents")
def documents():
    user = current_user()
    if not user:
        return jsonify({"error": "Sign in to see your documents."}), 401
    return jsonify({"documents": get_documents_for_user(user["id"])})


@app.route("/upload", methods=["POST"])
def upload():
    user = current_user()
    if not user:
        return jsonify({"error": "Sign in to upload documents."}), 401

    if "file" not in request.files:
        return jsonify({"error": "no file provided"}), 400

    file = request.files["file"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "only PDF files are supported"}), 400

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    save_path = os.path.join(UPLOAD_DIR, file.filename)
    file.save(save_path)

    text = ""
    with pdfplumber.open(save_path) as pdf:
        for page in pdf.pages:
            text += (page.extract_text() or "") + "\n"

    if not text.strip():
        return jsonify({"error": "no extractable text found in PDF"}), 422

    user_id = user["id"]

    store = get_store()
    chunk_count = store.add_pdf(file.filename, text, user_id=user_id)
    save_document(file.filename, chunk_count, user_id=user_id)

    return jsonify({"filename": file.filename, "chunks_added": chunk_count})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
