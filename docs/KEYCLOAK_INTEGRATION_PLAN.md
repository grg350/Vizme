# Keycloak Integration Plan - Step 1: Authentication Strategy

## Executive Summary

This document outlines the strategy for replacing the existing custom JWT-based authentication system with Keycloak-based OAuth2/OpenID Connect authentication. This is **Step 1** - planning and strategy only. Implementation will follow after approval.

---

## Current System Analysis

### Existing Authentication Implementation

**Backend:**
- Custom JWT authentication (`/api/v1/auth/signup`, `/api/v1/auth/signin`, `/api/v1/auth/refresh`)
- JWT tokens generated with `jsonwebtoken` library
- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry, stored in PostgreSQL `refresh_tokens` table
- Password hashing with bcrypt (12 rounds)
- `authenticate` middleware validates JWT tokens and sets `req.user`
- API key authentication (separate, for metrics ingestion)

**Frontend:**
- React application with Zustand state management
- Tokens stored in `localStorage`
- Auto token refresh via axios interceptors
- Login/Signup pages with form-based authentication

**Database:**
- `users` table: `id`, `email`, `password_hash`, `name`, `created_at`, `updated_at`
- `refresh_tokens` table: `user_id`, `token`, `expires_at`
- Multi-tenancy: User-scoped via `user_id` foreign keys

**Protected Routes:**
- `/api/v1/api-keys` - requires JWT
- `/api/v1/metric-configs` - requires JWT
- `/api/v1/code-generation` - requires JWT
- `/api/v1/metrics/info` - requires JWT
- `/api/v1/metrics` - uses API key (separate, remains unchanged)

---

## Keycloak Integration Strategy

### 1. Multi-Tenancy Approach: **Single Realm with Client-Based Separation**

**Decision: Single Realm Strategy**

**Rationale:**
- **Simplicity**: Easier to manage, configure, and maintain
- **Scalability**: Can scale horizontally without realm management overhead
- **Cost-Effective**: Single realm reduces resource consumption
- **Future-Proof**: Can migrate to multi-realm later if needed (e.g., for strict tenant isolation)
- **User Management**: Centralized user management simplifies operations

**Multi-Tenancy Implementation:**
- Use **Keycloak Client** per tenant (or use custom claims/attributes)
- Store tenant_id in Keycloak user attributes or realm roles
- Backend extracts tenant_id from JWT token claims
- Database remains user-scoped (current `user_id` approach)
- Future: Can add `tenant_id` column to users table if needed

**Alternative Considered:**
- Multi-Realm: More isolation but complex to manage, harder to scale, requires realm-per-tenant

### 2. Client Type: **Confidential Client**

**Decision: Confidential Client (with Client Secret)**

**Rationale:**
- **Security**: Client secret provides additional security layer
- **Backend-to-Backend**: Our backend will validate tokens server-side
- **Token Introspection**: Can use token introspection endpoint if needed
- **Production-Ready**: Standard for server-side applications

**Client Configuration:**
- Client ID: `unified-visibility-platform` (or configurable via env)
- Client Secret: Stored in environment variables (never hardcoded)
- Access Type: `confidential`
- Standard Flow Enabled: `authorization_code` (for frontend)
- Direct Access Grants: Enabled (for API testing, optional)
- Service Accounts: Enabled (for backend-to-backend, if needed)

### 3. Token Flow: **Authorization Code Flow with PKCE**

**Frontend Flow:**
1. User clicks "Login" → Redirects to Keycloak login page
2. User authenticates with Keycloak
3. Keycloak redirects back to frontend with authorization code
4. Frontend exchanges code for tokens (access + refresh)
5. Frontend stores tokens in `localStorage` (or secure httpOnly cookies)
6. Frontend includes access token in `Authorization: Bearer <token>` header

**Backend Flow:**
1. Receives request with `Authorization: Bearer <token>` header
2. Validates token signature using Keycloak's public key (JWKS)
3. Extracts user information from token claims (`sub`, `email`, `name`, etc.)
4. Sets `req.user` with user information
5. Continues to route handler

**Token Validation:**
- Use **JWKS (JSON Web Key Set)** endpoint for public key retrieval
- Cache public keys to reduce Keycloak requests
- Validate token signature, expiration, issuer, audience
- Extract user info from standard OIDC claims (`sub`, `email`, `preferred_username`, etc.)

