import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IHrmPlatformGuest {
  /**
   * Request body for refreshing guest authentication tokens. Contains the refresh token that was previously issued to the guest during session creation or a prior refresh operation. This token is validated server-side to verify the guest session's authenticity and extend the access period without requiring re-authentication.
   */
  export type IRefresh = {
    /**
     * Long-lived refresh token for obtaining new access tokens. Use this token to request new access tokens when the current access token expires, allowing session continuation without re-authentication. This token was previously issued during guest registration or a prior token refresh operation.
     *
     * @x-autobe-specification JWT refresh token string previously issued during guest join (POST /hrmPlatform/auth/guest/join) or prior refresh operation. Server extracts this from request body and validates against hrm_platform_guest_sessions table to verify session authenticity, check expiration (expired_at timestamp), and determine if new tokens should be generated. This is a computed authentication token, not a database column.
     */
    refresh_token: string;
  };

  /**
   * Request body for guest registration or session retrieval based on device fingerprint. Guests are unauthenticated visitors identified by their device fingerprint rather than persistent credentials. This operation either creates a new guest record or reuses an existing one if the same device fingerprint already exists and hasn't been deleted.
   *
   * The device_fingerprint uniquely identifies the guest across sessions. The ip_address is used for security monitoring and access pattern analysis. The user_agent string provides device and browser identification for security purposes.
   *
   * Session context fields (href, referrer, ip) track the connection metadata for the guest session. The href indicates the current page URL, referrer shows the source page that led to this access, and ip provides the client IP address (optional for server-side rendering scenarios where the server determines the IP).
   */
  export type IJoin = {
    /**
     * @x-autobe-database-schema-property device_fingerprint
     */
    device_fingerprint: string;
    /**
     * @x-autobe-database-schema-property ip_address
     */
    ip_address: string;
    /**
     * @x-autobe-database-schema-property user_agent
     */
    user_agent?: string | null | undefined;
    href: string & tags.Format<"uri">;
    referrer: string & tags.Format<"uri">;
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Authorization response for guest authentication containing the guest's unique identifier and JWT tokens for session access. Guests are unauthenticated visitors identified by device fingerprint who receive temporary access tokens to interact with public resources. The access token is used for API requests, the refresh token for obtaining new access tokens, and the expiration timestamps indicate when the session expires.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest user. This UUID identifies the guest record in the system and is used to associate sessions and access patterns with the device fingerprint.
     *
     * @x-autobe-specification Guest identifier extracted from hrm_platform_guests.id during authentication. This UUID is the primary key of the guest record that was created or retrieved based on device fingerprint matching. It serves as the guest's identity reference in the authorization response.
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
   * Lightweight summary of a guest user for display in paginated lists. Guests are unauthenticated visitors identified by device fingerprint rather than persistent accounts. This summary includes essential identification information such as device fingerprint, IP address, and creation timestamp for security monitoring and access tracking purposes.
   */
  export type ISummary = {
    /**
     * Unique guest identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from hrm_platform_guests.id. Primary key UUID.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Device fingerprint used to identify guest visitors.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from hrm_platform_guests.device_fingerprint. Unique constraint identifies returning guests.
     */
    device_fingerprint: string;

    /**
     * IP address from which the guest accessed the platform.
     *
     * @x-autobe-database-schema-property ip_address
     * @x-autobe-specification Direct mapping from hrm_platform_guests.ip_address. Captured at guest creation for security monitoring.
     */
    ip_address: string;

    /**
     * Browser and device user agent string for device identification.
     *
     * @x-autobe-database-schema-property user_agent
     * @x-autobe-specification Direct mapping from hrm_platform_guests.user_agent. Nullable field containing browser/device information.
     */
    user_agent: string | null;

    /**
     * Creation timestamp of the guest record.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from hrm_platform_guests.created_at. Timestamp when guest record was first created upon initial access.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Soft-deletion timestamp, null if active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from hrm_platform_guests.deleted_at. Nullable, indicates soft-delete status for retention policy enforcement.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
