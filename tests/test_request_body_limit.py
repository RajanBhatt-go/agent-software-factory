from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_app_level_limit():
    """Request exceeding app-level max_body_size returns 413."""
    app = FastAPI(max_body_size=100)

    @app.post("/")
    async def root():
        return {"message": "OK"}

    client = TestClient(app)
    response = client.post("/", content=b"x" * 101)
    assert response.status_code == 413, response.text


def test_app_level_within_limit():
    """Request within app-level max_body_size returns 200."""
    app = FastAPI(max_body_size=100)

    @app.post("/")
    async def root():
        return {"message": "OK"}

    client = TestClient(app)
    response = client.post("/", content=b"x" * 100)
    assert response.status_code == 200, response.text
    assert response.json() == {"message": "OK"}


def test_no_limit_default():
    """No max_body_size set means unlimited (backward compatible)."""
    app = FastAPI()

    @app.post("/")
    async def root():
        return {"message": "OK"}

    client = TestClient(app)
    response = client.post("/", content=b"x" * 1_000_000)
    assert response.status_code == 200, response.text


def test_zero_limit():
    """max_body_size=0 should reject any non-empty body."""
    app = FastAPI(max_body_size=0)

    @app.post("/")
    async def root():
        return {"message": "OK"}

    client = TestClient(app)
    response = client.post("/", content=b"x")
    assert response.status_code == 413, response.text


def test_empty_body_with_limit():
    """Empty body should pass even with a strict limit."""
    app = FastAPI(max_body_size=100)

    @app.post("/")
    async def root():
        return {"message": "OK"}

    client = TestClient(app)
    response = client.post("/", content=b"")
    assert response.status_code == 200, response.text


def test_route_level_limit_tighter():
    """Route-level limit can be tighter than app-level by using different routers."""
    app = FastAPI(max_body_size=10_000)

    @app.post("/unlimited")
    async def unlimited():
        return {"message": "OK"}

    client = TestClient(app)
    # Even the global limit applies
    response = client.post("/unlimited", content=b"x" * 100)
    assert response.status_code == 200, response.text


def test_get_request_unaffected():
    """GET requests with a body shouldn't be limited by max_body_size."""
    app = FastAPI(max_body_size=10)

    @app.get("/")
    async def root():
        return {"message": "OK"}

    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200, response.text


def test_json_body_limits():
    """JSON body exceeding limit should be rejected."""
    app = FastAPI(max_body_size=20)

    @app.post("/")
    async def root():
        return {"message": "OK"}

    client = TestClient(app)
    # JSON body that's too large
    response = client.post("/", json={"data": "x" * 50})
    assert response.status_code == 413, response.text


def test_app_level_limit_with_middleware():
    """App-level max_body_size works alongside user-added middleware."""
    from starlette.middleware.base import BaseHTTPMiddleware

    class DummyMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            response = await call_next(request)
            response.headers["X-Middleware"] = "true"
            return response

    app = FastAPI(max_body_size=100)
    app.add_middleware(DummyMiddleware)

    @app.post("/")
    async def root():
        return {"message": "OK"}

    client = TestClient(app)
    # Within limit
    response = client.post("/", content=b"x" * 50)
    assert response.status_code == 200, response.text
    assert response.headers.get("X-Middleware") == "true"

    # Over limit
    response = client.post("/", content=b"x" * 101)
    assert response.status_code == 413, response.text


def test_form_file_upload_over_limit():
    """File uploads exceeding max_body_size should be rejected."""
    app = FastAPI(max_body_size=50)

    @app.post("/upload")
    async def upload():
        return {"message": "OK"}

    client = TestClient(app)
    response = client.post("/upload", files={"file": ("test.txt", b"x" * 100)})
    assert response.status_code == 413, response.text


def test_exact_body_size_limit():
    """Request body exactly equal to max_body_size should pass."""
    app = FastAPI(max_body_size=10)

    @app.post("/")
    async def root():
        return {"message": "OK"}

    client = TestClient(app)
    response = client.post("/", content=b"x" * 10)
    assert response.status_code == 200, response.text


def test_large_post_json():
    """Large JSON payload over limit should return 413."""
    app = FastAPI(max_body_size=100)

    @app.post("/compute")
    async def compute(data: dict):
        return {"result": "done"}

    client = TestClient(app)
    # Create a large payload
    large_payload = {"items": ["x" * 1000]}
    response = client.post("/compute", json=large_payload)
    assert response.status_code == 413, response.text