### 4. User Data Synchronization Strategy

**Approach: Hybrid Model (Keycloak + PostgreSQL)**

**Rationale:**
- Keycloak handles authentication (passwords, tokens, sessions)
- PostgreSQL stores application-specific user data (if needed)
- Avoids data duplication where possible

**Implementation:**
- **Option A (Recommended for Step 1)**: Use Keycloak as source of truth
  - Extract user info from JWT token claims
  - No PostgreSQL user table lookup (or minimal lookup for application-specific data)
  - Simpler, faster, reduces database load

- **Option B (Future)**: Sync Keycloak users to PostgreSQL
  - Keep `users` table for application-specific data
  - Use Keycloak user ID (`sub` claim) as foreign key
  - Sync on first login or via Keycloak events/webhooks

**Step 1 Decision: Option A**
- Use Keycloak user ID (`sub` claim) as primary identifier
- Store in `req.user` from token claims
- Keep existing `users` table for backward compatibility (can be deprecated later)
- API keys and metric configs will reference Keycloak user ID

---

## How Authentication Will Replace Existing Mechanism

### Backend Changes

**1. Remove/Replace Auth Routes:**
- ❌ Remove: `/api/v1/auth/signup` (users register via Keycloak)
- ❌ Remove: `/api/v1/auth/signin` (handled by Keycloak)
- ❌ Remove: `/api/v1/auth/refresh` (handled by Keycloak)
- ✅ Add: `/api/v1/auth/callback` (optional, for post-login redirects)
- ✅ Add: `/api/v1/auth/logout` (optional, for logout coordination)

**2. Replace Auth Middleware:**
- ❌ Remove: JWT verification with `jsonwebtoken` library
- ✅ Add: OIDC token validation using Keycloak JWKS
- ✅ Extract user info from token claims (`sub`, `email`, `name`, etc.)
- ✅ Set `req.user` with Keycloak user information
- ✅ Maintain same interface (`req.user.id`, `req.user.email`, `req.user.name`)

**3. Update Protected Routes:**
- No changes needed to route handlers
- Routes continue using `authenticate` middleware
- Middleware implementation changes, but interface remains the same

**4. API Key Authentication:**
- ✅ **Remains unchanged** (separate concern, not affected by Keycloak)

### Frontend Changes

**1. Replace Auth API Calls:**
- ❌ Remove: `authAPI.signup()` and `authAPI.signin()` calls
- ✅ Add: Keycloak redirect flow
- ✅ Add: Token exchange after Keycloak callback
- ✅ Update: Token refresh logic (use Keycloak refresh token endpoint)

**2. Update Auth Store:**
- ✅ Keep: Token storage in `localStorage` (or migrate to httpOnly cookies)
- ✅ Update: Token refresh to use Keycloak endpoint
- ✅ Add: Keycloak client initialization

**3. Replace Login/Signup Pages:**
- ❌ Remove: Form-based login/signup
- ✅ Replace: "Login with Keycloak" button → redirects to Keycloak
- ✅ Add: Callback handler for Keycloak redirect

**4. Update API Client:**
- ✅ Keep: Axios interceptors for token attachment
- ✅ Update: Token refresh logic to use Keycloak refresh endpoint

---

## Docker & Infrastructure Changes

### Keycloak Service in Docker Compose

**Service Configuration:**
- Image: `quay.io/keycloak/keycloak:latest` (or specific version)
- Port: `8080` (internal), `8090` (host, for admin access)
- Environment:
  - `KEYCLOAK_ADMIN`: Admin username (from env)
  - `KEYCLOAK_ADMIN_PASSWORD`: Admin password (from env)
  - `KC_DB`: `postgres` (use existing PostgreSQL)
  - `KC_DB_URL_HOST`: `postgres` (Docker service name)
  - `KC_DB_URL_DATABASE`: Keycloak database name
  - `KC_DB_USERNAME`: Database user
  - `KC_DB_PASSWORD`: Database password
  - `KC_HTTP_RELATIVE_PATH`: `/auth` (optional, for path-based routing)
- Volumes:
  - Keycloak data volume (for persistence)
  - Import/export scripts (optional)
