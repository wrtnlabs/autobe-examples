import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCloneGuest {
  /**
   * Request body for guest session creation with device and connection information.
   */
  export type IJoin = {
    session_token: string & tags.Format<"uuid">;
    device_id: string & tags.Format<"uuid">;
    ip: string & tags.Format<"ipv4">;

    /**
     * HTTP referrer header for traffic tracking. Optional.
     *
     * @x-autobe-specification HTTP referrer header from client request. Maps to nullable guest_sessions.referrer column.
     */
    referrer?: string | null | undefined;
  };

  /**
   * Guest session authentication response containing session token, device identifier, expiration timestamp, and full authorization token information with access and refresh token pair.
   */
  export type IAuthorized = {
    /**
     * Unique session token for guest authentication. Used to identify and authenticate the guest session.
     *
     * @x-autobe-database-schema-property session_token
     * @x-autobe-specification Direct mapping from guest_sessions.session_token. Unique UUID string for guest authentication.
     */
    session_token: string;

    /**
     * Device identifier from client for security tracking. Helps identify and track guest sessions by device.
     *
     * @x-autobe-database-schema-property device_id
     * @x-autobe-specification Direct mapping from guest_sessions.device_id. Client device identifier for security tracking.
     */
    device_id: string & tags.Format<"uuid">;

    /**
     * Session expiration timestamp in ISO 8601 format. Indicates when the guest session will expire.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from guest_sessions.expired_at. Session expiration timestamp in ISO 8601 format.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Unique session token for guest authentication. Used to identify and validate the guest session being refreshed.
   */
  export type IRefresh = {
    /**
     * Unique session token for guest authentication. Used to identify and validate the guest session being refreshed.
     *
     * @x-autobe-specification Direct mapping from reddit_clone_guest_sessions.session_token. Used for validating existing session during refresh operation.
     * @x-autobe-database-schema-property session_token
     */
    session_token: string & tags.Format<"uuid">;
  };
}
