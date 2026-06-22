import base64
import hmac
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from functools import wraps
from html import escape
from pathlib import Path
from flask import (
    Flask,
    abort,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
INSTANCE_DIR = BASE_DIR / "instance"
INSTANCE_DIR.mkdir(exist_ok=True)
DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", INSTANCE_DIR / "jamal_demo.db"))
DEMO_MODE = os.environ.get("DEMO_MODE", "1").lower() not in {"0", "false", "no"}

if os.environ.get("FLASK_ENV") == "production" and not os.environ.get("SECRET_KEY"):
    raise RuntimeError("SECRET_KEY is required in production")

app = Flask(__name__, static_folder=None)
app.config.update(
    SECRET_KEY=os.environ.get("SECRET_KEY", "dev-only-change-me"),
    MAX_CONTENT_LENGTH=5 * 1024 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("FLASK_ENV") == "production",
)

ALLOWED_IMAGE_EXTENSIONS = {".gif", ".jpeg", ".jpg", ".png", ".webp"}
PUBLIC_ASSET_EXTENSIONS = {
    ".css",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".js",
    ".png",
    ".svg",
    ".webp",
}


def get_db():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


@contextmanager
def database():
    connection = get_db()
    try:
        yield connection
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database():
    with database() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS login_tbl (
                username TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS admin_login (
                username TEXT PRIMARY KEY,
                password TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS profile_tbl (
                email TEXT PRIMARY KEY,
                name TEXT,
                gender TEXT,
                birthday TEXT,
                phone_number TEXT,
                address TEXT,
                profile_pic BLOB
            );
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                quantity INTEGER NOT NULL,
                image_filename TEXT
            );
            CREATE TABLE IF NOT EXISTS order_list (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                product TEXT NOT NULL,
                price REAL NOT NULL,
                quantity INTEGER NOT NULL,
                date TEXT NOT NULL
            );
            """
        )
        connection.execute(
            "INSERT OR IGNORE INTO login_tbl (username, email, password) VALUES (?, ?, ?)",
            ("demo", "demo@jamal-portfolio.local", generate_password_hash("Demo123!")),
        )
        connection.execute(
            "INSERT OR IGNORE INTO admin_login (username, password) VALUES (?, ?)",
            ("admin-demo", generate_password_hash("Admin123!")),
        )
        connection.execute(
            """
            INSERT OR IGNORE INTO profile_tbl
            (email, name, gender, birthday, phone_number, address)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                "demo@jamal-portfolio.local",
                "Jamal Demo User",
                "Male",
                "1998-08-31",
                "+60 12-345 6789",
                "Kuala Lumpur, Malaysia",
            ),
        )

        product_count = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        if product_count == 0:
            connection.executemany(
                """
                INSERT INTO products (name, category, price, quantity, image_filename)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    ("Jaguh Body Wash", "Body Care", 39.90, 24, "Images/jamal_body_jaguh.png"),
                    ("Mat Kilau Cologne", "Cologne", 59.90, 18, "Images/jamal_cologne_matkilau.png"),
                    ("Arjuna Face Cleanser", "Face Care", 45.90, 20, "Images/jamal_face_arjuna.png"),
                    ("Bujang Hair Pomade", "Hair Care", 35.90, 30, "Images/jamal_hair_bujang.png"),
                    ("Legenda Hairstyle Kit", "Hairstyle", 69.90, 12, "Images/jamal_hairstyle_legenda.png"),
                ],
            )

        order_count = connection.execute("SELECT COUNT(*) FROM order_list").fetchone()[0]
        if order_count == 0:
            connection.executemany(
                """
                INSERT INTO order_list (name, product, price, quantity, date)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    ("Aiman", "Mat Kilau Cologne", 59.90, 1, "2026-06-20"),
                    ("Farah", "Arjuna Face Cleanser", 91.80, 2, "2026-06-18"),
                    ("Haziq", "Jaguh Body Wash", 39.90, 1, "2026-06-15"),
                ],
            )
        connection.commit()


_database_initialized = False


@app.before_request
def ensure_database():
    global _database_initialized
    if not _database_initialized:
        initialize_database()
        _database_initialized = True


def json_error(message, status=400):
    return jsonify({"error": message}), status


def profile_error(message, status=400):
    return jsonify({"status": "error", "message": message}), status


