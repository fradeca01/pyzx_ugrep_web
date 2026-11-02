# pyzx_ugrep_web

Web interface for [pyzx_ugrep](https://github.com/fradeca01/pyzx_ugrep), a Python library that converts stabilizer codes into their Universal Graph Representation (UGR).

- `backend/`: FastAPI service that runs the library
- `frontend/`: Next.js interface

## Run locally

`docker` is required. From the root of the repository, run:

```bash
docker compose up
```

The interface is then available at http://localhost:3000/pyzx_ugrep_web and the API at http://localhost:8000.

## Configuration

- **Backend URL:** the frontend reads `NEXT_PUBLIC_BACKEND_URL`. To override the default, copy `frontend/.env.example` to `frontend/.env.local`.
- **Backend limits:** the `UGR_*` variables are set in `docker-compose.yml`.
- **Library version:** the backend pins a commit of `ugr` in `backend/requirements.txt`. Update that hash to use a newer version of the library.
