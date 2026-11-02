FROM python:3.10-slim

ENV DEBIAN_FRONTEND=noninteractive


RUN apt-get update && \
    apt-get install -y minizinc build-essential git python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app


COPY backend/ ./backend/

RUN pip install --no-cache-dir -r backend/requirements.txt

WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