def verify_password(stored_password, submitted_password):
    if stored_password.startswith(("pbkdf2:", "scrypt:")):
        return check_password_hash(stored_password, submitted_password)
    return hmac.compare_digest(stored_password, submitted_password)


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_authenticated"):
            if request.path.endswith(".py"):
                return "<p>Admin login required.</p>", 401
            return redirect(url_for("serve_page", page_name="admin_login"))
        return view(*args, **kwargs)

    return wrapped


def csrf_token():
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return token


def valid_csrf():
    submitted = request.form.get("csrf_token", "")
    expected = session.get("csrf_token", "")
    return bool(expected and hmac.compare_digest(expected, submitted))


def stored_image_url(image_filename):
    if not image_filename:
        return ""
    normalized = str(image_filename).replace("\\", "/").lstrip("/")
    if normalized.startswith("jamal/"):
        normalized = normalized[6:]
    if normalized.startswith("uploads/"):
        return url_for("serve_upload", filename=normalized[8:])
    return url_for("serve_asset", asset_path=normalized)


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<page_name>.html")
def serve_page(page_name):
    filename = f"{page_name}.html"
    if not (BASE_DIR / filename).is_file():
        abort(404)
    if filename == "login.html":
        session.pop("user", None)
    elif filename == "admin_login.html":
        session.pop("admin_authenticated", None)
        session.pop("admin_username", None)
        session.pop("csrf_token", None)
    protected_admin_pages = {
        "admin_dashboard.html",
        "admin_orders.html",
        "admin_products.html",
    }
    if filename in protected_admin_pages and not session.get("admin_authenticated"):
        return redirect(url_for("serve_page", page_name="admin_login"))
    return send_from_directory(BASE_DIR, filename)


@app.get("/assets/<path:asset_path>")
@app.get("/js/<path:asset_path>")
@app.get("/Images/<path:asset_path>")
def named_asset(asset_path):
    folder = request.path.strip("/").split("/", 1)[0]
    return send_from_directory(BASE_DIR / folder, asset_path)


@app.get("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.get("/jamal/<path:asset_path>")
@app.get("/<path:asset_path>")
def serve_asset(asset_path):
    suffix = Path(asset_path).suffix.lower()
    if suffix not in PUBLIC_ASSET_EXTENSIONS:
        abort(404)
    return send_from_directory(BASE_DIR, asset_path)


@app.post("/login.py")
def login():
    action = request.form.get("action", "")
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")

    if action == "login":
        if not username or not password:
            return json_error("Username and password are required")

        with database() as connection:
            cursor = connection.cursor()
            cursor.execute(
                "SELECT username, email, password FROM login_tbl WHERE username = ?",
                (username,),
            )
            user = cursor.fetchone()
            cursor.close()

        if not user or not verify_password(user["password"], password):
            return json_error("Invalid username or password", 401)

        session.clear()
        session["user"] = {"username": user["username"], "email": user["email"]}
        return jsonify(
            message="success", username=user["username"], email=user["email"]
        )

    if action == "signup":
        if DEMO_MODE:
            return json_error(
                "Sign-up is disabled in this portfolio demo. Use the demo account.",
                403,
            )
        email = request.form.get("email", "").strip()
        if not username or not email or not password:
            return json_error("All fields are required")

        with database() as connection:
            cursor = connection.cursor()
            cursor.execute(
                "SELECT username FROM login_tbl WHERE username = ? OR email = ?",
                (username, email),
            )
            if cursor.fetchone():
                cursor.close()
                return json_error("Username or email already exists", 409)

            cursor.execute(
                "INSERT INTO login_tbl (username, email, password) VALUES (?, ?, ?)",
                (username, email, generate_password_hash(password)),
            )
            connection.commit()
            cursor.close()
        return jsonify(message="success", username=username, email=email)

    return json_error("Invalid action")


@app.post("/admin_login.py")
def admin_login():
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")
    if not username or not password:
        return jsonify(success=False, message="Username and Password are required"), 400

    with database() as connection:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT username, password FROM admin_login WHERE username = ?",
            (username,),
        )
        admin = cursor.fetchone()
        cursor.close()

    if not admin or not verify_password(admin["password"], password):
        return jsonify(success=False, message="Invalid username or password"), 401

    session.clear()
    session["admin_authenticated"] = True
    session["admin_username"] = admin["username"]
    csrf_token()
    return jsonify(success=True)


@app.get("/admin_logout")
def admin_logout():
    session.clear()
    return redirect(url_for("serve_page", page_name="admin_login"))


