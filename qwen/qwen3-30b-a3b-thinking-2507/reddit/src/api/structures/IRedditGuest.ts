import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditGuest {
  /**
   * Request payload for creating a temporary guest session with device identifier.
   */
  export type IJoin = {
    /**
     * Unique device identifier for guest session tracking.
     *
     * @x-autobe-database-schema-property device_id
     * @x-autobe-specification Direct mapping from reddit_guests.device_id. Must be unique across platform.
     */
    device_id: string & tags.Format<"uuid">;

    /**
     * URL of the initiating page for session context.
     *
     * @x-autobe-specification Origin URL for session initiation tracking, not persisted to database.
     */
    href: string & tags.Format<"uri">;

    /**
     * Previous web page URL before session initiation.
     *
     * @x-autobe-specification Previous page URL for analytics, not stored in database.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for geolocation tracking, optional.
     *
     * @x-autobe-specification Client IP address for geographical context, optional and not stored.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Guest authentication token structure for anonymous platform access. Includes short-lived access token (for API requests), long-lived refresh token (to extend session), expiration timestamps, and complete authorization metadata.
   */
  export type IAuthorized = {
    /**
     * Short-lived JWT access token for API authentication.
     *
     * @x-autobe-specification JWT access token for authenticating API requests. Requires Bearer scheme (Authorization: Bearer {access}). Contains encoded claims with user identity and permissions. Expires after 30 minutes.
     */
    access: string;

    /**
     * Long-lived refresh token for session continuation.
     *
     * @x-autobe-specification JWT refresh token for obtaining new access tokens without re-authentication. Stored in reddit_guest_sessions and used to extend session validity by 30 minutes. Never exposed in response except during refresh.
     */
    refresh: string;

    /**
     * Access token expiration timestamp in ISO 8601 format.
     *
     * @x-autobe-specification ISO 8601 timestamp indicating when access token expires. This timestamp is embedded within the JWT itself as its 'exp' claim and is used to determine token validity for authentication requests.
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
   * Filters and pagination parameters for guest account listings. Supports partial matching on device_id for search, and page/limit for data retrieval.
   */
  export type IRequest = {
    /**
     * Substring to filter guest accounts by device ID.
     *
     * @x-autobe-specification Search parameter for partial matching on guest device_id field. Supports substring matching in device_id for filtering.
     */
    search?: string | undefined;

    /**
     * Page number to retrieve (1-indexed).
     *
     * @x-autobe-specification Page number for paginated results. Must be 1 or higher.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page (max 100).
     *
     * @x-autobe-specification Maximum number of items per page. Must be between 1 and 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Refresh token used to renew guest session expiration. Must be provided as part of the refresh request to extend session validity.
   */
  export type IRefresh = {};

  /**
   * Lightweight guest session summary for active guest listing, including device identifier and timestamp metrics. Active guests have deleted_at = null.
   */
  export type ISummary = {
    /**
     * Unique identifier for the guest session
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_guests.id (UUID primary key)
     */
    id: string & tags.Format<"uuid">;

    /**
     * Device identifier used to track guest sessions across devices
     *
     * @x-autobe-database-schema-property device_id
     * @x-autobe-specification Direct mapping from reddit_guests.device_id (unique device identifier)
     */
    device_id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the guest account was created
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_guests.created_at (timestamp of guest account creation)
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the guest account was last updated
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from reddit_guests.updated_at (timestamp of last guest account update)
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
