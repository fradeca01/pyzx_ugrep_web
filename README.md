# pyzx_ugrep_web

Web interface for [pyzx_ugrep](https://github.com/fradeca01/pyzx_ugrep), a Python library that converts stabilizer codes into their Universal Graph Representation (UGR).

- `backend/`: FastAPI service that runs the library
- `frontend/`: Next.js interface

## Run locally

Python 3.12, Node.js 24, `git`, a C/C++ toolchain and [MiniZinc](https://www.minizinc.org/) are required.

Start the backend from the root of the repository:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

In a second terminal, start the frontend from the root of the repository:

```bash
cd frontend
npm ci
npm run dev
```

The interface is then available at http://localhost:3000/pyzx_ugrep_web and the API at http://localhost:8000.

## Configuration

- **Backend URL:** the frontend reads `NEXT_PUBLIC_BACKEND_URL`. To override the default, copy `frontend/.env.example` to `frontend/.env.local`.
- **Backend limits:** set the `UGR_*` environment variables before starting the backend. The defaults are in `backend/main.py`.
- **Library version:** the backend pins a commit of `ugr` in `backend/requirements.in`. Update that hash and regenerate the lockfile to use a newer version of the library.

## Update backend dependencies

Edit direct dependencies in `backend/requirements.in`. `backend/requirements.txt` is generated from it, so don't edit it by hand. With the backend virtual environment active, regenerate it from `backend/`:

```bash
pip install pip-tools
pip-compile --strip-extras --output-file=requirements.txt requirements.in
```

Add `--upgrade` to move every package to its latest compatible version.
