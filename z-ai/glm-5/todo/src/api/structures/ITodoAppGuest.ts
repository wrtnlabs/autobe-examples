import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Authorization response containing authentication tokens and member identifier. Returned after successful guest authentication operations including registration and token refresh. The access token should be used in Authorization header for subsequent API requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated member account
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Registration credentials and session context for creating a new member account. Contains email (unique identifier), password (securely hashed before storage), and session tracking information (href, referrer, optional IP) for security analytics.
   */
  export type IJoin = {
    /**
     * Email address for the new member account. Serves as the unique account identifier for authentication.
     *
     * @x-autobe-specification Validates email format and uniqueness against todo_app_members.email. On duplicate, returns generic error to prevent email enumeration attacks. Maps to the email column of the newly created member record.
     */
    email: string & tags.Format<"email">;

    /**
     * Password for the new member account. Transmitted in plain text and securely hashed by the server before storage.
     *
     * @x-autobe-specification Validates password meets minimum length and complexity requirements. Hashed using bcrypt or argon2 before storage. Maps to todo_app_members.hashed_password column. Plain text password is never stored.
     */
    password: string & tags.Format<"password">;

    /**
     * The URL where the registration request originated. Used for session tracking and security analytics.
     *
     * @x-autobe-specification Captures the registration page URL for security tracking and analytics. Maps to todo_app_guest_sessions.href column. Required field for session record creation.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referrer URL that led to the registration page. Used for session tracking and security analytics.
     *
     * @x-autobe-specification Captures the referring URL that led to the registration page for security tracking and analytics. Maps to todo_app_guest_sessions.referrer column. Required field for session record creation.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for session tracking. Optional - if not provided, the server captures the actual client IP automatically.
     *
     * @x-autobe-specification Optional IP address field. SSR clients cannot know their own IP, so server captures actual client IP as fallback if body.ip is null. Maps to todo_app_guest_sessions.ip column. Format: IPv4 address string or null.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Request body for refreshing guest authentication tokens. Contains the refresh token and session context information needed to obtain new access tokens. The refresh token must be valid, not expired, and associated with an active session. Session context fields are used for security auditing and fraud detection.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for obtaining new access tokens.
     *
     * @x-autobe-specification JWT refresh token string. Used to look up and validate the associated session in todo_app_guest_sessions table. The token signature is verified cryptographically using the server's secret key, then the session record is retrieved by token identifier and validated for expiration and active status. Tokens that pass validation trigger generation of new access and refresh tokens.
     */
    refreshToken: string;

    /**
     * Current page URL where the refresh request originated.
     *
     * @x-autobe-specification Current page URL collected from the client-side request context (typically window.location.href). Stored in session logs and audit records for security monitoring and fraud detection. Used to track where refresh requests originated and identify suspicious patterns.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referring page URL for the refresh request.
     *
     * @x-autobe-specification HTTP Referer header value collected from the request context. Stored in session logs and audit records for security monitoring and fraud detection. Helps identify navigation patterns and detect potential session hijacking or unauthorized access attempts.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for security logging, optional in SSR cases.
     *
     * @x-autobe-specification Client IP address for security logging and audit trail. Optional because in SSR (Server Side Rendering) environments, the client cannot determine its own IP address. When null or not provided, the backend captures the IP from the incoming HTTP request. Stored in session records for security monitoring, geolocation tracking, and fraud detection. Format must be IPv4 address when provided.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };
}
