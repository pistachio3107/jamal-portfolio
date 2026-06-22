import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import app as app_module
from app import app


class FakeCursor:
    def __init__(self, row):
        self.row = row

    def execute(self, query, values=None):
        self.query = query
        self.values = values

    def fetchone(self):
        return self.row

    def close(self):
        pass


class FakeConnection:
    def __init__(self, row):
        self.row = row

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        pass

    def cursor(self, dictionary=False):
        return FakeCursor(self.row)

    def rollback(self):
        pass

    def close(self):
        pass


class FlaskMigrationTests(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True, SECRET_KEY="test-secret")
        app_module._database_initialized = True
        self.client = app.test_client()

    def assert_request_status(self, path, expected_status):
        response = self.client.get(path)
        try:
            self.assertEqual(response.status_code, expected_status)
        finally:
            response.close()

    def test_public_files_are_served_but_python_source_is_not(self):
        self.assert_request_status("/", 200)
        self.assert_request_status("/js/login.js", 200)
        for banner in (
            "jamal poster copy.png",
            "poster_body.png",
            "poster_cologne.png",
            "poster_face.png",
            "poster_hair.png",
            "poster_hairstyle.png",
        ):
            self.assert_request_status(f"/Images/{banner}", 200)
        self.assert_request_status("/app.py", 404)

    def test_admin_pages_and_endpoints_require_login(self):
        response = self.client.get("/admin_dashboard.html")
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.location.endswith("/admin_login.html"))
        self.assert_request_status("/admin_products.py", 401)
        self.assert_request_status("/delete_product.py?id=1", 404)

    def test_user_login_creates_session(self):
        user = {
            "username": "jamal",
            "email": "jamal@example.com",
            "password": "legacy-password",
        }
        with patch("app.get_db", return_value=FakeConnection(user)):
            response = self.client.post(
                "/login.py",
                data={
                    "action": "login",
                    "username": "jamal",
                    "password": "legacy-password",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["message"], "success")
        with self.client.session_transaction() as flask_session:
            self.assertEqual(flask_session["user"]["username"], "jamal")

    def test_admin_login_unlocks_admin_page(self):
        admin = {"username": "admin", "password": "legacy-password"}
        with patch("app.get_db", return_value=FakeConnection(admin)):
            response = self.client.post(
                "/admin_login.py",
                data={"username": "admin", "password": "legacy-password"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["success"])
        self.assert_request_status("/admin_dashboard.html", 200)

    def test_profile_requires_user_session(self):
        response = self.client.get(
            "/user_profile.py?action=get_profile&username=someone"
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["status"], "error")

    def test_sqlite_seed_supports_portfolio_flow(self):
        with tempfile.TemporaryDirectory() as directory:
            database_path = Path(directory) / "portfolio.db"
            with patch("app.DATABASE_PATH", database_path):
                app_module.initialize_database()
                customer_login = self.client.post(
                    "/login.py",
                    data={
                        "action": "login",
                        "username": "demo",
                        "password": "Demo123!",
                    },
                )
                self.assertEqual(customer_login.status_code, 200)
                profile = self.client.get(
                    "/user_profile.py?action=get_profile&username=demo"
                )
                self.assertEqual(profile.status_code, 200)
                self.assertEqual(profile.get_json()["data"]["name"], "Jamal Demo User")

                signup = self.client.post(
                    "/login.py",
                    data={
                        "action": "signup",
                        "username": "visitor",
                        "email": "visitor@example.com",
                        "password": "password",
                    },
                )
                self.assertEqual(signup.status_code, 403)

                admin_login = self.client.post(
                    "/admin_login.py",
                    data={"username": "admin-demo", "password": "Admin123!"},
                )
                self.assertEqual(admin_login.status_code, 200)
                products = self.client.get("/admin_products.py")
                self.assertEqual(products.status_code, 200)
                self.assertIn(b"Read-only demo", products.data)

                connection = sqlite3.connect(database_path)
                try:
                    self.assertEqual(
                        connection.execute("SELECT COUNT(*) FROM products").fetchone()[0],
                        5,
                    )
                finally:
                    connection.close()


if __name__ == "__main__":
    unittest.main()
