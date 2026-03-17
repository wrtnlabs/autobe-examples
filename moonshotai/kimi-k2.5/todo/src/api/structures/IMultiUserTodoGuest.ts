import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IMultiUserTodoGuest {
  /**
   * Request body for refreshing a guest session token. Contains the refresh token obtained during initial guest creation to exchange for a new access token.
   */
  export type IRefresh = {
    /**
     * The refresh token obtained during initial guest creation, used to request a new access token without re-authentication.
     *
     * @x-autobe-specification Client-provided refresh token value that must match an active session in multi_user_todo_guest_sessions. Server validates by querying the sessions table where refresh_token equals the provided value and expired_at is in the future.
     */
    refreshToken: string;
  };

  /**
   * Request body for creating a temporary guest identity. Contains optional device identifier and required session context (URL, referrer, IP) for security tracking and audit purposes.
   */
  export type IJoin = {
    /**
     * Optional unique device identifier for guest recognition. When not provided, the server automatically generates a UUIDv4.
     *
     * @x-autobe-database-schema-property device_id
     * @x-autobe-specification Maps to multi_user_todo_guests.device_id. Optional - server generates UUIDv4 when not provided. Used to recognize returning guests across sessions.
     */
    device_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Current page URL for session tracking and security audit purposes.
     *
     * @x-autobe-specification Captured in multi_user_todo_guest_sessions.href. The current page URL where the guest is joining from. Required for session audit trail.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL for session tracking and security audit purposes.
     *
     * @x-autobe-specification Captured in multi_user_todo_guest_sessions.referrer. The referring URL that led the guest to the current page. Required for session audit trail.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for security audit. Optional in request as server can extract from connection in SSR scenarios.
     *
     * @x-autobe-specification Captured in multi_user_todo_guest_sessions.ip. Client IP address for audit. Optional in request (null allowed) because in SSR scenarios the client cannot know its own IP - server falls back to extracting from connection.
     */
    ip: (string & tags.Format<"ipv4">) | null;
  };

  /**
   * Authentication response containing guest identity and access tokens issued upon successful authentication.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the guest account extracted from authentication token.
     *
     * @x-autobe-specification Computed from JWT token claims containing multi_user_todo_guests.id. The guest UUID is extracted from the authenticated token's subject claim. Not a direct database column mapping because this DTO is constructed from token validation results, not a database query.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };
}
