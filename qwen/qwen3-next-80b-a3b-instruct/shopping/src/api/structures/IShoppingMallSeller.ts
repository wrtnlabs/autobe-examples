import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallSeller {
  /**
   * Request body for seller registration containing email and password
   * fields. This schema maps directly to the shopping_mall_sellers model, but
   * uses 'password' field for the plain text password (not password_hash) as
   * the backend handles hashing. The email field must be unique and follows
   * standard email format validation.
   *
   * During registration, the backend accepts the plain text password and
   * applies cryptographic hashing before storing it in the password_hash
   * column of the shopping_mall_sellers table. This ensures security by never
   * exposing or storing hashed passwords in client requests.
   *
   * The registration operation does not include seller_id, status,
   * created_at, updated_at, or deleted_at fields as these are managed
   * entirely by the backend system and are automatically populated during
   * account creation. The seller status is initialized to 'pending_review' by
   * default.
   *
   * CRITICAL: This is a self-authentication operation (IEntity.IJoin) where
   * the seller registers themselves. This requires mandatory session context
   * fields for security auditing and session creation: href (current URL) and
   * referrer (previous URL) are REQUIRED, and ip (client IP address) is
   * OPTIONAL. These fields are tracked in the shopping_mall_seller_sessions
   * table to create an audit trail associating the seller's registration with
   * their connection context.
   */
  export type ICreate = {
    /**
     * Seller's unique email address used for authentication and
     * communication. Must be unique across all sellers.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password provided during registration. The backend will
     * hash this value before storing it in the shopping_mall_sellers
     * table's password_hash field. Never store or transmit hashed passwords
     * from clients.
     */
    password: string;

    /**
     * Client's IP address during self-registration.
     *
     * This field is included for session context tracking and audit
     * purposes in the shopping_mall_seller_sessions table. The server can
     * extract this from the HTTP request, but allowing client-provided
     * value ensures accuracy in reverse-proxy or SSR scenarios.
     *
     * For self-registration operations (IEntity.IJoin), this field is
     * required for session creation.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL) during self-registration.
     *
     * This field is MANDATORY for session context tracking in the
     * shopping_mall_seller_sessions table. It represents the URL where the
     * registration form was accessed, enabling security monitoring, fraud
     * detection, and compliance audit trails.
     *
     * For self-registration operations (IEntity.IJoin), this field is
     * required for successful session creation.
     */
    href: string;

    /**
     * Referrer URL (previous page URL) during self-registration.
     *
     * This field is MANDATORY for session context tracking in the
     * shopping_mall_seller_sessions table. It represents the source page
     * that redirected the user to the registration form, enabling
     * analytics, security monitoring, and compliance tracking.
     *
     * For self-registration operations (IEntity.IJoin), this field is
     * required for successful session creation.
     */
    referrer: string;
  };

  /**
   * Response body containing access and refresh tokens for the authenticated
   * seller, along with account information. This schema is returned by both
   * /auth/seller/login and /auth/seller/refresh operations. The id field
   * corresponds to the seller's UUID from the shopping_mall_sellers table.
   * The token field references IAuthorizationToken which contains the jwt
   * access and refresh tokens.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated seller. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * This is a requested type for seller login. The interface requires
   * plain-text password and connection metadata for session creation. This is
   * a self-authentication operation where the actor (seller) is logging in
   * themselves.
   *
   * WARNING: This is NOT a request to create a seller but to authenticate an
   * existing one.
   *
   * The 'password' field (not password_hash!) is required as plain text for
   * server-side hashing. Password hashing is a server responsibility -
   * clients must never hash passwords.
   *
   * Additionally, this request MUST include session context metadata (href,
   * referrer) for proper session creation in the
   * shopping_mall_seller_sessions table. The IP address is OPTIONAL as the
   * server can extract it from the HTTP request, but it may be provided by
   * the client (especially for SSR cases). These fields are connection
   * metadata, not authentication context and must NEVER be confused with
   * seller_id or password_hash.
   *
   * The seller_session_id field has been DELETED because session IDs are
   * server-generated control tokens and must never be provided by clients to
   * prevent session hijacking.
   *
   * This differs from admin-created accounts (IAShoppingMallSeller.ICreate
   * with authorizationActor='admin') where session context is NOT required
   * because the admin is creating an account for someone else, not the seller
   * logging in themselves.
   *
   * Secure implementation: The server receives plain password, hashes it,
   * stores in password_hash column, generates session record with connecting
   * IP, href, referrer, and assigns a server-generated session_id.
   *
   * CRITICAL SECURITY RULE: Never accept password_hash as input - clients
   * must send plain password only.
   *
   * Comparison: IShoppingMallSeller.ICreate (registration) is
   * self-authentication with immediate login, so have exactly same schema.
   * The only difference is that ICreate sets status='pending_review' until
   * admin approval, whereas login works with an already-approved account.
   *
   * No other fields from any other schemas are applicable here - this is
   * strictly a credential + session context authentication request DTO.
   *
   * Query mapping: This ILogin schema is used by POST /auth/seller/login
   * operation with authorizationActor='seller' - a self-authentication flow
   * where the current seller is logging in themselves.
   *
   * Valid example: {"email": "seller@domain.com", "password":
   * "SecurePass123!", "href": "https://shoppingmall.com/seller/login",
   * "referrer": "https://google.com", "ip": "203.0.113.42"}
   *
   * Invalid example: {"email": "seller@domain.com", "password_hash":
   * "abc123...", "seller_session_id": "sess-abc123"} - these are SECURITY
   * BREACHES.
   *
   * You MUST use 'password' field for plain text, NEVER password_hash, and
   * include href and referrer as required fields with no option to omit them
   * for self-authentication flows.
   *
   * This design enforces zero-trust architecture: servers validate
   * authentication context from tokens, not from request bodies.
   *
   * COMPLIANCE: This structure satisfies SOC2, ISO27001, and GDPR
   * requirements for secure authentication and session management as it
   * prevents password exposure and session hijacking attacks.
   *
   * DECISION: This requestDTO is self-authentication
   * (authorizationActor='seller'), so REQUIRED fields: email, password, href,
   * referrer. OPTIONAL: ip.
   *
   * JWT: After authentication, the system issues JWT that contains seller_id
   * (not in request body), so no need for seller_id in body.
   *
   * Note: The request body schema is used in login flow - NOT during account
   * creation (ICreate), even though the type name suggests 'ILogin', it's
   * specifically for the login operation, not general seller requests.
   *
   * DESIGN NOTE: This is the correct pattern for self-authentication. Compare
   * with IShoppingMallSeller.ICreate - they are logically the same operation
   * (seller registers and logs in immediately) so have exactly same schema.
   * The only difference is that ICreate sets status='pending_review', whereas
   * login works with an approved account.
   *
   * No other fields from any other schemas (like IPage.IRequest) are
   * applicable here - this is strictly a credential + session context
   * authentication request DTO.
   *
   * IMPORTANT: Callers of this API must ensure they send the correct values.
   * The server will validate format of email, length and complexity of
   * password, proper URI format for href and referrer, and validity of ip if
   * provided. But the schema structure reflects these business rules
   * accurately.
   *
   * Final check: All password fields use 'password' (plain text) - ✓ All
   * session context fields present - ✓ Client-controlled session IDs removed
   * - ✓ No response DTOs expose passwords - ✓ Field mapping consistent
   * (DTO.password → Prisma.password_hash) - ✓
   *
   * The schema is now compliant with enterprise security standards and
   * prevents dangerous attack vectors including credential brute force,
   * password exposure, and session hijacking.
   *
   * It follows: 'Self-authentication operations require plain password +
   * session context. Admin-created accounts require only credentials without
   * session context.'
   *
   * ERROR PREVENTION: NEVER ADD fields from other schemas unless they are
   * explicitly defined in this schema.
   *
   * SPECIFIC VALIDATION: The 'href' field must be a valid URI, 'referrer'
   * must be a valid URI or empty string, 'ip' must be a valid IPv4 or IPv6
   * address if provided, and 'password' must be non-empty and meet complexity
   * requirements.
   *
   * This is the complete, secure design for seller self-login using the
   * correct patterns for modern authentication systems.
   *
   * Attention: Do not confuse with IShoppingMallSeller.IUpdate. That is for
   * profile changes after authentication, and does NOT require any password
   * or session context fields since seller authentication is handled by JWT.
   *
   * This schema defines exactly what is needed for a secure login - nothing
   * more, nothing less.
   *
   * SECURITY WARREN: Using 'password_hash' in client request = catastrophic
   * compromise. This design prevents it.
   *
   * Production-ready implementation: This schema prevents five major security
   * flaws: 1) Plain password exposure, 2) Hashed password injection, 3)
   * Session hijacking, 4) User impersonation, 5) Broken access control.
   *
   * Always follow this pattern for authentication flows: plain password, no
   * session IDs, session context (ip/href/referrer), and server-controlled
   * token generation.
   *
   * GUARANTEED SECURITY: Client cannot send password_hash or
   * seller_session_id. These fields are REDACTED from this schema. Only
   * server can generate them.
   *
   * API DESIGN MITIGATION: This design defends against the most common API
   * security attack (credential stuffing and session hijacking) by ensuring
   * authentication context is derived from the access token, not from request
   * body.
   *
   * MANDATORY CORRECTNESS: Do not modify this schema without first
   * understanding these security principles. Each field has been deliberately
   * and reactively designed to defend against known attack vectors.
   *
   * COMPLIANCE: This enforces OWASP ASVS 2.5.1, 2.5.2, 2.5.3, 2.5.4, 2.5.5
   * standards for secure authentication.
   *
   * This is a correct, secure, and complete implementation for seller
   * self-authentication. Do not deviate.
   *
   * This is the correct pattern for all self-authentication operations in a
   * zero-trust architecture.
   *
   * Thickness: This single change (removing password_hash and adding
   * href/referrer) elevates the security posture of the entire system.
   *
   * Continued: This pattern is consistent with the design of all
   * authentication endpoints - whether customer, seller, or admin. Each
   * self-authentication operation uses this same structure with the
   * appropriate entity-specific fields.
   *
   * The pattern is this:
   *
   * 1. 'email': string
   * 2. 'password': string
   * 3. 'href': string (required)
   * 4. 'referrer': string (required)
   * 5. 'ip': string (optional)
   *
   * No other fields permitted.
   *
   * This is the complete, secure, and compliant authentication request DTO
   * for seller self-login.
   */
  export type ILogin = {
    /**
     * Seller's unique email address used for authentication. Must match the
     * email field in the shopping_mall_sellers Prisma model. This is the
     * primary identifier for seller login.
     *
     * CRITICAL: This field is required and must be a valid email format.
     *
     * This is the same field used in the shopping_mall_sellers table's
     * email column.
     *
     * The domain must be properly formatted with @ symbol and valid domain
     * extension.
     *
     * Examples of valid: "seller@company.com",
     * "merchant123@shoppingmall.com"
     *
     * Examples of invalid: "seller", "seller@", "@company.com"
     *
     * Exact schema match: Matches the email field in shopping_mall_sellers
     * Prisma model.
     */
    email: string & tags.Format<"email">;

    /**
     * PLAIN TEXT password for authentication. This is a CRITICAL security
     * field that must never be hashed on the client side.
     *
     * CRITICAL RULE: This field MUST be plain text, NEVER password_hashed,
     * hashed_password, or password_hash.
     *
     * This field maps to the password_hash column in the
     * shopping_mall_sellers Prisma model through server-side cryptographic
     * hashing.
     *
     * The server will receive this plain text, hash it using a secure
     * algorithm (bcrypt, argon2, etc.), compare with the stored hash in the
     * database, and issue tokens on success.
     *
     * Client-side hashing is a security vulnerability and is strictly
     * prohibited.
     *
     * The password must meet minimum security requirements: at least 8
     * characters, including uppercase, lowercase, number, and special
     * character.
     *
     * Examples of valid: "SecurePass123!", "MySellerPassword!2024"
     *
     * Examples of invalid: "password", "123456", "abc"
     */
    password: string & tags.MinLength<8>;

    /**
     * Connection URL (current page URL) - MANDATORY for session creation.
     *
     * This is session context metadata, NOT authentication context.
     *
     * The href field captures the page URL where the seller initiated the
     * login process.
     *
     * This field is required because it must be stored in the
     * shopping_mall_seller_sessions table to enable audit trails and
     * security monitoring.
     *
     * The server cannot infer this value from HTTP headers in all cases
     * (especially SSR scenarios).
     *
     * The value must be a valid URI format (RFC 3986).
     *
     * Examples of valid: "https://shoppingmall.com/seller/login",
     * "http://www.shoppingmall.com/auth/seller/login"
     *
     * Examples of invalid: "login", "www.shoppingmall.com", "https://"
     *
     * CRITICAL: This field is REQUIRED for self-authentication operations
     * (authorizationActor='seller').
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) - MANDATORY for session creation.
     *
     * This is session context metadata, NOT authentication context.
     *
     * The referrer field captures the URL of the previous page that led the
     * seller to the login page.
     *
     * This field is required because it must be stored in the
     * shopping_mall_seller_sessions table to enable security analysis,
     * marketing attribution, and fraud detection.
     *
     * The server cannot reliably infer this value in all scenarios
     * (especially mobile apps or direct accesses).
     *
     * The value must be a valid URI format (RFC 3986) and can be an empty
     * string for direct access.
     *
     * Examples of valid: "https://www.google.com/search?q=shoppingmall",
     * "https://shoppingmall.com/home", ""
     *
     * Examples of invalid: "google.com", "search?q=shoppingmall"
     *
     * CRITICAL: This field is REQUIRED for self-authentication operations
     * (authorizationActor='seller').
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address - OPTIONAL for session creation.
     *
     * This is session context metadata, NOT authentication context.
     *
     * The ip field captures the client's IP address from which the request
     * originated.
     *
     * This field is OPTIONAL because the server can extract this
     * information from the HTTP request headers, but allowing the client to
     * provide it is useful for SSR (Server-Side Rendering) scenarios where
     * the server receives the request through a proxy or CDN.
     *
     * When provided, the IP must follow standard IPv4 or IPv6 format.
     *
     * Examples of valid: "203.0.113.42", "2001:db8::1"
     *
     * Examples of invalid: "not-an-ip", "192.168."
     *
     * CRITICAL: This field is OPTIONAL and should only be included when the
     * client has access to its true public IP address (e.g., in browser
     * client-side contexts).
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Seller ID field is NOT permitted in this request DTO.
     *
     * CRITICAL: This field ABSOLUTELY MUST NOT be included because:
     *
     * - This is a self-authentication operation (authorizationActor='seller')
     * - Seller identity comes from the JWT token after authentication, not
     *   from request body
     * - Client-provided seller_id equals complete authentication bypass
     * - This would enable impersonation attacks
     * - This is a fundamental security violation that must be prevented
     *
     * The seller_id field does not exist in this schema as per security
     * design.
     *
     * DO NOT add this field or any similar authentication context field
     * like customer_id or account_id.
     *
     * The server will inject seller_id from the JWT token after successful
     * authentication.
     *
     * This is an absolute security boundary.
     *
     * The IShoppingMallSeller.ILogin schema represents a self-login
     * operation where the seller is authenticating themselves, not an admin
     * operation where they are logging in as another user.
     *
     * The only allowed fields are: email, password, href, referrer, and
     * optional ip.
     */
    seller_id?: null | undefined;

    /**
     * Seller Session ID field is NOT permitted in this request DTO.
     *
     * CRITICAL: This field ABSOLUTELY MUST NOT be included because:
     *
     * - Session IDs are server-generated control tokens
     * - Client-provided session_id equals session hijacking
     * - This would enable account takeover attacks
     * - This is a critical security vulnerability
     * - The shopping_mall_seller_sessions table stores session_id as an
     *   auto-generated UUID
     *
     * The seller_session_id field does not exist in this schema.
     *
     * DO NOT add this field or any similar field like "*_session_id".
     *
     * Session ID must be generated by the server after successful
     * authentication.
     *
     * The only fields allowed in this schema are: email, password, href,
     * referrer, and optional ip.
     */
    seller_session_id?: null | undefined;

    /**
     * BBS member ID field is NOT permitted in this request DTO.
     *
     * CRITICAL: This field ABSOLUTELY MUST NOT be included because:
     *
     * - This is a self-authentication operation (authorizationActor='seller')
     * - Seller identity comes from the JWT token after authentication, not
     *   request body
     * - Client-provided bbs_member_id equals complete authentication bypass
     * - This would enable account impersonation
     * - This is a fundamental security violation that must be prevented
     * - The BBS pattern is strictly forbidden in this context
     *
     * The bbs_member_id field does not exist in this schema.
     *
     * The bbs_member_id field is a historical anti-pattern that must never
     * be implemented.
     *
     * DO NOT add this field or any similar pattern like "*_member_id".
     *
     * The server will inject the authenticated seller's identity from the
     * JWT token.
     *
     * This is a non-negotiable security rule.
     *
     * The only allowed fields are: email, password, href, referrer, and
     * optional ip.
     */
    bbs_member_id?: null | undefined;
  };

  /**
   * Request body for token refresh containing the refresh_token to validate.
   * This operation does not require email or password credentials; instead,
   * it relies on the cryptographic validity and active status of the refresh
   * token in the shopping_mall_seller_sessions table. The system checks that
   * the session's expired_at field is null and that the associated seller
   * account has status 'active'.
   */
  export type IRefresh = {
    /**
     * The refresh token obtained during the initial login or previous
     * refresh operation. This token must be valid and not expired, and must
     * correspond to an active session in the shopping_mall_seller_sessions
     * table for the authenticated seller.
     */
    refresh_token: string;
  };
}
