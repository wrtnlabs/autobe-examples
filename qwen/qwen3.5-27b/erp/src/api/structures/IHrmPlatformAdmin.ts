import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IHrmPlatformAdmin {
  /**
   * Request body for refreshing administrator authentication tokens. This DTO contains the refresh token that the administrator client sends to obtain new access and refresh tokens without re-entering credentials. The refresh token is validated by verifying its cryptographic signature, checking its expiration time, and extracting the administrator identity from its claims. Upon successful validation, the system generates new JWT tokens with updated expiration timestamps.
   */
  export type IRefresh = {
    /**
     * Long-lived refresh token for obtaining new access tokens without re-authentication.
     *
     * @x-autobe-specification JWT refresh token string. Service layer must: 1) Validate cryptographic signature using server secret key, 2) Check exp claim for expiration time, 3) Extract sub claim for admin ID, 4) Verify admin record exists and is not soft-deleted. This token is NOT stored in database - it's a JWT string passed by client.
     */
    refresh_token: string;
  };

  /**
   * Authorization response containing administrator identity and JWT tokens for accessing protected API endpoints. This response is returned after successful administrator registration, login, or token refresh operations. It includes the administrator's unique identifier, email address, account creation timestamp, and authorization tokens (access token, refresh token, and their expiration timestamps) for authenticating subsequent API requests.
   */
  export type IAuthorized = {
    /**
     * Unique administrator identifier.
     *
     * @x-autobe-specification Administrator's unique identifier from hrm_platform_admins.id. Retrieved from the authenticated admin record during join/login/refresh operations.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator's email address used for authentication.
     *
     * @x-autobe-specification Administrator's email address from hrm_platform_admins.email. Retrieved from the authenticated admin record during join/login/refresh operations.
     */
    email: string & tags.Format<"email">;

    /**
     * Timestamp when the administrator account was created.
     *
     * @x-autobe-specification Account creation timestamp from hrm_platform_admins.created_at. Retrieved from the authenticated admin record during join/login/refresh operations.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for administrator login authentication. Contains email address and password credentials along with session context information for security auditing. The email must match an existing administrator account, and the password is validated against the stored BCrypt hash. Session context (href, referrer, ip) is recorded for login tracking and suspicious activity detection.
   */
  export type ILogin = {
    /**
     * Administrator's unique email address used for authentication. This email must match an existing administrator account in the system.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from hrm_platform_admins.email. Used as the primary lookup key for finding the administrator record. Must be a valid email format and match an existing non-deleted admin account.
     */
    email: string & tags.Format<"email">;

    /**
     * Administrator's password for authentication. This is validated against the BCrypt-hashed password stored in the database.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to hrm_platform_admins.password_hash. Backend performs BCrypt verification by comparing the provided plaintext password against the stored hash. Use constant-time comparison to prevent timing attacks.
     */
    password: string & tags.Format<"password">;

    /**
     * URL of the page where the administrator initiated the login. Captured for security auditing and session tracking purposes.
     *
     * @x-autobe-specification Session context field captured from client request. Stored in hrm_platform_admin_sessions.href for audit trail. Represents the URL where the administrator accessed the login page. Used for security analysis and suspicious login detection.
     */
    href: string & tags.Format<"uri">;

    /**
     * URL of the page that referred the administrator to the login page. Captured for security auditing and access pattern analysis.
     *
     * @x-autobe-specification Session context field captured from client request. Stored in hrm_platform_admin_sessions.referrer for audit trail. Represents the referring URL that directed the administrator to the login page. Used for security analysis and access pattern tracking.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * IP address of the client initiating the login. Optional field as the server can capture this automatically. Used for security auditing and detecting suspicious login attempts from unusual locations.
     *
     * @x-autobe-specification Session context field captured from client request or server-side fallback. Stored in hrm_platform_admin_sessions.ip for audit trail. Optional in request because SSR (Server Side Rendering) clients cannot know their own IP - server captures it as fallback (body.ip ?? serverIp). Used for security analysis, geolocation tracking, and suspicious login detection.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for creating a new administrator account in the HRM Platform. Administrators are system users with elevated privileges who can manage platform-wide settings, view all organizations, and handle support requests. The email must be unique across all administrator accounts. The password is securely hashed using BCrypt before storage. Session context (href, referrer, ip) is collected for security auditing and initial session creation.
   */
  export type IJoin = {
    /**
     * Administrator's unique email address used for authentication and identification. Must not be already registered in the system.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping to hrm_platform_admins.email column. Must be unique across all administrator accounts. Validated against @@unique constraint. Used as primary authentication identifier.
     */
    email: string & tags.Format<"email">;

    /**
     * Administrator's password for authentication. Will be securely hashed using BCrypt algorithm before storage in the database.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to hrm_platform_admins.password_hash column. Password is hashed using BCrypt algorithm before storage. Minimum length and complexity requirements should be enforced at validation layer. Never stored or transmitted in plain text.
     */
    password: string & tags.Format<"password">;

    /**
     * URL of the page where the administrator registration form was accessed. Used for security auditing and session initialization.
     *
     * @x-autobe-specification Session context field stored in hrm_platform_admin_sessions.href column during join flow, not in hrm_platform_admins. Captures the URL where the registration form was accessed. Used for security auditing and session tracking.
     */
    href: string & tags.Format<"uri">;

    /**
     * URL of the referring page that directed the user to the registration form. Used for security auditing and traffic source tracking.
     *
     * @x-autobe-specification Session context field stored in hrm_platform_admin_sessions.referrer column during join flow, not in hrm_platform_admins. Captures the referring URL that led to the registration page. Used for security auditing and analytics.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * IP address of the client making the registration request. Optional - will be captured from server request if not provided by client (e.g., in SSR scenarios). Used for security auditing.
     *
     * @x-autobe-specification Session context field stored in hrm_platform_admin_sessions.ip column during join flow, not in hrm_platform_admins. Optional field - in SSR (Server Side Rendering) scenarios, client cannot know its own IP, so server captures it as fallback (body.ip ?? serverIp). Used for security auditing and geolocation tracking.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
