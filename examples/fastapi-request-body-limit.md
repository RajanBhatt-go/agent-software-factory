# Request Body Size Limiting for FastAPI

> **Pipeline**: agent-software-factory  
> **Target project**: [FastAPI](https://github.com/fastapi/fastapi) — modern, fast web framework for building APIs with Python  
> **Feature**: Add `max_body_size` support throughout FastAPI's application stack  
> **Date**: 2026-10-08

---

## 1. Problem Statement

Starlette 1.6.0 introduced `max_body_size` — a parameter that limits the total size of incoming HTTP request bodies — across its entire stack: `Starlette.__init__`, `Router.__init__`, `Route.__init__`, and `Mount.__init__`. It uses a `RequestBodyLimitMiddleware` that returns `413 Content Too Large` for oversized requests.

**FastAPI silently ignores this parameter.** Because:

| # | Layer | Root Cause |
|---|-------|------------|
| 1 | `FastAPI.__init__` | Does not accept `max_body_size` as a parameter. Unknown kwargs go into `**extra` and are silently dropped. |
| 2 | `FastAPI.build_middleware_stack()` | Duplicates Starlette's stack builder but omits `RequestBodyLimitMiddleware` entirely. |
| 3 | `APIRoute.__init__` | Never calls `super().__init__()`. Sets `self.app` itself, bypassing Starlette's route-level body limit wrapping. |
| 4 | `APIRouter.__init__` | Does not accept or forward `max_body_size` to Starlette's `Router.__init__`. |
| 5 | `APIRouter.add_api_route()` | Creates `APIRoute` instances without passing any `max_body_size` parameter. |

**Impact**: Applications that pass `FastAPI(max_body_size=1_000_000)` expecting a 1MB limit receive **no limit** and **no warning**. This is a silent configuration failure, with security implications (CVE-2024-47874 — Starlette ASGI DoS via unbounded request bodies).

**Related**: [FastAPI Discussion #16339](https://github.com/fastapi/fastapi/discussions/16339)

---

## 2. Design

### 2.1 Approach

Thread `max_body_size` through all 4 FastAPI layers that mirror Starlette's corresponding layers. Each layer wraps the ASGI handler with `RequestBodyLimitMiddleware` when `max_body_size` is set. The default `None` preserves existing unlimited behaviour — zero backward incompatibility.

### 2.2 Layer Stack & Middleware Ordering

```
Incoming Request
  │
  ▼
RequestBodyLimitMiddleware (app-level, outermost)
  │  Checks against global max_body_size (e.g. 10MB)
  │  413 if exceeded
  ▼
ServerErrorMiddleware
  ▼
ExceptionTelemetryMiddleware
  ▼
ExceptionMiddleware
  ▼
AsyncExitStackMiddleware
  ▼
Router
  │
  ▼
RequestBodyLimitMiddleware (route-level, innermost)
  │  Checks against per-route max_body_size (e.g. 1MB for upload endpoint)
  │  413 if exceeded
  ▼
Actual request handler (dependency injection, model parsing, etc.)
```

**Precedence**: The stricter of the two limits wins. A request passes only if it satisfies both. This gives users:

- **Global cap**: A hard limit for all endpoints (defense-in-depth against oversized requests)
- **Per-route override**: A tighter limit on upload endpoints, or a looser one on endpoints that genuinely need large payloads

### 2.3 Layer 1: `APIRoute` (route-level)

**File**: `fastapi/routing.py` — class `APIRoute`

Add a `max_body_size: int | None = None` parameter. After setting `self.app`, wrap it:

```python
def __init__(self, ..., max_body_size: int | None = None) -> None:
    ...
    self.app = request_response(self.get_route_handler())
    if max_body_size is not None:
        from starlette.middleware.body_limit import RequestBodyLimitMiddleware
        self.app = RequestBodyLimitMiddleware(self.app, max_body_size=max_body_size)
```

**Why this works**: `Route.handle()` calls `await self.app(scope, receive, send)`, and `APIRoute.handle()` delegates to `super().handle()` in the regular path. The wrapped `self.app` intercepts the `receive` channel and enforces the limit before the body reaches request handler code.

### 2.4 Layer 2: `APIRouter` (router-level)

**File**: `fastapi/routing.py` — class `APIRouter`

Accept `max_body_size` and thread it through to route creation:

```python
def __init__(self, ..., max_body_size: int | None = None) -> None:
    super().__init__(..., max_body_size=max_body_size)  # For Starlette-level routes
    self.max_body_size = max_body_size
    ...

def add_api_route(self, ..., max_body_size: int | None = None) -> None:
    ...
    route_max_size = max_body_size if max_body_size is not None else self.max_body_size
    route = route_class(
        ...,
        max_body_size=route_max_size,
    )
```

**Router-level vs route-level merging**: The `APIRouter` sets a default; `add_api_route()` can override it per-route. This mirrors how Starlette handles it.

### 2.5 Layer 3: `FastAPI` (application-level)

**File**: `fastapi/applications.py` — class `FastAPI`

Add `max_body_size` parameter and install the middleware:

```python
def __init__(self, ..., max_body_size: int | None = None) -> None:
    ...
    self.max_body_size = max_body_size
    # Pass to router for route-level limits
    self.router = routing.APIRouter(..., max_body_size=max_body_size)
    ...

def build_middleware_stack(self) -> ASGIApp:
    ...
    middleware = [
        Middleware(ServerErrorMiddleware, handler=error_handler, debug=debug),
        Middleware(ExceptionTelemetryMiddleware),
    ]
    # Insert app-level body limit middleware after error handlers, before user middleware
    if self.max_body_size is not None:
        from starlette.middleware.body_limit import RequestBodyLimitMiddleware
        middleware.append(
            Middleware(RequestBodyLimitMiddleware, max_body_size=self.max_body_size)
        )
    middleware += self.user_middleware + [
        Middleware(ExceptionMiddleware, handlers=exception_handlers, debug=debug),
        Middleware(AsyncExitStackMiddleware),
    ]
    ...
```

**Placement**: `RequestBodyLimitMiddleware` sits **after** exception handlers (so it can raise `HTTPException(413)` that gets caught) but **before** user middleware and the router (so the check fires early, before any user code or routing runs).

### 2.6 Layer 4: Tests

**File**: `tests/test_request_body_limit.py` (new)

| Test Case | Scenario | Expected |
|-----------|----------|----------|
| `test_app_level_limit` | Request body exceeds app-level `max_body_size` | `413` |
| `test_app_level_within_limit` | Request body within app-level limit | `200` |
| `test_route_level_limit` | Route has tighter limit than app-level | Respects route limit |
| `test_no_limit_default` | No `max_body_size` set anywhere | Unlimited (backward compat) |
| `test_file_upload_over_limit` | File upload exceeds limit | `413` |
| `test_websocket_unaffected` | WebSocket connection | Not affected by body limit |
| `test_streaming_body_over_limit` | Streaming/chunked body exceeds limit | `413` |
| `test_zero_limit` | `max_body_size=0` | `413` on any non-empty body |
| `test_mixed_routes_different_limits` | Multiple routes with different limits | Each route enforces its own |
| `test_apiroute_effective_context` | Included router with `max_body_size` | Limit still enforced |

---

## 3. Backward Compatibility

| Scenario | Before | After | Break? |
|----------|--------|-------|--------|
| `FastAPI()` (no arg) | Unlimited | Unlimited | ✅ No |
| `FastAPI(max_body_size=1_000_000)` | Silently ignored | 1MB limit enforced | ⚠️ Fixes a bug |
| `FastAPI(some_typo=...)` | In `**extra` | Still in `**extra` | ✅ No |
| Subclass of `FastAPI` | Works | Works | ✅ No |
| Existing middleware | Works | Works | ✅ No |
| `APIRouter()` (no arg) | Unlimited | Unlimited | ✅ No |
| `@app.post(...)` | Works | Works | ✅ No |

---

## 4. Edge Cases

### 4.1 WebSockets
`RequestBodyLimitMiddleware` only activates when `scope["type"] == "http"`. WebSocket connections pass through untouched.

### 4.2 Streaming / Chunked Transfer Encoding
The middleware tracks accumulated bytes across multiple `http.request` ASGI messages. The limit applies to the total streamed body, not per-chunk.

### 4.3 Multipart File Uploads
The limit applies to the **raw body bytes**, including multipart encoding overhead and boundary markers. This is consistent with Starlette's `max_body_size` and is stricter than Pydantic's per-field limits.

### 4.4 Route-Level with `effective_context` (included routers)
When a router is included into another, `APIRoute.handle()` has a special path that uses `effective_context.app`. Because `effective_context` is populated from the *included* route's `self.app`, and we wrap `self.app` in `APIRoute.__init__`, the limit is naturally preserved.

### 4.5 CVE-2024-47874 Context
This feature directly mitigates the Starlette ASGI DoS vulnerability where unbounded request bodies could exhaust server memory. The app-level global cap is the recommended defense-in-depth measure, while route-level limits handle endpoints with different size requirements.

---

## 5. Files Changed

| File | Change |
|------|--------|
| `fastapi/applications.py` | Add `max_body_size` to `FastAPI.__init__` and `build_middleware_stack()` |
| `fastapi/routing.py` | Add `max_body_size` to `APIRoute.__init__`, `APIRouter.__init__`, `APIRouter.add_api_route()` |
| `tests/test_request_body_limit.py` | New test file covering all scenarios |

---

## 6. Open Questions

1. **Starlette version minimum**: Should this feature require Starlette >= 0.46.0 (current dependency) or Starlette >= 1.6.0 (where `RequestBodyLimitMiddleware` was added)? A runtime check or import guard could handle older versions gracefully.
2. **Documentation**: Should we add a page to FastAPI's docs (e.g. "Request Body Size Limits") or just a docstring on the parameter?
3. **`openapi.json` exposure**: Should the limit be exposed in the OpenAPI schema (e.g. `maxLength` on request body schemas)? Not in scope for v1, but worth noting.

---

## 7. Related Resources

- [Starlette `RequestBodyLimitMiddleware` source](https://github.com/encode/starlette/blob/main/starlette/middleware/body_limit.py)
- [Starlette `max_body_size` in applications.py](https://github.com/encode/starlette/blob/main/starlette/applications.py)
- [FastAPI Discussion #16339 — "FastAPI silently ignores Starlette's new max_body_size"](https://github.com/fastapi/fastapi/discussions/16339)
- [CVE-2024-47874 — Starlette ASGI Framework DoS Vulnerability](https://www.sentinelone.com/vulnerability-database/cve-2024-47874/)
- [Starlette docs — Request size limits](https://starlette.dev/requests/)