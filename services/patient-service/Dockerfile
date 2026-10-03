# syntax=docker/dockerfile:1
# AuraCare Health - Patient Records Service
# Production Dockerfile: multi-stage build, non-root runtime user.

# ---------- Stage 1: builder ----------
# Compiles wheels for all dependencies in an isolated layer so the final
# image doesn't need a C compiler / build toolchain.
FROM python:3.11-slim AS builder

WORKDIR /build

# Build deps needed only to compile wheels (e.g. for psycopg2-binary's
# transitive deps on some platforms); not present in the final image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip wheel --no-cache-dir --wheel-dir /build/wheels -r requirements.txt

# ---------- Stage 2: runtime ----------
FROM python:3.11-slim AS runtime

# Metadata
LABEL maintainer="AuraCare Health Engineering" \
      description="Patient Records Service"

# Create a dedicated non-root user/group to run the app.
# Using fixed UID/GID keeps permissions predictable across environments
# (e.g. Kubernetes securityContext, ECS task definitions).
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid appuser --shell /bin/false --no-create-home appuser

WORKDIR /app

# Install only the pre-built wheels from the builder stage - no compiler,
# no package manager cache, no build toolchain in the final image.
COPY --from=builder /build/wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels requirements.txt

# Copy application source after dependency install to maximize layer caching.
COPY --chown=appuser:appuser main.py ./
COPY --chown=appuser:appuser app ./app

# Drop root privileges for all subsequent instructions and at runtime.
USER appuser

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

EXPOSE 8000

# Container-level health check hitting the same endpoint the ALB uses.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/patients/health', timeout=2).status == 200 else 1)"

# No shell form, no reload, no --root flags: least privilege at runtime.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
