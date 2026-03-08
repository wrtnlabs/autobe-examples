import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Request body for refreshing expired JWT access and refresh tokens for an authenticated guest user session.
   *
   * This DTO is used by guest users to renew their authentication tokens without re-registering. The refresh_token must be a valid JWT previously issued by the join or refresh endpoint. Upon successful validation, the server returns new access and refresh tokens along with guest account information, enabling session continuity across multiple requests.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for session renewal. Must be the exact token value returned from a previous join or refresh operation. This token authenticates the guest user without requiring device fingerprint re-submission.
     *
     * @x-autobe-specification JWT refresh token from previous join or refresh response. Contains guest_id and actor_type claims. Backend validates: signature, expiration, guest account existence (deleted_at IS NULL), and session validity (expired_at > NOW). Token is opaque to client - just pass through from previous response.
     */
    refresh_token: string;
  };

  /**
   * Request body for registering a new guest user account identified by device fingerprint for anonymous access to the todo application.
   *
   * This DTO represents the information required to create a temporary guest account that allows unauthenticated users to access the system without email/password registration. The guest is uniquely identified by their device fingerprint, which serves as the primary identifier for session persistence and data ownership.
   *
   * The device fingerprint must be unique across all guest accounts. If a guest with the same fingerprint already exists, the API returns a 409 Conflict error to prevent duplicate guest accounts from the same device.
   *
   * Session context fields (href, referrer, ip) are captured for security auditing and connection metadata tracking. These fields help trace the origin of the guest registration and support security analysis.
   */
  export type IJoin = {
    /**
     * Unique device fingerprint identifying the guest device. Used for guest identification and session association. Must be unique across all guest accounts.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from todo_app_guests.device_fingerprint. Unique constraint enforced at database level. Must be provided and non-empty.
     */
    device_fingerprint: string & tags.MinLength<1>;

    /**
     * Current URL of the client browser. Captured from request headers for session tracking and security auditing.
     *
     * @x-autobe-specification Captured from HTTP request Referer header or current URL. Stored in todo_app_guest_sessions.href, not todo_app_guests. Used for session tracking and security auditing.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL of the client browser. Captured from request headers for session tracking and security auditing.
     *
     * @x-autobe-specification Captured from HTTP request Referer header. Stored in todo_app_guest_sessions.referrer, not todo_app_guests. Used for session tracking and security auditing.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address in IPv4 format. Optional field, primarily used for SSR (Server-Side Rendering) cases where IP may not be available.
     *
     * @x-autobe-specification Captured from client connection IP address. Stored in todo_app_guest_sessions.ip, not todo_app_guests. Optional field primarily used for SSR (Server-Side Rendering) cases where IP may not be available. Client may omit this field and server will capture IP from connection.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Authorized response containing guest account identifier and JWT authentication tokens for subsequent API requests. The guest id uniquely identifies the guest account, while the token object provides the credentials needed to authenticate future requests to the API.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_guests.id. UUID primary key identifying the guest account.
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