- Healthcheck: Check Keycloak health endpoint
- Depends on: PostgreSQL

**Database:**
- Option A: Use existing PostgreSQL (separate database: `keycloak_db`)
- Option B: Separate PostgreSQL instance (more isolation)
- **Step 1 Decision: Option A** (separate database in same PostgreSQL instance)

**Persistence:**
- Keycloak data stored in Docker volume
- Database stores realm, client, user configurations
- No data loss on container restart

### Environment Variables

**New Variables:**
```bash
# Keycloak Configuration
KEYCLOAK_URL=http://localhost:8090
KEYCLOAK_REALM=<realm-name>
KEYCLOAK_CLIENT_ID=unified-visibility-platform
KEYCLOAK_CLIENT_SECRET=<secret-from-keycloak>
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=<secure-password>

# Keycloak Database (if using separate DB)
KC_DB_NAME=keycloak_db
KC_DB_USER=keycloak_user
KC_DB_PASSWORD=<secure-password>
```

**Backend Variables:**
- Remove: `JWT_SECRET` (no longer needed)
- Add: `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`

**Frontend Variables:**
- Add: `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`

---

## Security Considerations

### Token Validation
- ✅ Validate token signature using JWKS
- ✅ Validate token expiration
- ✅ Validate issuer (`iss` claim)
- ✅ Validate audience (`aud` claim)
- ✅ Cache JWKS keys (with TTL) to reduce Keycloak load

### Token Storage
- **Current**: `localStorage` (vulnerable to XSS)
- **Future**: Consider httpOnly cookies (requires backend changes)
- **Step 1**: Keep `localStorage` (minimal changes, can improve later)

### HTTPS
- ✅ Production: Use HTTPS for Keycloak and application
- ✅ Development: HTTP acceptable for local development

### Secrets Management
- ✅ Never hardcode secrets
- ✅ Use environment variables
- ✅ Use Docker secrets or external secret management in production

---

## Horizontal Scaling Considerations

### Stateless Authentication
- ✅ Token validation is stateless (no session storage in backend)
- ✅ Multiple backend instances can validate tokens independently
- ✅ JWKS caching reduces Keycloak load

### Keycloak Scaling
- ✅ Keycloak supports clustering (for future)
- ✅ Database-backed configuration enables multi-instance deployments
- ✅ Load balancer can distribute Keycloak requests

### Database Scaling
- ✅ PostgreSQL can be scaled (read replicas, connection pooling)
- ✅ User data minimal (mostly in Keycloak)

---

## Migration Path

### Step 1: Authentication Only
1. Add Keycloak to Docker Compose
2. Configure Keycloak realm and client
3. Replace backend auth middleware (OIDC validation)
4. Replace frontend auth flow (Keycloak redirect)
5. Remove old auth routes
6. Update documentation

### Step 2: Authorization (Future)
- Implement role-based access control (RBAC)
- Use Keycloak roles and groups
- Map roles to application permissions

### Step 3: Accounting (Future)
- Audit logging via Keycloak events
- Track authentication events
- Integration with monitoring/logging systems

---

## Exact Code Changes (Not Implemented Yet)

### Backend Files to Modify:

1. **`docker/docker-compose.yml`**
   - Add Keycloak service
   - Add Keycloak database (or use existing PostgreSQL)
   - Add Keycloak volumes
   - Update backend environment variables

2. **`backend/package.json`**
   - Add: `keycloak-connect` or `jsonwebtoken` + `jwks-rsa` (for JWKS)
   - Add: `node-fetch` or use built-in `fetch` (for JWKS fetching)
   - Remove: `bcryptjs` (no longer needed, but keep for migration period)

3. **`backend/src/middleware/auth.middleware.js`**
   - Replace JWT verification with OIDC token validation
   - Add JWKS fetching and caching
   - Extract user info from token claims
   - Maintain same `req.user` interface

4. **`backend/src/routes/auth.routes.js`**
   - Remove: `signup`, `signin`, `refresh` endpoints
   - Add: Optional `callback` and `logout` endpoints
   - Keep: Error handling structure

5. **`backend/index.js`**
   - Remove: Auth routes import (or keep for backward compatibility)
   - Update: Environment variable validation

### Frontend Files to Modify:

