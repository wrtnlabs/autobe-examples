import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformGuest {
  /**
   * Request body for creating a temporary guest account. The device_hash field is required to identify the guest device across sessions, enabling session continuity without registration.
   */
  export type IJoin = {};

  /**
   * Input for refreshing the guest session token. Contains the current refresh token required to extend session validity without user interaction.
   */
  export type IRefresh = {};

  /**
   * Session access and token details for guest authentication, including access token, refresh token, and expiration information, all derived from the token storage column.
   */
  export type IAuthorized = {
    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Summary view of a guest account containing essential identifiers and creation information used to link sessions to guest accounts with minimal data.
   */
  export type ISummary = {
    /**
     * Unique guest account identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_guests.id. UUID PK.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique device fingerprint identifying the guest across sessions.
     *
     * @x-autobe-database-schema-property device_hash
     * @x-autobe-specification Direct mapping from community_platform_guests.device_hash. Unique device fingerprint across sessions.
     */
    device_hash: string;

    /**
     * Timestamp when the guest account was created (UTC).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_guests.created_at. Timestamp when guest account was created (UTC).
     */
    created_at: string & tags.Format<"date-time">;
  };
}
