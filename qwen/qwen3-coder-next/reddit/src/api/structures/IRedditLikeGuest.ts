import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditLikeGuest {
  /**
   * Device fingerprint identifier for creating temporary anonymous accounts.
   */
  export type IJoin = {
    /**
     * Device fingerprint identifier for anonymous guest identification.
     *
     * @x-autobe-database-schema-property device_id
     * @x-autobe-specification Direct mapping from reddit_like_guests.device_id. Unique constraint enforced at database level.
     */
    device_id: string & tags.Format<"uuid">;
  };

  /**
   * Refresh token used to obtain new access tokens without re-authentication.
   */
  export type IRefresh = {
    /**
     * Refresh token used to obtain new access tokens without re-authentication.
     *
     * @x-autobe-specification System-derived from reddit_like_guest_sessions.refresh_token. Validates token against session table, checks expired_at > now and deleted_at is null, then regenerates new access/refresh tokens.
     */
    refresh_token: string;
  };

  /**
   * Authorized guest response containing JWT tokens for anonymous access.
   */
  export type IAuthorized = {
    /**
     * Unique guest identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_like_guests.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Device fingerprint identifier.
     *
     * @x-autobe-database-schema-property device_id
     * @x-autobe-specification Direct mapping from reddit_like_guests.device_id. Unique constraint enforced.
     */
    device_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;

    /**
     * Guest account creation timestamp.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_like_guests.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last session update timestamp.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from reddit_like_guests.updated_at.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
