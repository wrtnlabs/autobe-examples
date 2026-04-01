import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IMultiUserTodoGuest {
  /**
   * Request body for refreshing a guest access token using a valid refresh token. Submit the refresh token received from a previous registration or refresh operation. The server validates the token and returns a new token pair if the guest session is still active.
   */
  export type IRefresh = {
    /**
     * Valid refresh token obtained from a previous guest registration or token refresh operation. This token is used to request a new access token without re-registering. Must be included in the request body as a plain string.
     *
     * @x-autobe-specification JWT refresh token string from previous auth response. Server validates signature, checks expiration against guest_sessions.expired_at, verifies associated guest account is active (deleted_at is null). Token contains encoded session_id claim used to lookup session in multi_user_todo_guest_sessions table.
     */
    refresh_token: string;
  };

  /**
   * Guest authorization response containing guest ID and JWT tokens for session access. Returned after successful guest registration or token refresh operations.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.id. UUID format.
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
   * Request body for registering a new guest account using device fingerprint for anonymous access. The device fingerprint serves as a unique identifier for tracking anonymous users across sessions. Session context (href, referrer, ip) is recorded for security auditing.
   */
  export type IJoin = {
    /**
     * Unique identifier for the guest's device used for anonymous access tracking.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.device_fingerprint. Unique constraint enforced at DB level. Validate non-empty string.
     */
    device_fingerprint: string;

    /**
     * The URL of the page where the guest registration was initiated.
     *
     * @x-autobe-specification Captured from HTTP request (current page URL). Stored in multi_user_todo_guest_sessions for audit tracking, not in guests table. Required field.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referring URL that navigated the user to the registration page.
     *
     * @x-autobe-specification Captured from HTTP Referer header. Stored in multi_user_todo_guest_sessions for audit tracking, not in guests table. Required field.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * The client's IP address at registration time. Used for security auditing.
     *
     * @x-autobe-specification Captured from HTTP request (X-Forwarded-For or remote address). Stored in multi_user_todo_guest_sessions for audit tracking, not in guests table. Optional field - server may capture as fallback. Format: IPv4 address.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Summary view of a guest account with essential identification and timestamp information. Used in session listings to show associated guest details.
   */
  export type ISummary = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.id. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique identifier for the guest's device used for anonymous access tracking.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.device_fingerprint. Unique constraint on this field.
     */
    device_fingerprint: string;

    /**
     * Timestamp when the guest account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.created_at. ISO 8601 date-time format.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the guest account was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.updated_at. ISO 8601 date-time format.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the guest account was soft deleted. Null if the account is active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.deleted_at. Nullable - null if active, ISO 8601 date-time if soft deleted.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