@app.route("/user_profile.py", methods=["GET", "POST"])
def user_profile():
    logged_in_user = session.get("user")
    if not logged_in_user:
        return profile_error("Login required", 401)

    if request.method == "GET":
        if request.args.get("action") != "get_profile":
            return profile_error("Invalid action")
        if request.args.get("username") != logged_in_user["username"]:
            return profile_error("You cannot access another user's profile", 403)

        with database() as connection:
            cursor = connection.cursor()
            cursor.execute(
                """
                SELECT l.username, l.email, p.name, p.gender, p.birthday,
                       p.phone_number, p.address, p.profile_pic
                FROM login_tbl l
                LEFT JOIN profile_tbl p ON l.email = p.email
                WHERE l.username = ?
                """,
                (logged_in_user["username"],),
            )
            user = cursor.fetchone()
            cursor.close()

        if not user:
            return profile_error("User not found", 404)
        birthday = user["birthday"]
        if isinstance(birthday, (date, datetime)):
            birthday = birthday.strftime("%Y-%m-%d")
        picture = user["profile_pic"]
        if picture:
            picture = base64.b64encode(picture).decode("ascii")
        return jsonify(
            status="success",
            data={
                "username": user["username"],
                "email": user["email"],
                "name": user["name"],
                "gender": user["gender"],
                "birthday": birthday,
                "phone_number": user["phone_number"],
                "address": user["address"],
                "profile_pic": picture,
            },
        )

    data = request.get_json(silent=True) or {}
    action = data.get("action")
    email = logged_in_user["email"]
    if data.get("email") and data["email"] != email:
        return profile_error("You cannot update another user's profile", 403)
    if DEMO_MODE:
        return profile_error("Profile editing is disabled in this portfolio demo", 403)

    if action == "update_profile":
        values = (
            str(data.get("name", "")).strip(),
            str(data.get("gender", "")).strip(),
            str(data.get("birthday", "")).strip() or None,
            str(data.get("phone_number", "")).strip(),
            str(data.get("address", "")).strip(),
        )
        with database() as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT email FROM profile_tbl WHERE email = ?", (email,))
            if cursor.fetchone():
                cursor.execute(
                    """
                    UPDATE profile_tbl SET name=?, gender=?, birthday=?,
                    phone_number=?, address=? WHERE email=?
                    """,
                    (*values, email),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO profile_tbl
                    (name, gender, birthday, phone_number, address, email)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (*values, email),
                )
            connection.commit()
            cursor.close()
        return jsonify(status="success", message="Profile updated successfully")

    if action == "update_profile_pic":
        encoded_picture = data.get("profile_pic", "")
        try:
            picture = base64.b64decode(encoded_picture, validate=True)
        except (ValueError, TypeError):
            return profile_error("Invalid image format")
        if not picture or len(picture) > app.config["MAX_CONTENT_LENGTH"]:
            return profile_error("Profile picture must be between 1 byte and 5 MB")

        with database() as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT email FROM profile_tbl WHERE email = ?", (email,))
            if cursor.fetchone():
                cursor.execute(
                    "UPDATE profile_tbl SET profile_pic = ? WHERE email = ?",
                    (picture, email),
                )
            else:
                cursor.execute(
                    "INSERT INTO profile_tbl (email, profile_pic) VALUES (?, ?)",
                    (email, picture),
                )
            connection.commit()
            cursor.close()
        return jsonify(status="success", message="Profile picture updated successfully")

    return profile_error("Invalid action")


