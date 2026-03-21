import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IMultiUserTodoGuest {
  /**
   * Request body containing the refresh token for guest session renewal.
   *
   * This DTO is used by the guest refresh token endpoint to submit a valid refresh token for session renewal. The refresh token is a JWT string that was previously issued during guest registration. The backend validates this token against stored sessions and issues new access credentials if the token is valid and not expired.
   */
  export type IRefresh = {
    /**
     * JWT refresh token string issued during guest registration for session renewal.
     *
     * @x-autobe-specification The refresh token JWT string is not stored directly in the database. Instead, it contains an encoded session identifier used to look up the corresponding record in multi_user_todo_guest_sessions table. Validation process: 1) Extract session ID from JWT claims, 2) Look up session by ID in multi_user_todo_guest_sessions, 3) Verify session exists and is not expired (expired_at > current timestamp), 4) Verify associated guest in multi_user_todo_guests is not soft-deleted (deleted_at IS NULL).
     */
    refresh_token: string & tags.Format<"password">;
  };

  /**
   * Request body for guest user registration with device identifier and session context. Used by unauthenticated visitors to create a guest account identified by their device. The device_id uniquely identifies the guest device for session continuity before registration or login.
   */
  export type IJoin = {
    /**
     * Unique device identifier used to track anonymous guest users. Must be a valid UUID format that uniquely identifies the user's device. This is the primary identifier for guest accounts, allowing the system to maintain session continuity for unauthenticated visitors.
     *
     * @x-autobe-database-schema-property device_id
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.device_id. User-provided identifier for the guest device. Unique constraint ensures no duplicate guest accounts for the same device.
     */
    device_id: string & tags.Format<"uuid">;

    /**
     * The URL path of the request for session tracking. Indicates which page or endpoint the guest was accessing when initiating the session. Used for analytics and security audit purposes.
     *
     * @x-autobe-specification Captured from HTTP request headers. Not stored as a direct DB column. Stored in multi_user_todo_guest_sessions.href for session tracking context.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer header value indicating the previous page the guest visited. Used for analytics to understand traffic sources and for security audit logging.
     *
     * @x-autobe-specification Captured from HTTP request headers. Not stored as a direct DB column. Stored in multi_user_todo_guest_sessions.referrer for session tracking context.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for session tracking. Optional field that defaults to server-detected IP in SSR environments where the client cannot reliably provide its own IP address. Used for security and analytics purposes.
     *
     * @x-autobe-specification Captured from HTTP request headers or server-side detection as fallback. Not stored as a direct DB column. Stored in multi_user_todo_guest_sessions.ip for session tracking. In SSR, body.ip is optional and defaults to server-detected IP.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Authorization response containing guest user ID and authentication tokens for API access.
   *
   * This response type is returned after successful guest registration or token refresh. It includes the guest's unique identifier and JWT tokens for subsequent API authentication. The access token is used for API authorization, while the refresh token allows token renewal without re-registration.
   *
   * The token expiration timestamp indicates when the access token will expire, allowing clients to proactively refresh before authentication failures occur.
   */
  export type IAuthorized = {
    /**
     * JWT access token for API authentication. Include this token in the Authorization header as 'Bearer {access}' for authenticated requests.
     *
     * @x-autobe-specification Computed JWT access token generated server-side. Contains guest ID (sub claim) with short expiry (15-30 min). Signed with server secret, validated on each authenticated request.
     */
    access: string;

    /**
     * ISO 8601 timestamp indicating when the access token expires. Clients should use the refresh token to obtain a new access token after this time.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from multi_user_todo_guest_sessions.expired_at. Indicates when the refresh token/session expires.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Unique identifier of the guest user. This is the primary key from the multi_user_todo_guests table, used for identifying the guest in API requests and database operations.
     *
     * @x-autobe-database-schema-property multi_user_todo_guest_id
     * @x-autobe-specification Direct mapping from multi_user_todo_guest_sessions.multi_user_todo_guest_id. Returns the guest's UUID for API authorization.
     */
    id: string & tags.Format<"uuid">;

    /**
     * JWT refresh token for obtaining new access tokens. Use this token with the refresh endpoint to get a new access token without re-authentication.
     *
     * @x-autobe-specification Computed JWT refresh token generated server-side. Stored in multi_user_todo_guest_sessions for session continuity. Contains guest ID with longer expiry (7-30 days). Used for token renewal via /refresh endpoint.
     */
    refresh: string;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };
}
