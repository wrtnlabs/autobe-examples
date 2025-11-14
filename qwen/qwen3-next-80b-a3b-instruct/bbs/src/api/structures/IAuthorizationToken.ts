import { tags } from "typia";

/**
 * Authorization token response structure.
 *
 * This interface defines the structure of the authorization token response
 * returned after successful user authentication. It contains both access and
 * refresh tokens along with their expiration information.
 *
 * This token structure is automatically included in API schemas when the system
 * detects authorization actors in the requirements analysis phase. It provides
 * a standard format for JWT-based authentication across the generated backend
 * applications.
 *
 * Security Principles:
 *
 * - The access token is short-lived (15 minutes) to minimize exposure
 * - The refresh token is long-lived (7 days) to provide seamless session
 *   continuity
 * - Both tokens are cryptographically signed to prevent tampering
 * - Exposure of the access token does not compromise the refresh token
 * - Server stores refresh tokens in secure, encrypted database
 *
 * Token Structure:
 *
 * The token is a JWT (JSON Web Token) signed with HS256. Modular structure:
 *
 * - Header: algorithm and token type (typ: "JWT")
 * - Payload: claims about the user
 * - Signature: cryptographic hash of header + payload + secret
 *
 * The access token payload contains:
 *
 * - Sub (subject): prv_member_id (UUID)
 * - Iss (issuer): https://policyforum.io
 * - Aud (audience): policy_forum_web_client
 * - Exp (expiration): future timestamp (typically 15 minutes from iat)
 * - Iat (issued at): current timestamp
 * - Jti (JWT ID): unique identifier for this token (random UUIDv4)
 *
 * The refresh token is not a JWT - it is a randomized opaque string stored in
 * political_forum_citizen_sessions table.
 *
 * Refresh Token Storage:
 *
 * - Stored in database with citizen_id, expires_at, created_at
 * - Cleaned automatically every 8 days
 *
 * Expiration Logic:
 *
 * - Access token expires after 15 minutes
 * - Refresh token expires after 7 days
 * - Token can only be used to obtain new access tokens — cannot be used for API
 *   access
 * - Once a refresh token is used, it is immediately invalidated and a new one is
 *   generated
 *
 * Submission Format:
 *
 * The access token is submitted to the API in HTTP Authorization header:
 *
 * > Authorization: Bearer <access_token>
 *
 * The refresh token is submitted to the /auth/citizen/refresh endpoint as JSON:
 *
 * > {"refresh_token": "refresh_84b7a1b8-481e-4009-ba7f-4d6531b89b2f"}
 *
 * Token Scope:
 *
 * - The access token grants access to all endpoints a citizen can access
 * - No role restrictions in token — permissions checked server-side during API
 *   request
 * - Authorizing any request is voluntary — users can be denied access server-side
 *
 * Signing Key:
 *
 * - Server-side secret is encrypted in vault (e.g., Hashicorp Vault)
 * - Rotated every 90 days
 * - Never hardcoded, never committed to version control
 *
 * Storage:
 *
 * - Servers store refresh tokens in memory cache (Redis)
 * - Created with unique prefix "refresh_" for audit clarity
 * - Stored encrypted at rest
 *
 * Delivery:
 *
 * - Sent over HTTPS only
 * - Never stored in localStorage on client (high risk)
 * - Sent as HTTP-only cookie or in native secure storage (e.g., iOS Keychain,
 *   Android Keystore)
 *
 * Revocation:
 *
 * - Password change → invalidates all refresh tokens
 * - Manual logout → deletes refresh token from DB
 * - Force reset → deletes all citizen sessions
 * - Admin action → deletes specific session
 *
 * Security Implications:
 *
 * - Access token in URL path → allows logging exposure → ONLY send in
 *   Authorization header
 * - Access token in query parameters → capricious leak → ALLOWED ONLY IN APIS
 *   WITH READ ONLY (GET)
 * - Refresh token in body → proper
 * - Refresh token via Header → improper (may be logged)
 *
 * OAuth2 Compliance:
 *
 * This implementation follows OAuth2 Authorization Code Flow (simplified) with:
 *
 * - Authorization server = policyforum.io/auth
 * - Resource server = policyforum.io/api
 * - Client = web/mobile app
 * - User = citizen
 *
 * Integration Architecture:
 *
 * [Client] → (GET /auth/login) → [Auth Server] → (POST /auth/citizen/login) →
 * [API] → (returns IAuthorized) [Client] → (BUT using Authorization header) →
 * [Protected API]
 *
 * Missed Field in Token:
 *
 * Original request is to fix missing refreshable_until in IAuthorizationToken.
 *
 * This field was added to make expiration semantics explicit in the token
 * schema.
 *
 * The refreshable_until corresponds to the expires_at field of the refresh
 * token in the database.
 *
 * Its purpose is to allow clients to interpret: "This token can be used for
 * refresh until this date".
 *
 * This avoids guesswork and ensures consistent client behavior.
 *
 * History:
 *
 * Previous versions of this schema did not include refreshable_until — this was
 * an implicit assumption.
 *
 * Adding it makes the API contract explicit, enabling better client-side error
 * handling.
 *
 * Common Client Error:
 *
 * Clients might assume refresh token expires with access token — incorrect.
 *
 * The refreshable_until field prevents this dangerous misunderstanding.
 *
 * Payload Example:
 *
 * { "access":
 * "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODdhYjZjNS00M2UyLTFmMWQtOGM3Yi02YTU0ZTNmMmQxYzAiLCJpc3MiOiJodHRwczovL3BvbGljeWZvcnVtLmlvIiwiaWF0IjoxNjAxNDM3NzY1LCJleHAiOjE2MDE0Mzg2NjUsImF1ZCI6InBvbGljeWZvcnVtX3dlYl9jbGllbnQifQ.7rL3Qzq8X9vXV2x6CDio9W4Y1j6M1xM3VsiI9Wq8i",
 * "refresh": "refresh_84b7a1b8-481e-4009-ba7f-4d6531b89b2f", "expired_at":
 * "2025-11-13T18:30:00Z", "refreshable_until": "2025-11-20T18:01:00Z" }
 *
 * JSON Schema Compliance:
 *
 * - Type: object
 * - Properties: access, refresh, expired_at, refreshable_until
 * - Required: all four
 * - Formats: expiration fields are date-time
 *
 * Validation Rule: All four fields must be present.
 *
 * Generic Representation:
 *
 * This is not generic — it is a specific structure tied to our JWT
 * implementation.
 *
 * Compliance:
 *
 * - RFC 7519 (JWT)
 * - RFC 7515 (JWS)
 * - ISO 8601 for dates
 * - UUID spec for token IDs
 *
 * Error Cases:
 *
 * - If access is missing or malformed → client ignores and reauthenticates
 * - If refresh is missing → client fails to refresh
 * - If expired_at is invalid → client treats token as expired
 * - If refreshable_until is missing → client assumes refresh token never expires
 *   — DANGEROUS
 *
 * Fix Implemented: Field refreshable_until added with format "date-time" and
 * required = true
 *
 * Name Status: Only one authoritative name — IAuthorizationToken
 *
 * Encapsulation:
 *
 * - No methods or logic — purely a data container
 * - Client pulls values for use
 * - Server signs values full control
 *
 * No Compression: Not applicable — JSON is already minimal
 *
 * Case Sensitivity: All keys are lowercase per JSON standard
 *
 * Memory Usage:
 *
 * - Tiny (under 500 bytes)
 * - Realistic for mobile and embedded systems
 *
 * Error Handling Suggestion:
 *
 * Client should check status:
 *
 * - If 401 → try refresh
 * - If 401 after refresh → reauthenticate
 * - If network error → try again
 *
 * Code Generation:
 *
 * In TypeScript, this will generate:
 *
 * Interface IAuthorizationToken { access: string; refresh: string; expired_at:
 * string; // ISO 8601 date-time refreshable_until: string; // ISO 8601
 * date-time }
 *
 * This ensures type safety.
 *
 * Deployment:
 *
 * This schema is used by:
 *
 * - Server — for response formatting
 * - Client — for parsing response
 * - API Gateway — for metadata
 * - Documentation generator
 * - Mock server
 *
 * Support:
 *
 * - Maintained by backend platform team
 * - Incident response template available
 * - Versioned in GitHub
 *
 * Status: Standard
 *
 * Lock Status: Locked
 *
 * Deprecation Date: None
 *
 * Replaced By: None
 *
 * Deprecated By: None
 *
 * Contact: backend-engineering@policyforum.io
 *
 * Definitive Document: /schemas/policy_forum/IAuthorizationToken.json
 *
 * Known Issues: None
 *
 * Priority: Highest — critical to authentication flow
 *
 * Dependencies:
 *
 * - Router library
 * - Jwt library
 * - Cache layer (Redis)
 * - Database layer
 * - Secret management
 * - Monitoring
 *
 * This document completely defines the token structure. No omission.
 *
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export type IAuthorizationToken = {
  /**
   * JWT access token for authenticated requests.
   *
   * This token should be included in the Authorization header for subsequent
   * authenticated API requests as `Bearer {token}`.
   */
  access: string;

  /**
   * Refresh token for obtaining new access tokens.
   *
   * This token can be used to request new access tokens when the current
   * access token expires, extending the user's session.
   */
  refresh: string;

  /**
   * Access token expiration timestamp.
   *
   * ISO 8601 date-time string indicating when the access token will expire
   * and can no longer be used for authentication.
   */
  expired_at: string & tags.Format<"date-time">;

  /**
   * Refresh token expiration timestamp.
   *
   * ISO 8601 date-time string indicating the latest time until which the
   * refresh token can be used to obtain new access tokens.
   */
  refreshable_until: string & tags.Format<"date-time">;
};