@app.get("/admin_orders.py")
@admin_required
def admin_orders():
    search = request.args.get("search", "")
    with database() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT name, product, price, quantity, date
            FROM order_list WHERE name LIKE ? ORDER BY date DESC
            """,
            (f"%{search}%",),
        )
        rows = cursor.fetchall()
        cursor.close()

    if not rows:
        return "<tr><td colspan='5'>No orders found.</td></tr>"
    return "".join(
        "<tr>" + "".join(f"<td>{escape(str(value))}</td>" for value in row) + "</tr>"
        for row in rows
    )


@app.get("/admin_products.py")
@admin_required
def admin_products():
    with database() as connection:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT id, name, category, price, quantity, image_filename FROM products"
        )
        rows = cursor.fetchall()
        cursor.close()

    body = []
    for product_id, name, category, price, quantity, image_filename in rows:
        image_url = stored_image_url(image_filename)
        if DEMO_MODE:
            actions_html = '<span style="color:#aaa">Read-only demo</span>'
        else:
            edit_url = url_for("edit_product", product_id=product_id)
            delete_url = url_for("delete_product", product_id=product_id)
            actions_html = f"""
              <div class="btn-container">
                <a class="btn" href="{escape(edit_url)}">Edit</a>
                <form method="post" action="{escape(delete_url)}"
                      onsubmit="return confirm('Delete this product?')">
                  <input type="hidden" name="csrf_token" value="{csrf_token()}">
                  <button class="btn" type="submit">Delete</button>
                </form>
              </div>
            """
        body.append(
            f"""
            <tr>
              <td>{escape(str(product_id))}</td><td>{escape(str(name))}</td>
              <td>{escape(str(category))}</td><td>{escape(str(price))}</td>
              <td>{escape(str(quantity))}</td>
              <td><img src="{escape(image_url)}" alt="Product Image" width="80"></td>
              <td>{actions_html}</td>
            </tr>
            """
        )

    rows_html = "".join(body) or "<tr><td colspan='7'>No products found.</td></tr>"
    return f"""
      <table><thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Price</th>
      <th>Quantity</th><th>Image</th><th>Actions</th></tr></thead>
      <tbody>{rows_html}</tbody></table>
    """


@app.route("/edit_product.py", methods=["GET", "POST"])
@admin_required
def edit_product():
    if DEMO_MODE:
        abort(403, "Product editing is disabled in this portfolio demo")
    product_id = request.args.get("id", type=int)
    if product_id is None:
        abort(400, "A valid product ID is required")

    with database() as connection:
        cursor = connection.cursor()
        if request.method == "POST":
            if not valid_csrf():
                abort(400, "Invalid form token")
            image = request.files.get("image")
            image_filename = None
            if image and image.filename:
                suffix = Path(image.filename).suffix.lower()
                if suffix not in ALLOWED_IMAGE_EXTENSIONS:
                    abort(400, "Unsupported image type")
                image_filename = f"{secrets.token_hex(8)}-{secure_filename(image.filename)}"
                image.save(UPLOAD_DIR / image_filename)

            values = (
                request.form.get("name", "").strip(),
                request.form.get("category", "").strip(),
                request.form.get("price", "").strip(),
                request.form.get("quantity", "").strip(),
            )
            if not all(values):
                abort(400, "All product fields are required")
            if image_filename:
                cursor.execute(
                    """
                    UPDATE products SET name=?, category=?, price=?, quantity=?,
                    image_filename=? WHERE id=?
                    """,
                    (*values, f"uploads/{image_filename}", product_id),
                )
            else:
                cursor.execute(
                    """
                    UPDATE products SET name=?, category=?, price=?, quantity=?
                    WHERE id=?
                    """,
                    (*values, product_id),
                )
            connection.commit()
            cursor.close()
            return redirect(url_for("serve_page", page_name="admin_products"))

        cursor.execute(
            "SELECT id, name, category, price, quantity, image_filename FROM products WHERE id=?",
            (product_id,),
        )
        product = cursor.fetchone()
        cursor.close()

    if not product:
        abort(404, "Product not found")
    return render_template("edit_product.html", product=product, csrf_token=csrf_token())


@app.post("/delete_product.py")
@admin_required
def delete_product():
    if DEMO_MODE:
        abort(403, "Product deletion is disabled in this portfolio demo")
    if not valid_csrf():
        abort(400, "Invalid form token")
    product_id = request.args.get("id", type=int)
    if product_id is None:
        abort(400, "A valid product ID is required")

    with database() as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT image_filename FROM products WHERE id=?", (product_id,))
        row = cursor.fetchone()
        if not row:
            cursor.close()
            abort(404, "Product not found")
        cursor.execute("DELETE FROM products WHERE id=?", (product_id,))
        connection.commit()
        cursor.close()

    image_filename = str(row[0] or "").replace("\\", "/")
    if image_filename.startswith("uploads/"):
        image_path = UPLOAD_DIR / Path(image_filename).name
        if image_path.is_file():
            image_path.unlink()
    return redirect(url_for("serve_page", page_name="admin_products"))


@app.errorhandler(sqlite3.Error)
def database_error(error):
    app.logger.exception("Database operation failed")
    if request.path.endswith(".py") and request.path.startswith("/user_profile"):
        return profile_error("Database operation failed", 500)
    if request.path.endswith(".py"):
        return json_error("Database operation failed", 500)
    return "Database operation failed", 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5000")),
        debug=os.environ.get("FLASK_DEBUG") == "1",
    )
