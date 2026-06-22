# JAMAL Portfolio Demo

JAMAL is a Flask portfolio application backed by a self-seeding SQLite demo
database. It does not need XAMPP, MySQL, or a database service.

## Demo accounts

- Customer: `demo` / `Demo123!`
- Read-only admin: `admin-demo` / `Admin123!`

`DEMO_MODE=1` disables public sign-up, profile changes, file uploads, product
editing, and product deletion. Cart and checkout interactions remain available
in the visitor's browser.

## Local setup

```powershell
py -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
$env:SECRET_KEY = "local-development-secret"
.venv\Scripts\python -m flask --app app run --debug
```

Open `http://127.0.0.1:5000/`. The SQLite database is created automatically at
`instance/jamal_demo.db` on the first request.

## Deployment

The included `render.yaml` installs the dependencies, starts Gunicorn, creates
a secure session secret, and enables portfolio demo mode. Create a new Render
web service from this repository and deploy it using the Blueprint file.

The SQLite file may reset when an ephemeral hosting instance restarts. That is
intentional for this read-only portfolio demo because the seed data is recreated
automatically and visitor changes are disabled.