1. **`frontend/package.json`**
   - Add: `keycloak-js` (Keycloak JavaScript adapter)
   - Or: Use manual OAuth2/OIDC flow (no library)

2. **`frontend/src/api/auth.js`**
   - Remove: `signup` and `signin` functions
   - Add: Keycloak initialization and redirect functions

3. **`frontend/src/store/authStore.js`**
   - Update: Token refresh to use Keycloak endpoint
   - Keep: Same interface for components

4. **`frontend/src/pages/Login/index.jsx`**
   - Replace: Form with "Login with Keycloak" button
   - Add: Redirect to Keycloak login

5. **`frontend/src/pages/Signup/index.jsx`**
   - Replace: Form with "Sign up via Keycloak" button
   - Or: Redirect to Keycloak registration page

6. **`frontend/src/api/client.js`**
   - Update: Token refresh logic to use Keycloak refresh endpoint
   - Keep: Same interceptor structure

7. **`frontend/src/App.jsx`**
   - Add: Keycloak callback route handler
   - Update: Auth check logic

### New Files to Create:

1. **`docker/keycloak/`** (optional)
   - Realm import/export scripts
   - Initial configuration

2. **`backend/src/services/keycloak.service.js`** (new)
   - JWKS fetching and caching
   - Token validation logic
   - User info extraction

3. **`docs/KEYCLOAK_AUTH_TESTING.md`** (new)
   - Testing guide
   - User creation steps
   - Troubleshooting

### Files to Keep Unchanged:

- ✅ `backend/src/routes/metrics.routes.js` (API key auth remains)
- ✅ `backend/src/routes/apikey.routes.js` (protected routes, middleware changes)
- ✅ `backend/src/routes/metricconfig.routes.js` (protected routes, middleware changes)
- ✅ `backend/src/routes/codeGeneration.routes.js` (protected routes, middleware changes)
- ✅ Database schema (users table can remain for backward compatibility)
- ✅ Prometheus and Grafana configuration

---

## Testing Strategy

### Manual Testing Steps:
1. Start Docker Compose (Keycloak + Backend + Frontend)
2. Access Keycloak admin console
3. Create realm and client
4. Create test user in Keycloak
5. Test frontend login redirect
6. Test token exchange
7. Test API calls with access token
8. Test token refresh
9. Test logout

### Automated Testing (Future):
- Integration tests for token validation
- E2E tests for login flow
- Token expiration tests

---

## Rollback Plan

If issues arise:
1. Keep old auth routes commented (not deleted) for quick rollback
2. Feature flag to switch between Keycloak and old auth
3. Database migration scripts are reversible
4. Docker Compose changes can be reverted

---

## Next Steps After Approval

Once Step 1 is approved, the implementation will proceed in this order:

1. **Docker Setup**: Add Keycloak service to docker-compose.yml
2. **Keycloak Configuration**: Create realm, client, test user
3. **Backend Middleware**: Replace JWT validation with OIDC validation
4. **Backend Routes**: Remove old auth routes
5. **Frontend Integration**: Replace login/signup with Keycloak redirect
6. **Frontend Token Management**: Update token refresh logic
7. **Documentation**: Create testing guide
8. **Testing**: Manual testing and verification

---

## Questions & Decisions Needed

1. **Realm Name**: What should the Keycloak realm be named? (e.g., `unified-visibility-platform`, `metrics-platform`)
2. **Client ID**: What should the client ID be? (e.g., `unified-visibility-platform`, `frontend-app`)
3. **Database**: Use existing PostgreSQL (separate database) or separate PostgreSQL instance?
4. **Token Storage**: Keep `localStorage` for Step 1, or migrate to httpOnly cookies?
5. **User Sync**: Use Keycloak as source of truth (Option A) or sync to PostgreSQL (Option B)?

---

## Summary

This plan outlines a **production-ready, scalable Keycloak integration** that:
- ✅ Replaces custom JWT authentication with industry-standard OAuth2/OIDC
- ✅ Maintains backward compatibility where possible
- ✅ Supports multi-tenancy via single realm with client-based separation
- ✅ Enables horizontal scaling (stateless token validation)
- ✅ Keeps changes minimal and well-scoped
- ✅ Does not break existing Prometheus/Grafana functionality
- ✅ Preserves API key authentication (separate concern)

**Ready for Step 1 implementation after approval.**
