import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEcommerceMallGuest {
  /**
   * Authorization response containing JWT access and refresh tokens for guest session. This type is returned after successful guest join or token refresh operations, providing the guest with credentials to maintain their session across subsequent API requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account. This UUID is the primary key from the guests table and is used to identify the guest in subsequent API requests.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.id UUID column.
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
   * Request body for refreshing a guest session token. Contains the current refresh token that was issued during guest session creation. The server validates this token and issues new access and refresh tokens to maintain session continuity without requiring re-authentication.
   */
  export type IRefresh = {
    /**
     * The current refresh token issued during guest session creation. This token is used to obtain new access and refresh tokens.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping to ecommerce_mall_guest_sessions.id. The refreshToken value is the UUID of the guest session record used to look up and validate the existing session before issuing new tokens.
     */
    refreshToken: string;
  };

  /**
   * Request body for guest self-registration. Contains device fingerprint for identity creation and session context fields including current page URL, referrer, IP address, and user agent string for security tracking.
   */
  export type IJoin = {
    /**
     * @x-autobe-database-schema-property fingerprint
     */
    fingerprint: string;
    href: string & tags.Format<"uri">;

    /**
     * Client IP address at session creation time.
     *
     * @x-autobe-database-schema-property ip_address
     * @x-autobe-specification Maps to ecommerce_mall_guests.ip_address column.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
    referrer: string & tags.Format<"uri">;

    /**
     * Browser or client user agent string for device identification.
     *
     * @x-autobe-database-schema-property user_agent
     * @x-autobe-specification Maps to ecommerce_mall_guests.user_agent column.
     */
    user_agent?: string | null | undefined;
  };

  /**
   * Lightweight summary representation of a guest entity for display in session and list contexts. Contains essential device identification and activity information without sensitive data or collection references.
   */
  export type ISummary = {
    /**
     * Unique identifier of the guest account (UUID format).
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.id. Primary key UUID.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Device fingerprint string used to identify anonymous guest visitors across sessions.
     *
     * @x-autobe-database-schema-property fingerprint
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.fingerprint. Unique device identifier.
     */
    fingerprint: string;

    /**
     * IP address of the guest's device for geographic tracking and security purposes.
     *
     * @x-autobe-database-schema-property ip_address
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.ip_address. Nullable field.
     */
    ip_address?: string | null | undefined;

    /**
     * Browser or client user agent string for device identification and analytics.
     *
     * @x-autobe-database-schema-property user_agent
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.user_agent. Nullable field.
     */
    user_agent?: string | null | undefined;

    /**
     * Timestamp of the guest's last activity across any session.
     *
     * @x-autobe-database-schema-property last_active_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.last_active_at. Nullable timestamp.
     */
    last_active_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when the guest account was first created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.created_at. Non-nullable timestamp.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
