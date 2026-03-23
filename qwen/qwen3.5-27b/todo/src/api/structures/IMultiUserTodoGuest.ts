import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IMultiUserTodoGuest {
  /**
   * Request body for guest registration. Creates a new guest account identified by a unique device token for unauthenticated visitors. Includes session context information (href, referrer, ip) for security auditing and session management. Unlike member registration, no email or password credentials are required.
   */
  export type IJoin = {
    /**
     * Unique device token identifying the guest user. Generated automatically on first visit or provided by client, used for anonymous session tracking before registration.
     *
     * @x-autobe-database-schema-property device_token
     * @x-autobe-specification Direct mapping to multi_user_todo_guests.device_token column. Unique constraint enforced at database level. If guest with same device_token already exists and is not deleted, return existing guest's tokens instead of creating new account.
     */
    device_token: string;

    /**
     * URL of the application page where the guest registration originated. Used for session tracking and security auditing purposes.
     *
     * @x-autobe-specification Extracted from HTTP request headers (Origin or Referer). Stored in multi_user_todo_guest_sessions.href when session is created. Required field - must be present in all requests.
     */
    href: string & tags.Format<"uri">;

    /**
     * URL of the referring page that directed the user to the application. Optional field used for analytics and session tracking.
     *
     * @x-autobe-specification Extracted from HTTP Referer header. Stored in multi_user_todo_guest_sessions.referrer when session is created. Nullable - may not be present if direct navigation or privacy settings block referrer.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * IP address of the client device. Optional field - if not provided by client, server will capture it automatically. Used for security auditing and session management.
     *
     * @x-autobe-specification Extracted from HTTP request headers (X-Forwarded-For, CF-Connecting-IP, or remote address). Stored in multi_user_todo_guest_sessions.ip when session is created. Optional in request - server will capture IP as fallback if not provided (SSR scenario).
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Guest account authentication response containing the guest identifier and JWT tokens for session management. Returned after successful guest registration or token refresh operations.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.id. Unique UUID identifying the guest account.
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
   * Request body for refreshing guest authentication tokens. Contains the refresh token that will be validated to renew the guest's session without requiring re-authentication. The refresh token is a JWT that encodes the guest identity and session information.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for session renewal. This token is used to obtain new access tokens without re-authentication. Must be a valid, non-expired refresh token from a previous guest authentication response.
     *
     * @x-autobe-specification JWT refresh token string provided by client. Decode to extract guest_id and session_id claims. Validate against: 1) guest exists in multi_user_todo_guests (deleted_at=null), 2) session exists in multi_user_todo_guest_sessions with valid expired_at timestamp, 3) token signature is valid. On validation success, session expired_at is extended and new access/refresh tokens are generated.
     */
    refresh_token: string;
  };
}
